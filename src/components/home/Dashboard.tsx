/**
 * 대시보드 컴포넌트 - shadcn/ui 스타일
 *
 * 모든 이모지를 제거하고 Lucide 아이콘만 사용
 */

'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Camera,
  Clock,
  Dumbbell,
  ChevronRight,
  LogOut,
  Calendar,
  TrendingUp,
  Activity,
  Play,
  Sparkles,
  Target,
  Zap,
  Lightbulb,
  MoveVertical,
  StretchHorizontal,
  LucideIcon,
} from 'lucide-react';
import useStore, { useAnalysisResult } from '@/store/useStore';
import { useAuth } from '@/components/providers/AuthProvider';
import { getWeeklyRecords } from '@/lib/supabase';
import AppHeader from '@/components/layout/AppHeader';

// shadcn/ui 컴포넌트
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// ============================================================
// 타입 정의
// ============================================================

interface WeeklyRecordItem {
  day: string;
  date: string;
  completed: boolean;
  isToday: boolean;
  score?: number;
}

// 운동 타입 정의 (이모지 대신 아이콘 사용)
interface Exercise {
  id: string;
  name: string;
  duration: string;
  difficulty: '초급' | '중급' | '고급';
  description: string;
  icon: LucideIcon;  // 이모지 대신 Lucide 아이콘 사용
}

// ============================================================
// 유틸리티 함수
// ============================================================

// 기본 주간 기록 생성
function getDefaultWeeklyRecord(): WeeklyRecordItem[] {
  const today = new Date();
  const koreanDays = ['일', '월', '화', '수', '목', '금', '토'];

  // 이번 주 월요일 계산
  const mondayOffset = today.getDay() === 0 ? -6 : 1 - today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dateStr = date.toISOString().split('T')[0];
    const dayIndex = date.getDay();
    const todayStr = today.toISOString().split('T')[0];

    return {
      day: koreanDays[dayIndex],
      date: dateStr,
      completed: false,
      isToday: dateStr === todayStr,
      score: undefined,
    };
  });
}

// 오늘 날짜 문자열 반환
function getTodayDateString(): string {
  const today = new Date();
  const month = today.getMonth() + 1;
  const date = today.getDate();
  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const dayName = dayNames[today.getDay()];
  return `${month}월 ${date}일 ${dayName}`;
}

// 점수에 따른 메시지 반환
function getScoreMessage(score: number): { text: string; subText: string } {
  if (score >= 90) return { text: '훌륭해요!', subText: '자세가 매우 좋습니다' };
  if (score >= 80) return { text: '좋아요!', subText: '조금만 신경쓰면 완벽해요' };
  if (score >= 70) return { text: '양호한 편이에요', subText: '꾸준히 관리해보세요' };
  if (score >= 60) return { text: '주의가 필요해요', subText: '운동을 시작해보세요' };
  return { text: '교정이 필요해요', subText: '전문가 상담을 권장드려요' };
}

// ============================================================
// 추천 운동 데이터 (이모지 → Lucide 아이콘으로 변경)
// ============================================================

const defaultExercises: Exercise[] = [
  {
    id: 'forward_head',
    name: '목 스트레칭',
    duration: '5분',
    difficulty: '초급',
    description: '거북목 교정에 효과적',
    icon: MoveVertical,  // 목 스트레칭 아이콘
  },
  {
    id: 'round_shoulder',
    name: '어깨 교정',
    duration: '10분',
    difficulty: '중급',
    description: '라운드숄더 개선',
    icon: Dumbbell,  // 어깨 운동 아이콘
  },
  {
    id: 'pelvis_tilt',
    name: '코어 강화',
    duration: '10분',
    difficulty: '중급',
    description: '골반 균형 회복',
    icon: Target,  // 코어/타겟 아이콘
  },
  {
    id: 'full_body',
    name: '전신 스트레칭',
    duration: '15분',
    difficulty: '초급',
    description: '전체적인 유연성 향상',
    icon: StretchHorizontal,  // 스트레칭 아이콘
  },
];

