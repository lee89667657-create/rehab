/**
 * 실시간 운동 분석 페이지
 *
 * /exercise/realtime/[id] 경로
 * - 카메라 기반 실시간 자세 분석
 * - 자동 반복 카운팅
 * - 음성 피드백
 * - 운동 완료 후 결과 표시 및 기록 저장
 *
 * ## 사용법
 * 1. 운동 목록에서 실시간 분석 지원 운동 선택
 * 2. 운동 정보 확인 후 "실시간 분석 시작" 버튼 클릭
 * 3. 카메라에 전신이 보이도록 위치 조정
 * 4. 운동 수행 (자동 카운팅)
 * 5. 완료 후 결과 확인
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  Target,
  Zap,
  Camera,
  CheckCircle,
  Home,
  RotateCcw,
  ChevronRight,
  Activity,
} from 'lucide-react';
import {
  getCountableExerciseById,
  getTimerExerciseById,
  type CountableExercise,
  type TimerExercise as TimerExerciseType,
  type ExerciseResult,
} from '@/lib/exerciseData';
import RealTimeExercise from '@/components/exercise/RealTimeExercise';
import TimerExercise from '@/components/exercise/TimerExercise';
import AppHeader from '@/components/layout/AppHeader';

// shadcn/ui 컴포넌트
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ============================================================
// 타입 정의
// ============================================================

type PageState = 'info' | 'exercising' | 'completed';

// ============================================================
// 메인 컴포넌트
// ============================================================

export default function RealTimeExercisePage() {
  const params = useParams();
  const router = useRouter();

  const exerciseId = params.id as string;

  const [exercise, setExercise] = useState<CountableExercise | TimerExerciseType | null>(null);
  const [exerciseType, setExerciseType] = useState<'countable' | 'timer' | null>(null);
  const [pageState, setPageState] = useState<PageState>('info');
  const [result, setResult] = useState<ExerciseResult | null>(null);

  // ========================================
  // 운동 데이터 로드
  // ========================================

  useEffect(() => {
    // 먼저 카운팅 운동에서 검색
    const countableData = getCountableExerciseById(exerciseId);
    if (countableData) {
      setExercise(countableData);
      setExerciseType('countable');
      return;
    }

    // 타이머 운동에서 검색
    const timerData = getTimerExerciseById(exerciseId);
    if (timerData) {
      setExercise(timerData);
      setExerciseType('timer');
    }
  }, [exerciseId]);

  // ========================================
  // 운동 완료 핸들러
  // ========================================

  const handleComplete = (exerciseResult: ExerciseResult) => {
    setResult(exerciseResult);
    setPageState('completed');
  };

  // ========================================
  // 운동 취소 핸들러
  // ========================================

  const handleCancel = () => {
    setPageState('info');
  };

  // ========================================
  // 다시 시작 핸들러
  // ========================================

  const handleRestart = () => {
    setResult(null);
    setPageState('exercising');
  };

  // ========================================
  // 운동을 찾을 수 없는 경우
  // ========================================

  if (!exercise) {
    return (
      <>
        <AppHeader />
        <div className="min-h-screen bg-background flex items-center justify-center pt-14">
          <Card className="max-w-sm mx-4">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-bold mb-2">운동을 찾을 수 없습니다</h2>
              <p className="text-muted-foreground text-sm mb-6">
                요청하신 운동 정보를 불러올 수 없습니다.
              </p>
              <Button onClick={() => router.push('/exercise')} className="w-full">
                운동 목록으로
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // ========================================
  // 실시간 운동 화면
  // ========================================

  if (pageState === 'exercising') {
    // 타이머 기반 운동
    if (exerciseType === 'timer') {
      return (
        <TimerExercise
          exercise={exercise as TimerExerciseType}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      );
    }

    // 카운팅 기반 운동
    return (
      <RealTimeExercise
        exercise={exercise as CountableExercise}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    );
  }

  // ========================================
  // 운동 완료 결과 화면
  // ========================================

  if (pageState === 'completed' && result) {
    return (
      <>
        <AppHeader />
        <div className="min-h-screen bg-background pb-24 pt-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 pt-6"
          >
            {/* 완료 헤더 */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-24 h-24 rounded-2xl bg-primary mx-auto mb-4 flex items-center justify-center shadow-lg"
              >
                <CheckCircle className="w-12 h-12 text-primary-foreground" strokeWidth={2.5} />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold mb-2"
              >
                운동 완료!
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground"
              >
                {result.exerciseName}을(를) 완료했습니다
              </motion.p>
            </div>

            {/* 결과 카드 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">운동 결과</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {/* 완료 세트 */}
                    <div className="text-center p-4 bg-muted rounded-xl">
                      <p className="text-xs text-muted-foreground mb-1">세트</p>
                      <p className="text-2xl font-bold">{result.completedSets}</p>
                    </div>

                    {/* 총 횟수 */}
                    <div className="text-center p-4 bg-muted rounded-xl">
                      <p className="text-xs text-muted-foreground mb-1">총 횟수</p>
                      <p className="text-2xl font-bold">{result.totalReps}</p>
                    </div>

                    {/* 소요 시간 */}
                    <div className="text-center p-4 bg-muted rounded-xl">
                      <p className="text-xs text-muted-foreground mb-1">시간</p>
                      <p className="text-2xl font-bold">
                        {result.duration >= 60
                          ? `${Math.floor(result.duration / 60)}분`
                          : `${result.duration}초`}
                      </p>
                    </div>
                  </div>

                  {/* 세트별 상세 */}
                  {result.completedReps.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">세트별 횟수</p>
                      <div className="flex gap-2 flex-wrap">
                        {result.completedReps.map((reps, idx) => (
                          <Badge key={idx} variant="secondary">
                            {idx + 1}세트: {reps}회
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 정확도 */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">달성률</span>
                      <span className="text-lg font-bold text-primary">{result.accuracy}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${result.accuracy}%` }}
                        transition={{ duration: 0.5, delay: 0.7 }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* 액션 버튼 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-3"
            >
              <Button
                onClick={handleRestart}
                variant="outline"
                className="w-full h-12"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                다시 하기
              </Button>

              <Button
                onClick={() => router.push('/exercise')}
                className="w-full h-12"
              >
                운동 목록으로
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>

              <Button
                onClick={() => router.push('/dashboard')}
                variant="ghost"
                className="w-full h-12"
              >
                <Home className="w-4 h-4 mr-2" />
                홈으로 돌아가기
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </>
    );
  }

  // ========================================
  // 운동 정보 화면 (시작 전)
  // ========================================

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-background pb-32 pt-14">
        {/* 헤더 */}
        <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 pb-16">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-primary-foreground hover:bg-primary-foreground/20 mb-4"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>

          <h1 className="text-2xl font-bold mb-2">{exercise.name}</h1>
          <p className="text-primary-foreground/80 mb-4">{exercise.description}</p>

          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                {exerciseType === 'timer'
                  ? `약 ${Math.round(((exercise as TimerExerciseType).holdTime * exercise.sets + exercise.restTime * (exercise.sets - 1)) / 60)}분`
                  : `약 ${Math.round(((exercise as CountableExercise).duration * exercise.sets + exercise.restTime * (exercise.sets - 1)) / 60)}분`
                }
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Target className="w-4 h-4" />
              <span className="text-sm">
                {exerciseType === 'timer'
                  ? `${exercise.sets}세트 x ${(exercise as TimerExerciseType).holdTime}초 유지`
                  : `${exercise.sets}세트 x ${(exercise as CountableExercise).reps}회`
                }
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              <span className="text-sm">{exercise.targetDisease}</span>
            </div>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="px-4 -mt-10">
          {/* 실시간 분석 모드 안내 */}
          <Card className="mb-4 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                  <Camera className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">
                    {exerciseType === 'timer' ? '타이머 모드' : '실시간 분석 모드'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {exerciseType === 'timer'
                      ? `카메라로 자세를 확인하면서 ${(exercise as TimerExerciseType).holdTime}초간 자세를 유지합니다. 음성 안내에 따라 운동하세요.`
                      : '카메라로 자세를 분석하고 자동으로 횟수를 카운팅합니다. 전신이 보이도록 카메라 위치를 조정해주세요.'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 자세 포인트 */}
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                자세 포인트
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {exercise.keyPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-sm">{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* 운동 정보 */}
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">운동 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">세트</p>
                  <p className="text-xl font-bold">{exercise.sets}세트</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">
                    {exerciseType === 'timer' ? '유지 시간' : '반복'}
                  </p>
                  <p className="text-xl font-bold">
                    {exerciseType === 'timer'
                      ? `${(exercise as TimerExerciseType).holdTime}초`
                      : `${(exercise as CountableExercise).reps}회`
                    }
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">휴식</p>
                  <p className="text-xl font-bold">{exercise.restTime}초</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">대상</p>
                  <p className="text-xl font-bold">{exercise.targetDisease}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 준비 안내 */}
          <Card className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-4">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                시작 전 확인사항
              </h3>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                <li>- 밝은 조명에서 진행해주세요</li>
                <li>- 카메라에 전신이 보이도록 거리를 조절하세요</li>
                <li>- 편한 복장으로 운동하세요</li>
                <li>- 음성 안내를 위해 볼륨을 확인하세요</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* 시작 버튼 */}
        <div className="fixed bottom-20 left-4 right-4">
          <Button
            className="w-full h-14 text-lg bg-gradient-to-r from-primary to-primary/80 shadow-lg"
            onClick={() => setPageState('exercising')}
          >
            <Camera className="w-5 h-5 mr-2" />
            {exerciseType === 'timer' ? '타이머 운동 시작하기' : '실시간 분석 시작하기'}
          </Button>
        </div>
      </div>
    </>
  );
}
