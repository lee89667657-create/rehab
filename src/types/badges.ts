/**
 * 뱃지/업적 시스템 타입 정의
 */

/** 뱃지 ID 타입 */
export type BadgeId =
  | 'first_analysis'      // 첫 분석 완료
  | 'streak_3'            // 3일 연속 운동
  | 'streak_7'            // 7일 연속 운동
  | 'streak_30'           // 30일 연속 운동
  | 'first_improvement'   // 첫 개선 (5점 이상 향상)
  | 'turtle_neck_escape'  // 거북목 탈출
  | 'shoulder_balance'    // 어깨 균형 달성
  | 'perfect_posture';    // 완벽한 자세 (90점 이상)

/** 뱃지 카테고리 */
export type BadgeCategory = 'milestone' | 'streak' | 'improvement' | 'achievement';

/** 뱃지 정의 */
export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  description: string;
  icon: string;  // Lucide 아이콘 이름
  category: BadgeCategory;
  color: string; // 달성 시 색상 (tailwind class)
}

/** 사용자 뱃지 상태 */
export interface UserBadge {
  id: BadgeId;
  earnedAt: string | null;  // ISO 날짜 문자열, null이면 미달성
  progress?: number;        // 진행도 (0-100), 선택적
}

/** 뱃지 저장 데이터 */
export interface BadgeStorage {
  userId: string;
  badges: UserBadge[];
  lastUpdated: string;
}

/** 뱃지 체크 컨텍스트 */
export interface BadgeCheckContext {
  totalAnalyses: number;
  currentStreak: number;
  latestScore: number;
  previousScore: number | null;
  headForwardScore: number;
  shoulderBalanceScore: number;
  overallScore: number;
}
