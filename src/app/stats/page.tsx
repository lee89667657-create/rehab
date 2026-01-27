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
// 6개 항목 레이더 차트로 통합되어 더 이상 필요하지 않음
// import { LOWER_BODY_ANALYSIS_ENABLED } from '@/constants/features';

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
  shortName: string;
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
  if (score >= 90) return { label: '최상', color: 'text-teal-500' };
  if (score >= 75) return { label: '양호', color: 'text-teal-500' };
  if (score >= 60) return { label: '보통', color: 'text-amber-500' };
  if (score >= 45) return { label: '주의', color: 'text-rose-500' };
  return { label: '경고', color: 'text-rose-600' };
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
// 전문 레이더 차트 컴포넌트 (정육각형)
// ============================================================

interface ProfessionalRadarChartProps {
  data: RadarDataPoint[];
  size?: number;
}

function ProfessionalRadarChart({ data, size = 280 }: ProfessionalRadarChartProps) {
  if (data.length === 0) return null;

  const center = size / 2;
  const maxRadius = size * 0.38; // 외곽 반지름
  const levels = [20, 40, 60, 80, 100]; // 동심원 레벨
  const numPoints = data.length;
  const angleStep = (2 * Math.PI) / numPoints;
  const startAngle = -Math.PI / 2; // 12시 방향에서 시작

  // 각 레벨의 다각형 경로 생성
  const getLevelPath = (level: number) => {
    const radius = (level / 100) * maxRadius;
    const points = [];
    for (let i = 0; i < numPoints; i++) {
      const angle = startAngle + i * angleStep;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    return `M ${points.join(' L ')} Z`;
  };

  // 데이터 영역 경로 생성
  const getDataPath = () => {
    const points = data.map((item, i) => {
      const radius = (item.value / 100) * maxRadius;
      const angle = startAngle + i * angleStep;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      return { x, y, value: item.value };
    });
    return {
      path: `M ${points.map(p => `${p.x},${p.y}`).join(' L ')} Z`,
      points,
    };
  };

  // 축 라인 좌표 생성
  const getAxisEndpoint = (index: number) => {
    const angle = startAngle + index * angleStep;
    return {
      x: center + maxRadius * Math.cos(angle),
      y: center + maxRadius * Math.sin(angle),
    };
  };

  // 라벨 위치 계산
  const getLabelPosition = (index: number) => {
    const angle = startAngle + index * angleStep;
    const labelRadius = maxRadius + 28;
    return {
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle),
    };
  };

  // 점수 위치 계산 (데이터 포인트 바깥쪽)
  const getScorePosition = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    const scoreRadius = (value / 100) * maxRadius + 14;
    return {
      x: center + scoreRadius * Math.cos(angle),
      y: center + scoreRadius * Math.sin(angle),
    };
  };

  const dataPath = getDataPath();

  // 점수에 따른 색상
  const getScoreColor = (score: number) => {
    if (score >= 75) return '#14b8a6'; // teal-500
    if (score >= 60) return '#f59e0b'; // amber-500
    return '#f43f5e'; // rose-500
  };

  // 전체 평균 점수
  const avgScore = Math.round(data.reduce((sum, d) => sum + d.value, 0) / data.length);

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* 배경 그라데이션 정의 */}
        <defs>
          <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="dataFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* 배경 원 */}
        <circle cx={center} cy={center} r={maxRadius} fill="url(#radarBg)" />

        {/* 동심원 그리드 (20, 40, 60, 80, 100) */}
        {levels.map((level) => (
          <path
            key={level}
            d={getLevelPath(level)}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={level === 100 ? 1.5 : 0.5}
            strokeDasharray={level === 100 ? 'none' : '3 3'}
            opacity={level === 100 ? 0.6 : 0.3}
          />
        ))}

        {/* 레벨 숫자 표시 (오른쪽 축에) */}
        {levels.map((level) => {
          const radius = (level / 100) * maxRadius;
          return (
            <text
              key={`label-${level}`}
              x={center + radius + 3}
              y={center - 3}
              fontSize="8"
              fill="hsl(var(--muted-foreground))"
              opacity="0.5"
            >
              {level}
            </text>
          );
        })}

        {/* 축 라인 */}
        {data.map((_, i) => {
          const end = getAxisEndpoint(i);
          return (
            <line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
              opacity="0.4"
            />
          );
        })}

        {/* 데이터 영역 (반투명 채우기) */}
        <path
          d={dataPath.path}
          fill="url(#dataFill)"
          stroke="#14b8a6"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* 데이터 포인트 */}
        {dataPath.points.map((point, i) => (
          <g key={`point-${i}`}>
            {/* 외곽 원 */}
            <circle
              cx={point.x}
              cy={point.y}
              r="6"
              fill="hsl(var(--background))"
              stroke={getScoreColor(point.value)}
              strokeWidth="2"
            />
            {/* 내부 점 */}
            <circle
              cx={point.x}
              cy={point.y}
              r="3"
              fill={getScoreColor(point.value)}
            />
          </g>
        ))}

        {/* 라벨 (항목명) */}
        {data.map((item, i) => {
          const pos = getLabelPosition(i);
          const isTop = i === 0;
          const isBottom = i === 3;
          const isLeft = i === 4 || i === 5;

          return (
            <text
              key={`label-${i}`}
              x={pos.x}
              y={pos.y}
              fontSize="11"
              fontWeight="500"
              fill="hsl(var(--foreground))"
              textAnchor={isLeft ? 'end' : i === 1 || i === 2 ? 'start' : 'middle'}
              dominantBaseline={isTop ? 'auto' : isBottom ? 'hanging' : 'middle'}
            >
              {item.shortName}
            </text>
          );
        })}

        {/* 점수 표시 (각 꼭짓점 근처) */}
        {data.map((item, i) => {
          const pos = getScorePosition(i, item.value);
          return (
            <text
              key={`score-${i}`}
              x={pos.x}
              y={pos.y}
              fontSize="9"
              fontWeight="600"
              fill={getScoreColor(item.value)}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {item.value}
            </text>
          );
        })}

        {/* 중앙 평균 점수 */}
        <circle
          cx={center}
          cy={center}
          r="24"
          fill="hsl(var(--background))"
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />
        <text
          x={center}
          y={center - 4}
          fontSize="16"
          fontWeight="700"
          fill="hsl(var(--foreground))"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {avgScore}
        </text>
        <text
          x={center}
          y={center + 10}
          fontSize="8"
          fill="hsl(var(--muted-foreground))"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          평균
        </text>
      </svg>

      {/* 범례 */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
          <span>양호 (75+)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>보통 (60-74)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>주의 (&lt;60)</span>
        </div>
      </div>
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

  // 레이더 차트 데이터 (최근 분석 결과) - 6개 항목
  const radarChartData: RadarDataPoint[] = useMemo(() => {
    if (analysisRecords.length === 0) return [];

    const latest = analysisRecords[0];

    // 6개 항목의 정육각형 레이더 차트
    // 실제 데이터가 없는 항목은 관련 점수에서 추정
    const headForward = latest.head_forward || 65;
    const shoulderBalance = latest.shoulder_balance || 65;
    const pelvicTilt = latest.pelvic_tilt || 65;
    const kneeAlignment = latest.knee_alignment || 65;

    // 라운드숄더: 어깨 균형 점수와 거북목 점수의 평균 (연관성 있음)
    const roundShoulder = Math.round((shoulderBalance * 0.6 + headForward * 0.4));
    // 허리 전만: 골반 점수와 무릎 점수의 평균 (하체 연관성)
    const lumbarLordosis = Math.round((pelvicTilt * 0.7 + kneeAlignment * 0.3));

    return [
      { subject: '거북목', shortName: '거북목', value: headForward, fullMark: 100 },
      { subject: '라운드숄더', shortName: '라운드숄더', value: roundShoulder, fullMark: 100 },
      { subject: '어깨 균형', shortName: '어깨', value: shoulderBalance, fullMark: 100 },
      { subject: '골반 균형', shortName: '골반', value: pelvicTilt, fullMark: 100 },
      { subject: '허리 전만', shortName: '허리', value: lumbarLordosis, fullMark: 100 },
      { subject: '무릎 정렬', shortName: '무릎', value: kneeAlignment, fullMark: 100 },
    ];
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
              {/* 전문 레이더 차트 (정육각형) */}
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      자세 분석 종합
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      6개 항목의 균형 상태를 한눈에 확인하세요
                    </p>
                  </CardHeader>
                  <CardContent className="flex justify-center py-4">
                    <ProfessionalRadarChart data={radarChartData} size={300} />
                  </CardContent>
                </Card>
              </motion.div>

              {/* 항목별 상세 점수 */}
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">항목별 상세 점수</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {radarChartData.map((item) => {
                      const getBarColor = (score: number) => {
                        if (score >= 75) return 'bg-teal-500';
                        if (score >= 60) return 'bg-amber-500';
                        return 'bg-rose-500';
                      };
                      const getTextColor = (score: number) => {
                        if (score >= 75) return 'text-teal-500';
                        if (score >= 60) return 'text-amber-500';
                        return 'text-rose-500';
                      };
                      return (
                        <div
                          key={item.subject}
                          className="flex items-center gap-3"
                        >
                          <span className="text-sm text-muted-foreground w-20 flex-shrink-0">{item.subject}</span>
                          <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${getBarColor(item.value)}`}
                                style={{ width: `${item.value}%` }}
                              />
                            </div>
                            <span className={`text-sm font-bold w-10 text-right ${getTextColor(item.value)}`}>
                              {item.value}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </motion.div>

              {/* 개선 포인트 */}
              <motion.div variants={itemVariants}>
                <Card className="border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-transparent">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center flex-shrink-0">
                        <Activity className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-foreground mb-2">
                          개선 포인트
                        </h3>
                        {radarChartData.length > 0 && (() => {
                          // 가장 낮은 점수 2개 항목 찾기
                          const sorted = [...radarChartData].sort((a, b) => a.value - b.value);
                          const lowest = sorted[0];
                          const secondLowest = sorted[1];

                          const getRecommendation = (subject: string) => {
                            const recommendations: Record<string, string> = {
                              '거북목': '목 스트레칭과 턱 당기기 운동',
                              '라운드숄더': '가슴 스트레칭과 등 근육 강화',
                              '어깨 균형': '한쪽 어깨 스트레칭과 균형 운동',
                              '골반 균형': '골반 교정 스트레칭',
                              '허리 전만': '코어 강화 운동과 복근 운동',
                              '무릎 정렬': '하체 근력 운동과 스트레칭',
                            };
                            return recommendations[subject] || '관련 운동';
                          };

                          return (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-rose-500 font-semibold">1순위:</span>
                                <span className="text-muted-foreground">
                                  {lowest.subject} ({lowest.value}점) - {getRecommendation(lowest.subject)}
                                </span>
                              </div>
                              {secondLowest.value < 75 && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-amber-500 font-semibold">2순위:</span>
                                  <span className="text-muted-foreground">
                                    {secondLowest.subject} ({secondLowest.value}점) - {getRecommendation(secondLowest.subject)}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
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
