/**
 * ScoreCard.tsx
 * 운동 점수 카드 컴포넌트
 * - 운동 수행 점수 시각화 (100점 만점)
 * - 정확도, 일관성, 범위 등 세부 점수 표시
 * - 등급 표시 (A, B, C, D, F)
 * - 애니메이션 효과로 점수 카운트업
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, TrendingUp, Zap, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// ============================================================
// 타입 정의
// ============================================================

export interface ScoreBreakdown {
  accuracy: number;      // 정확도 (0-100)
  consistency: number;   // 일관성 (0-100)
  range: number;         // 동작 범위 (0-100)
  timing: number;        // 타이밍 (0-100)
}

export interface ScoreCardProps {
  /** 총점 (0-100) */
  totalScore: number;
  /** 세부 점수 */
  breakdown?: ScoreBreakdown;
  /** 이전 점수 (비교용) */
  previousScore?: number;
  /** 최고 점수 */
  bestScore?: number;
  /** 애니메이션 활성화 */
  animate?: boolean;
  /** 컴팩트 모드 */
  compact?: boolean;
}

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * 점수를 등급으로 변환
 */
function getGrade(score: number): { letter: string; label: string; color: string; bgColor: string } {
  if (score >= 95) return { letter: 'S', label: '완벽', color: 'text-purple-600', bgColor: 'bg-purple-100' };
  if (score >= 90) return { letter: 'A+', label: '훌륭함', color: 'text-emerald-600', bgColor: 'bg-emerald-500/20' };
  if (score >= 85) return { letter: 'A', label: '우수', color: 'text-green-600', bgColor: 'bg-green-500/20' };
  if (score >= 80) return { letter: 'B+', label: '양호', color: 'text-teal-600', bgColor: 'bg-teal-100' };
  if (score >= 75) return { letter: 'B', label: '보통', color: 'text-blue-600', bgColor: 'bg-blue-500/20' };
  if (score >= 70) return { letter: 'C+', label: '노력필요', color: 'text-amber-600', bgColor: 'bg-amber-500/20' };
  if (score >= 65) return { letter: 'C', label: '부족', color: 'text-orange-600', bgColor: 'bg-orange-500/20' };
  if (score >= 60) return { letter: 'D', label: '미흡', color: 'text-red-500', bgColor: 'bg-red-500/20' };
  return { letter: 'F', label: '재도전', color: 'text-red-600', bgColor: 'bg-red-200' };
}

/**
 * 점수 변화 계산
 */
function getScoreChange(current: number, previous?: number): { value: number; isPositive: boolean } | null {
  if (previous === undefined) return null;
  const diff = current - previous;
  return { value: Math.abs(diff), isPositive: diff >= 0 };
}

// ============================================================
// 서브 컴포넌트
// ============================================================

interface CircularScoreProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  animate?: boolean;
}

