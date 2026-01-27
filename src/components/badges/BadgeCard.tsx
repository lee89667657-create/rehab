/**
 * BadgeCard 컴포넌트
 *
 * 개별 뱃지를 표시하는 미니멀한 카드 컴포넌트입니다.
 * 달성 여부에 따라 다른 스타일로 표시됩니다.
 */

'use client';

import {
  Target,
  Flame,
  TrendingUp,
  CheckCircle,
  Trophy,
  Lock,
} from 'lucide-react';
import type { BadgeDefinition, UserBadge } from '@/types/badges';
import { formatEarnedDate } from '@/lib/badgeSystem';

// ============================================================
// 타입 정의
// ============================================================

interface BadgeCardProps {
  definition: BadgeDefinition;
  userBadge: UserBadge;
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================
// 아이콘 매핑
// ============================================================

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Target,
  Flame,
  TrendingUp,
  CheckCircle,
  Trophy,
};

// ============================================================
// 색상 매핑
// ============================================================

const colorMap: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  teal: {
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/50',
    icon: 'text-teal-400',
    text: 'text-teal-400',
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/50',
    icon: 'text-orange-400',
    text: 'text-orange-400',
  },
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/50',
    icon: 'text-red-400',
    text: 'text-red-400',
  },
  green: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/50',
    icon: 'text-green-400',
    text: 'text-green-400',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/50',
    icon: 'text-emerald-400',
    text: 'text-emerald-400',
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/50',
    icon: 'text-blue-400',
    text: 'text-blue-400',
  },
  yellow: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/50',
    icon: 'text-yellow-400',
    text: 'text-yellow-400',
  },
};

const lockedColors = {
  bg: 'bg-slate-800/50',
  border: 'border-slate-700/50',
  icon: 'text-slate-600',
  text: 'text-slate-500',
};

// ============================================================
// 컴포넌트
// ============================================================

export default function BadgeCard({ definition, userBadge, size = 'md' }: BadgeCardProps) {
  const isEarned = userBadge.earnedAt !== null;
  const IconComponent = iconMap[definition.icon] || Target;
  const colors = isEarned ? colorMap[definition.color] || colorMap.teal : lockedColors;

  // 사이즈별 스타일
  const sizeStyles = {
    sm: {
      card: 'p-2.5',
      icon: 'w-6 h-6',
      iconWrapper: 'w-10 h-10',
      title: 'text-xs',
      desc: 'text-[10px]',
      date: 'text-[9px]',
    },
    md: {
      card: 'p-3',
      icon: 'w-7 h-7',
      iconWrapper: 'w-12 h-12',
      title: 'text-sm',
      desc: 'text-xs',
      date: 'text-[10px]',
    },
    lg: {
      card: 'p-4',
      icon: 'w-8 h-8',
      iconWrapper: 'w-14 h-14',
      title: 'text-base',
      desc: 'text-sm',
      date: 'text-xs',
    },
  };

  const styles = sizeStyles[size];

  return (
    <div
      className={`
        relative rounded-xl border ${colors.border} ${colors.bg}
        ${styles.card} transition-all duration-200
        ${isEarned ? 'hover:scale-[1.02]' : 'opacity-60'}
      `}
    >
      <div className="flex items-center gap-3">
        {/* 아이콘 */}
        <div
          className={`
            ${styles.iconWrapper} rounded-xl flex items-center justify-center
            ${isEarned ? colors.bg : 'bg-slate-800/80'}
          `}
        >
          {isEarned ? (
            <IconComponent className={`${styles.icon} ${colors.icon}`} />
          ) : (
            <Lock className={`${styles.icon} ${lockedColors.icon}`} />
          )}
        </div>

        {/* 텍스트 */}
        <div className="flex-1 min-w-0">
          <h4
            className={`
              ${styles.title} font-semibold truncate
              ${isEarned ? 'text-foreground' : 'text-slate-500'}
            `}
          >
            {definition.name}
          </h4>
          <p
            className={`
              ${styles.desc} truncate
              ${isEarned ? 'text-muted-foreground' : 'text-slate-600'}
            `}
          >
            {definition.description}
          </p>
          {isEarned && userBadge.earnedAt && (
            <p className={`${styles.date} ${colors.text} mt-0.5`}>
              {formatEarnedDate(userBadge.earnedAt)}
            </p>
          )}
        </div>
      </div>

      {/* 달성 표시 */}
      {isEarned && (
        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${colors.icon.replace('text-', 'bg-')}`} />
      )}
    </div>
  );
}

// ============================================================
// 뱃지 그리드 컴포넌트
// ============================================================

interface BadgeGridProps {
  badges: Array<{ definition: BadgeDefinition; userBadge: UserBadge }>;
  columns?: 1 | 2;
  size?: 'sm' | 'md' | 'lg';
}

export function BadgeGrid({ badges, columns = 2, size = 'md' }: BadgeGridProps) {
  // 달성된 뱃지를 먼저 정렬
  const sortedBadges = [...badges].sort((a, b) => {
    const aEarned = a.userBadge.earnedAt !== null;
    const bEarned = b.userBadge.earnedAt !== null;
    if (aEarned && !bEarned) return -1;
    if (!aEarned && bEarned) return 1;
    return 0;
  });

  return (
    <div className={`grid gap-3 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {sortedBadges.map(({ definition, userBadge }) => (
        <BadgeCard
          key={definition.id}
          definition={definition}
          userBadge={userBadge}
          size={size}
        />
      ))}
    </div>
  );
}

// ============================================================
// 뱃지 요약 컴포넌트 (대시보드용)
// ============================================================

interface BadgeSummaryProps {
  earnedCount: number;
  totalCount: number;
  recentBadge?: { definition: BadgeDefinition; userBadge: UserBadge } | null;
}

export function BadgeSummary({ earnedCount, totalCount, recentBadge }: BadgeSummaryProps) {
  return (
    <div className="flex items-center gap-4">
      {/* 달성 현황 */}
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">달성 뱃지</p>
          <p className="text-lg font-bold">
            <span className="text-yellow-400">{earnedCount}</span>
            <span className="text-muted-foreground text-sm">/{totalCount}</span>
          </p>
        </div>
      </div>

      {/* 최근 달성 뱃지 */}
      {recentBadge && (
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground mb-1">최근 달성</p>
          <BadgeCard
            definition={recentBadge.definition}
            userBadge={recentBadge.userBadge}
            size="sm"
          />
        </div>
      )}
    </div>
  );
}
