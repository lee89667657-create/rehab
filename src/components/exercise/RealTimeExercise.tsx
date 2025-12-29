/**
 * RealTimeExercise.tsx
 * 실시간 운동 분석 컴포넌트
 *
 * MediaPipe Pose를 사용하여 카메라로 사용자의 자세를 실시간 분석하고,
 * 반복 동작을 자동으로 카운팅합니다.
 *
 * ## 주요 기능
 * - 실시간 포즈 감지 및 스켈레톤 렌더링
 * - 자동 반복 카운팅 (hysteresis + cooldown 적용)
 * - 세트/휴식 관리
 * - 음성/텍스트 피드백
 * - 운동 결과 저장
 *
 * ## 기술적 고려사항
 * - React state stale 문제 방지를 위해 useRef 사용
 * - 좌/우 관절 중 visibility가 높은 쪽 또는 중점 사용
 * - 셀피 카메라 좌우반전 지원 (mirrorMode)
 * - 음성 피드백 큐 관리 (중복 방지)
 * - 완전한 cleanup (Camera, Pose, MediaStream, speechSynthesis)
 */

'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, X, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  type CountableExercise,
  type ExerciseResult,
  getJointValue,
  saveExerciseResult,
} from '@/lib/exerciseData';
import { devRealtimeLog, devStateLog } from '@/lib/logger';

// ============================================================
// 타입 정의
// ============================================================

interface RealTimeExerciseProps {
  /** 수행할 운동 데이터 */
  exercise: CountableExercise;
  /** 운동 완료 시 호출되는 콜백 */
  onComplete: (result: ExerciseResult) => void;
  /** 운동 취소 시 호출되는 콜백 */
  onCancel: () => void;
}

/** 반복 동작 상태 */
type RepPhase = 'ready' | 'down' | 'up';

/** 피드백 타입 */
type FeedbackType = 'info' | 'success' | 'warning' | 'error';

/** MediaPipe 랜드마크 타입 */
interface PoseLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/** MediaPipe 결과 타입 */
interface PoseResults {
  poseLandmarks?: PoseLandmark[];
}

/** MediaPipe Pose 인스턴스 타입 */
interface PoseInstance {
  setOptions: (options: Record<string, unknown>) => void;
  onResults: (callback: (results: PoseResults) => void) => void;
  send: (input: { image: HTMLVideoElement }) => Promise<void>;
  close: () => void;
}

/** MediaPipe Camera 인스턴스 타입 */
interface CameraInstance {
  start: () => Promise<void>;
  stop: () => void;
}

// ============================================================
// 스켈레톤 연결선 정의 (MediaPipe Pose 기준)
// ============================================================

/**
 * 한국어 숫자 배열 (1~20)
 * - 1~20까지는 "하나, 둘, 셋... 스물" 형식으로 읽음
 * - 0번 인덱스는 빈 문자열 (사용하지 않음)
 */
const KOREAN_NUMBERS = [
  '', '하나', '둘', '셋', '넷', '다섯',
  '여섯', '일곱', '여덟', '아홉', '열',
  '열하나', '열둘', '열셋', '열넷', '열다섯',
  '열여섯', '열일곱', '열여덟', '열아홉', '스물'
];

const SKELETON_CONNECTIONS: [number, number][] = [
  // 몸통
  [11, 12], // 어깨
  [11, 23], // 왼쪽 몸통
  [12, 24], // 오른쪽 몸통
  [23, 24], // 골반

  // 왼팔
  [11, 13], // 어깨-팔꿈치
  [13, 15], // 팔꿈치-손목

  // 오른팔
  [12, 14], // 어깨-팔꿈치
  [14, 16], // 팔꿈치-손목

  // 왼다리
  [23, 25], // 골반-무릎
  [25, 27], // 무릎-발목

  // 오른다리
  [24, 26], // 골반-무릎
  [26, 28], // 무릎-발목
];

// ============================================================
// 관절 각도 계산 함수
// ============================================================

/**
 * 세 점 사이의 각도 계산 (도 단위)
 * @param a - 첫 번째 점 (예: hip)
 * @param b - 중간 점 (예: knee) - 각도를 측정할 관절
 * @param c - 세 번째 점 (예: ankle)
 * @returns 각도 (0~180도), visibility 부족 시 null
 */
function calculateAngle(
  a: PoseLandmark | undefined,
  b: PoseLandmark | undefined,
  c: PoseLandmark | undefined,
  minVisibility = 0.5
): number | null {
  if (!a || !b || !c) return null;

  // visibility 체크
  if (
    (a.visibility ?? 0) < minVisibility ||
    (b.visibility ?? 0) < minVisibility ||
    (c.visibility ?? 0) < minVisibility
  ) {
    return null;
  }

  // 벡터 계산: BA와 BC
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };

  // 내적 계산
  const dotProduct = ba.x * bc.x + ba.y * bc.y;

  // 벡터 크기
  const magnitudeBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
  const magnitudeBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);

  if (magnitudeBA === 0 || magnitudeBC === 0) return null;

  // 각도 계산 (라디안 → 도)
  const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
  // clamp to [-1, 1] to avoid NaN from floating point errors
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  const angleRad = Math.acos(clampedCos);
  const angleDeg = angleRad * (180 / Math.PI);

  return angleDeg;
}

/**
 * 좌/우 무릎 각도 중 더 작은 값 반환 (스쿼트 감지에 유리)
 * @returns 무릎 각도 (도) 또는 null
 */
function getKneeAngle(landmarks: PoseLandmark[]): number | null {
  // 왼쪽: hip(23), knee(25), ankle(27)
  const leftAngle = calculateAngle(
    landmarks[23],
    landmarks[25],
    landmarks[27]
  );

  // 오른쪽: hip(24), knee(26), ankle(28)
  const rightAngle = calculateAngle(
    landmarks[24],
    landmarks[26],
    landmarks[28]
  );

  // 둘 다 유효하면 더 작은 값 사용 (스쿼트 인식에 유리)
  if (leftAngle !== null && rightAngle !== null) {
    return Math.min(leftAngle, rightAngle);
  }
  return leftAngle ?? rightAngle;
}

/**
 * hip-knee 각도 계산 (무릎 들어올리기용)
 * shoulder-hip-knee 세 점으로 허벅지가 몸통과 이루는 각도 계산
 * - 서있을 때: 약 170~180도 (다리가 펴짐)
 * - 무릎 들었을 때: 약 90~130도 (허벅지가 올라감)
 * @returns 더 작은 쪽 hip 각도 (도) 또는 null
 */
