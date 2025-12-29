/**
 * 대시보드 컴포넌트 - Calm 스타일
 *
 * 차분하고 미니멀한 디자인
 * - 밝은 배경 (#F8FAFC)
 * - 화이트 카드 + 얇은 보더
 * - 블루 포인트 (#3B82F6)
 */

'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Camera,
  Dumbbell,
  ChevronRight,
  LogOut,
  Calendar,
  Lightbulb,
  MoveVertical,
  StretchHorizontal,
  LucideIcon,
  Target,
} from 'lucide-react';
import useStore, { useAnalysisResult } from '@/store/useStore';
import { useAuth } from '@/components/providers/AuthProvider';
import { getWeeklyRecords } from '@/lib/supabase';
import AppHeader from '@/components/layout/AppHeader';
import { LOWER_BODY_ANALYSIS_ENABLED } from '@/constants/features';

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

interface Exercise {
  id: string;
  name: string;
  duration: string;
  difficulty: '초급' | '중급' | '고급';
  description: string;
  icon: LucideIcon;
}

// ============================================================
// 유틸리티 함수
// ============================================================

function getDefaultWeeklyRecord(): WeeklyRecordItem[] {
  const today = new Date();
  const koreanDays = ['일', '월', '화', '수', '목', '금', '토'];

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

function getTodayDateString(): string {
  const today = new Date();
  const month = today.getMonth() + 1;
  const date = today.getDate();
  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const dayName = dayNames[today.getDay()];
  return `${month}월 ${date}일 ${dayName}`;
}

function getScoreMessage(score: number): { text: string; subText: string } {
  if (score >= 90) return { text: '훌륭해요!', subText: '자세가 매우 좋습니다' };
  if (score >= 80) return { text: '좋아요!', subText: '조금만 신경쓰면 완벽해요' };
  if (score >= 70) return { text: '양호한 편이에요', subText: '꾸준히 관리해보세요' };
  if (score >= 60) return { text: '주의가 필요해요', subText: '운동을 시작해보세요' };
  return { text: '교정이 필요해요', subText: '전문가 상담을 권장드려요' };
}

// ============================================================
// 추천 운동 데이터
// ============================================================

const allExercises: Exercise[] = [
  {
    id: 'forward_head',
    name: '목 스트레칭',
    duration: '5분',
    difficulty: '초급',
    description: '거북목 교정에 효과적',
    icon: MoveVertical,
  },
  {
    id: 'round_shoulder',
    name: '어깨 교정',
    duration: '10분',
    difficulty: '중급',
    description: '라운드숄더 개선',
    icon: Dumbbell,
  },
  {
    id: 'pelvis_tilt',
    name: '코어 강화',
    duration: '10분',
    difficulty: '중급',
    description: '골반 균형 회복',
    icon: Target,
  },
  {
    id: 'full_body',
    name: '전신 스트레칭',
    duration: '15분',
    difficulty: '초급',
    description: '전체적인 유연성 향상',
    icon: StretchHorizontal,
  },
];

const defaultExercises: Exercise[] = allExercises.filter((ex) => {
  if (ex.id === 'pelvis_tilt') {
    return LOWER_BODY_ANALYSIS_ENABLED;
  }
  return true;
});

// ============================================================
// 애니메이션 설정
// ============================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
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
// 컴포넌트: 원형 프로그레스
// ============================================================

interface ScoreCircleProps {
  value: number;
  size?: number;
  strokeWidth?: number;
}

function ScoreCircle({ value, size = 120, strokeWidth = 10 }: ScoreCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-gray-100"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-blue-500"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-4xl font-bold text-gray-800"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {value}
        </motion.span>
        <span className="text-sm text-gray-500">점</span>
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

  const rawName = user?.user_metadata?.name;
  const isValidName =
    rawName &&
    !/[\uFFFD\u00EF\u00BF\u00BD]/.test(rawName) &&
    !/^[\x00-\x1F\x7F-\x9F\u2028\u2029]+$/.test(rawName);
  const userName = isValidName
    ? rawName
    : user?.email?.split('@')[0] || '사용자';

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

  const completedDays = weeklyRecord.filter((r) => r.completed).length;
  const overallScore = analysisResult?.overallScore ?? 0;
  const normalItemsCount =
    analysisResult?.items.filter((item) => item.grade === 'good').length ?? 0;
  const totalItemsCount = analysisResult?.items.length ?? 0;
  const scoreMessage = getScoreMessage(overallScore);

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
        className="min-h-screen bg-slate-50 pb-32 pt-14"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* 상단 헤더 */}
        <motion.header
          className="bg-white px-6 pt-6 pb-5 border-b border-gray-100"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 flex items-center gap-1.5 mb-1">
                <Calendar className="w-4 h-4" />
                {getTodayDateString()}
              </p>
              <h1 className="text-xl font-semibold text-gray-800">
                안녕하세요, {userName}님
              </h1>
            </div>

            <button
              onClick={() => signOut()}
              className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
              title="로그아웃"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </motion.header>

        {/* 메인 콘텐츠 */}
        <div className="px-6 py-6 space-y-5">
          {/* 메인 점수 카드 */}
          <motion.section variants={itemVariants}>
            {analysisResult ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-4">
                  <ScoreCircle value={overallScore} size={90} strokeWidth={7} />

                  <div className="flex-1">
                    <span className="text-xs text-gray-400">종합 자세 점수</span>

                    <h2 className="text-lg font-semibold text-gray-800 mt-0.5">
                      {scoreMessage.text}
                    </h2>

                    <p className="text-sm text-gray-500 mt-0.5">
                      {scoreMessage.subText}
                    </p>
                  </div>
                </div>

                <Link
                  href="/result"
                  className="mt-4 flex items-center justify-center gap-1 w-full py-2.5 bg-white hover:bg-blue-50 text-blue-500 font-medium rounded-lg border border-gray-200 transition-colors"
                >
                  상세 결과 보기
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-blue-500 to-blue-400 rounded-xl px-6 py-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">
                      첫 분석을 시작해보세요
                    </h2>
                    <p className="text-blue-100 text-sm mt-0.5">
                      AI가 자세를 분석하고 맞춤 운동을 추천해드려요
                    </p>
                  </div>
                </div>

                <Link
                  href="/analyze"
                  className="mt-4 flex items-center justify-center gap-1 w-full py-2.5 bg-white text-blue-600 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  자세 분석 시작하기
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </motion.section>

          {/* 퀵 액션 버튼 */}
          <motion.section className="grid grid-cols-2 gap-3" variants={itemVariants}>
            <Link
              href="/analyze"
              className="flex items-center justify-center gap-2 h-14 bg-white hover:bg-blue-50 hover:border-blue-300 text-gray-700 hover:text-blue-600 font-medium rounded-xl border border-gray-200 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span className="text-sm">{analysisResult ? '다시 분석' : '자세 분석'}</span>
            </Link>

            <Link
              href="/exercise"
              className="flex items-center justify-center gap-2 h-14 bg-white hover:bg-blue-50 hover:border-blue-300 text-gray-700 hover:text-blue-600 font-medium rounded-xl border border-gray-200 transition-all"
            >
              <Dumbbell className="w-4 h-4" />
              <span className="text-sm">{currentExerciseIndex > 0 ? '이어하기' : '운동 시작'}</span>
            </Link>
          </motion.section>

          {/* 추천 운동 - 새로운 Calm 스타일 */}
          <motion.section variants={itemVariants}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-800">
                {analysisResult ? '맞춤 추천 운동' : '추천 운동'}
              </span>
              <Link href="/exercise" className="text-sm text-gray-400 hover:text-blue-500 flex items-center gap-0.5 transition-colors">
                전체 보기
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* 운동 카드 목록 - 심플한 리스트 형태 */}
            <div className="space-y-2">
              {recommendedExercises.slice(0, 3).map((exercise, index) => (
                <motion.div
                  key={exercise.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                >
                  <Link href={`/exercise?type=${exercise.id}`}>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center hover:border-blue-300 hover:bg-blue-50/30 transition-all group">
                      {/* 왼쪽 컬러 바 */}
                      <div className={`w-1 h-12 rounded-full mr-4 ${
                        exercise.difficulty === '초급'
                          ? 'bg-emerald-400'
                          : exercise.difficulty === '중급'
                            ? 'bg-blue-400'
                            : 'bg-amber-400'
                      }`} />

                      {/* 텍스트 정보 */}
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">
                          {exercise.name}
                        </h3>
                        <p className="text-sm text-gray-500">{exercise.description}</p>
                      </div>

                      {/* 오른쪽 난이도 + 화살표 */}
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          exercise.difficulty === '초급'
                            ? 'bg-emerald-50 text-emerald-600'
                            : exercise.difficulty === '중급'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-amber-50 text-amber-600'
                        }`}>
                          {exercise.difficulty}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* 이번 주 기록 - 컴팩트 버전 */}
          <motion.section variants={itemVariants}>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-gray-800 text-sm">이번 주</span>
                <Link href="/stats" className="text-xs text-gray-400 hover:text-blue-500 flex items-center gap-1 transition-colors">
                  통계
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {/* 주간 막대 - 작은 버전 */}
              <div className="flex justify-between items-end gap-1.5">
                {weeklyRecord.map((record) => (
                  <div key={record.date} className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className={`w-full max-w-[24px] h-8 rounded ${
                        record.completed
                          ? 'bg-blue-500'
                          : record.isToday
                            ? 'bg-blue-100'
                            : 'bg-gray-100'
                      }`}
                    />
                    <span
                      className={`text-[10px] ${
                        record.isToday
                          ? 'text-blue-500 font-semibold'
                          : 'text-gray-400'
                      }`}
                    >
                      {record.day}
                    </span>
                  </div>
                ))}
              </div>

              {/* 주간 달성률 */}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-400">주간 달성률</span>
                <span className="text-sm font-semibold text-gray-800">{Math.round((completedDays / 7) * 100)}%</span>
              </div>
            </div>
          </motion.section>

          {/* 오늘의 팁 */}
          <motion.section variants={itemVariants}>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm mb-1">오늘의 팁</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    30분마다 간단한 스트레칭을 하면 거북목 예방에 효과적이에요.
                    <span className="text-blue-500 font-medium ml-1">꾸준함이 중요해요.</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </motion.div>
    </>
  );
}
