/**
 * 통계 페이지 - 운동 데이터 시각화
 *
 * 분석 기록을 차트로 시각화합니다.
 * - 점수 추이 라인 차트
 * - 항목별 분석 레이더 차트
 * - 주간 활동 요약
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Activity,
  BarChart3,
  ArrowLeft,
  ChevronRight,
  Flame,
  Award,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
} from 'recharts';
// AppHeader는 SidebarLayout에서 처리됨
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  getAnalysisHistory,
  getWeeklyRecords,
  type AnalysisResultRow,
  type DailyRecordRow,
} from '@/lib/supabase';
import { LOWER_BODY_ANALYSIS_ENABLED } from '@/constants/features';

// shadcn/ui 컴포넌트
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================
// 타입 정의
// ============================================================

interface ChartDataPoint {
  date: string;
  score: number;
  displayDate: string;
}

interface RadarDataPoint {
  subject: string;
  value: number;
  fullMark: number;
}

interface WeeklyActivityData {
  day: string;
  value: number;
  isToday: boolean;
}

// ============================================================
// 애니메이션 설정
// ============================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// ============================================================
// 유틸리티 함수
// ============================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getScoreChange(current: number, previous: number): number {
  return current - previous;
}

function getScoreGrade(score: number): { label: string; color: string } {
  if (score >= 90) return { label: '최상', color: 'text-green-500' };
  if (score >= 80) return { label: '양호', color: 'text-blue-500' };
  if (score >= 70) return { label: '보통', color: 'text-yellow-500' };
  if (score >= 60) return { label: '주의', color: 'text-orange-500' };
  return { label: '경고', color: 'text-red-500' };
}

// ============================================================
// 커스텀 툴팁 컴포넌트
// ============================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartDataPoint }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  const grade = getScoreGrade(data.value);

  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 min-w-[120px]">
      <p className="text-xs text-muted-foreground mb-1">
        {data.payload.displayDate}
      </p>
      <p className="text-lg font-bold">{data.value}점</p>
      <Badge variant="secondary" className={`text-xs mt-1 ${grade.color}`}>
        {grade.label}
      </Badge>
    </div>
  );
}

// ============================================================
// 메인 컴포넌트: StatsPage
// ============================================================

export default function StatsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [analysisRecords, setAnalysisRecords] = useState<AnalysisResultRow[]>([]);
  const [weeklyRecords, setWeeklyRecords] = useState<DailyRecordRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // ============================================================
  // 데이터 로드
  // ============================================================
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const [analysisData, weeklyData] = await Promise.all([
          getAnalysisHistory(user.id),
          getWeeklyRecords(user.id),
        ]);

        setAnalysisRecords(analysisData || []);
        setWeeklyRecords(weeklyData || []);
      } catch (error) {
        console.error('Failed to fetch stats data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // ============================================================
  // 차트 데이터 계산
  // ============================================================

  // 점수 추이 데이터 (최근 10개)
  const scoreChartData: ChartDataPoint[] = useMemo(() => {
    return analysisRecords
      .slice(0, 10)
      .reverse()
      .map((record) => ({
        date: record.created_at,
        score: record.overall_score,
        displayDate: formatDate(record.created_at),
      }));
  }, [analysisRecords]);

  // 레이더 차트 데이터 (최근 분석 결과)
  const radarChartData: RadarDataPoint[] = useMemo(() => {
    if (analysisRecords.length === 0) return [];

    const latest = analysisRecords[0];

    // 기본 상체 분석 항목
    const upperBodyData: RadarDataPoint[] = [
      { subject: '거북목', value: latest.head_forward, fullMark: 100 },
      { subject: '라운드숄더', value: latest.shoulder_balance, fullMark: 100 },
    ];

    // [하체 분석 - 추후 활성화 예정] features.ts의 LOWER_BODY_ANALYSIS_ENABLED로 제어
    const lowerBodyData: RadarDataPoint[] = LOWER_BODY_ANALYSIS_ENABLED
      ? [
          { subject: '골반 균형', value: latest.pelvic_tilt, fullMark: 100 },
          { subject: '무릎 정렬', value: latest.knee_alignment, fullMark: 100 },
        ]
      : [];

    return [...upperBodyData, ...lowerBodyData];
  }, [analysisRecords]);

  // 주간 활동 데이터
  const weeklyActivityData: WeeklyActivityData[] = useMemo(() => {
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    const today = new Date();
    const todayDay = today.getDay();
    const adjustedTodayIndex = todayDay === 0 ? 6 : todayDay - 1;

    const mondayOffset = todayDay === 0 ? -6 : 1 - todayDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    return days.map((day, index) => {
      const currentDate = new Date(monday);
      currentDate.setDate(monday.getDate() + index);
      const dateStr = currentDate.toISOString().split('T')[0];

      const record = weeklyRecords.find((r) => r.date === dateStr);

      return {
        day,
        value: record ? record.exercises_completed : 0,
        isToday: index === adjustedTodayIndex,
      };
    });
  }, [weeklyRecords]);

  // 통계 요약
  const stats = useMemo(() => {
    if (analysisRecords.length === 0) {
      return {
        averageScore: 0,
        bestScore: 0,
        totalAnalyses: 0,
        scoreChange: 0,
        streak: 0,
      };
    }

    const scores = analysisRecords.map((r) => r.overall_score);
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const bestScore = Math.max(...scores);
    const totalAnalyses = analysisRecords.length;

    const scoreChange =
      analysisRecords.length >= 2
        ? getScoreChange(analysisRecords[0].overall_score, analysisRecords[1].overall_score)
        : 0;

    const latestWeeklyRecord = weeklyRecords[weeklyRecords.length - 1];
    const streak = latestWeeklyRecord?.streak_count || 0;

    return { averageScore, bestScore, totalAnalyses, scoreChange, streak };
  }, [analysisRecords, weeklyRecords]);

  // ============================================================
  // 로딩 상태
  // ============================================================
  if (isLoading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen bg-background pb-24">
          <div className="px-5 pt-5 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-48 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </SidebarLayout>
    );
  }

  // ============================================================
  // 데이터 없음 상태
  // ============================================================
  if (!user || analysisRecords.length === 0) {
    return (
      <SidebarLayout>
        <div className="min-h-screen bg-background pb-24">
          <motion.div
            className="px-5 pt-5"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}>
              <Card className="text-center">
                <CardContent className="p-8">
                  <div className="w-20 h-20 mx-auto mb-5 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <BarChart3 className="w-10 h-10 text-primary" />
                  </div>

                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    아직 통계 데이터가 없습니다
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    자세 분석을 시작하면
                    <br />
                    이곳에서 통계를 확인할 수 있어요!
                  </p>

                  <Button
                    onClick={() => router.push('/analyze')}
                    size="lg"
                    className="font-semibold"
                  >
                    자세 분석 시작하기
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </SidebarLayout>
    );
  }

  // ============================================================
  // 메인 렌더링
  // ============================================================
  return (
    <SidebarLayout>
      <div className="min-h-screen bg-background pb-24">
        {/* 페이지 헤더 */}
        <motion.div
          className="bg-card px-5 py-6 border-b border-border"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-8 w-8"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold text-foreground">통계</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-11">
            자세 분석 데이터를 한눈에 확인하세요
          </p>
        </motion.div>

        {/* 탭 네비게이션 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-5 pt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">요약</TabsTrigger>
              <TabsTrigger value="trend">추이</TabsTrigger>
              <TabsTrigger value="detail">상세</TabsTrigger>
            </TabsList>
          </div>

          {/* 요약 탭 */}
          <TabsContent value="overview">
            <motion.div
              className="px-5 pt-5 space-y-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* 주요 지표 카드 */}
              <motion.div
                className="grid grid-cols-2 gap-4"
                variants={itemVariants}
              >
                {/* 평균 점수 */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Target className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm text-muted-foreground">평균 점수</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{stats.averageScore}</span>
                      <span className="text-sm text-muted-foreground">점</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 최고 점수 */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-yellow-500/100/10 flex items-center justify-center">
                        <Award className="w-4 h-4 text-yellow-500" />
                      </div>
                      <span className="text-sm text-muted-foreground">최고 점수</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{stats.bestScore}</span>
                      <span className="text-sm text-muted-foreground">점</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 총 분석 횟수 */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/100/10 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-blue-500" />
                      </div>
                      <span className="text-sm text-muted-foreground">총 분석</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{stats.totalAnalyses}</span>
                      <span className="text-sm text-muted-foreground">회</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 연속 기록 */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <Flame className="w-4 h-4 text-orange-500" />
                      </div>
                      <span className="text-sm text-muted-foreground">연속</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{stats.streak}</span>
                      <span className="text-sm text-muted-foreground">일</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* 점수 변화 카드 */}
              <motion.div variants={itemVariants}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          이전 대비 변화
                        </p>
                        <div className="flex items-center gap-2">
                          {stats.scoreChange > 0 ? (
                            <TrendingUp className="w-5 h-5 text-green-500" />
                          ) : stats.scoreChange < 0 ? (
                            <TrendingDown className="w-5 h-5 text-red-500" />
                          ) : (
                            <Activity className="w-5 h-5 text-muted-foreground" />
                          )}
                          <span
                            className={`text-2xl font-bold ${
                              stats.scoreChange > 0
                                ? 'text-green-500'
                                : stats.scoreChange < 0
                                  ? 'text-red-500'
                                  : ''
                            }`}
                          >
                            {stats.scoreChange > 0 ? '+' : ''}
                            {stats.scoreChange}점
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/history')}
                      >
                        기록 보기
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* 주간 활동 차트 */}
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      이번 주 활동
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-end h-24 gap-2">
                      {weeklyActivityData.map((item, index) => (
                        <div
                          key={index}
                          className="flex flex-col items-center gap-1 flex-1"
                        >
                          <div
                            className={`w-full max-w-[32px] rounded-t-md transition-all ${
                              item.isToday
                                ? 'bg-primary'
                                : item.value > 0
                                  ? 'bg-primary/60'
                                  : 'bg-muted'
                            }`}
                            style={{
                              height: `${Math.max(8, (item.value / 5) * 60)}px`,
                            }}
                          />
                          <span
                            className={`text-xs ${
                              item.isToday
                                ? 'text-primary font-bold'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {item.day}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* 추이 탭 */}
          <TabsContent value="trend">
            <motion.div
              className="px-5 pt-5 space-y-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* 점수 추이 라인 차트 */}
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      점수 추이
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={scoreChartData}>
                          <defs>
                            <linearGradient
                              id="colorScore"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="hsl(var(--primary))"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="hsl(var(--primary))"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                          />
                          <XAxis
                            dataKey="displayDate"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis
                            domain={[0, 100]}
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="score"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            fill="url(#colorScore)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* 평균 비교 */}
              <motion.div variants={itemVariants}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          최근 5회 평균
                        </p>
                        <span className="text-2xl font-bold">
                          {analysisRecords.length > 0
                            ? Math.round(
                                analysisRecords
                                  .slice(0, 5)
                                  .reduce((a, b) => a + b.overall_score, 0) /
                                  Math.min(5, analysisRecords.length)
                              )
                            : 0}
                          점
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-1">
                          전체 평균
                        </p>
                        <span className="text-2xl font-bold">
                          {stats.averageScore}점
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* 상세 탭 */}
          <TabsContent value="detail">
            <motion.div
              className="px-5 pt-5 space-y-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* 레이더 차트 */}
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      항목별 분석
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart
                          cx="50%"
                          cy="50%"
                          outerRadius="80%"
                          data={radarChartData}
                        >
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                          />
                          <PolarRadiusAxis
                            angle={30}
                            domain={[0, 100]}
                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <Radar
                            name="점수"
                            dataKey="value"
                            stroke="hsl(var(--primary))"
                            fill="hsl(var(--primary))"
                            fillOpacity={0.3}
                            strokeWidth={2}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* 항목별 상세 점수 */}
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">최근 분석 상세</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {radarChartData.map((item) => {
                      const grade = getScoreGrade(item.value);
                      return (
                        <div
                          key={item.subject}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm">{item.subject}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${item.value}%` }}
                              />
                            </div>
                            <span className={`text-sm font-semibold ${grade.color}`}>
                              {item.value}점
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </motion.div>

              {/* 개선 팁 */}
              <motion.div variants={itemVariants}>
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                        <Activity className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground mb-1">
                          개선 포인트
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {radarChartData.length > 0 &&
                            (() => {
                              const lowest = radarChartData.reduce((a, b) =>
                                a.value < b.value ? a : b
                              );
                              return `${lowest.subject} 항목이 ${lowest.value}점으로 가장 낮습니다. 관련 운동을 꾸준히 해보세요.`;
                            })()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarLayout>
  );
}
