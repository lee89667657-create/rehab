/**
 * 운동 프로그램 페이지 - Calm 스타일
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Clock,
  Dumbbell,
  Play,
  Zap,
  Target,
  Timer,
  ChevronRight,
  Camera,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import {
  exercisePrograms,
  getExercisesForProgram,
  calculateTotalDuration,
} from '@/constants/exercises';
import { COUNTABLE_EXERCISES, TIMER_EXERCISES, type CountableExercise, type TimerExercise as TimerExerciseType } from '@/lib/exerciseData';
import AppHeader from '@/components/layout/AppHeader';
import { useAuth } from '@/components/providers/AuthProvider';
import { getLatestAnalysisResult, type AnalysisResultRow } from '@/lib/supabase';
import { LOWER_BODY_ANALYSIS_ENABLED } from '@/constants/features';

// shadcn/ui 컴포넌트
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ============================================================
// 애니메이션 설정
// ============================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// ============================================================
// 상수 및 매핑 데이터
// ============================================================

// 전체 매핑 (하체 포함)
const allIssueToProgram: Record<string, string> = {
  forward_head: 'forward_head',
  shoulder_tilt: 'round_shoulder',
  // [하체 분석 - 추후 활성화 예정] features.ts의 LOWER_BODY_ANALYSIS_ENABLED로 제어
  pelvis_tilt: 'pelvis_tilt',
  knee_angle: 'knee_alignment',
};

// 활성화된 항목만 필터링
const issueToProgram: Record<string, string> = Object.fromEntries(
  Object.entries(allIssueToProgram).filter(([key]) => {
    if (key === 'pelvis_tilt' || key === 'knee_angle') {
      return LOWER_BODY_ANALYSIS_ENABLED;
    }
    return true;
  })
);

// ============================================================
// 컴포넌트: 실시간 분석 운동 카드
// ============================================================

interface RealtimeExerciseCardProps {
  exercise: CountableExercise;
}

function RealtimeExerciseCard({ exercise }: RealtimeExerciseCardProps) {
  return (
    <motion.div variants={itemVariants}>
      <Link href={`/exercise/realtime/${exercise.id}`}>
        <Card className="hover:shadow-lg transition-all duration-300 group border-green-200 dark:border-green-800">
          <CardContent className="p-0">
            <div className="flex items-stretch">
              {/* 왼쪽 아이콘 영역 - 카메라 표시 */}
              <div className="w-16 min-h-[72px] bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0 rounded-l-lg">
                <Camera className="w-6 h-6 text-white" />
              </div>

              <div className="flex-1 p-4 flex items-center">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground group-hover:text-green-600 transition-colors">
                      {exercise.name}
                    </h3>
                    <Badge variant="outline" className="text-[10px] border-green-500 text-green-600">
                      실시간 분석
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">
                    {exercise.description}
                  </p>
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Target className="w-3.5 h-3.5" />
                      {exercise.sets}세트 x {exercise.reps}회
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Zap className="w-3.5 h-3.5" />
                      {exercise.targetDisease}
                    </span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-800/50 flex items-center justify-center flex-shrink-0 ml-3 transition-colors">
                  <ChevronRight className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

// ============================================================
// 컴포넌트: 타이머 운동 카드
// ============================================================

interface TimerExerciseCardProps {
  exercise: TimerExerciseType;
}

