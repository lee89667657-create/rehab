/**
 * AnalysisCard.tsx
 * 운동 분석 카드 컴포넌트
 * - 운동 수행에 대한 상세 분석 정보 표시
 * - 잘한 점, 개선할 점 피드백 제공
 * - 관절별 각도 분석 그래프
 * - 이전 기록과의 비교 데이터
 */

'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Minus,
  Activity,
  BarChart3,
  Lightbulb,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// ============================================================
// 타입 정의
// ============================================================

export interface JointAngleData {
  name: string;           // 관절 이름
  current: number;        // 현재 각도
  target: number;         // 목표 각도
  min: number;           // 최소 허용 각도
  max: number;           // 최대 허용 각도
  unit?: string;          // 단위
}

export interface FeedbackItem {
  type: 'positive' | 'improvement';
  title: string;
  description: string;
}

export interface ComparisonData {
  label: string;
  current: number;
  previous: number;
  unit?: string;
}

export interface AnalysisCardProps {
  /** 관절별 각도 데이터 */
  jointAngles?: JointAngleData[];
  /** 피드백 목록 */
  feedback?: FeedbackItem[];
  /** 이전 기록과의 비교 */
  comparison?: ComparisonData[];
  /** 전체 정확도 (0-100) */
  overallAccuracy?: number;
  /** 운동 이름 */
  exerciseName?: string;
  /** 총 반복 횟수 */
  totalReps?: number;
  /** 성공한 반복 횟수 */
  successfulReps?: number;
}

// ============================================================
// 기본 데이터
// ============================================================

const DEFAULT_JOINT_ANGLES: JointAngleData[] = [
  { name: '어깨 각도', current: 85, target: 90, min: 80, max: 100 },
  { name: '팔꿈치 각도', current: 92, target: 90, min: 85, max: 95 },
  { name: '엉덩이 각도', current: 88, target: 90, min: 80, max: 100 },
  { name: '무릎 각도', current: 95, target: 90, min: 85, max: 95 },
];

const DEFAULT_FEEDBACK: FeedbackItem[] = [
  {
    type: 'positive',
    title: '안정적인 자세 유지',
    description: '운동 중 균형을 잘 유지했어요. 흔들림 없이 자세를 잘 잡았습니다.',
  },
  {
    type: 'positive',
    title: '일정한 속도',
    description: '동작을 일정한 속도로 수행했어요. 반복 간 일관성이 좋습니다.',
  },
  {
    type: 'improvement',
    title: '팔 각도 조정 필요',
    description: '팔을 조금 더 높이 올려보세요. 목표 각도보다 약간 낮았습니다.',
  },
  {
    type: 'improvement',
    title: '호흡 타이밍',
    description: '동작과 호흡을 맞춰보세요. 올릴 때 내쉬고, 내릴 때 들이마시세요.',
  },
];

const DEFAULT_COMPARISON: ComparisonData[] = [
  { label: '평균 정확도', current: 87, previous: 82, unit: '%' },
  { label: '완료 횟수', current: 12, previous: 10, unit: '회' },
  { label: '운동 시간', current: 8, previous: 10, unit: '분' },
];

// ============================================================
// 유틸리티 함수
// ============================================================

function getAngleStatus(current: number, target: number, min: number, max: number): {
  status: 'good' | 'warning' | 'danger';
  message: string;
  percentage: number;
} {
  const diff = Math.abs(current - target);
  const range = max - min;
  const tolerance = range * 0.1; // 10% 허용 오차

  if (diff <= tolerance) {
    return { status: 'good', message: '정확함', percentage: 100 - (diff / range) * 50 };
  } else if (diff <= tolerance * 2) {
    return { status: 'warning', message: '약간 벗어남', percentage: 80 - (diff / range) * 30 };
  } else {
    return { status: 'danger', message: '조정 필요', percentage: 50 - (diff / range) * 20 };
  }
}