function getHipAngle(landmarks: PoseLandmark[]): number | null {
  // 왼쪽: shoulder(11), hip(23), knee(25)
  const leftAngle = calculateAngle(
    landmarks[11],
    landmarks[23],
    landmarks[25]
  );

  // 오른쪽: shoulder(12), hip(24), knee(26)
  const rightAngle = calculateAngle(
    landmarks[12],
    landmarks[24],
    landmarks[26]
  );

  // 둘 다 유효하면 더 작은 값 사용 (어느 쪽 무릎이든 들어올리면 인식)
  if (leftAngle !== null && rightAngle !== null) {
    return Math.min(leftAngle, rightAngle);
  }
  return leftAngle ?? rightAngle;
}

// ============================================================
// 메인 컴포넌트
// ============================================================

export default function RealTimeExercise({
  exercise,
  onComplete,
  onCancel,
}: RealTimeExerciseProps) {
  // ========================================
  // Refs - MediaPipe 인스턴스 및 최신 상태 유지용
  // ========================================

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<PoseInstance | null>(null);
  const cameraRef = useRef<CameraInstance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // React state stale 문제 방지를 위한 refs
  const isPausedRef = useRef(false);
  const isRestingRef = useRef(false);
  const repPhaseRef = useRef<RepPhase>('ready');
  const currentRepRef = useRef(0);
  const currentSetRef = useRef(1);
  const lastCountTimeRef = useRef(0);

  // 운동 시작 시간
  const startTimeRef = useRef(Date.now());
  const repsPerSetRef = useRef<number[]>([]);

  // ========================================
  // 캘리브레이션용 Refs
  // ========================================
  // 카메라 거리/자세에 따라 관절 좌표 값이 달라지므로
  // 절대값 대신 기준점(baseline) 대비 변화량으로 감지
  const baselineRef = useRef<number | null>(null);        // 기준값 (캘리브레이션 결과)
  const baselineSamplesRef = useRef<number[]>([]);        // 기준값 측정용 샘플

  // completeSet 함수 참조용 ref (순환 참조 방지)
  const completeSetRef = useRef<() => void>(() => {});

  // 디바운싱용 ref (턱 당기기 등 노이즈 방지)
  const debounceCountRef = useRef(0);  // 조건 만족 연속 프레임 수

  // ========================================
  // neck-side-stretch 전용 Refs (물리치료 스타일)
  // ========================================
  // 상태 머신: 'center' → 'left-hold' → 'center' → 'right-hold' → 반복
  type NeckStretchState = 'center' | 'left-hold' | 'right-hold';
  const neckStretchStateRef = useRef<NeckStretchState>('center');
  const holdStartTimeRef = useRef<number>(0);                    // 유지 시작 시각
  const expectedDirectionRef = useRef<'left' | 'right'>('left'); // 다음 기대 방향
  const neckBaselineXRef = useRef<number | null>(null);          // nose.x 기준값
  const neckBaselineSamplesRef = useRef<number[]>([]);           // baseline 샘플
  const leftCountRef = useRef(0);                                // 왼쪽 완료 횟수
  const rightCountRef = useRef(0);                               // 오른쪽 완료 횟수

  // ========================================
  // State - UI 렌더링용
  // ========================================

  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const [currentSet, setCurrentSet] = useState(1);
  const [currentRep, setCurrentRep] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restTime, setRestTime] = useState(0);

  const [feedback, setFeedback] = useState('준비하세요');
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('info');

  const [poseDetected, setPoseDetected] = useState(false);
  const [showJointWarning, setShowJointWarning] = useState(false);

  // ========================================
  // 초기화 단계 상태 (음성 타이밍 관리)
  // ========================================
  // 플로우: loading → announcing → countdown → starting → done
  // 1. loading: 카메라 로딩 중
  // 2. announcing: "기본 자세를 잡으세요" 음성 (3초 대기)
  // 3. countdown: 3, 2, 1 카운트다운
  // 4. starting: "운동을 시작합니다" 음성 (2초 대기)
  // 5. done: 운동 시작
  const [initPhase, setInitPhase] = useState<'loading' | 'announcing' | 'countdown' | 'starting' | 'done'>('loading');
  const [readyCountdown, setReadyCountdown] = useState(3);
  const isCalibrationCompleteRef = useRef(false);  // 캘리브레이션 완료 여부

  // ========================================
  // 음성 피드백 함수
  // ========================================

  /**
   * 음성 피드백 재생
   * - 음소거 상태면 무시
   * - 항상 이전 음성 취소 후 새 음성 재생
   */
  const speak = useCallback((text: string) => {
    if (isMuted) return;

    // 이전 음성 취소
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    speechSynthesis.speak(utterance);
  }, [isMuted]);

  // ========================================
  // 한국어 숫자 음성 피드백
  // ========================================

  /**
   * 반복 횟수를 한국어로 음성 피드백
   * - 1~20회: "하나", "둘", "셋" ... "스물" 형식
   * - 21회 이상: "21회", "22회" 형식
   * @param count - 현재 반복 횟수
   */
  const speakRepCount = useCallback((count: number) => {
    if (count >= 1 && count <= 20) {
      // 1~20까지는 한국어 숫자로 읽기
      speak(KOREAN_NUMBERS[count]);
    } else {
      // 21 이상은 "N회" 형식으로 읽기
      speak(`${count}회`);
    }
  }, [speak]);

  // ========================================
  // 스켈레톤 그리기
  // ========================================

  const drawSkeleton = useCallback((
    landmarks: Array<{ x: number; y: number; visibility?: number }>
  ) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // 캔버스 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 연결선 그리기
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    SKELETON_CONNECTIONS.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];

      if (
        p1 && p2 &&
        (p1.visibility ?? 0) > 0.5 &&
        (p2.visibility ?? 0) > 0.5
      ) {
        ctx.beginPath();
        ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
        ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
        ctx.stroke();
      }
    });

    // 관절 포인트 그리기
    ctx.fillStyle = '#22c55e';
    landmarks.forEach((lm) => {
      if (lm && (lm.visibility ?? 0) > 0.5) {
        ctx.beginPath();
        ctx.arc(
          lm.x * canvas.width,
          lm.y * canvas.height,
          6,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }
    });

    // 감지 중인 관절 강조
    const highlightValue = getJointValue(
      landmarks,
      exercise.countingJoint,
      exercise.countingAxis,
      exercise.mirrorMode
    );

    if (highlightValue !== null) {
      // 감지 관절 위치에 큰 원 표시
      ctx.fillStyle = repPhaseRef.current === 'down' ? '#ef4444' : '#3b82f6';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;

      // 관절 인덱스 가져오기
      const jointIndexMap: Record<string, number[]> = {
        nose: [0],
        shoulder: [11, 12],
        hip: [23, 24],
        knee: [25, 26],
        wrist: [15, 16],
        elbow: [13, 14],
      };

      const indices = jointIndexMap[exercise.countingJoint];
      indices.forEach((idx) => {
        const lm = landmarks[idx];
        if (lm && (lm.visibility ?? 0) > 0.5) {
          ctx.beginPath();
          ctx.arc(
            lm.x * canvas.width,
            lm.y * canvas.height,
            12,
            0,
            2 * Math.PI
          );
          ctx.fill();
          ctx.stroke();
        }
      });
    }
  }, [exercise]);

  // ========================================
  // 측정값 계산 함수
  // ========================================

  /**
   * 운동별 측정값 계산
   * - chin-tuck: nose-shoulder y거리 (앞뒤 움직임 감지)
   * - 그 외: countingJoint + countingAxis 값
   *
   * @returns 측정값 또는 null (visibility 부족 시)
   */
  const getMeasurementValue = useCallback((
    landmarks: Array<{ x: number; y: number; visibility?: number }>
  ): number | null => {
    // chin-tuck 운동: nose-shoulder y거리 사용
    if (exercise.id === 'chin-tuck') {
      const nose = landmarks[0];
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];

      if (!nose || !leftShoulder || !rightShoulder) return null;
      if ((nose.visibility ?? 0) < 0.5) return null;
      if ((leftShoulder.visibility ?? 0) < 0.5 && (rightShoulder.visibility ?? 0) < 0.5) return null;

      const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
      return shoulderMidY - nose.y;  // 코-어깨 y거리
    }

    // 그 외 운동: 기본 관절 좌표 사용
    return getJointValue(
      landmarks,
      exercise.countingJoint,
      exercise.countingAxis,
      exercise.mirrorMode
    );
  }, [exercise]);

  // ========================================
  // 스쿼트 각도 기반 감지
  // ========================================

  /**
   * 스쿼트 전용 각도 기반 감지
   * - 서있을 때: 무릎 각도 > 150도
   * - 스쿼트 시: 무릎 각도 < 120도
   * - down → standing 전환 시 1회 카운트
   */
  const detectSquat = useCallback((
    landmarks: PoseLandmark[]
  ) => {
    if (isPausedRef.current || isRestingRef.current) return;
    if (!isCalibrationCompleteRef.current) return;

    // 무릎 각도 계산
    const kneeAngle = getKneeAngle(landmarks);
    if (kneeAngle === null) {
      // visibility 부족 - 경고는 onResults에서 처리
      return;
    }

    const now = Date.now();
    const cooldown = exercise.countingCooldown ?? 500;
    const phase = repPhaseRef.current;
    const debounceFrames = 2;  // 빠른 동작 인식을 위해 2프레임으로 고정

    // 스쿼트 임계값 (실측 기준: 서있을 때 170~178°, 스쿼트 시 143~152°)
    const SQUAT_DOWN_THRESHOLD = 160;  // 이 각도 미만이면 스쿼트 상태
    const STANDING_THRESHOLD = 168;     // 이 각도 초과이면 서있는 상태

    // 디버그 로그 (실시간 - 기본 비활성화)
    devRealtimeLog(
      `[스쿼트] 무릎각도: ${kneeAngle.toFixed(1)}° | ` +
      `연속: ${debounceCountRef.current}/${debounceFrames} | ` +
      `상태: ${phase}`
    );

    // 상태 머신
    if (phase === 'ready' || phase === 'up') {
      // 스쿼트 자세로 전환: 무릎 각도 < 120도
      if (kneeAngle < SQUAT_DOWN_THRESHOLD) {
        debounceCountRef.current++;
        if (debounceCountRef.current >= debounceFrames) {
          repPhaseRef.current = 'down';
          debounceCountRef.current = 0;
          setFeedback('좋아요! 천천히 일어나세요');
          setFeedbackType('success');
        }
      } else {
        debounceCountRef.current = 0;
      }
    } else if (phase === 'down') {
      // 서있는 자세로 복귀: 무릎 각도 > 150도 → 카운트
      if (kneeAngle > STANDING_THRESHOLD) {
        debounceCountRef.current++;
        if (debounceCountRef.current >= debounceFrames &&
            now - lastCountTimeRef.current > cooldown) {
          repPhaseRef.current = 'up';
          debounceCountRef.current = 0;
          lastCountTimeRef.current = now;

          // 카운트 증가
          const newRep = currentRepRef.current + 1;
          currentRepRef.current = newRep;
          setCurrentRep(newRep);

          // 피드백
          setFeedback(`${newRep}회 완료!`);
          setFeedbackType('success');

          // 한국어 음성 피드백
          speakRepCount(newRep);

          // 세트 완료 체크
          if (newRep >= exercise.reps) {
            completeSetRef.current();
          }
        }
      } else {
        debounceCountRef.current = 0;
      }
    }
  }, [exercise, speakRepCount]);

  // ========================================
  // 무릎 들어올리기 각도 기반 감지
  // ========================================

  /**
   * 무릎 들어올리기 전용 각도 기반 감지
   * - 서있을 때: hip 각도 > 160도 (다리 펴짐)
   * - 무릎 들었을 때: hip 각도 < 140도 (허벅지 올라감)
   * - down → up 전환 시 1회 카운트
   */
  const detectKneeLift = useCallback((
    landmarks: PoseLandmark[]
  ) => {
    if (isPausedRef.current || isRestingRef.current) return;
    if (!isCalibrationCompleteRef.current) return;

    // hip 각도 계산 (shoulder-hip-knee)
    const hipAngle = getHipAngle(landmarks);
    if (hipAngle === null) {
      return;
    }

    const now = Date.now();
    const cooldown = exercise.countingCooldown ?? 500;
    const phase = repPhaseRef.current;
    const debounceFrames = 2;

    // 무릎 들어올리기 임계값
    const KNEE_UP_THRESHOLD = 140;    // 이 각도 미만이면 무릎 들린 상태
    const STANDING_THRESHOLD = 160;   // 이 각도 초과이면 서있는 상태

    // 디버그 로그 (실시간 - 기본 비활성화)
    devRealtimeLog(
      `[무릎들기] hip각도: ${hipAngle.toFixed(1)}° | ` +
      `연속: ${debounceCountRef.current}/${debounceFrames} | ` +
      `상태: ${phase}`
    );

    // 상태 머신
    if (phase === 'ready' || phase === 'up') {
      // 무릎 들린 상태로 전환: hip 각도 < 140도
      if (hipAngle < KNEE_UP_THRESHOLD) {
        debounceCountRef.current++;
        if (debounceCountRef.current >= debounceFrames) {
          repPhaseRef.current = 'down';
          debounceCountRef.current = 0;
          setFeedback('좋아요! 천천히 내려놓으세요');
          setFeedbackType('success');
        }
      } else {
        debounceCountRef.current = 0;
      }
    } else if (phase === 'down') {
      // 서있는 자세로 복귀: hip 각도 > 160도 → 카운트
      if (hipAngle > STANDING_THRESHOLD) {
        debounceCountRef.current++;
        if (debounceCountRef.current >= debounceFrames &&
            now - lastCountTimeRef.current > cooldown) {
          repPhaseRef.current = 'up';
          debounceCountRef.current = 0;
          lastCountTimeRef.current = now;

          // 카운트 증가
          const newRep = currentRepRef.current + 1;
          currentRepRef.current = newRep;
          setCurrentRep(newRep);

          // 피드백
          setFeedback(`${newRep}회 완료!`);
          setFeedbackType('success');

          // 한국어 음성 피드백
          speakRepCount(newRep);

          // 세트 완료 체크
          if (newRep >= exercise.reps) {
            completeSetRef.current();
          }
        }
      } else {
        debounceCountRef.current = 0;
      }
    }
  }, [exercise, speakRepCount]);

  // ========================================
  // 목 옆 스트레칭 (물리치료 스타일) 감지
  // ========================================

  /**
   * neck-side-stretch 전용 감지 로직
   *
   * ## 핵심 규칙
   * 1. 유지 시간: 최소 3초 유지해야 1회 카운트
   * 2. 좌우 번갈아: left → center → right → center → left ... 순서
   * 3. 중앙 복귀 필수: 중앙으로 돌아와야 다음 동작 인정
   *
   * ## 상태 머신
   * - 'center': 중앙 대기 상태 (다음 방향으로 이동 가능)
   * - 'left-hold': 왼쪽 유지 중 (3초 후 카운트)
   * - 'right-hold': 오른쪽 유지 중 (3초 후 카운트)
   *
   * ## 방향 판정 (셀피 카메라 좌우반전 적용)
   * - 화면상 왼쪽으로 기울임 = nose.x 증가 (실제 오른쪽 기울임)
   * - 화면상 오른쪽으로 기울임 = nose.x 감소 (실제 왼쪽 기울임)
   * - mirrorMode=true이므로 좌우 반전해서 해석
   */
  const detectNeckSideStretch = useCallback((
    landmarks: PoseLandmark[]
  ) => {
    if (isPausedRef.current || isRestingRef.current) return;
    if (!isCalibrationCompleteRef.current) return;

    const nose = landmarks[0];
    if (!nose || (nose.visibility ?? 0) < 0.5) return;

    const baselineX = neckBaselineXRef.current;
    if (baselineX === null) return;

    // ========================================
    // 설정값
    // ========================================
    const THRESHOLD = 0.04;           // 좌우 판정 임계값
    const HOLD_DURATION = 3000;       // 유지 시간 (3초)
    const CENTER_THRESHOLD = 0.02;    // 중앙 복귀 임계값

    const now = Date.now();
    const state = neckStretchStateRef.current;
    const expectedDir = expectedDirectionRef.current;

    // ========================================
    // 방향 판정
    // ========================================
    // mirrorMode=true (셀피 카메라)이므로:
    // - 사용자가 화면상 왼쪽으로 기울이면 nose.x가 커짐 → 실제로는 오른쪽 방향
    // - 사용자가 화면상 오른쪽으로 기울이면 nose.x가 작아짐 → 실제로는 왼쪽 방향
    // 하지만 사용자 관점에서 "왼쪽으로 기울여주세요"는 화면상 왼쪽이므로:
    // - nose.x > baseline + THRESHOLD → 왼쪽 (화면상)
    // - nose.x < baseline - THRESHOLD → 오른쪽 (화면상)
    let direction: 'left' | 'right' | 'center' = 'center';

    if (nose.x > baselineX + THRESHOLD) {
      direction = 'left';  // 화면상 왼쪽으로 기울임
    } else if (nose.x < baselineX - THRESHOLD) {
      direction = 'right'; // 화면상 오른쪽으로 기울임
    }

    // 중앙 판정 (더 좁은 범위)
    const isCenter = Math.abs(nose.x - baselineX) < CENTER_THRESHOLD;

    // 디버그 로그 (실시간 - 기본 비활성화)
    devRealtimeLog(
      `[목스트레칭] nose.x: ${nose.x.toFixed(3)} | ` +
      `baseline: ${baselineX.toFixed(3)} | ` +
      `delta: ${(nose.x - baselineX).toFixed(3)} | ` +
      `방향: ${direction} | ` +
      `상태: ${state} | ` +
      `기대방향: ${expectedDir} | ` +
      `좌: ${leftCountRef.current} 우: ${rightCountRef.current}`
    );

    // ========================================
    // 상태 머신 처리
    // ========================================
    if (state === 'center') {
      // 중앙 상태: 기대 방향으로 이동하면 hold 상태로 전환
      if (direction === expectedDir) {
        // 기대 방향으로 기울임 시작
        neckStretchStateRef.current = direction === 'left' ? 'left-hold' : 'right-hold';
        holdStartTimeRef.current = now;
        setFeedback(`${direction === 'left' ? '왼쪽' : '오른쪽'}으로 기울이세요... 유지!`);
        setFeedbackType('info');
      }
      // 기대 방향이 아닌 방향으로 기울이면 무시 (순서 강제)
    } else if (state === 'left-hold') {
      // 왼쪽 유지 중
      if (direction === 'left') {
        // 계속 유지 중 - 유지 시간 체크
        const holdTime = now - holdStartTimeRef.current;

        if (holdTime >= HOLD_DURATION) {
          // 3초 유지 완료! 카운트
          leftCountRef.current += 1;
          const totalCount = leftCountRef.current + rightCountRef.current;

          // 전체 카운트 증가
          currentRepRef.current = totalCount;
          setCurrentRep(totalCount);
          lastCountTimeRef.current = now;

          // 피드백 (한국어 숫자)
          setFeedback(`왼쪽 ${KOREAN_NUMBERS[leftCountRef.current] || leftCountRef.current + '회'} 완료!`);
          setFeedbackType('success');

          // 음성 피드백: "왼쪽 하나", "왼쪽 둘" 형식
          speechSynthesis.cancel();
          const countText = leftCountRef.current <= 20
            ? KOREAN_NUMBERS[leftCountRef.current]
            : `${leftCountRef.current}회`;
          speak(`왼쪽 ${countText}`);

          // 다음 상태: 중앙으로 복귀 대기, 다음은 오른쪽
          neckStretchStateRef.current = 'center';
          expectedDirectionRef.current = 'right';
          holdStartTimeRef.current = 0;

          // 세트 완료 체크
          if (totalCount >= exercise.reps) {
            completeSetRef.current();
          }
        } else {
          // 아직 유지 중
          const remaining = Math.ceil((HOLD_DURATION - holdTime) / 1000);
          setFeedback(`왼쪽 유지... ${remaining}초`);
        }
      } else if (isCenter) {
        // 중앙으로 돌아옴 - 유지 실패 (3초 전에 중앙 복귀)
        neckStretchStateRef.current = 'center';
        holdStartTimeRef.current = 0;
        setFeedback('다시 왼쪽으로 기울여주세요');
        setFeedbackType('warning');
      }
      // 반대 방향(right)으로 가면 무시 (잘못된 동작)
    } else if (state === 'right-hold') {
      // 오른쪽 유지 중
      if (direction === 'right') {
        // 계속 유지 중 - 유지 시간 체크
        const holdTime = now - holdStartTimeRef.current;

        if (holdTime >= HOLD_DURATION) {
          // 3초 유지 완료! 카운트
          rightCountRef.current += 1;
          const totalCount = leftCountRef.current + rightCountRef.current;

          // 전체 카운트 증가
          currentRepRef.current = totalCount;
          setCurrentRep(totalCount);
          lastCountTimeRef.current = now;

          // 피드백 (한국어 숫자)
          setFeedback(`오른쪽 ${KOREAN_NUMBERS[rightCountRef.current] || rightCountRef.current + '회'} 완료!`);
          setFeedbackType('success');

          // 음성 피드백: "오른쪽 하나", "오른쪽 둘" 형식
          speechSynthesis.cancel();
          const countText = rightCountRef.current <= 20
            ? KOREAN_NUMBERS[rightCountRef.current]
            : `${rightCountRef.current}회`;
          speak(`오른쪽 ${countText}`);

          // 다음 상태: 중앙으로 복귀 대기, 다음은 왼쪽
          neckStretchStateRef.current = 'center';
          expectedDirectionRef.current = 'left';
          holdStartTimeRef.current = 0;

          // 세트 완료 체크
          if (totalCount >= exercise.reps) {
            completeSetRef.current();
          }
        } else {
          // 아직 유지 중
          const remaining = Math.ceil((HOLD_DURATION - holdTime) / 1000);
          setFeedback(`오른쪽 유지... ${remaining}초`);
        }
      } else if (isCenter) {
        // 중앙으로 돌아옴 - 유지 실패 (3초 전에 중앙 복귀)
        neckStretchStateRef.current = 'center';
        holdStartTimeRef.current = 0;
        setFeedback('다시 오른쪽으로 기울여주세요');
        setFeedbackType('warning');
      }
      // 반대 방향(left)으로 가면 무시 (잘못된 동작)
    }
  }, [exercise, speak]);

  // ========================================
  // 반복 동작 감지 (통합 캘리브레이션 방식)
  // ========================================

  /**
   * 통합 캘리브레이션 기반 반복 동작 감지
   *
   * ## 캘리브레이션 방식
   * 1. 운동 시작 시 3초간 기본 자세 유지 (baseline 측정)
   * 2. baseline 기준으로 deltaThreshold만큼 변화 시 동작 인식
   * 3. 모든 운동에 동일한 로직 적용
   *
   * ## 디바운싱
   * - debounceFrames 연속 프레임에서 조건 만족해야 상태 전환
   * - 노이즈로 인한 잘못된 카운팅 방지
   *
   * ## 상태 머신
   * - ready/up → down: 동작 수행 (값이 baseline에서 deltaThreshold 이상 변화)
   * - down → up: 동작 복귀 (값이 baseline 근처로 돌아옴) + 카운트
   */
  const detectRepetition = useCallback((
    landmarks: Array<{ x: number; y: number; visibility?: number }>
  ) => {
    // 일시정지, 휴식 중, 캘리브레이션 중이면 무시
    if (isPausedRef.current || isRestingRef.current) return;
    if (!isCalibrationCompleteRef.current) return;  // 캘리브레이션 완료 전에는 감지 안 함

    // 스쿼트는 각도 기반 감지 사용
    if (exercise.id === 'squat') {
      detectSquat(landmarks as PoseLandmark[]);
      return;
    }

    // 무릎 들어올리기는 각도 기반 감지 사용
    if (exercise.id === 'knee-lift') {
      detectKneeLift(landmarks as PoseLandmark[]);
      return;
    }

    // 목 옆 스트레칭은 물리치료 스타일 감지 사용
    if (exercise.id === 'neck-side-stretch') {
      detectNeckSideStretch(landmarks as PoseLandmark[]);
      return;
    }

    // 측정값 계산
    const value = getMeasurementValue(landmarks);
    if (value === null) return;

    const now = Date.now();
    const cooldown = exercise.countingCooldown ?? 300;
    const phase = repPhaseRef.current;

    // baseline이 없으면 동작 감지 불가
    const baseline = baselineRef.current;
    if (baseline === null) return;

    // 운동별 설정값 (없으면 기본값)
    const deltaThreshold = exercise.deltaThreshold ?? 0.05;
    const debounceFrames = exercise.debounceFrames ?? 3;

    // ========================================
    // 동작 방향 결정
    // ========================================
    // - y축 운동 (어깨 올리기, 턱 당기기 등): 값 감소 = 동작 수행
    // - x축 운동 (목 기울이기 등): 값 변화 = 동작 수행
    //
    // 대부분의 y축 운동은:
    // - 동작 수행 시 y값이 작아짐 (위로 이동하거나 거리 줄어듦)
    // - 복귀 시 y값이 커짐 (원래 위치로 돌아옴)

    // 동작 감지 임계값 계산
    const isYAxis = exercise.countingAxis === 'y' || exercise.id === 'chin-tuck';

    // 디버그 로그 (실시간 - 기본 비활성화)
    devRealtimeLog(
      `[${exercise.name}] 값: ${value.toFixed(3)} | ` +
      `baseline: ${baseline.toFixed(3)} | ` +
      `delta: ${(value - baseline).toFixed(3)} | ` +
      `threshold: ${deltaThreshold} | ` +
      `연속: ${debounceCountRef.current}/${debounceFrames} | ` +
      `상태: ${phase}`
    );

    // ========================================
    // 통합 상태 머신
    // ========================================
    if (phase === 'ready' || phase === 'up') {
      // down 상태로 전환: 동작 수행
      // y축: 값이 baseline - deltaThreshold 미만 (위로 이동 또는 거리 줄어듦)
      // x축: 값이 baseline에서 deltaThreshold 이상 벗어남 (양방향)
      let conditionMet = false;

      if (isYAxis) {
        // y축: 값이 작아지면 동작 수행
        conditionMet = value < baseline - deltaThreshold;
      } else {
        // x축: 어느 방향이든 변화량이 크면 동작 수행
        conditionMet = Math.abs(value - baseline) > deltaThreshold;
      }

      if (conditionMet) {
        debounceCountRef.current++;
        if (debounceCountRef.current >= debounceFrames) {
          repPhaseRef.current = 'down';
          debounceCountRef.current = 0;
          setFeedback('좋아요! 유지 후 천천히 돌아오세요');
          setFeedbackType('success');
        }
      } else {
        debounceCountRef.current = 0;
      }
    } else if (phase === 'down') {
      // up 상태로 전환: 동작 복귀 + 카운트
      // y축: 값이 baseline - deltaThreshold/2 이상 (복귀 중)
      // x축: 값이 baseline 근처로 복귀
      let returnConditionMet = false;

      if (isYAxis) {
        // y축: 값이 baseline 근처로 돌아오면 복귀
        returnConditionMet = value > baseline - deltaThreshold / 2;
      } else {
        // x축: 값이 baseline 근처로 돌아오면 복귀
        returnConditionMet = Math.abs(value - baseline) < deltaThreshold / 2;
      }

      if (returnConditionMet) {
        debounceCountRef.current++;
        if (debounceCountRef.current >= debounceFrames &&
            now - lastCountTimeRef.current > cooldown) {
          repPhaseRef.current = 'up';
          debounceCountRef.current = 0;
          lastCountTimeRef.current = now;

          // 카운트 증가
          const newRep = currentRepRef.current + 1;
          currentRepRef.current = newRep;
          setCurrentRep(newRep);

          // 피드백
          setFeedback(`${newRep}회 완료!`);
          setFeedbackType('success');

          // 한국어 음성 피드백
          speakRepCount(newRep);

          // 세트 완료 체크
          if (newRep >= exercise.reps) {
            completeSetRef.current();
          }
        }
      } else {
        debounceCountRef.current = 0;
      }
    }
  }, [exercise, getMeasurementValue, speakRepCount, detectSquat, detectKneeLift, detectNeckSideStretch]);

  // ========================================
  // 세트 완료 처리
  // ========================================

  const completeSet = useCallback(() => {
    const completedReps = currentRepRef.current;
    repsPerSetRef.current = [...repsPerSetRef.current, completedReps];

    // 마지막 카운트 음성이 끝난 후 세트 완료 음성 재생 (500ms 딜레이)
    // speakRepCount가 먼저 호출되므로 약간의 딜레이 필요
    setTimeout(() => {
      if (currentSetRef.current >= exercise.sets) {
        // 모든 세트 완료 -> 운동 종료
        finishExercise();
      } else {
        // 휴식 시작
        speak(`${currentSetRef.current}세트 완료! ${exercise.restTime}초 휴식`);
        isRestingRef.current = true;
        setIsResting(true);
        setRestTime(exercise.restTime);
        setFeedback(`휴식 중... ${exercise.restTime}초`);
        setFeedbackType('info');
      }
    }, 500);
  }, [exercise, speak]);

  // completeSetRef 업데이트 (detectRepetition에서 참조)
  completeSetRef.current = completeSet;

  // ========================================
  // 운동 종료
  // ========================================

  const finishExercise = useCallback(() => {
    const finalReps = repsPerSetRef.current;
    const totalReps = finalReps.reduce((a, b) => a + b, 0);
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);

    speak('운동을 완료했습니다. 수고하셨습니다!');

    // 정확도 계산 (목표 대비 실제 수행률)
    const targetTotal = exercise.sets * exercise.reps;
    const accuracy = Math.min(100, Math.round((totalReps / targetTotal) * 100));

    const result: ExerciseResult = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      completedSets: finalReps.length,
      completedReps: finalReps,
      totalReps,
      accuracy,
      duration,
      date: new Date().toISOString(),
    };

    // localStorage에 저장
    saveExerciseResult(result);

    // 콜백 호출
    onComplete(result);
  }, [exercise, speak, onComplete]);

  // ========================================
  // 휴식 타이머
  // ========================================

  useEffect(() => {
    if (!isResting || restTime <= 0) return;

    const timer = setInterval(() => {
      setRestTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);

          // 다음 세트 준비
          isRestingRef.current = false;
          setIsResting(false);

          currentSetRef.current += 1;
          setCurrentSet(currentSetRef.current);

          currentRepRef.current = 0;
          setCurrentRep(0);

          repPhaseRef.current = 'ready';
          debounceCountRef.current = 0;  // 디바운스 카운터 리셋

          // 캘리브레이션 다시 시작 (새 세트마다 기준점 재측정)
          baselineSamplesRef.current = [];
          baselineRef.current = null;
          isCalibrationCompleteRef.current = false;

          // neck-side-stretch 전용 상태 리셋
          if (exercise.id === 'neck-side-stretch') {
            neckStretchStateRef.current = 'center';
            holdStartTimeRef.current = 0;
            expectedDirectionRef.current = 'left';
            neckBaselineXRef.current = null;
            neckBaselineSamplesRef.current = [];
            leftCountRef.current = 0;
            rightCountRef.current = 0;
          }

          // announcing 단계로 리셋
          setInitPhase('announcing');

          return 0;
        }

        setFeedback(`휴식 중... ${prev - 1}초`);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isResting, restTime, speak, exercise.id]);

  // ========================================
  // MediaPipe 포즈 결과 처리
  // ========================================

  /**
   * onResults 핸들러
   * useRef를 통해 최신 상태를 참조하여 stale closure 문제 방지
   */
  const onResultsRef = useRef<(results: PoseResults) => void>();

  onResultsRef.current = (results: PoseResults) => {
    if (!results.poseLandmarks) {
      setPoseDetected(false);
      setShowJointWarning(false);
      return;
    }

    setPoseDetected(true);
    const landmarks = results.poseLandmarks;

    // 스켈레톤 그리기
    drawSkeleton(landmarks);

    // ========================================
    // 관절 visibility 체크
    // ========================================
    if (exercise.id === 'squat') {
      // 스쿼트: hip, knee, ankle 모두 확인 (각도 계산에 필요)
      // 왼쪽: hip(23), knee(25), ankle(27)
      // 오른쪽: hip(24), knee(26), ankle(28)
      const leftHipVis = landmarks[23]?.visibility ?? 0;
      const leftKneeVis = landmarks[25]?.visibility ?? 0;
      const leftAnkleVis = landmarks[27]?.visibility ?? 0;
      const rightHipVis = landmarks[24]?.visibility ?? 0;
      const rightKneeVis = landmarks[26]?.visibility ?? 0;
      const rightAnkleVis = landmarks[28]?.visibility ?? 0;

      // 한쪽이라도 모든 관절이 보이면 OK
      const leftLegVisible = leftHipVis > 0.5 && leftKneeVis > 0.5 && leftAnkleVis > 0.5;
      const rightLegVisible = rightHipVis > 0.5 && rightKneeVis > 0.5 && rightAnkleVis > 0.5;

      if (!leftLegVisible && !rightLegVisible) {
        setShowJointWarning(true);
        return; // visibility가 낮으면 동작 감지 무시
      } else {
        setShowJointWarning(false);
      }
    } else if (exercise.id === 'knee-lift') {
      // 무릎 들어올리기: shoulder, hip, knee 확인 (hip 각도 계산에 필요)
      // 왼쪽: shoulder(11), hip(23), knee(25)
      // 오른쪽: shoulder(12), hip(24), knee(26)
      const leftShoulderVis = landmarks[11]?.visibility ?? 0;
      const leftHipVis = landmarks[23]?.visibility ?? 0;
      const leftKneeVis = landmarks[25]?.visibility ?? 0;
      const rightShoulderVis = landmarks[12]?.visibility ?? 0;
      const rightHipVis = landmarks[24]?.visibility ?? 0;
      const rightKneeVis = landmarks[26]?.visibility ?? 0;

      // 한쪽이라도 모든 관절이 보이면 OK
      const leftVisible = leftShoulderVis > 0.5 && leftHipVis > 0.5 && leftKneeVis > 0.5;
      const rightVisible = rightShoulderVis > 0.5 && rightHipVis > 0.5 && rightKneeVis > 0.5;

      if (!leftVisible && !rightVisible) {
        setShowJointWarning(true);
        return;
      } else {
        setShowJointWarning(false);
      }
    } else if (exercise.countingJoint === 'knee') {
      // 기타 knee 운동: 무릎만 확인
      const leftKnee = landmarks[25];
      const rightKnee = landmarks[26];
      const leftKneeVis = leftKnee?.visibility ?? 0;
      const rightKneeVis = rightKnee?.visibility ?? 0;

      if (leftKneeVis < 0.5 && rightKneeVis < 0.5) {
        setShowJointWarning(true);
        return;
      } else {
        setShowJointWarning(false);
      }
    } else {
      setShowJointWarning(false);
    }

    // ========================================
    // 캘리브레이션 중: baseline 샘플 수집
    // ========================================
    if (!isCalibrationCompleteRef.current && !isPausedRef.current) {
      const value = getMeasurementValue(landmarks);
      if (value !== null) {
        baselineSamplesRef.current.push(value);
      }

      // neck-side-stretch 전용: nose.x baseline 샘플 수집
      if (exercise.id === 'neck-side-stretch') {
        const nose = landmarks[0];
        if (nose && (nose.visibility ?? 0) > 0.5) {
          neckBaselineSamplesRef.current.push(nose.x);
        }
      }

      return; // 캘리브레이션 중에는 동작 감지 안 함
    }

    // 반복 감지
    detectRepetition(landmarks);
  };

  // ========================================
  // 초기화 단계 처리 (음성 타이밍 관리)
  // ========================================

  // announcing 단계: "기본 자세를 잡으세요" 음성
  useEffect(() => {
    if (initPhase !== 'announcing') return;

    setFeedback('기본 자세를 잡으세요');
    setFeedbackType('info');
    speak('기본 자세를 잡으세요');

    // 음성 후 3초 대기 → 카운트다운 시작
    const timer = setTimeout(() => {
      setInitPhase('countdown');
      setReadyCountdown(3);
    }, 3000);

    return () => clearTimeout(timer);
  }, [initPhase, speak]);

  // countdown 단계: 3, 2, 1 카운트다운 (캘리브레이션 샘플 수집)
  useEffect(() => {
    if (initPhase !== 'countdown') return;

    setFeedback('준비');
    setFeedbackType('info');

    // 즉시 "3" 음성 재생
    speak('3');

    const timer = setInterval(() => {
      setReadyCountdown((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(timer);

          // 캘리브레이션 완료: baseline 계산
          const samples = baselineSamplesRef.current;
          if (samples.length > 0) {
            const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
            baselineRef.current = avg;
            devStateLog('캘리브레이션', '완료', { baseline: avg.toFixed(3), samples: samples.length });
          } else {
            // 샘플이 없으면 기본값 사용
            baselineRef.current = 0.5;
            devStateLog('캘리브레이션', '샘플 없음 - 기본값 사용');
          }

          // neck-side-stretch 전용: nose.x baseline 계산
          if (exercise.id === 'neck-side-stretch') {
            const neckSamples = neckBaselineSamplesRef.current;
            if (neckSamples.length > 0) {
              const neckAvg = neckSamples.reduce((a, b) => a + b, 0) / neckSamples.length;
              neckBaselineXRef.current = neckAvg;
              devStateLog('목스트레칭 캘리브레이션', '완료', { baseline: neckAvg.toFixed(3), samples: neckSamples.length });
            } else {
              neckBaselineXRef.current = 0.5;
              devStateLog('목스트레칭 캘리브레이션', '샘플 없음 - 기본값 사용');
            }
          }

          setInitPhase('starting');
          return 0;
        }
        // "2", "1" 음성 재생
        speak(String(next));
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [initPhase, speak]);

  // starting 단계: "운동을 시작합니다" 음성 → 2초 대기 → 운동 시작
  useEffect(() => {
    if (initPhase !== 'starting') return;

    setFeedback('운동을 시작합니다!');
    setFeedbackType('success');
    speak('운동을 시작합니다');

    // 음성 후 2초 대기 → 운동 시작
    const timer = setTimeout(() => {
      isCalibrationCompleteRef.current = true;
      setInitPhase('done');
    }, 2000);

    return () => clearTimeout(timer);
  }, [initPhase, speak]);

  // ========================================
  // MediaPipe 초기화
  // ========================================

  useEffect(() => {
    let isMounted = true;

    const initMediaPipe = async () => {
      try {
        // ========================================
        // 카메라 스트림 시작 - 세로형(9:16) 해상도
        // ========================================
        // 전신이 잘 보이도록 세로형 비율 사용
        // - width: 720, height: 1280 (9:16 비율)
        // - aspectRatio: 9/16으로 세로형 강제
        // - 브라우저가 지원하지 않으면 ideal 값으로 fallback
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 720 },
            height: { ideal: 1280 },
            aspectRatio: { ideal: 9 / 16 },
          },
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // MediaPipe Pose 동적 로드
        const { Pose } = await import('@mediapipe/pose');
        const { Camera } = await import('@mediapipe/camera_utils');

        if (!isMounted) return;

        // Pose 인스턴스 생성
        const pose = new Pose({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        // 결과 콜백 설정 (ref를 통해 최신 핸들러 호출)
        pose.onResults((results: PoseResults) => {
          if (onResultsRef.current) {
            onResultsRef.current(results);
          }
        });

        poseRef.current = pose as PoseInstance;

        // ========================================
        // 카메라 시작 - 세로형(9:16) 해상도
        // ========================================
        // MediaPipe Camera 유틸리티도 세로형으로 설정
        // - width: 720, height: 1280 (캔버스와 동일)
        // - 전신 추적에 최적화된 비율
        if (videoRef.current) {
          const camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (poseRef.current && videoRef.current && !isPausedRef.current) {
                await poseRef.current.send({ image: videoRef.current });
              }
            },
            width: 720,
            height: 1280,
          });

          cameraRef.current = camera as CameraInstance;
          await camera.start();
        }

        if (isMounted) {
          setIsLoading(false);
          // 1초 대기 후 음성 재생 시작
          setTimeout(() => {
            setInitPhase('announcing');
          }, 1000);
        }
      } catch (error) {
        console.error('MediaPipe 초기화 실패:', error);
        if (isMounted) {
          setFeedback('카메라를 시작할 수 없습니다');
          setFeedbackType('error');
          setIsLoading(false);
        }
      }
    };

    initMediaPipe();

    // Cleanup
    return () => {
      isMounted = false;

      // Camera 중지
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }

      // Pose 인스턴스 닫기
      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }

      // MediaStream 트랙 중지
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // 음성 합성 취소
      speechSynthesis.cancel();
    };
  }, [speak]);

  // ========================================
  // 일시정지/재개
  // ========================================

  const togglePause = useCallback(() => {
    isPausedRef.current = !isPausedRef.current;
    setIsPaused(isPausedRef.current);

    if (isPausedRef.current) {
      speak('일시정지');
      setFeedback('일시정지됨');
      setFeedbackType('info');
    } else {
      speak('운동을 재개합니다');
      setFeedback('운동 재개!');
      setFeedbackType('info');
    }
  }, [speak]);

  // ========================================
  // 취소
  // ========================================

  const handleCancel = useCallback(() => {
    if (confirm('운동을 종료하시겠습니까?')) {
      speechSynthesis.cancel();
      onCancel();
    }
  }, [onCancel]);

  // ========================================
  // 음소거 토글
  // ========================================

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // ========================================
  // 렌더링
  // ========================================

  const progressPercent = (currentRep / exercise.reps) * 100;
  const setProgressPercent = ((currentSet - 1) / exercise.sets) * 100 +
    (progressPercent / exercise.sets);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* 카메라 영역 - 고정 높이로 휴식 중에도 비율 유지 */}
      <div className="h-[50vh] flex items-center justify-center shrink-0">
        <div className="relative h-full aspect-[9/16] overflow-hidden rounded-lg">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
            playsInline
            muted
          />

          <canvas
            ref={canvasRef}
            width={720}
            height={1280}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* 로딩 오버레이 */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 flex items-center justify-center"
              >
                <div className="text-white text-center">
                  <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-lg font-medium">카메라 준비 중...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 상단 헤더 */}
          <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-white text-lg font-bold">{exercise.name}</h2>
                <p className="text-white/70 text-xs">{exercise.description}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* 포즈 미감지 경고 */}
          {!isLoading && !poseDetected && (
            <div className="absolute bottom-2 left-2 right-2">
              <Card className="bg-yellow-500/90 border-0">
                <CardContent className="p-2 text-center">
                  <p className="text-white text-xs font-medium">
                    카메라에 전신이 보이도록 위치를 조정해주세요
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 관절 visibility 경고 */}
          {!isLoading && poseDetected && showJointWarning && (
            <div className="absolute bottom-2 left-2 right-2">
              <Card className="bg-orange-500/90 border-0">
                <CardContent className="p-2 text-center">
                  <p className="text-white text-xs font-medium">
                    {exercise.id === 'squat' || exercise.id === 'knee-lift'
                      ? '하체가 보이도록 카메라 위치를 조정해주세요'
                      : '무릎이 보이도록 카메라 위치를 조정해주세요'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* 피드백 배너 (카메라 아래, 카드 위) */}
      <div className="px-4 py-2">
        <motion.div
          key={feedback + (initPhase === 'countdown' ? readyCountdown : '')}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center py-3 px-6 rounded-2xl ${
            feedbackType === 'success'
              ? 'bg-green-500'
              : feedbackType === 'warning'
                ? 'bg-orange-500'
                : feedbackType === 'error'
                  ? 'bg-red-500'
                  : 'bg-blue-500'
          }`}
        >
          {/* 카운트다운 중일 때는 큰 숫자 표시 */}
          {initPhase === 'countdown' ? (
            <div className="flex items-center justify-center gap-3">
              <span className="text-white text-lg">{feedback}</span>
              <span className="text-white text-3xl font-bold">{readyCountdown}</span>
            </div>
          ) : (
            <p className="text-white text-lg font-bold">{feedback}</p>
          )}
        </motion.div>
      </div>

      {/* 하단 정보 패널 */}
      <div className="bg-black/80 p-4 pb-8">
        {/* 세트/횟수 표시 */}
        <Card className="mb-4 bg-white/95 backdrop-blur">
          <CardContent className="p-4">
            {isResting ? (
              // 휴식 중 표시
              <div className="text-center">
                <p className="text-gray-500 text-sm mb-2">휴식 중</p>
                <motion.p
                  key={restTime}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-5xl font-bold text-blue-600"
                >
                  {restTime}
                  <span className="text-2xl text-gray-400 ml-1">초</span>
                </motion.p>
              </div>
            ) : (
              // 운동 중 표시
              <>
                <div className="flex justify-around text-center mb-4">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">세트</p>
                    <p className="text-3xl font-bold">
                      {currentSet}
                      <span className="text-gray-400 text-lg">/{exercise.sets}</span>
                    </p>
                  </div>
                  <div className="w-px bg-gray-200" />
                  <div>
                    <p className="text-gray-500 text-xs mb-1">횟수</p>
                    <p className="text-3xl font-bold">
                      {currentRep}
                      <span className="text-gray-400 text-lg">/{exercise.reps}</span>
                    </p>
                  </div>
                </div>

                {/* 진행률 바 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>현재 세트 진행률</span>
                    <span>{Math.round(progressPercent)}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 자세 포인트 표시 */}
        {!isResting && (
          <Card className="mb-4 bg-white/10 border-white/20">
            <CardContent className="p-3">
              <p className="text-white/70 text-xs mb-2">자세 포인트</p>
              <div className="flex flex-wrap gap-2">
                {exercise.keyPoints.map((point, idx) => (
                  <span
                    key={idx}
                    className="text-xs text-white bg-white/20 px-2 py-1 rounded-full"
                  >
                    {point}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 컨트롤 버튼 */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-14 bg-white hover:bg-gray-100 border-0"
            onClick={togglePause}
          >
            {isPaused ? (
              <>
                <Play className="w-5 h-5 mr-2" />
                재개
              </>
            ) : (
              <>
                <Pause className="w-5 h-5 mr-2" />
                일시정지
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 bg-white hover:bg-gray-100 border-0"
            onClick={toggleMute}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* 전체 진행률 */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-white/60 mb-1">
            <span>전체 진행률</span>
            <span>{Math.round(setProgressPercent)}%</span>
          </div>
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-green-500"
              animate={{ width: `${setProgressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