function CircularScore({ score, size = 160, strokeWidth = 12, animate = true }: CircularScoreProps) {
  const [displayScore, setDisplayScore] = useState(animate ? 0 : score);
  const grade = getGrade(score);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (displayScore / 100) * circumference;

  useEffect(() => {
    if (!animate) {
      setDisplayScore(score);
      return;
    }

    const duration = 1500;
    const startTime = performance.now();

    const animateScore = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentScore = Math.round(easeProgress * score);

      setDisplayScore(currentScore);

      if (progress < 1) {
        requestAnimationFrame(animateScore);
      }
    };

    requestAnimationFrame(animateScore);
  }, [score, animate]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* 배경 원 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        {/* 점수 원 */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: animate ? 1.5 : 0, ease: 'easeOut' }}
        />
        {/* 그라데이션 정의 */}
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.6)" />
          </linearGradient>
        </defs>
      </svg>

      {/* 중앙 점수 표시 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-4xl font-bold text-foreground"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {displayScore}
        </motion.span>
        <span className="text-sm text-muted-foreground">/ 100</span>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.3 }}
        >
          <Badge className={`mt-2 ${grade.bgColor} ${grade.color} border-0`}>
            {grade.letter} - {grade.label}
          </Badge>
        </motion.div>
      </div>
    </div>
  );
}

interface BreakdownItemProps {
  icon: React.ReactNode;
  label: string;
  score: number;
  delay?: number;
}

function BreakdownItem({ icon, label, score, delay = 0 }: BreakdownItemProps) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDisplayScore(score);
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [score, delay]);

  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
    >
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="text-sm font-semibold text-primary">{displayScore}점</span>
        </div>
        <Progress value={displayScore} className="h-1.5" />
      </div>
    </motion.div>
  );
}

// ============================================================
// 메인 컴포넌트
// ============================================================

export default function ScoreCard({
  totalScore,
  breakdown,
  previousScore,
  bestScore,
  animate = true,
  compact = false,
}: ScoreCardProps) {
  const grade = useMemo(() => getGrade(totalScore), [totalScore]);
  const scoreChange = useMemo(() => getScoreChange(totalScore, previousScore), [totalScore, previousScore]);

  // 기본 세부 점수 (제공되지 않은 경우)
  const defaultBreakdown: ScoreBreakdown = useMemo(() => breakdown || {
    accuracy: Math.min(100, totalScore + Math.floor(Math.random() * 10) - 5),
    consistency: Math.min(100, totalScore + Math.floor(Math.random() * 15) - 7),
    range: Math.min(100, totalScore + Math.floor(Math.random() * 12) - 6),
    timing: Math.min(100, totalScore + Math.floor(Math.random() * 8) - 4),
  }, [breakdown, totalScore]);

  if (compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl ${grade.bgColor} flex items-center justify-center`}>
              <span className={`text-2xl font-bold ${grade.color}`}>{grade.letter}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">{totalScore}</span>
                <span className="text-sm text-muted-foreground">점</span>
                {scoreChange && (
                  <Badge variant={scoreChange.isPositive ? 'default' : 'destructive'} className="text-xs">
                    {scoreChange.isPositive ? '+' : '-'}{scoreChange.value}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{grade.label}</p>
            </div>
            {bestScore && totalScore >= bestScore && (
              <div className="flex items-center gap-1 text-amber-500">
                <Trophy className="w-5 h-5" />
                <span className="text-xs font-medium">최고기록!</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">운동 점수</h3>
              <p className="text-xs text-muted-foreground">수행 결과 분석</p>
            </div>
          </div>
          {scoreChange && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <Badge
                variant={scoreChange.isPositive ? 'default' : 'secondary'}
                className="flex items-center gap-1"
              >
                <TrendingUp className={`w-3 h-3 ${scoreChange.isPositive ? '' : 'rotate-180'}`} />
                {scoreChange.isPositive ? '+' : '-'}{scoreChange.value}점
              </Badge>
            </motion.div>
          )}
        </div>

        {/* 원형 점수 */}
        <div className="flex justify-center mb-6">
          <CircularScore score={totalScore} animate={animate} />
        </div>

        {/* 최고 기록 표시 */}
        {bestScore && totalScore >= bestScore && (
          <motion.div
            className="flex items-center justify-center gap-2 mb-6 py-2 px-4 bg-amber-500/10 rounded-xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
          >
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span className="text-sm font-semibold text-amber-700">새로운 최고 기록!</span>
          </motion.div>
        )}

        {/* 세부 점수 */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground">세부 점수</h4>
          <BreakdownItem
            icon={<Target className="w-4 h-4 text-muted-foreground" />}
            label="정확도"
            score={defaultBreakdown.accuracy}
            delay={0.5}
          />
          <BreakdownItem
            icon={<Zap className="w-4 h-4 text-muted-foreground" />}
            label="일관성"
            score={defaultBreakdown.consistency}
            delay={0.65}
          />
          <BreakdownItem
            icon={<TrendingUp className="w-4 h-4 text-muted-foreground" />}
            label="동작 범위"
            score={defaultBreakdown.range}
            delay={0.8}
          />
          <BreakdownItem
            icon={<Star className="w-4 h-4 text-muted-foreground" />}
            label="타이밍"
            score={defaultBreakdown.timing}
            delay={0.95}
          />
        </div>
      </CardContent>
    </Card>
  );
}
