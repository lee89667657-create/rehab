/**
 * TimerExercise.tsx
 * 타이머 기반 운동 컴포넌트
 *
 * MediaPipe Pose로 자세를 표시하면서 타이머 기반으로 운동을 진행합니다.
 * 동작이 미세하여 카메라 인식이 어려운 운동에 적합합니다.
 *
 * ## 주요 기능
 * - 실시간 포즈 감지 및 스켈레톤 렌더링 (자세 확인용)
 * - holdTime 초 카운트다운 타이머
 * - 세트/휴식 관리
 * - 음성 피드백 ("시작", "5초", "4초"... "완료")
 * - 운동 결과 저장
 */

'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, X, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  type TimerExercise as TimerExerciseType,
  type ExerciseResult,
  saveExerciseResult,
} from '@/lib/exerciseData';

// ============================================================
// 타입 정의
// ============================================================

interface TimerExerciseProps {
  /** 수행할 운동 데이터 */
  exercise: TimerExerciseType;
  /** 운동 완료 시 호출되는 콜백 */
  onComplete: (result: ExerciseResult) => void;
  /** 운동 취소 시 호출되는 콜백 */
  onCancel: () => void;
}

/** 운동 단계 */
type ExercisePhase = 'ready' | 'holding' | 'resting' | 'completed';

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

