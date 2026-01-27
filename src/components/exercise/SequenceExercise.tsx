/**
 * SequenceExercise.tsx
 * 시퀀스 운동 컴포넌트 (Y-T-W 같은 연속 자세 운동)
 *
 * MediaPipe Pose로 자세를 감지하고, 정해진 순서대로 자세를 수행합니다.
 *
 * ## 주요 기능
 * - 실시간 포즈 감지 및 스켈레톤 렌더링
 * - 자세 감지 (Y, T, W 등)
 * - holdTime 동안 유지 체크
 * - 세트/사이클/휴식 관리
 * - 음성 피드백
 * - 운동 결과 저장
 */

'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, X, Volume2, VolumeX, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  type SequenceExercise as SequenceExerciseType,
  type ExerciseResult,
  type PoseDefinition,
  detectCurrentPose,
  saveExerciseResult,
} from '@/lib/exerciseData';
import { recordExercise } from '@/lib/streakSystem';

// ============================================================
// 타입 정의
// ============================================================

interface SequenceExerciseProps {
  /** 수행할 운동 데이터 */
  exercise: SequenceExerciseType;
  /** 운동 완료 시 호출되는 콜백 */
  onComplete: (result: ExerciseResult) => void;
  /** 운동 취소 시 호출되는 콜백 */
  onCancel: () => void;
}

/** 운동 상태 */
type ExerciseState = 'ready' | 'countdown' | 'exercising' | 'resting' | 'completed';

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
// 스켈레톤 연결선 정의 (상체 위주)
// ============================================================

const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], // 어깨
  [11, 13], // 왼쪽 팔꿈치
  [13, 15], // 왼쪽 손목
  [12, 14], // 오른쪽 팔꿈치
  [14, 16], // 오른쪽 손목
  [11, 23], // 왼쪽 몸통
  [12, 24], // 오른쪽 몸통
  [23, 24], // 골반
];

// ============================================================
// 메인 컴포넌트
// ============================================================