function getComparisonIcon(current: number, previous: number) {
  if (current > previous) return <ArrowUpRight className="w-4 h-4 text-emerald-500" />;
  if (current < previous) return <ArrowDownRight className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

// ============================================================
// 서브 컴포넌트: 관절 각도 바
// ============================================================

interface JointAngleBarProps {
  data: JointAngleData;
  index: number;
}

function JointAngleBar({ data, index }: JointAngleBarProps) {
  const status = getAngleStatus(data.current, data.target, data.min, data.max);
  const range = data.max - data.min;
  const currentPosition = ((data.current - data.min) / range) * 100;
  const targetPosition = ((data.target - data.min) / range) * 100;

  const statusColors = {
    good: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  };

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{data.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {data.current}{data.unit || '°'}
          </span>
          <Badge
            variant="outline"
            className={`text-xs ${
              status.status === 'good'
                ? 'border-emerald-500 text-emerald-600'
                : status.status === 'warning'
                ? 'border-amber-500 text-amber-600'
                : 'border-red-500 text-red-600'
            }`}
          >
            {status.message}
          </Badge>
        </div>
      </div>

      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        {/* 허용 범위 표시 */}
        <div className="absolute inset-0 bg-muted" />

        {/* 현재 값 바 */}
        <motion.div
          className={`absolute h-full ${statusColors[status.status]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(5, currentPosition)}%` }}
          transition={{ duration: 0.6, delay: index * 0.1 }}
        />

        {/* 목표 마커 */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-foreground/50"
          style={{ left: `${targetPosition}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-foreground/50" />
        </div>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{data.min}{data.unit || '°'}</span>
        <span className="text-primary font-medium">목표: {data.target}{data.unit || '°'}</span>
        <span>{data.max}{data.unit || '°'}</span>
      </div>
    </motion.div>
  );
}

// ============================================================
// 서브 컴포넌트: 피드백 섹션
// ============================================================

interface FeedbackSectionProps {
  items: FeedbackItem[];
  isExpanded: boolean;
  onToggle: () => void;
}

function FeedbackSection({ items, isExpanded, onToggle }: FeedbackSectionProps) {
  const positiveItems = items.filter((f) => f.type === 'positive');
  const improvementItems = items.filter((f) => f.type === 'improvement');

  return (
    <div className="space-y-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">피드백</span>
          <Badge variant="secondary" className="text-xs">
            {items.length}개
          </Badge>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 overflow-hidden"
          >
            {/* 잘한 점 */}
            {positiveItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  잘한 점
                </p>
                <div className="space-y-2">
                  {positiveItems.map((item, idx) => (
                    <motion.div
                      key={idx}
                      className="p-3 bg-emerald-50 rounded-xl border border-emerald-100"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <p className="font-medium text-emerald-700 text-sm">{item.title}</p>
                      <p className="text-xs text-emerald-600 mt-0.5">{item.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* 개선할 점 */}
            {improvementItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  개선할 점
                </p>
                <div className="space-y-2">
                  {improvementItems.map((item, idx) => (
                    <motion.div
                      key={idx}
                      className="p-3 bg-amber-50 rounded-xl border border-amber-100"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 + 0.2 }}
                    >
                      <p className="font-medium text-amber-700 text-sm">{item.title}</p>
                      <p className="text-xs text-amber-600 mt-0.5">{item.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// 서브 컴포넌트: 비교 섹션
// ============================================================

interface ComparisonSectionProps {
  data: ComparisonData[];
}

function ComparisonSection({ data }: ComparisonSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <span className="font-semibold text-foreground">이전 기록과 비교</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {data.map((item, idx) => {
          const diff = item.current - item.previous;
          const isPositive = diff > 0;
          const isNeutral = diff === 0;

          return (
            <motion.div
              key={idx}
              className="p-3 bg-muted/50 rounded-xl text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
            >
              <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
              <p className="text-lg font-bold text-foreground">
                {item.current}{item.unit}
              </p>
              <div className="flex items-center justify-center gap-1 mt-1">
                {getComparisonIcon(item.current, item.previous)}
                <span
                  className={`text-xs font-medium ${
                    isNeutral
                      ? 'text-muted-foreground'
                      : isPositive
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }`}
                >
                  {isNeutral ? '동일' : `${isPositive ? '+' : ''}${diff}${item.unit}`}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// 메인 컴포넌트
// ============================================================

export default function AnalysisCard({
  jointAngles = DEFAULT_JOINT_ANGLES,
  feedback = DEFAULT_FEEDBACK,
  comparison = DEFAULT_COMPARISON,
  overallAccuracy = 87,
  exerciseName = '스쿼트',
  totalReps = 12,
  successfulReps = 10,
}: AnalysisCardProps) {
  const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(true);

  const successRate = useMemo(() => {
    if (totalReps === 0) return 0;
    return Math.round((successfulReps / totalReps) * 100);
  }, [totalReps, successfulReps]);

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* 헤더: 운동 요약 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{exerciseName} 분석</h3>
              <p className="text-sm text-muted-foreground">
                {successfulReps}/{totalReps}회 성공 ({successRate}%)
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{overallAccuracy}%</p>
            <p className="text-xs text-muted-foreground">정확도</p>
          </div>
        </div>

        {/* 정확도 바 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">전체 정확도</span>
            <span className="font-medium text-foreground">{overallAccuracy}%</span>
          </div>
          <Progress value={overallAccuracy} className="h-2" />
        </div>

        {/* 관절별 각도 분석 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">관절별 각도 분석</span>
          </div>

          <div className="space-y-4">
            {jointAngles.map((joint, idx) => (
              <JointAngleBar key={joint.name} data={joint} index={idx} />
            ))}
          </div>
        </div>

        {/* 구분선 */}
        <div className="h-px bg-border" />

        {/* 피드백 섹션 */}
        <FeedbackSection
          items={feedback}
          isExpanded={isFeedbackExpanded}
          onToggle={() => setIsFeedbackExpanded(!isFeedbackExpanded)}
        />

        {/* 구분선 */}
        <div className="h-px bg-border" />

        {/* 비교 섹션 */}
        <ComparisonSection data={comparison} />
      </CardContent>
    </Card>
  );
}