// ============================================================
// 애니메이션 설정
// ============================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// ============================================================
// 컴포넌트: 원형 프로그레스
// ============================================================

interface ScoreCircleProps {
  value: number;
  size?: number;
  strokeWidth?: number;
}

function ScoreCircle({ value, size = 140, strokeWidth = 12 }: ScoreCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* 배경 원 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth={strokeWidth}
        />
        {/* 진행 원 */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-primary"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>

      {/* 점수 텍스트 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-5xl font-bold text-primary"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          {value}
        </motion.span>
        <span className="text-sm text-muted-foreground font-medium">점</span>
      </div>
    </div>
  );
}

// ============================================================
// 메인 컴포넌트: Dashboard
// ============================================================

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const analysisResult = useAnalysisResult();
  const currentExerciseIndex = useStore((state) => state.currentExerciseIndex);

  const [weeklyRecord, setWeeklyRecord] = useState<WeeklyRecordItem[]>(() =>
    getDefaultWeeklyRecord()
  );

  // 사용자 이름 처리 (깨진 문자 필터링)
  const rawName = user?.user_metadata?.name;
  const isValidName =
    rawName &&
    !/[\uFFFD\u00EF\u00BF\u00BD]/.test(rawName) &&
    !/^[\x00-\x1F\x7F-\x9F\u2028\u2029]+$/.test(rawName);
  const userName = isValidName
    ? rawName
    : user?.email?.split('@')[0] || '사용자';

  // Supabase에서 주간 기록 가져오기
  useEffect(() => {
    const fetchWeeklyRecords = async () => {
      if (!user) return;

      try {
        const records = await getWeeklyRecords(user.id);
        const completedDates = new Set(records.map((r) => r.date));

        setWeeklyRecord((prev) =>
          prev.map((item) => ({
            ...item,
            completed: completedDates.has(item.date),
          }))
        );
      } catch (error) {
        console.error('주간 기록 조회 실패:', error);
      }
    };

    fetchWeeklyRecords();
  }, [user]);

  // 파생 데이터 계산
  const completedDays = weeklyRecord.filter((r) => r.completed).length;
  const overallScore = analysisResult?.overallScore ?? 0;
  const normalItemsCount =
    analysisResult?.items.filter((item) => item.grade === 'good').length ?? 0;
  const totalItemsCount = analysisResult?.items.length ?? 0;
  const scoreMessage = getScoreMessage(overallScore);

  // 분석 결과에 따른 추천 운동 필터링
  const recommendedExercises = useMemo(() => {
    if (!analysisResult) return defaultExercises;

    const warningItems = analysisResult.items
      .filter((item) => item.grade !== 'good')
      .map((item) => item.id);

    if (warningItems.length === 0) return defaultExercises;

    return defaultExercises.filter((ex) => warningItems.includes(ex.id));
  }, [analysisResult]);

  return (
    <>
      <AppHeader />

      <motion.div
        className="min-h-screen bg-background pb-32 pt-14"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ============================================================
            상단 헤더 - 인사말 및 로그아웃 버튼
            ============================================================ */}
        <motion.header
          className="bg-card px-6 pt-8 pb-6 border-b"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between">
            <div>
              {/* 날짜 표시 */}
              <p className="text-sm text-muted-foreground font-medium flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4" />
                {getTodayDateString()}
              </p>
              {/* 인사말 (이모지 제거) */}
              <h1 className="text-2xl font-bold text-foreground">
                안녕하세요, {userName}님
              </h1>
            </div>

            {/* 로그아웃 버튼 */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => signOut()}
              className="h-10 w-10"
              title="로그아웃"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </motion.header>

        {/* 메인 콘텐츠 */}
        <div className="px-6 py-6 space-y-6">
          {/* ============================================================
              메인 점수 카드
              ============================================================ */}
          <motion.section variants={itemVariants}>
            {analysisResult ? (
              // 분석 결과가 있을 때 - 점수 표시
              <Card className="bg-primary text-primary-foreground border-0 shadow-lg overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-6 mb-6">
                    {/* 원형 점수 표시 */}
                    <div className="bg-primary-foreground/10 rounded-2xl p-4">
                      <ScoreCircle value={overallScore} size={140} strokeWidth={12} />
                    </div>

                    <div className="flex-1">
                      {/* 종합 점수 라벨 */}
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 opacity-80" />
                        <span className="text-sm opacity-80 font-medium">
                          종합 자세 점수
                        </span>
                      </div>

                      {/* 점수 메시지 */}
                      <h2 className="text-3xl font-bold mb-2">
                        {scoreMessage.text}
                      </h2>

                      <p className="text-base opacity-90 mb-4">
                        {scoreMessage.subText}
                      </p>

                      {/* 정상 항목 뱃지 */}
                      <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
                        <Sparkles className="w-3 h-3 mr-1" />
                        {totalItemsCount}개 중 {normalItemsCount}개 정상
                      </Badge>
                    </div>
                  </div>

                  {/* 상세 결과 보기 버튼 */}
                  <Button
                    asChild
                    variant="secondary"
                    className="w-full h-12 text-base font-semibold"
                  >
                    <Link href="/result">
                      상세 결과 보기
                      <ChevronRight className="w-5 h-5 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              // 분석 결과가 없을 때 - 분석 유도
              <Card className="bg-primary text-primary-foreground border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                  {/* 카메라 아이콘 */}
                  <motion.div
                    className="w-24 h-24 mx-auto mb-6 bg-primary-foreground/10 rounded-2xl flex items-center justify-center"
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    transition={{ type: 'spring' }}
                  >
                    <Camera className="w-12 h-12" />
                  </motion.div>

                  {/* 안내 문구 (이모지 제거) */}
                  <h2 className="text-2xl font-bold mb-3">
                    첫 분석을 시작해보세요
                  </h2>
                  <p className="text-base opacity-90 mb-8">
                    AI가 자세를 분석하고 맞춤 운동을 추천해드려요
                  </p>

                  {/* 분석 시작 버튼 */}
                  <Button
                    asChild
                    variant="secondary"
                    size="lg"
                    className="text-base font-semibold"
                  >
                    <Link href="/analyze">
                      자세 분석 시작하기
                      <ChevronRight className="w-5 h-5 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.section>

          {/* ============================================================
              퀵 액션 버튼 - 자세 분석 / 운동 시작
              ============================================================ */}
          <motion.section className="grid grid-cols-2 gap-4" variants={itemVariants}>
            {/* 자세 분석 버튼 */}
            <Button
              asChild
              size="lg"
              className="h-24 flex-col gap-2 text-base font-semibold"
            >
              <Link href="/analyze">
                <Camera className="w-6 h-6" />
                {analysisResult ? '다시 분석' : '자세 분석'}
              </Link>
            </Button>

            {/* 운동 시작 버튼 */}
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-24 flex-col gap-2 text-base font-semibold"
            >
              <Link href="/exercise">
                <Dumbbell className="w-6 h-6" />
                {currentExerciseIndex > 0 ? '이어하기' : '운동 시작'}
              </Link>
            </Button>
          </motion.section>

          {/* ============================================================
              이번 주 기록 - 주간 달성률 표시
              ============================================================ */}
          <motion.section variants={itemVariants}>
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* 아이콘 */}
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">이번 주 기록</CardTitle>
                  </div>
                  {/* 완료 일수 뱃지 */}
                  <Badge variant="secondary">
                    {completedDays}/7일 완료
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* 주간 막대 그래프 */}
                <div className="flex justify-between items-end gap-2">
                  {weeklyRecord.map((record) => (
                    <div key={record.date} className="flex flex-col items-center gap-2 flex-1">
                      {/* 막대 */}
                      <div
                        className={`
                          w-full max-w-[32px] h-20 rounded-lg relative overflow-hidden
                          ${record.completed ? 'bg-primary' : record.isToday ? 'bg-primary/30' : 'bg-muted'}
                        `}
                      >
                        {record.score && (
                          <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-primary-foreground">
                            {record.score}
                          </span>
                        )}
                      </div>
                      {/* 요일 라벨 */}
                      <span
                        className={`
                          text-xs font-medium
                          ${record.isToday ? 'text-primary font-bold' : record.completed ? 'text-foreground' : 'text-muted-foreground'}
                        `}
                      >
                        {record.day}
                      </span>
                      {/* 오늘 표시 점 */}
                      {record.isToday && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary -mt-1" />
                      )}
                    </div>
                  ))}
                </div>

                {/* 주간 달성률 프로그레스 바 */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">주간 달성률</span>
                    <span className="font-semibold">{Math.round((completedDays / 7) * 100)}%</span>
                  </div>
                  <Progress value={(completedDays / 7) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* ============================================================
              추천 운동 - 가로 스크롤 카드 목록
              ============================================================ */}
          <motion.section variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* 타겟 아이콘 */}
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold">
                  {analysisResult ? '맞춤 추천 운동' : '추천 운동'}
                </h2>
              </div>
              {/* 전체 보기 링크 */}
              <Button variant="ghost" size="sm" asChild>
                <Link href="/exercise" className="text-primary">
                  전체 보기
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>

            {/* 가로 스크롤 운동 카드 목록 */}
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
              {recommendedExercises.map((exercise, index) => {
                // 각 운동의 아이콘 컴포넌트
                const ExerciseIcon = exercise.icon;

                return (
                  <motion.div
                    key={exercise.id}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index, duration: 0.5 }}
                    whileHover={{ y: -4 }}
                    className="flex-shrink-0"
                  >
                    <Link href={`/exercise?type=${exercise.id}`}>
                      <Card className="w-44 overflow-hidden hover:shadow-lg transition-shadow">
                        {/* 카드 상단 - 아이콘 영역 */}
                        <div className="h-28 bg-primary flex items-center justify-center relative">
                          {/* 운동 아이콘 (이모지 대신 Lucide 아이콘) */}
                          <ExerciseIcon className="w-12 h-12 text-primary-foreground" />

                          {/* 재생 버튼 */}
                          <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                            <Play className="w-4 h-4 text-primary-foreground fill-primary-foreground ml-0.5" />
                          </div>

                          {/* 소요 시간 뱃지 */}
                          <Badge
                            variant="secondary"
                            className="absolute top-3 left-3 bg-black/20 text-white border-0 text-[10px]"
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            {exercise.duration}
                          </Badge>
                        </div>

                        {/* 카드 하단 - 정보 */}
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-foreground mb-1">
                            {exercise.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                            {exercise.description}
                          </p>
                          {/* 난이도 뱃지 */}
                          <Badge
                            variant={
                              exercise.difficulty === '초급'
                                ? 'default'
                                : exercise.difficulty === '중급'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                            className="text-[10px]"
                          >
                            <Zap className="w-3 h-3 mr-0.5" />
                            {exercise.difficulty}
                          </Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          {/* ============================================================
              오늘의 팁 - 건강 정보 카드
              ============================================================ */}
          <motion.section variants={itemVariants}>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* 전구 아이콘 (이모지 대신) */}
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    {/* 제목 (이모지 제거) */}
                    <h3 className="font-bold text-foreground mb-1">오늘의 팁</h3>
                    {/* 내용 (이모지 제거) */}
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      30분마다 간단한 스트레칭을 하면 거북목 예방에 효과적이에요.
                      <span className="text-primary font-medium ml-1">
                        꾸준함이 가장 중요합니다.
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </div>
      </motion.div>
    </>
  );
}
