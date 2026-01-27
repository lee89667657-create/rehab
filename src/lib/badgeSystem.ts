/**
 * 뱃지/업적 시스템 로직
 *
 * 뱃지 정의, 달성 조건 체크, 저장/로드 기능을 제공합니다.
 */

import type {
  BadgeId,
  BadgeDefinition,
  UserBadge,
  BadgeStorage,
  BadgeCheckContext,
} from '@/types/badges';

// ============================================================
// 뱃지 정의
// ============================================================

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_analysis',
    name: '첫 분석 완료',
    description: '첫 자세 분석을 완료했습니다',
    icon: 'Target',
    category: 'milestone',
    color: 'teal',
  },
  {
    id: 'streak_3',
    name: '3일 연속 운동',
    description: '3일 연속으로 운동했습니다',
    icon: 'Flame',
    category: 'streak',
    color: 'orange',
  },
  {
    id: 'streak_7',
    name: '7일 연속 운동',
    description: '일주일 연속으로 운동했습니다',
    icon: 'Flame',
    category: 'streak',
    color: 'orange',
  },
  {
    id: 'streak_30',
    name: '30일 연속 운동',
    description: '한 달 연속으로 운동했습니다',
    icon: 'Flame',
    category: 'streak',
    color: 'red',
  },
  {
    id: 'first_improvement',
    name: '첫 개선',
    description: '점수가 5점 이상 향상되었습니다',
    icon: 'TrendingUp',
    category: 'improvement',
    color: 'green',
  },
  {
    id: 'turtle_neck_escape',
    name: '거북목 탈출',
    description: '거북목 점수가 정상 범위에 도달했습니다',
    icon: 'CheckCircle',
    category: 'achievement',
    color: 'emerald',
  },
  {
    id: 'shoulder_balance',
    name: '어깨 균형 달성',
    description: '어깨 균형 점수가 정상 범위에 도달했습니다',
    icon: 'CheckCircle',
    category: 'achievement',
    color: 'blue',
  },
  {
    id: 'perfect_posture',
    name: '완벽한 자세',
    description: '종합 점수 90점 이상을 달성했습니다',
    icon: 'Trophy',
    category: 'achievement',
    color: 'yellow',
  },
];

// ============================================================
// 뱃지 달성 조건 체크
// ============================================================

/**
 * 뱃지 달성 조건을 체크합니다.
 */
export function checkBadgeCondition(
  badgeId: BadgeId,
  context: BadgeCheckContext
): boolean {
  switch (badgeId) {
    case 'first_analysis':
      return context.totalAnalyses >= 1;

    case 'streak_3':
      return context.currentStreak >= 3;

    case 'streak_7':
      return context.currentStreak >= 7;

    case 'streak_30':
      return context.currentStreak >= 30;

    case 'first_improvement':
      if (context.previousScore === null) return false;
      return context.latestScore - context.previousScore >= 5;

    case 'turtle_neck_escape':
      // 거북목 점수 75점 이상이면 정상
      return context.headForwardScore >= 75;

    case 'shoulder_balance':
      // 어깨 균형 점수 75점 이상이면 정상
      return context.shoulderBalanceScore >= 75;

    case 'perfect_posture':
      return context.overallScore >= 90;

    default:
      return false;
  }
}

/**
 * 모든 뱃지의 달성 상태를 업데이트합니다.
 */
export function updateBadges(
  currentBadges: UserBadge[],
  context: BadgeCheckContext
): { badges: UserBadge[]; newlyEarned: BadgeId[] } {
  const newlyEarned: BadgeId[] = [];
  const now = new Date().toISOString();

  const updatedBadges = BADGE_DEFINITIONS.map((def) => {
    // 기존 뱃지 상태 찾기
    const existing = currentBadges.find((b) => b.id === def.id);

    // 이미 달성한 경우 유지
    if (existing?.earnedAt) {
      return existing;
    }

    // 달성 조건 체크
    const isEarned = checkBadgeCondition(def.id, context);

    if (isEarned) {
      newlyEarned.push(def.id);
      return { id: def.id, earnedAt: now };
    }

    // 미달성 상태 유지
    return existing || { id: def.id, earnedAt: null };
  });

  return { badges: updatedBadges, newlyEarned };
}

// ============================================================
// 로컬 스토리지 관리
// ============================================================

const STORAGE_KEY = 'user_badges';

/**
 * 뱃지 데이터를 로컬 스토리지에 저장합니다.
 */
export function saveBadges(userId: string, badges: UserBadge[]): void {
  const storage: BadgeStorage = {
    userId,
    badges,
    lastUpdated: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    console.error('Failed to save badges:', error);
  }
}

/**
 * 뱃지 데이터를 로컬 스토리지에서 로드합니다.
 */
export function loadBadges(userId: string): UserBadge[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return getInitialBadges();
    }

    const storage: BadgeStorage = JSON.parse(stored);

    // 다른 사용자의 데이터면 초기화
    if (storage.userId !== userId) {
      return getInitialBadges();
    }

    return storage.badges;
  } catch (error) {
    console.error('Failed to load badges:', error);
    return getInitialBadges();
  }
}

/**
 * 초기 뱃지 상태를 반환합니다.
 */
export function getInitialBadges(): UserBadge[] {
  return BADGE_DEFINITIONS.map((def) => ({
    id: def.id,
    earnedAt: null,
  }));
}

/**
 * 뱃지 정의를 ID로 찾습니다.
 */
export function getBadgeDefinition(id: BadgeId): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((def) => def.id === id);
}

/**
 * 달성한 뱃지 수를 반환합니다.
 */
export function getEarnedBadgeCount(badges: UserBadge[]): number {
  return badges.filter((b) => b.earnedAt !== null).length;
}

/**
 * 달성일을 포맷팅합니다.
 */
export function formatEarnedDate(isoDate: string): string {
  const date = new Date(isoDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}월 ${day}일 달성`;
}
