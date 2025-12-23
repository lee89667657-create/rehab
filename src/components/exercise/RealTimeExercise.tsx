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
  const lastSpeakTimeRef = useRef(0);
  const lastSpokenTextRef = useRef('');

  // 운동 시작 시간
  const startTimeRef = useRef(Date.now());
  const repsPerSetRef = useRef<number[]>([]);

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

  // ========================================
  // 음성 피드백 함수
  // ========================================

  /**
   * 음성 피드백 재생
   * - 음소거 상태면 무시
   * - 동일 문장 연속 재생 방지 (500ms 쿨다운)
   * - 새 음성 재생 전 기존 음성 취소
   */
  const speak = useCallback((text: string) => {
    if (isMuted) return;

    const now = Date.now();
    // 같은 문장을 500ms 내에 다시 말하지 않음
    if (text === lastSpokenTextRef.current && now - lastSpeakTimeRef.current < 500) {
      return;
    }

    // 기존 음성 큐 취소
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    speechSynthesis.speak(utterance);

    lastSpeakTimeRef.current = now;
    lastSpokenTextRef.current = text;
  }, [isMuted]);

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
  // 반복 동작 감지
  // ========================================

  /**
   * 반복 동작 감지 및 카운팅
   *
   * Hysteresis 방식:
   * 1. ready/up 상태에서 값이 thresholdDown을 초과하면 -> down 상태
   * 2. down 상태에서 값이 thresholdUp 미만이면 -> up 상태 (1회 카운트)
   *
   * Cooldown 적용:
   * - 마지막 카운트로부터 countingCooldown(기본 300ms) 경과 후에만 카운트
   */
  const detectRepetition = useCallback((
    landmarks: Array<{ x: number; y: number; visibility?: number }>
  ) => {
    // 일시정지 또는 휴식 중이면 무시
    if (isPausedRef.current || isRestingRef.current) return;

    // 관절 좌표 추출
    const value = getJointValue(
      landmarks,
      exercise.countingJoint,
      exercise.countingAxis,
      exercise.mirrorMode
    );

    if (value === null) return;

    const now = Date.now();
    const cooldown = exercise.countingCooldown ?? 300;
    const phase = repPhaseRef.current;

    // 상태 머신 기반 반복 감지
    if (phase === 'ready' || phase === 'up') {
      // down 상태로 전환 체크
      if (value > exercise.thresholdDown) {
        repPhaseRef.current = 'down';
        setFeedback('좋아요! 유지하세요');
        setFeedbackType('success');
      }
    } else if (phase === 'down') {
      // up 상태로 전환 체크 (쿨다운 적용)
      if (value < exercise.thresholdUp && now - lastCountTimeRef.current > cooldown) {
        repPhaseRef.current = 'up';
        lastCountTimeRef.current = now;

        // 카운트 증가
        const newRep = currentRepRef.current + 1;
        currentRepRef.current = newRep;
        setCurrentRep(newRep);

        // 피드백
        setFeedback(`${newRep}회 완료!`);
        setFeedbackType('success');

        // 5회마다 음성 피드백
        if (newRep % 5 === 0) {
          speak(`${newRep}회`);
        }

        // 세트 완료 체크
        if (newRep >= exercise.reps) {
          completeSet();
        }
      }
    }
  }, [exercise, speak]);

  // ========================================
  // 세트 완료 처리
  // ========================================

  const completeSet = useCallback(() => {
    const completedReps = currentRepRef.current;
    repsPerSetRef.current = [...repsPerSetRef.current, completedReps];

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
  }, [exercise, speak]);

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

          speak('다음 세트 시작!');
          setFeedback('다음 세트 준비!');
          setFeedbackType('info');

          return 0;
        }

        setFeedback(`휴식 중... ${prev - 1}초`);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isResting, restTime, speak]);

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
      return;
    }

    setPoseDetected(true);
    const landmarks = results.poseLandmarks;

    // 스켈레톤 그리기
    drawSkeleton(landmarks);

    // 반복 감지
    detectRepetition(landmarks);
  };

  // ========================================
  // MediaPipe 초기화
  // ========================================

  useEffect(() => {
    let isMounted = true;

    const initMediaPipe = async () => {
      try {
        // 카메라 스트림 시작
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
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

        // 카메라 시작
        if (videoRef.current) {
          const camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (poseRef.current && videoRef.current && !isPausedRef.current) {
                await poseRef.current.send({ image: videoRef.current });
              }
            },
            width: 640,
            height: 480,
          });

          cameraRef.current = camera as CameraInstance;
          await camera.start();
        }

        if (isMounted) {
          setIsLoading(false);
          speak('운동을 시작합니다');
          setFeedback('카메라에 전신이 보이도록 서주세요');
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
      {/* 비디오 레이어 */}
      <div className="relative flex-1">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }} // 셀피 미러링
          playsInline
          muted
        />

        {/* 스켈레톤 캔버스 */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }} // 비디오와 동일하게 미러링
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
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-white text-xl font-bold">{exercise.name}</h2>
              <p className="text-white/70 text-sm">{exercise.description}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="text-white hover:bg-white/20 h-10 w-10"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* 피드백 영역 */}
        <div className="absolute top-1/3 left-4 right-4">
          <motion.div
            key={feedback}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-center py-4 px-6 rounded-2xl backdrop-blur-sm ${
              feedbackType === 'success'
                ? 'bg-green-500/80'
                : feedbackType === 'warning'
                  ? 'bg-orange-500/80'
                  : feedbackType === 'error'
                    ? 'bg-red-500/80'
                    : 'bg-blue-500/80'
            }`}
          >
            <p className="text-white text-xl font-bold">{feedback}</p>
          </motion.div>
        </div>

        {/* 포즈 미감지 경고 */}
        {!isLoading && !poseDetected && (
          <div className="absolute bottom-48 left-4 right-4">
            <Card className="bg-yellow-500/90 border-0">
              <CardContent className="p-3 text-center">
                <p className="text-white text-sm font-medium">
                  카메라에 전신이 보이도록 위치를 조정해주세요
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* 하단 정보 패널 */}
      <div className="bg-gradient-to-t from-black/90 to-black/70 p-4 pb-8">
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