export default function SequenceExercise({
  exercise,
  onComplete,
  onCancel,
}: SequenceExerciseProps) {
  // ========================================
  // Refs - MediaPipe 인스턴스
  // ========================================

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<PoseInstance | null>(null);
  const cameraRef = useRef<CameraInstance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // React state stale 문제 방지를 위한 refs
  const isPausedRef = useRef(false);
  const exerciseStateRef = useRef<ExerciseState>('ready');
  const currentSetRef = useRef(1);
  const cyclesInSetRef = useRef(0);
  const currentPoseIndexRef = useRef(0);
  const poseHoldStartRef = useRef<number | null>(null);

  // 운동 시작 시간
  const startTimeRef = useRef(Date.now());
  const completedCyclesRef = useRef<number[]>([]);

  // ========================================
  // State - UI 렌더링용
  // ========================================

  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const [exerciseState, setExerciseState] = useState<ExerciseState>('ready');
  const [currentSet, setCurrentSet] = useState(1);
  const [cyclesInSet, setCyclesInSet] = useState(0);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);

  const [detectedPose, setDetectedPose] = useState<string | null>(null);
  const [poseProgress, setPoseProgress] = useState(0);
  const [restTime, setRestTime] = useState(0);

  const [feedback, setFeedback] = useState('준비하세요');
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('info');

  const [poseDetected, setPoseDetected] = useState(false);

  // 초기화 단계 상태
  const [countdownValue, setCountdownValue] = useState(3);

  // 디버그용 랜드마크 값
  const [debugLandmarks, setDebugLandmarks] = useState<{
    wristL: { x: number; y: number } | null;
    wristR: { x: number; y: number } | null;
    elbowL: { x: number; y: number } | null;
    elbowR: { x: number; y: number } | null;
    wristAvgY: number | null;
    elbowAvgY: number | null;
  }>({
    wristL: null,
    wristR: null,
    elbowL: null,
    elbowR: null,
    wristAvgY: null,
    elbowAvgY: null,
  });

  // 현재 목표 자세
  const targetPose: PoseDefinition = exercise.poses[currentPoseIndex] || exercise.poses[0];

  // ========================================
  // 음성 피드백 함수
  // ========================================

  const speak = useCallback((text: string) => {
    if (isMuted) return;

    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    speechSynthesis.speak(utterance);
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

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 연결선 그리기
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    POSE_CONNECTIONS.forEach(([i, j]) => {
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

    // 손목 강조 (Y-T-W 감지에 중요)
    const wristIndices = [15, 16];
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;

    wristIndices.forEach((idx) => {
      const lm = landmarks[idx];
      if (lm && (lm.visibility ?? 0) > 0.5) {
        ctx.beginPath();
        ctx.arc(
          lm.x * canvas.width,
          lm.y * canvas.height,
          10,
          0,
          2 * Math.PI
        );
        ctx.fill();
        ctx.stroke();
      }
    });
  }, []);

  // ========================================
  // 자세 처리 함수
  // ========================================

  const processPose = useCallback((landmarks: PoseLandmark[]) => {
    if (isPausedRef.current) return;
    if (exerciseStateRef.current !== 'exercising') return;

    // 현재 자세 감지
    const detected = detectCurrentPose(landmarks, exercise.poses);

    if (detected) {
      setDetectedPose(detected.poseName);
    } else {
      setDetectedPose(null);
    }

    const targetPoseIndex = currentPoseIndexRef.current;
    const currentTarget = exercise.poses[targetPoseIndex];

    // 목표 자세와 일치하는지 확인
    if (detected && detected.poseIndex === targetPoseIndex) {
      // 유지 시작 시간 기록
      if (poseHoldStartRef.current === null) {
        poseHoldStartRef.current = Date.now();
        setFeedback(`${currentTarget.name} 자세 유지!`);
        setFeedbackType('success');
      }

      // 유지 시간 체크
      const holdDuration = Date.now() - poseHoldStartRef.current;
      const holdTimeMs = currentTarget.holdTime * 1000;
      const progress = Math.min(100, (holdDuration / holdTimeMs) * 100);
      setPoseProgress(progress);

      if (holdDuration >= holdTimeMs) {
        // 자세 완료!
        poseHoldStartRef.current = null;
        setPoseProgress(0);

        const nextPoseIndex = targetPoseIndex + 1;

        if (nextPoseIndex >= exercise.poses.length) {
          // 한 사이클 완료 (Y→T→W 완료)
          const newCyclesInSet = cyclesInSetRef.current + 1;
          cyclesInSetRef.current = newCyclesInSet;
          setCyclesInSet(newCyclesInSet);

          currentPoseIndexRef.current = 0;
          setCurrentPoseIndex(0);

          speak('한 사이클 완료!');
          setFeedback('한 사이클 완료!');
          setFeedbackType('success');

          if (newCyclesInSet >= exercise.cycles) {
            // 세트 완료
            completeSet();
          } else {
            // 다음 사이클
            setTimeout(() => {
              const nextPose = exercise.poses[0];
              speak(`${nextPose.name} 자세를 만드세요`);
              setFeedback(`${nextPose.name} 자세를 만드세요`);
              setFeedbackType('info');
            }, 1000);
          }
        } else {
          // 다음 자세로
          currentPoseIndexRef.current = nextPoseIndex;
          setCurrentPoseIndex(nextPoseIndex);

          const nextPose = exercise.poses[nextPoseIndex];
          speak(`${nextPose.name} 자세로 바꾸세요`);
          setFeedback(`${nextPose.name} 자세로 바꾸세요`);
          setFeedbackType('info');
        }
      }
    } else {
      // 목표 자세가 아님 - 유지 시간 리셋
      if (poseHoldStartRef.current !== null) {
        poseHoldStartRef.current = null;
        setPoseProgress(0);
      }

      if (detected) {
        setFeedback(`${currentTarget.name} 자세를 만드세요`);
      } else {
        setFeedback(`${currentTarget.name} 자세를 만드세요`);
      }
      setFeedbackType('info');
    }
  }, [exercise, speak]);

  // ========================================
  // 세트 완료 처리
  // ========================================

  const completeSet = useCallback(() => {
    completedCyclesRef.current = [...completedCyclesRef.current, cyclesInSetRef.current];

    if (currentSetRef.current >= exercise.sets) {
      // 모든 세트 완료
      exerciseStateRef.current = 'completed';
      setExerciseState('completed');
      finishExercise();
    } else {
      // 휴식 시작
      speak(`${currentSetRef.current}세트 완료! ${exercise.restTime}초 휴식`);
      setFeedback(`휴식 중... ${exercise.restTime}초`);
      setFeedbackType('info');

      exerciseStateRef.current = 'resting';
      setExerciseState('resting');
      setRestTime(exercise.restTime);
    }
  }, [exercise, speak]);

  // ========================================
  // 운동 종료
  // ========================================

  const finishExercise = useCallback(() => {
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    const totalCycles = completedCyclesRef.current.reduce((a, b) => a + b, 0);

    speak('운동 완료! 수고하셨습니다.');

    // 정확도 계산 (목표 대비 실제 수행률)
    const targetTotal = exercise.sets * exercise.cycles;
    const accuracy = Math.min(100, Math.round((totalCycles / targetTotal) * 100));

    const result: ExerciseResult = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      completedSets: completedCyclesRef.current.length,
      completedReps: completedCyclesRef.current,
      totalReps: totalCycles,
      accuracy,
      duration,
      date: new Date().toISOString(),
    };

    saveExerciseResult(result);

    // Streak 기록 (오늘 운동 완료 체크)
    recordExercise();

    onComplete(result);
  }, [exercise, speak, onComplete]);

  // ========================================
  // 휴식 타이머
  // ========================================

  useEffect(() => {
    if (exerciseState !== 'resting' || restTime <= 0) return;

    const timer = setInterval(() => {
      setRestTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);

          // 다음 세트 시작
          currentSetRef.current += 1;
          setCurrentSet(currentSetRef.current);

          cyclesInSetRef.current = 0;
          setCyclesInSet(0);

          currentPoseIndexRef.current = 0;
          setCurrentPoseIndex(0);

          poseHoldStartRef.current = null;
          setPoseProgress(0);

          // 카운트다운 시작
          exerciseStateRef.current = 'countdown';
          setExerciseState('countdown');
          setCountdownValue(3);

          return 0;
        }

        setFeedback(`휴식 중... ${prev - 1}초`);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [exerciseState, restTime]);

  // ========================================
  // 카운트다운 처리
  // ========================================

  useEffect(() => {
    if (exerciseState !== 'countdown') return;

    speak(String(countdownValue));
    setFeedback(`${countdownValue}`);
    setFeedbackType('info');

    const timer = setInterval(() => {
      setCountdownValue((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(timer);

          // 운동 시작
          exerciseStateRef.current = 'exercising';
          setExerciseState('exercising');

          const firstPose = exercise.poses[0];
          speak(`${firstPose.name} 자세를 만드세요`);
          setFeedback(`${firstPose.name} 자세를 만드세요`);
          setFeedbackType('info');

          return 0;
        }
        speak(String(next));
        setFeedback(`${next}`);
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [exerciseState, speak, exercise.poses]);

  // ========================================
  // MediaPipe 포즈 결과 처리
  // ========================================

  const onResultsRef = useRef<(results: PoseResults) => void>();

  onResultsRef.current = (results: PoseResults) => {
    if (!results.poseLandmarks) {
      setPoseDetected(false);
      return;
    }

    setPoseDetected(true);
    drawSkeleton(results.poseLandmarks);

    // 디버그용 랜드마크 값 업데이트
    const lm = results.poseLandmarks;
    const wristL = lm[15] && (lm[15].visibility ?? 0) > 0.5 ? { x: lm[15].x, y: lm[15].y } : null;
    const wristR = lm[16] && (lm[16].visibility ?? 0) > 0.5 ? { x: lm[16].x, y: lm[16].y } : null;
    const elbowL = lm[13] && (lm[13].visibility ?? 0) > 0.5 ? { x: lm[13].x, y: lm[13].y } : null;
    const elbowR = lm[14] && (lm[14].visibility ?? 0) > 0.5 ? { x: lm[14].x, y: lm[14].y } : null;

    const wristAvgY = wristL && wristR ? (wristL.y + wristR.y) / 2 : (wristL?.y ?? wristR?.y ?? null);
    const elbowAvgY = elbowL && elbowR ? (elbowL.y + elbowR.y) / 2 : (elbowL?.y ?? elbowR?.y ?? null);

    setDebugLandmarks({
      wristL,
      wristR,
      elbowL,
      elbowR,
      wristAvgY,
      elbowAvgY,
    });

    // 운동 중일 때만 자세 처리
    if (exerciseStateRef.current === 'exercising') {
      processPose(results.poseLandmarks);
    }
  };

  // ========================================
  // MediaPipe 초기화
  // ========================================

  useEffect(() => {
    let isMounted = true;

    const initMediaPipe = async () => {
      try {
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

        const { Pose } = await import('@mediapipe/pose');
        const { Camera } = await import('@mediapipe/camera_utils');

        if (!isMounted) return;

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

        pose.onResults((results: PoseResults) => {
          if (onResultsRef.current) {
            onResultsRef.current(results);
          }
        });

        poseRef.current = pose as PoseInstance;

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

          // 안내 음성 후 카운트다운
          setTimeout(() => {
            speak('운동을 시작합니다');
            setFeedback('운동을 시작합니다!');
            setFeedbackType('success');

            setTimeout(() => {
              exerciseStateRef.current = 'countdown';
              setExerciseState('countdown');
              setCountdownValue(3);
            }, 2000);
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

    return () => {
      isMounted = false;

      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }

      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

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
  // 진행률 계산
  // ========================================

  const cycleProgressPercent = (cyclesInSet / exercise.cycles) * 100;
  const setProgressPercent = ((currentSet - 1) / exercise.sets) * 100 +
    (cycleProgressPercent / exercise.sets);

  // ========================================
  // 렌더링
  // ========================================

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* 카메라 영역 */}
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

          {/* 카운트다운 오버레이 */}
          <AnimatePresence>
            {exerciseState === 'countdown' && countdownValue > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 flex items-center justify-center"
              >
                <motion.span
                  key={countdownValue}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  className="text-8xl font-bold text-white"
                >
                  {countdownValue}
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 휴식 오버레이 */}
          <AnimatePresence>
            {exerciseState === 'resting' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 flex items-center justify-center"
              >
                <div className="text-center">
                  <p className="text-white/80 text-lg mb-2">휴식 중</p>
                  <motion.span
                    key={restTime}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className="text-6xl font-bold text-white"
                  >
                    {restTime}
                  </motion.span>
                  <p className="text-white/60 text-sm mt-2">초</p>
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
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20 h-8 w-8"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
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
          </div>

          {/* 포즈 미감지 경고 */}
          {!isLoading && !poseDetected && exerciseState === 'exercising' && (
            <div className="absolute bottom-2 left-2 right-2">
              <Card className="bg-yellow-500/90 border-0">
                <CardContent className="p-2 text-center">
                  <p className="text-white text-xs font-medium">
                    카메라에 상체가 보이도록 위치를 조정해주세요
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 디버그 정보 표시 */}
          {!isLoading && poseDetected && (
            <div className="absolute bottom-2 left-2 right-2">
              <div className="bg-black/80 rounded-lg p-2 text-xs font-mono">
                <div className="text-yellow-400 mb-1">
                  손목 y: <span className="text-white">{debugLandmarks.wristAvgY?.toFixed(2) ?? '-'}</span>
                  {' | '}
                  팔꿈치 y: <span className="text-white">{debugLandmarks.elbowAvgY?.toFixed(2) ?? '-'}</span>
                </div>
                <div className="text-gray-400 text-[10px]">
                  L손목({debugLandmarks.wristL?.y.toFixed(2) ?? '-'})
                  R손목({debugLandmarks.wristR?.y.toFixed(2) ?? '-'})
                  L팔꿈치({debugLandmarks.elbowL?.y.toFixed(2) ?? '-'})
                  R팔꿈치({debugLandmarks.elbowR?.y.toFixed(2) ?? '-'})
                </div>
                <div className="text-cyan-400 text-[10px] mt-1">
                  Y: y&lt;0.50 | T: 0.35~0.75 | W: 0.10~0.60 + 팔꿈치 0.20~0.80
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 피드백 배너 */}
      <div className="px-4 py-2">
        <motion.div
          key={feedback}
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
          <p className="text-white text-lg font-bold">{feedback}</p>
        </motion.div>
      </div>

      {/* 하단 정보 패널 */}
      <div className="flex-1 bg-black/80 p-4 pb-8 overflow-auto">
        {/* 운동 중 UI */}
        {exerciseState === 'exercising' && (
          <>
            {/* 자세 상태 표시 */}
            <Card className="mb-4 bg-card/95 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="text-muted-foreground text-xs">목표 자세</p>
                    <p className="text-2xl font-bold">{targetPose.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-xs">감지된 자세</p>
                    <p className={`text-2xl font-bold ${detectedPose === targetPose.name ? 'text-green-500' : 'text-gray-400'}`}>
                      {detectedPose || '-'}
                    </p>
                  </div>
                </div>

                {/* 자세 유지 진행바 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>자세 유지</span>
                    <span>{Math.round(poseProgress)}%</span>
                  </div>
                  <Progress value={poseProgress} className="h-3" />
                </div>
              </CardContent>
            </Card>

            {/* Y-T-W 순서 표시 */}
            <Card className="mb-4 bg-card/95 backdrop-blur">
              <CardContent className="p-4">
                <p className="text-muted-foreground text-xs mb-3">자세 순서</p>
                <div className="flex justify-around">
                  {exercise.poses.map((pose, idx) => {
                    const isCompleted = idx < currentPoseIndex;
                    const isCurrent = idx === currentPoseIndex;

                    return (
                      <div
                        key={pose.name}
                        className={`flex flex-col items-center ${
                          isCurrent ? 'scale-110' : ''
                        }`}
                      >
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold transition-all ${
                            isCompleted
                              ? 'bg-green-500 text-white'
                              : isCurrent
                                ? 'bg-blue-500 text-white ring-4 ring-blue-500/30'
                                : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-6 h-6" />
                          ) : (
                            pose.name
                          )}
                        </div>
                        <p className={`text-xs mt-1 ${isCurrent ? 'text-white font-medium' : 'text-gray-500'}`}>
                          {pose.description.slice(0, 8)}...
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 세트/사이클 표시 */}
            <Card className="mb-4 bg-card/95 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex justify-around text-center">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">세트</p>
                    <p className="text-2xl font-bold">
                      {currentSet}
                      <span className="text-muted-foreground text-lg">/{exercise.sets}</span>
                    </p>
                  </div>
                  <div className="w-px bg-muted" />
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">사이클</p>
                    <p className="text-2xl font-bold">
                      {cyclesInSet}
                      <span className="text-muted-foreground text-lg">/{exercise.cycles}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* 자세 포인트 표시 */}
        {exerciseState !== 'resting' && (
          <Card className="mb-4 bg-card/10 border-white/20">
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
            className="flex-1 h-14 bg-card hover:bg-accent border-0"
            onClick={togglePause}
            disabled={exerciseState === 'ready' || exerciseState === 'completed'}
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
