/**
 * 운동 플레이어 페이지 - 삼성 헬스케어 스타일
 *
 * 개별 운동을 수행하는 타이머 기반 플레이어입니다.
 * 삼성 헬스케어 디자인 시스템을 적용했습니다.
 *
 * ## 디자인 특징
 * - 삼성 블루 (#1428A0) 포인트 컬러
 * - 순백 배경 (#F8F9FA)
 * - 큰 원형 타이머 (애니메이션 적용)
 * - 미세한 그림자 카드
 * - 부드러운 애니메이션 (duration-300)
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Pause,
  Play,
  SkipForward,
  Home,
  ChevronRight,
  ChevronLeft,
  Info,
  CheckCircle,
  Timer,
  Flame,
} from 'lucide-react';
import {
  getExerciseById,
  getExercisesForProgram,
  type ExerciseData,
} from '@/constants/exercises';
import { useAuth } from '@/components/providers/AuthProvider';
import { saveExerciseRecord, updateDailyRecord } from '@/lib/supabase';
// AppHeader는 SidebarLayout에서 처리됨
import SidebarLayout from '@/components/layout/SidebarLayout';

// ============================================================
// 타입 정의
// ============================================================

type ExerciseState = 'exercising' | 'resting' | 'completed';

// ============================================================
// 유틸리티 함수
// ============================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================
// 컴포넌트: 원형 타이머 - 삼성 스타일
// ============================================================

interface CircularTimerProps {
  current: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  isResting?: boolean;
}

function CircularTimer({
  current,
  total,
  size = 280,
  strokeWidth = 16,
  isResting = false,
}: CircularTimerProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = current / total;
  const offset = circumference - progress * circumference;

  // 삼성 스타일 색상
  const colors = isResting
    ? {
        stroke: '#F59E0B',
        bg: '#FEF3C7',
        glow: 'rgba(245, 158, 11, 0.2)',
      }
    : {
        stroke: '#1428A0',
        bg: '#E8F0FE',
        glow: 'rgba(20, 40, 160, 0.2)',
      };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full blur-3xl opacity-50"
        style={{ backgroundColor: colors.glow }}
      />

      <svg width={size} height={size} className="-rotate-90 relative z-10">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.bg}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.3, ease: 'linear' }}
          style={{
            filter: `drop-shadow(0 4px 12px ${colors.glow})`,
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <motion.span
          key={current}
          initial={{ scale: 1.05, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`text-6xl font-bold tabular-nums ${
            isResting ? 'text-amber-600' : 'text-foreground'
          }`}
        >
          {formatTime(current)}
        </motion.span>
        <span className={`text-sm font-semibold mt-1 ${
          isResting ? 'text-amber-500' : 'text-foreground'
        }`}>
          {isResting ? '휴식 시간' : '운동 중'}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// 컴포넌트: 세트 프로그레스 인디케이터 - 삼성 스타일
// ============================================================

interface SetProgressProps {
  currentSet: number;
  totalSets: number;
}

function SetProgress({ currentSet, totalSets }: SetProgressProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-3 mb-3">
        {Array.from({ length: totalSets }).map((_, i) => {
          const isCompleted = i < currentSet - 1;
          const isCurrent = i === currentSet - 1;

          return (
            <motion.div
              key={i}
              className={`
                w-4 h-4 rounded-full transition-all duration-300
                ${isCompleted
                  ? 'bg-card'
                  : isCurrent
                    ? 'bg-card ring-4 ring-[#E8F0FE]'
                    : 'bg-card'
                }
              `}
              animate={isCurrent ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              {isCompleted && (
                <CheckCircle className="w-4 h-4 text-white" />
              )}
            </motion.div>
          );
        })}
      </div>

      <p className="text-muted-foreground">
        <span className="text-3xl font-bold text-foreground">{currentSet}</span>
        <span className="text-muted-foreground text-lg"> / {totalSets}</span>
        <span className="ml-1 text-sm">세트</span>
      </p>
    </div>
  );
}

// ============================================================
// 메인 컴포넌트: ExercisePlayerPage
// ============================================================

export default function ExercisePlayerPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const exerciseId = params.id as string;
  const programId = searchParams.get('program') || '';
  const currentIndex = parseInt(searchParams.get('index') || '0', 10);

  const [exercise, setExercise] = useState<ExerciseData | null>(null);
  const [programExercises, setProgramExercises] = useState<ExerciseData[]>([]);
  const [state, setState] = useState<ExerciseState>('exercising');
  const [currentSet, setCurrentSet] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const hasSavedRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const exerciseData = getExerciseById(exerciseId);
    if (exerciseData) {
      setExercise(exerciseData);
      setTimeLeft(exerciseData.duration);
      setState('exercising');
      setCurrentSet(1);
      setIsPaused(false);
      hasSavedRef.current = false;
      startTimeRef.current = Date.now();
    }

    if (programId) {
      const exercises = getExercisesForProgram(programId);
      setProgramExercises(exercises);
    }
  }, [exerciseId, programId]);

  useEffect(() => {
    const saveRecord = async () => {
      if (state !== 'completed' || !user || !exercise || hasSavedRef.current) return;

      hasSavedRef.current = true;
      const totalDuration = Math.round((Date.now() - startTimeRef.current) / 1000);

      try {
        await saveExerciseRecord({
          user_id: user.id,
          exercise_id: exercise.id,
          program_id: programId || null,
          completed_sets: exercise.sets,
          total_duration: totalDuration,
        });

        const today = new Date().toISOString().split('T')[0];
        await updateDailyRecord(user.id, today, 1, totalDuration);
      } catch (error) {
        console.error('운동 기록 저장 실패:', error);
      }
    };

    saveRecord();
  }, [state, user, exercise, programId]);

  const handleTimerEnd = useCallback(() => {
    if (!exercise) return;

    if (state === 'exercising') {
      if (currentSet < exercise.sets) {
        setState('resting');
        setTimeLeft(exercise.restTime || 15);
      } else {
        setState('completed');
      }
    } else if (state === 'resting') {
      setCurrentSet((prev) => prev + 1);
      setState('exercising');
      setTimeLeft(exercise.duration);
    }
  }, [exercise, state, currentSet]);

  useEffect(() => {
    if (isPaused || state === 'completed' || !exercise) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimerEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, state, exercise, currentSet, handleTimerEnd]);

  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const handleSkip = () => {
    if (!exercise) return;

    if (state === 'exercising') {
      if (currentSet < exercise.sets) {
        setState('resting');
        setTimeLeft(exercise.restTime || 15);
      } else {
        setState('completed');
      }
    } else if (state === 'resting') {
      setCurrentSet((prev) => prev + 1);
      setState('exercising');
      setTimeLeft(exercise.duration);
    }
  };

  const handleClose = () => {
    router.push('/exercise');
  };

  const handleNextExercise = () => {
    if (currentIndex < programExercises.length - 1) {
      const nextExercise = programExercises[currentIndex + 1];
      router.push(
        `/exercise/${nextExercise.id}?program=${programId}&index=${currentIndex + 1}`
      );
    } else {
      router.push('/');
    }
  };

  const handleGoHome = () => {
    router.push('/');
  };

  if (!exercise) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-border border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalTime = state === 'resting' ? exercise.restTime || 15 : exercise.duration;
  const hasNextExercise = currentIndex < programExercises.length - 1;

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-background flex flex-col">
        {/* ============================================================
            상단 헤더 - 삼성 스타일
            ============================================================ */}
        <header className="bg-card px-4 py-3 border-b border-border flex items-center justify-between">
          <button
            onClick={handleClose}
            className="
              w-10 h-10 rounded-xl
              bg-background hover:bg-accent
              border border-border
              flex items-center justify-center
              transition-all duration-300
            "
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="text-center">
            <h1 className="text-base font-bold text-foreground">{exercise.name}</h1>
            <p className="text-xs text-muted-foreground">{exercise.nameEn}</p>
          </div>

          <button
            onClick={handleClose}
            className="
              w-10 h-10 rounded-xl
              bg-background hover:bg-red-500/200/10
              border border-border
              flex items-center justify-center
              transition-all duration-300
              group
            "
          >
            <X className="w-5 h-5 text-muted-foreground group-hover:text-red-500" />
          </button>
        </header>

      {/* ============================================================
          메인 콘텐츠
          ============================================================ */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8">
        <AnimatePresence mode="wait">
          {state === 'completed' ? (
            /* ===== 완료 화면 - 삼성 스타일 ===== */
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center w-full max-w-sm"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
                className="
                  w-28 h-28 rounded-2xl mx-auto mb-6
                  bg-card
                  flex items-center justify-center
                  shadow-lg shadow-[#1428A0]/20
                "
              >
                <CheckCircle className="w-14 h-14 text-white" strokeWidth={2.5} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  수고하셨어요!
                </h2>
                <p className="text-muted-foreground mb-8">
                  {exercise.name} {exercise.sets}세트를 모두 완료했어요
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
              >
                {hasNextExercise ? (
                  <button
                    onClick={handleNextExercise}
                    className="
                      w-full h-14
                      flex items-center justify-center gap-2
                      bg-card hover:bg-card
                      text-white font-semibold
                      rounded-xl
                      shadow-sm hover:shadow-md
                      transition-all duration-300
                      active:scale-[0.98]
                    "
                  >
                    다음 운동
                    <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={handleGoHome}
                    className="
                      w-full h-14
                      flex items-center justify-center gap-2
                      bg-card hover:bg-card
                      text-white font-semibold
                      rounded-xl
                      shadow-sm hover:shadow-md
                      transition-all duration-300
                      active:scale-[0.98]
                    "
                  >
                    <Home className="w-5 h-5" />
                    홈으로 돌아가기
                  </button>
                )}

                <button
                  onClick={handleClose}
                  className="
                    w-full h-12
                    flex items-center justify-center
                    bg-card hover:bg-background
                    border border-border hover:border-border
                    text-foreground font-semibold
                    rounded-xl
                    transition-all duration-300
                  "
                >
                  운동 목록으로
                </button>
              </motion.div>
            </motion.div>
          ) : (
            /* ===== 운동/휴식 화면 ===== */
            <motion.div
              key="timer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center w-full"
            >
              {state === 'resting' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <span className="
                    inline-flex items-center gap-2
                    px-4 py-2 rounded-xl
                    bg-amber-500/20 text-amber-700
                    text-sm font-semibold
                  ">
                    <Timer className="w-4 h-4" />
                    휴식 시간 - 다음 세트 준비
                  </span>
                </motion.div>
              )}

              <div className="flex justify-center mb-8">
                <CircularTimer
                  current={timeLeft}
                  total={totalTime}
                  size={280}
                  strokeWidth={16}
                  isResting={state === 'resting'}
                />
              </div>

              <div className="mb-8">
                <SetProgress currentSet={currentSet} totalSets={exercise.sets} />
              </div>

              {state === 'exercising' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="
                    bg-card rounded-2xl p-5
                    border border-border
                    shadow-sm
                    max-w-sm mx-auto
                    text-left
                  "
                >
                  <div className="flex items-center gap-2 text-foreground text-sm font-semibold mb-2">
                    <Info className="w-4 h-4" />
                    운동 가이드
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {exercise.description}
                  </p>

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Timer className="w-3.5 h-3.5" />
                      {exercise.duration}초 × {exercise.sets}세트
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Flame className="w-3.5 h-3.5" />
                      {exercise.category === 'stretching' ? '스트레칭' :
                       exercise.category === 'strengthening' ? '근력 강화' : '가동성'}
                    </span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============================================================
          하단 컨트롤 바 - 삼성 스타일
          ============================================================ */}
      {state !== 'completed' && (
        <div className="bg-card px-5 py-6 border-t border-border">
          <div className="flex items-center justify-center gap-6">
            <motion.button
              onClick={handleSkip}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="
                w-14 h-14 rounded-2xl
                bg-background hover:bg-accent
                border border-border
                flex items-center justify-center
                transition-all duration-300
              "
            >
              <SkipForward className="w-6 h-6 text-muted-foreground" />
            </motion.button>

            <motion.button
              onClick={togglePause}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                w-20 h-20 rounded-2xl
                flex items-center justify-center
                shadow-lg transition-all duration-300
                ${state === 'resting'
                  ? 'bg-amber-500/100 hover:bg-amber-600 shadow-amber-500/30'
                  : 'bg-card hover:bg-card shadow-[#1428A0]/30'
                }
              `}
            >
              {isPaused ? (
                <Play className="w-9 h-9 text-white ml-1" />
              ) : (
                <Pause className="w-9 h-9 text-white" />
              )}
            </motion.button>

            <div className="w-14 h-14" />
          </div>

          <AnimatePresence>
            {isPaused && (
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="text-center text-muted-foreground text-sm mt-4"
              >
                일시정지됨 - 재생 버튼을 눌러 계속하세요
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
      </div>
    </SidebarLayout>
  );
}