function TimerExerciseCard({ exercise }: TimerExerciseCardProps) {
  return (
    <motion.div variants={itemVariants}>
      <Link href={`/exercise/realtime/${exercise.id}`}>
        <Card className="hover:shadow-lg transition-all duration-300 group border-purple-200 dark:border-purple-800">
          <CardContent className="p-0">
            <div className="flex items-stretch">
              {/* 왼쪽 아이콘 영역 - 타이머 표시 */}
              <div className="w-16 min-h-[72px] bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0 rounded-l-lg">
                <Timer className="w-6 h-6 text-white" />
              </div>

              <div className="flex-1 p-4 flex items-center">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground group-hover:text-purple-600 transition-colors">
                      {exercise.name}
                    </h3>
                    <Badge variant="outline" className="text-[10px] border-purple-500 text-purple-600">
                      타이머
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">
                    {exercise.description}
                  </p>
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {exercise.holdTime}초 x {exercise.sets}세트
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Zap className="w-3.5 h-3.5" />
                      {exercise.targetDisease}
                    </span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/50 flex items-center justify-center flex-shrink-0 ml-3 transition-colors">
                  <ChevronRight className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

// ============================================================
// 컴포넌트: 분석 안내 (분석 기록 없을 때)
// ============================================================

function NoAnalysisView() {
  return (
    <motion.div
      className="px-5 pt-5 pb-24"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <Card className="text-center">
          <CardContent className="p-8">
            <div className="w-20 h-20 mx-auto mb-5 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Camera className="w-10 h-10 text-primary" />
            </div>

            <h2 className="text-xl font-semibold text-foreground mb-3">
              먼저 자세를 분석해보세요!
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              AI가 당신의 자세를 분석하고
              <br />
              맞춤 운동 프로그램을 추천해드려요
            </p>

            <Button asChild size="lg" className="font-semibold">
              <Link href="/analyze">
                <Camera className="w-5 h-5 mr-2" />
                자세 분석 시작하기
              </Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* 타이머 운동 섹션 */}
      <motion.div variants={itemVariants} className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Timer className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">타이머 운동</h3>
            <p className="text-xs text-muted-foreground">자세를 유지하며 시간 측정</p>
          </div>
        </div>

        <div className="space-y-3">
          {TIMER_EXERCISES.map((exercise) => (
            <TimerExerciseCard key={exercise.id} exercise={exercise} />
          ))}
        </div>
      </motion.div>

      {/* 실시간 분석 운동 섹션 */}
      <motion.div variants={itemVariants} className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Camera className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">실시간 분석 운동</h3>
            <p className="text-xs text-muted-foreground">분석 없이 바로 시작 가능</p>
          </div>
        </div>

        <div className="space-y-3">
          {COUNTABLE_EXERCISES
            .filter((ex) => ['neck-side-stretch', 'shoulder-squeeze', 'arm-raise'].includes(ex.id))
            .map((exercise) => (
              <RealtimeExerciseCard key={exercise.id} exercise={exercise} />
            ))}
        </div>
      </motion.div>

      {/* 추가 운동 섹션 */}
      <motion.div variants={itemVariants} className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">추가 운동</h3>
            <p className="text-xs text-muted-foreground">오래 앉아있으면 하체도 약해집니다</p>
          </div>
        </div>

        <div className="space-y-3">
          {COUNTABLE_EXERCISES
            .filter((ex) => ex.id === 'squat')
            .map((exercise) => (
              <RealtimeExerciseCard key={exercise.id} exercise={exercise} />
            ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="mt-6 space-y-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">정확한 분석</h3>
              <p className="text-xs text-muted-foreground mt-0.5">AI가 자세를 정밀하게 분석해요</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Target className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">맞춤 운동</h3>
              <p className="text-xs text-muted-foreground mt-0.5">분석 결과에 맞는 운동을 추천해요</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">효과적인 개선</h3>
              <p className="text-xs text-muted-foreground mt-0.5">꾸준히 하면 자세가 좋아져요</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// 컴포넌트: 운동 프로그램 뷰 (분석 기록 있을 때)
// ============================================================

interface ExerciseProgramViewProps {
  analysisResult: AnalysisResultRow;
}

function ExerciseProgramView({ analysisResult }: ExerciseProgramViewProps) {
  const router = useRouter();

  const { program, programExercises, primaryIssue } = useMemo(() => {
    const scores = {
      forward_head: analysisResult.head_forward,
      shoulder_tilt: analysisResult.shoulder_balance,
      pelvis_tilt: analysisResult.pelvic_tilt,
      knee_angle: analysisResult.knee_alignment,
    };

    let lowestKey = 'forward_head';
    let lowestScore = 100;
    for (const [key, score] of Object.entries(scores)) {
      if (score < lowestScore) {
        lowestScore = score;
        lowestKey = key;
      }
    }

    const targetCondition = issueToProgram[lowestKey] || 'forward_head';
    let targetProgram = exercisePrograms.find(p => p.targetCondition === targetCondition);
    if (!targetProgram) {
      targetProgram = exercisePrograms[0];
    }

    const exercises = getExercisesForProgram(targetProgram.id);
    return {
      program: targetProgram,
      programExercises: exercises,
      primaryIssue: lowestKey,
    };
  }, [analysisResult]);

  const totalMinutes = calculateTotalDuration(program.exerciseIds);

  const handleStartExercise = () => {
    if (programExercises.length > 0) {
      router.push(`/exercise/${programExercises[0].id}?program=${program.id}&index=0`);
    }
  };

  // 전체 라벨 (하체 포함)
  const allIssueLabels: Record<string, string> = {
    forward_head: '거북목',
    shoulder_tilt: '라운드숄더',
    // [하체 분석 - 추후 활성화 예정] features.ts의 LOWER_BODY_ANALYSIS_ENABLED로 제어
    pelvis_tilt: '골반 틀어짐',
    knee_angle: '무릎 정렬',
  };

  // 활성화된 항목만 필터링
  const issueLabels: Record<string, string> = Object.fromEntries(
    Object.entries(allIssueLabels).filter(([key]) => {
      if (key === 'pelvis_tilt' || key === 'knee_angle') {
        return LOWER_BODY_ANALYSIS_ENABLED;
      }
      return true;
    })
  );

  return (
    <>
      <motion.div
        className="px-4 pt-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* 분석 결과 요약 */}
        <motion.div variants={itemVariants}>
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">분석 결과 기반 추천</p>
                  <p className="font-semibold text-foreground">
                    <span className="text-primary">{issueLabels[primaryIssue]}</span> 개선 프로그램
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{analysisResult.overall_score}</p>
                  <p className="text-xs text-muted-foreground">종합점수</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 프로그램 헤더 카드 */}
        <motion.section variants={itemVariants} className="mb-6">
          <Card className="bg-primary text-primary-foreground border-0 overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute -right-16 -top-16 w-48 h-48 bg-primary-foreground/10 rounded-full blur-3xl" />

              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center mb-4">
                  <Dumbbell className="w-6 h-6" />
                </div>

                <h2 className="text-xl font-bold mb-2">{program.name}</h2>
                <p className="text-primary-foreground/80 text-sm mb-4">{program.description}</p>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
                    <Target className="w-3 h-3 mr-1" />
                    {programExercises.length}개 운동
                  </Badge>
                  <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
                    <Clock className="w-3 h-3 mr-1" />
                    약 {totalMinutes}분
                  </Badge>
                  <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
                    <Zap className="w-3 h-3 mr-1" />
                    {program.level}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* 타이머 운동 섹션 */}
        <motion.section variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Timer className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">타이머 운동</h3>
                <p className="text-xs text-muted-foreground">자세를 유지하며 시간 측정</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {TIMER_EXERCISES.map((exercise) => (
              <TimerExerciseCard key={exercise.id} exercise={exercise} />
            ))}
          </div>
        </motion.section>

        {/* 실시간 분석 운동 섹션 */}
        <motion.section variants={itemVariants} className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Camera className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">실시간 분석 운동</h3>
                <p className="text-xs text-muted-foreground">카메라로 자동 횟수 카운팅</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {COUNTABLE_EXERCISES
              .filter((ex) => ['neck-side-stretch', 'shoulder-squeeze', 'arm-raise'].includes(ex.id))
              .map((exercise) => (
                <RealtimeExerciseCard key={exercise.id} exercise={exercise} />
              ))}
          </div>
        </motion.section>

        {/* 추가 운동 섹션 */}
        <motion.section variants={itemVariants} className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">추가 운동</h3>
                <p className="text-xs text-muted-foreground">오래 앉아있으면 하체도 약해집니다</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {COUNTABLE_EXERCISES
              .filter((ex) => ex.id === 'squat')
              .map((exercise) => (
                <RealtimeExerciseCard key={exercise.id} exercise={exercise} />
              ))}
          </div>
        </motion.section>

        {/* 팁 카드 */}
        <motion.section variants={itemVariants} className="mt-6 mb-24">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm text-foreground">
                <strong className="text-primary">오늘의 팁</strong>
                <span className="mx-2">|</span>
                운동 중 통증이 느껴지면 즉시 중단하고 휴식을 취하세요.
              </p>
            </CardContent>
          </Card>
        </motion.section>
      </motion.div>

      {/* 하단 시작 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <button
          onClick={handleStartExercise}
          className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5 fill-current" />
          운동 시작하기
        </button>
      </div>
    </>
  );
}

// ============================================================
// 메인 컴포넌트: ExercisePage
// ============================================================

export default function ExercisePage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultRow | null>(null);

  useEffect(() => {
    const checkAnalysis = async () => {
      setIsLoading(true);

      try {
        if (user) {
          const result = await getLatestAnalysisResult(user.id);
          if (result) {
            setAnalysisResult(result);
            setIsLoading(false);
            return;
          }
        }

        const savedResult = localStorage.getItem('analysisResult');
        if (savedResult) {
          const parsed = JSON.parse(savedResult);
          setAnalysisResult({
            id: 'local',
            user_id: user?.id || 'anonymous',
            overall_score: parsed.overallScore || 75,
            head_forward: parsed.items?.find((i: { id: string }) => i.id === 'forward_head')?.score || 80,
            shoulder_balance: parsed.items?.find((i: { id: string }) => i.id === 'shoulder_tilt')?.score || 80,
            pelvic_tilt: parsed.items?.find((i: { id: string }) => i.id === 'pelvis_tilt')?.score || 80,
            knee_alignment: parsed.items?.find((i: { id: string }) => i.id === 'knee_angle')?.score || 80,
            primary_issue: parsed.primaryIssue || null,
            recommendations: parsed.recommendations || [],
            pose_data: {},
            created_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Failed to fetch analysis:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAnalysis();
  }, [user]);

  return (
    <>
      <AppHeader />

      <div className="min-h-screen bg-slate-50 pb-24 pt-14">
        {/* 페이지 헤더 */}
        <motion.div
          className="bg-white px-5 py-6 border-b border-gray-100"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-xl font-semibold text-gray-800">맞춤 운동</h1>
          <p className="text-sm text-gray-500 mt-1">
            AI 분석 결과에 맞는 운동을 추천해드려요
          </p>
        </motion.div>

        {/* 메인 콘텐츠 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : analysisResult ? (
          <ExerciseProgramView analysisResult={analysisResult} />
        ) : (
          <NoAnalysisView />
        )}
      </div>
    </>
  );
}