export default function TimerExercise({
  exercise,
  onComplete,
  onCancel,
}: TimerExerciseProps) {
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
  const phaseRef = useRef<ExercisePhase>('ready');
  const currentSetRef = useRef(1);

  // 운동 시작 시간
  const startTimeRef = useRef(Date.now());

  // ========================================
  // State - UI 렌더링용
  // ========================================

  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const [phase, setPhase] = useState<ExercisePhase>('ready');
  const [currentSet, setCurrentSet] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(exercise.holdTime);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);

  const [feedback, setFeedback] = useState('준비하세요');
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('info');

  const [poseDetected, setPoseDetected] = useState(false);

  // 초기화 단계 상태
  const [initPhase, setInitPhase] = useState<'loading' | 'announcing' | 'countdown' | 'starting' | 'done'>('loading');

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
  }, []);

  // ========================================
  // 세트 완료 처리
  // ========================================

  const completeSet = useCallback(() => {
    if (currentSetRef.current >= exercise.sets) {
      // 모든 세트 완료
      phaseRef.current = 'completed';
      setPhase('completed');
      finishExercise();
    } else {
      // 휴식 안내 음성 후 휴식 타이머 시작
      setFeedback(`휴식하세요`);
      setFeedbackType('info');

      // 음성 후 2초 대기 후 휴식 타이머 시작
      speak('휴식하세요');
      setTimeout(() => {
        phaseRef.current = 'resting';
        setPhase('resting');
        setRestTimeRemaining(exercise.restTime);
        setFeedback(`휴식 중... ${exercise.restTime}초`);
      }, 2000);
    }
  }, [exercise, speak]);

  // ========================================
  // 운동 종료
  // ========================================

  const finishExercise = useCallback(() => {
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);

    speak('운동을 완료했습니다. 수고하셨습니다!');

    const result: ExerciseResult = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      completedSets: currentSetRef.current,
      completedReps: Array(currentSetRef.current).fill(1), // 타이머 운동은 세트당 1회
      totalReps: currentSetRef.current,
      accuracy: 100, // 타이머 기반이므로 100%
      duration,
      date: new Date().toISOString(),
    };

    // localStorage에 저장
    saveExerciseResult(result);

    // 콜백 호출
    onComplete(result);
  }, [exercise, speak, onComplete]);

  // ========================================
  // 초기화 단계 처리 (음성 타이밍 관리)
  // ========================================
  // 플로우: loading → announcing → countdown → starting → done
  // 1. loading: 카메라 로딩 중
  // 2. announcing: "기본 자세를 잡으세요" 음성 (3초 대기)
  // 3. countdown: 3, 2, 1 카운트다운
  // 4. starting: "운동을 시작합니다" 음성 (2초 대기)
  // 5. done: 운동 시작

  const [readyCountdown, setReadyCountdown] = useState(3);

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

  // countdown 단계: 3, 2, 1 카운트다운
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
      setInitPhase('done');
      phaseRef.current = 'holding';
      setPhase('holding');
      setTimeRemaining(exercise.holdTime);
    }, 2000);

    return () => clearTimeout(timer);
  }, [initPhase, speak, exercise.holdTime]);

  // ========================================
  // 홀딩 타이머 (운동 중)
  // ========================================

  useEffect(() => {
    // 이미 완료된 경우 타이머 시작하지 않음
    if (phase !== 'holding' || isPaused || timeRemaining <= 0) return;

    // 첫 번째 카운트는 즉시 피드백 및 음성 재생
    if (timeRemaining === exercise.holdTime) {
      setFeedback(`${timeRemaining}초 유지`);
      setFeedbackType('success');
      if (timeRemaining <= 5) {
        speak(String(timeRemaining));
      }
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1;

        if (next <= 0) {
          clearInterval(timer);
          // "완료" 음성 후 1초 대기 후 세트 완료 처리
          speak('완료');
          setTimeout(() => {
            completeSet();
          }, 1000);
          setFeedback('완료!');
          return 0;
        }

        // 5초 이하일 때 카운트다운 음성 (화면과 동시에)
        if (next <= 5) {
          speak(String(next));
        }

        setFeedback(`${next}초 남음`);
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, isPaused, timeRemaining, exercise.holdTime, speak, completeSet]);

  // ========================================
  // 휴식 타이머
  // ========================================

  useEffect(() => {
    if (phase !== 'resting' || restTimeRemaining <= 0) return;

    const timer = setInterval(() => {
      setRestTimeRemaining((prev) => {
        const next = prev - 1;

        if (next <= 0) {
          clearInterval(timer);

          // 다음 세트 시작
          currentSetRef.current += 1;
          setCurrentSet(currentSetRef.current);

          // 다음 세트: 초기화 단계로 돌아감
          phaseRef.current = 'ready';
          setPhase('ready');
          setInitPhase('announcing');  // announcing부터 다시 시작

          return 0;
        }

        setFeedback(`휴식 중... ${next}초`);
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, restTimeRemaining, speak]);

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
  };

  // ========================================
  // MediaPipe 초기화
  // ========================================

  useEffect(() => {
    let isMounted = true;

    const initMediaPipe = async () => {
      try {
        // 카메라 스트림 시작 - 세로형(9:16) 해상도
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

  const holdProgressPercent = phase === 'holding'
    ? ((exercise.holdTime - timeRemaining) / exercise.holdTime) * 100
    : phase === 'ready'
      ? 0
      : 100;

  const setProgressPercent = ((currentSet - 1) / exercise.sets) * 100 +
    (holdProgressPercent / exercise.sets);

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
                className="text-white hover:bg-card/20 h-8 w-8"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* 포즈 미감지 경고 */}
          {!isLoading && !poseDetected && (
            <div className="absolute bottom-2 left-2 right-2">
              <Card className="bg-yellow-500/100/90 border-0">
                <CardContent className="p-2 text-center">
                  <p className="text-white text-xs font-medium">
                    카메라에 전신이 보이도록 위치를 조정해주세요
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
              ? 'bg-green-500/100'
              : feedbackType === 'warning'
                ? 'bg-orange-500'
                : feedbackType === 'error'
                  ? 'bg-red-500/100'
                  : 'bg-blue-500/100'
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
        {/* 세트/타이머 표시 */}
        <Card className="mb-4 bg-card/95 backdrop-blur">
          <CardContent className="p-4">
            {phase === 'resting' ? (
              // 휴식 중 표시
              <div className="text-center">
                <p className="text-muted-foreground text-sm mb-2">휴식 중</p>
                <motion.p
                  key={restTimeRemaining}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-5xl font-bold text-blue-600"
                >
                  {restTimeRemaining}
                  <span className="text-2xl text-muted-foreground ml-1">초</span>
                </motion.p>
              </div>
            ) : (
              // 운동 중 표시
              <>
                <div className="flex justify-around text-center mb-4">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">세트</p>
                    <p className="text-3xl font-bold">
                      {currentSet}
                      <span className="text-muted-foreground text-lg">/{exercise.sets}</span>
                    </p>
                  </div>
                  <div className="w-px bg-muted" />
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">남은 시간</p>
                    <motion.p
                      key={timeRemaining}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      className={`text-3xl font-bold ${phase === 'holding' ? 'text-green-600' : 'text-gray-900'}`}
                    >
                      {phase === 'holding' ? timeRemaining : exercise.holdTime}
                      <span className="text-muted-foreground text-lg">초</span>
                    </motion.p>
                  </div>
                </div>

                {/* 진행률 바 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>현재 세트 진행률</span>
                    <span>{Math.round(holdProgressPercent)}%</span>
                  </div>
                  <Progress value={holdProgressPercent} className="h-2" />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 자세 포인트 표시 */}
        {phase !== 'resting' && (
          <Card className="mb-4 bg-card/10 border-white/20">
            <CardContent className="p-3">
              <p className="text-white/70 text-xs mb-2">자세 포인트</p>
              <div className="flex flex-wrap gap-2">
                {exercise.keyPoints.map((point, idx) => (
                  <span
                    key={idx}
                    className="text-xs text-white bg-card/20 px-2 py-1 rounded-full"
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
            disabled={phase === 'ready'}
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
            className="h-14 w-14 bg-card hover:bg-accent border-0"
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
          <div className="h-1 bg-card/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-green-500/100"
              animate={{ width: `${setProgressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
