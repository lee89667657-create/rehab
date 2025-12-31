/**
 * poseAnalysis.ts
 * 전문 자세 분석 로직 - 엄격한 점수 기준
 *
 * APECS, EXBODY, Posture Screen 등 전문 자세 분석 앱의
 * 기준을 참고하여 엄격한 평가 시스템을 구현합니다.
 *
 * ## 점수 철학
 * - 100점은 "완벽한 자세"에만 부여 (매우 어렵게)
 * - 80점 이상: 양호한 자세 (일반인 기준 좋은 편)
 * - 60점 이상: 보통 (대부분의 현대인이 해당)
 * - 60점 미만: 교정 필요 (명확한 문제 있음)
 *
 * ## 판정 기준
 * 각 기준값은 임상 연구와 물리치료 가이드라인을 참고합니다.
 * - 거북목: CVA (Craniovertebral Angle) 기반
 * - 어깨/골반: 좌우 대칭성 기준
 * - 무릎: 정렬 각도 기준
 */

import type { PoseLandmark } from '@/types';
import {
  getForwardHeadDistance,
  getShoulderTilt,
  getPelvisTilt,
  getKneeAngle,
} from './angleCalculator';

// ============================================================
// 타입 정의
// ============================================================

/** 판정 등급 */
export type Grade = 'good' | 'warning' | 'danger';

/** 개별 분석 항목 결과 */
export interface AnalysisItem {
  id: string;
  name: string;
  value: number;
  unit: string;
  grade: Grade;
  description: string;
  score: number;
  /** 상세 진단 메시지 */
  diagnosis?: string;
  /** 권장 운동 */
  recommendation?: string;
}

/** 전체 분석 결과 */
export interface AnalysisResult {
  overallScore: number;
  overallGrade: Grade;
  items: AnalysisItem[];
  analyzedAt: number;
  /** 분석 신뢰도 (0~1) */
  confidence?: number;
}

// ============================================================
// 전문 판정 기준 - 엄격한 기준
// ============================================================

/**
 * 거북목 (Forward Head Posture) 판정 기준
 *
 * ## 전문 기준 (CVA - Craniovertebral Angle 기반)
 * 의학적으로 CVA가 50도 이상이면 정상, 40도 미만이면 거북목입니다.
 * 거리 기준으로 환산하면:
 *
 * - 완벽 (100점): 0cm ~ 1cm (거의 수직, 매우 드뭄)
 * - 우수 (90점): 1cm ~ 2cm (좋은 자세)
 * - 양호 (80점): 2cm ~ 2.5cm (정상 범위 상한)
 * - 보통 (70점): 2.5cm ~ 3cm (경미한 거북목 시작)
 * - 주의 (60점): 3cm ~ 4cm (거북목)
 * - 경고 (50점): 4cm ~ 5cm (중등도 거북목)
 * - 위험 (<50점): 5cm 이상 (심한 거북목)
 */
const FORWARD_HEAD_CRITERIA = {
  perfect: 1.0,     // 1cm 미만: 완벽 (100점)
  excellent: 2.0,   // 2cm 미만: 우수 (90점)
  good: 2.5,        // 2.5cm 미만: 양호 (80점)
  fair: 3.0,        // 3cm 미만: 보통 (70점)
  warning: 4.0,     // 4cm 미만: 주의 (60점)
  caution: 5.0,     // 5cm 미만: 경고 (50점)
  // 5cm 이상: 위험 (40점 이하)
};

/**
 * 어깨 틀어짐 판정 기준
 *
 * ## 전문 기준
 * - 완벽: 0.5cm 미만 (거의 대칭)
 * - 정상: 1cm 미만
 * - 주의: 1cm ~ 2cm (기능적 불균형)
 * - 위험: 2cm 이상 (구조적 불균형 의심)
 */
const SHOULDER_CRITERIA = {
  perfect: 0.3,     // 0.3cm 미만: 완벽 (100점)
  excellent: 0.5,   // 0.5cm 미만: 우수 (95점)
  good: 0.8,        // 0.8cm 미만: 양호 (85점)
  fair: 1.0,        // 1cm 미만: 보통 (75점)
  warning: 1.5,     // 1.5cm 미만: 주의 (60점)
  caution: 2.0,     // 2cm 미만: 경고 (50점)
  // 2cm 이상: 위험 (40점 이하)
};

/**
 * 골반 틀어짐 판정 기준
 *
 * ## 전문 기준
 * 골반은 어깨보다 조금 더 엄격하게 판정합니다.
 * 골반 불균형은 척추 전체에 영향을 미치기 때문입니다.
 */
const PELVIS_CRITERIA = {
  perfect: 0.3,     // 0.3cm 미만: 완벽 (100점)
  excellent: 0.5,   // 0.5cm 미만: 우수 (95점)
  good: 0.8,        // 0.8cm 미만: 양호 (85점)
  fair: 1.0,        // 1cm 미만: 보통 (75점)
  warning: 1.5,     // 1.5cm 미만: 주의 (60점)
  caution: 2.0,     // 2cm 미만: 경고 (50점)
  // 2cm 이상: 위험 (40점 이하)
};

/**
 * 무릎 각도 판정 기준
 *
 * ## 전문 기준
 * 이상적인 서있는 자세에서 무릎 각도는 175~180도입니다.
 * - 과신전(Hyperextension): 180도 초과
 * - 굴곡(Flexion): 175도 미만
 */
const KNEE_CRITERIA = {
  perfectMin: 176,  // 176~180도: 완벽 (100점)
  perfectMax: 180,
  goodMin: 173,     // 173~176도 또는 180~183도: 양호 (85점)
  goodMax: 183,
  fairMin: 170,     // 170~173도 또는 183~186도: 보통 (70점)
  fairMax: 186,
  warningMin: 165,  // 165~170도: 주의 (55점)
  // 165도 미만 또는 186도 초과: 위험 (40점 이하)
};

// ============================================================
// 점수 계산 함수
// ============================================================

/**
 * 거북목 점수 계산 - 엄격한 기준
 *
 * 100점을 받으려면 거의 완벽한 수직 정렬이 필요합니다.
 * 현실적으로 대부분의 사람은 70~85점 범위에 해당합니다.
 */
function calculateForwardHeadScore(distanceCm: number): number {
  // 음수 방지 (뒤로 기울어진 경우)
  const dist = Math.abs(distanceCm);

  if (dist < FORWARD_HEAD_CRITERIA.perfect) {
    // 0~1cm: 100~95점 (선형)
    return Math.round(100 - (dist / FORWARD_HEAD_CRITERIA.perfect) * 5);
  }
  if (dist < FORWARD_HEAD_CRITERIA.excellent) {
    // 1~2cm: 95~88점
    const ratio = (dist - FORWARD_HEAD_CRITERIA.perfect) /
      (FORWARD_HEAD_CRITERIA.excellent - FORWARD_HEAD_CRITERIA.perfect);
    return Math.round(95 - ratio * 7);
  }
  if (dist < FORWARD_HEAD_CRITERIA.good) {
    // 2~2.5cm: 88~80점
    const ratio = (dist - FORWARD_HEAD_CRITERIA.excellent) /
      (FORWARD_HEAD_CRITERIA.good - FORWARD_HEAD_CRITERIA.excellent);
    return Math.round(88 - ratio * 8);
  }
  if (dist < FORWARD_HEAD_CRITERIA.fair) {
    // 2.5~3cm: 80~70점
    const ratio = (dist - FORWARD_HEAD_CRITERIA.good) /
      (FORWARD_HEAD_CRITERIA.fair - FORWARD_HEAD_CRITERIA.good);
    return Math.round(80 - ratio * 10);
  }
  if (dist < FORWARD_HEAD_CRITERIA.warning) {
    // 3~4cm: 70~55점
    const ratio = (dist - FORWARD_HEAD_CRITERIA.fair) /
      (FORWARD_HEAD_CRITERIA.warning - FORWARD_HEAD_CRITERIA.fair);
    return Math.round(70 - ratio * 15);
  }
  if (dist < FORWARD_HEAD_CRITERIA.caution) {
    // 4~5cm: 55~40점
    const ratio = (dist - FORWARD_HEAD_CRITERIA.warning) /
      (FORWARD_HEAD_CRITERIA.caution - FORWARD_HEAD_CRITERIA.warning);
    return Math.round(55 - ratio * 15);
  }
  // 5cm 이상: 40점에서 시작, 10cm에서 10점까지 감소
  const excess = dist - FORWARD_HEAD_CRITERIA.caution;
  return Math.max(10, Math.round(40 - excess * 6));
}

/**
 * 어깨/골반 틀어짐 점수 계산 - 엄격한 기준
 */
function calculateTiltScore(
  diffCm: number,
  criteria: typeof SHOULDER_CRITERIA
): number {
  const diff = Math.abs(diffCm);

  if (diff < criteria.perfect) {
    // 0~0.3cm: 100~97점
    return Math.round(100 - (diff / criteria.perfect) * 3);
  }
  if (diff < criteria.excellent) {
    // 0.3~0.5cm: 97~93점
    const ratio = (diff - criteria.perfect) / (criteria.excellent - criteria.perfect);
    return Math.round(97 - ratio * 4);
  }
  if (diff < criteria.good) {
    // 0.5~0.8cm: 93~85점
    const ratio = (diff - criteria.excellent) / (criteria.good - criteria.excellent);
    return Math.round(93 - ratio * 8);
  }
  if (diff < criteria.fair) {
    // 0.8~1cm: 85~75점
    const ratio = (diff - criteria.good) / (criteria.fair - criteria.good);
    return Math.round(85 - ratio * 10);
  }
  if (diff < criteria.warning) {
    // 1~1.5cm: 75~58점
    const ratio = (diff - criteria.fair) / (criteria.warning - criteria.fair);
    return Math.round(75 - ratio * 17);
  }
  if (diff < criteria.caution) {
    // 1.5~2cm: 58~45점
    const ratio = (diff - criteria.warning) / (criteria.caution - criteria.warning);
    return Math.round(58 - ratio * 13);
  }
  // 2cm 이상: 45점에서 시작, 5cm에서 15점까지 감소
  const excess = diff - criteria.caution;
  return Math.max(15, Math.round(45 - excess * 10));
}

/**
 * 무릎 각도 점수 계산 - 엄격한 기준
 */
function calculateKneeScore(angleDeg: number): number {
  const angle = angleDeg;

  // 완벽 범위: 176~180도
  if (angle >= KNEE_CRITERIA.perfectMin && angle <= KNEE_CRITERIA.perfectMax) {
    // 178도가 가장 이상적
    const deviation = Math.abs(178 - angle);
    return Math.round(100 - deviation * 2);
  }

  // 양호 범위: 173~176도 또는 180~183도
  if ((angle >= KNEE_CRITERIA.goodMin && angle < KNEE_CRITERIA.perfectMin) ||
    (angle > KNEE_CRITERIA.perfectMax && angle <= KNEE_CRITERIA.goodMax)) {
    if (angle < KNEE_CRITERIA.perfectMin) {
      const ratio = (KNEE_CRITERIA.perfectMin - angle) /
        (KNEE_CRITERIA.perfectMin - KNEE_CRITERIA.goodMin);
      return Math.round(92 - ratio * 10);
    } else {
      const ratio = (angle - KNEE_CRITERIA.perfectMax) /
        (KNEE_CRITERIA.goodMax - KNEE_CRITERIA.perfectMax);
      return Math.round(92 - ratio * 10);
    }
  }

  // 보통 범위: 170~173도 또는 183~186도
  if ((angle >= KNEE_CRITERIA.fairMin && angle < KNEE_CRITERIA.goodMin) ||
    (angle > KNEE_CRITERIA.goodMax && angle <= KNEE_CRITERIA.fairMax)) {
    if (angle < KNEE_CRITERIA.goodMin) {
      const ratio = (KNEE_CRITERIA.goodMin - angle) /
        (KNEE_CRITERIA.goodMin - KNEE_CRITERIA.fairMin);
      return Math.round(82 - ratio * 15);
    } else {
      const ratio = (angle - KNEE_CRITERIA.goodMax) /
        (KNEE_CRITERIA.fairMax - KNEE_CRITERIA.goodMax);
      return Math.round(82 - ratio * 15);
    }
  }

  // 주의 범위: 165~170도
  if (angle >= KNEE_CRITERIA.warningMin && angle < KNEE_CRITERIA.fairMin) {
    const ratio = (KNEE_CRITERIA.fairMin - angle) /
      (KNEE_CRITERIA.fairMin - KNEE_CRITERIA.warningMin);
    return Math.round(67 - ratio * 15);
  }

  // 과신전: 186도 초과
  if (angle > KNEE_CRITERIA.fairMax) {
    const excess = angle - KNEE_CRITERIA.fairMax;
    return Math.max(20, Math.round(67 - excess * 4));
  }

  // 굴곡: 165도 미만
  const deficit = KNEE_CRITERIA.warningMin - angle;
  return Math.max(15, Math.round(52 - deficit * 3));
}

// ============================================================
// 판정 함수
// ============================================================

/**
 * 점수를 등급으로 변환
 */
function scoreToGrade(score: number): Grade {
  if (score >= 75) return 'good';
  if (score >= 55) return 'warning';
  return 'danger';
}

/**
 * 거북목 판정
 */
function analyzeForwardHead(distanceCm: number): AnalysisItem {
  const score = calculateForwardHeadScore(distanceCm);
  const grade = scoreToGrade(score);

  // 상세 진단 메시지
  let description: string;
  let diagnosis: string;
  let recommendation: string;

  if (score >= 90) {
    description = '목이 이상적인 위치에 있어요';
    diagnosis = '귀와 어깨가 수직선상에 잘 정렬되어 있습니다.';
    recommendation = '현재 자세를 유지하세요';
  } else if (score >= 80) {
    description = '목 위치가 양호해요';
    diagnosis = `머리가 약간(${distanceCm.toFixed(1)}cm) 앞으로 나와 있지만 정상 범위입니다.`;
    recommendation = '간단한 거북목 교정';
  } else if (score >= 70) {
    description = '경미한 거북목 경향이 있어요';
    diagnosis = `머리가 어깨보다 ${distanceCm.toFixed(1)}cm 앞에 위치합니다. 장시간 유지 시 목 피로감이 있을 수 있습니다.`;
    recommendation = '거북목 교정 + 자세 교정';
  } else if (score >= 55) {
    description = '거북목이에요. 교정이 필요해요';
    diagnosis = `머리가 어깨보다 ${distanceCm.toFixed(1)}cm 앞으로 나와 있습니다. 목에 약 ${Math.round(distanceCm * 2)}kg의 추가 하중이 걸리고 있습니다.`;
    recommendation = '거북목 교정 운동 필수';
  } else {
    description = '심한 거북목이에요. 적극적인 교정이 필요해요';
    diagnosis = `머리가 어깨보다 ${distanceCm.toFixed(1)}cm 앞으로 나와 있어 심한 거북목입니다. 목과 어깨에 상당한 부담이 가고 있습니다.`;
    recommendation = '전문가 상담 + 집중 교정 운동';
  }

  return {
    id: 'forward_head',
    name: '거북목',
    value: Math.round(distanceCm * 10) / 10,
    unit: 'cm',
    grade,
    description,
    score,
    diagnosis,
    recommendation,
  };
}

/**
 * 어깨 틀어짐 판정
 */
function analyzeShoulderTilt(diffCm: number): AnalysisItem {
  const score = calculateTiltScore(diffCm, SHOULDER_CRITERIA);
  const grade = scoreToGrade(score);

  let description: string;
  let diagnosis: string;
  let recommendation: string;

  if (score >= 90) {
    description = '어깨가 균형잡혀 있어요';
    diagnosis = '좌우 어깨 높이가 거의 동일합니다.';
    recommendation = '현재 상태 유지';
  } else if (score >= 75) {
    description = '어깨 균형이 양호해요';
    diagnosis = `좌우 어깨 높이 차이가 ${diffCm.toFixed(1)}cm로 정상 범위입니다.`;
    recommendation = '라운드숄더 교정';
  } else if (score >= 55) {
    description = '어깨가 살짝 틀어져 있어요';
    diagnosis = `좌우 어깨 높이 차이가 ${diffCm.toFixed(1)}cm입니다. 한쪽 어깨에 힘이 더 들어가는 습관이 있을 수 있습니다.`;
    recommendation = '라운드숄더 교정';
  } else {
    description = '어깨 균형이 많이 틀어졌어요';
    diagnosis = `좌우 어깨 높이 차이가 ${diffCm.toFixed(1)}cm로 상당한 불균형이 있습니다. 척추 정렬에 영향을 줄 수 있습니다.`;
    recommendation = '전문가 상담 권장';
  }

  return {
    id: 'shoulder_tilt',
    name: '어깨 균형',
    value: Math.round(diffCm * 10) / 10,
    unit: 'cm',
    grade,
    description,
    score,
    diagnosis,
    recommendation,
  };
}

/**
 * 골반 틀어짐 판정
 */
function analyzePelvisTilt(diffCm: number): AnalysisItem {
  const score = calculateTiltScore(diffCm, PELVIS_CRITERIA);
  const grade = scoreToGrade(score);

  let description: string;
  let diagnosis: string;
  let recommendation: string;

  if (score >= 90) {
    description = '골반이 균형잡혀 있어요';
    diagnosis = '좌우 골반 높이가 거의 동일합니다.';
    recommendation = '현재 상태 유지';
  } else if (score >= 75) {
    description = '골반 균형이 양호해요';
    diagnosis = `좌우 골반 높이 차이가 ${diffCm.toFixed(1)}cm로 정상 범위입니다.`;
    recommendation = '골반 스트레칭';
  } else if (score >= 55) {
    description = '골반이 살짝 틀어져 있어요';
    diagnosis = `좌우 골반 높이 차이가 ${diffCm.toFixed(1)}cm입니다. 다리 꼬는 습관이나 한쪽으로 기대는 자세가 원인일 수 있습니다.`;
    recommendation = '골반 교정 운동';
  } else {
    description = '골반 균형이 많이 틀어졌어요';
    diagnosis = `좌우 골반 높이 차이가 ${diffCm.toFixed(1)}cm로 상당한 불균형이 있습니다. 허리 통증의 원인이 될 수 있습니다.`;
    recommendation = '전문가 상담 권장';
  }

  return {
    id: 'pelvis_tilt',
    name: '골반 균형',
    value: Math.round(diffCm * 10) / 10,
    unit: 'cm',
    grade,
    description,
    score,
    diagnosis,
    recommendation,
  };
}

/**
 * 무릎 정렬 판정
 */
function analyzeKneeAngle(angleDeg: number): AnalysisItem {
  const score = calculateKneeScore(angleDeg);
  const grade = scoreToGrade(score);

  let description: string;
  let diagnosis: string;
  let recommendation: string;

  if (score >= 90) {
    description = '무릎이 바르게 정렬되어 있어요';
    diagnosis = `무릎 각도가 ${Math.round(angleDeg)}도로 이상적입니다.`;
    recommendation = '현재 상태 유지';
  } else if (score >= 75) {
    description = '무릎 정렬이 양호해요';
    diagnosis = `무릎 각도가 ${Math.round(angleDeg)}도로 정상 범위입니다.`;
    recommendation = '하체 스트레칭';
  } else if (score >= 55) {
    if (angleDeg < 175) {
      description = '무릎이 살짝 굽혀져 있어요';
      diagnosis = `무릎 각도가 ${Math.round(angleDeg)}도로 완전히 펴지지 않았습니다.`;
      recommendation = '하체 강화 운동';
    } else {
      description = '무릎이 뒤로 젖혀져 있어요';
      diagnosis = `무릎 각도가 ${Math.round(angleDeg)}도로 과신전 경향이 있습니다.`;
      recommendation = '무릎 안정화 운동';
    }
  } else {
    if (angleDeg < 170) {
      description = '무릎이 많이 굽혀져 있어요';
      diagnosis = `무릎 각도가 ${Math.round(angleDeg)}도로 상당히 굽혀져 있습니다. 하체 근력 약화가 의심됩니다.`;
    } else {
      description = '무릎 과신전이 심해요';
      diagnosis = `무릎 각도가 ${Math.round(angleDeg)}도로 과도하게 젖혀져 있습니다. 인대에 부담이 갈 수 있습니다.`;
    }
    recommendation = '전문가 상담 권장';
  }

  return {
    id: 'knee_angle',
    name: '무릎 정렬',
    value: Math.round(angleDeg),
    unit: '°',
    grade,
    description,
    score,
    diagnosis,
    recommendation,
  };
}

// ============================================================
// 종합 점수 계산 - 복합 페널티 적용
// ============================================================

/**
 * 종합 점수 계산
 *
 * ## 가중치 (합계 100%)
 * - 거북목: 35% (현대인의 가장 흔한 문제)
 * - 어깨 균형: 25%
 * - 골반 균형: 25%
 * - 무릎 정렬: 15%
 *
 * ## 복합 페널티
 * - 2개 이상 항목이 주의/위험일 경우 추가 감점
 * - 연관된 문제(예: 어깨+골반 동시 틀어짐)는 추가 감점
 */
export function calculateOverallScore(items: AnalysisItem[]): number {
  // 가중치 정의
  const weights: Record<string, number> = {
    forward_head: 0.35,   // 거북목 35%
    shoulder_tilt: 0.25,  // 어깨 균형 25%
    pelvis_tilt: 0.25,    // 골반 균형 25%
    knee_angle: 0.15,     // 무릎 정렬 15%
  };

  // 기본 점수 계산 (가중 평균)
  let weightedSum = 0;
  let totalWeight = 0;

  items.forEach((item) => {
    const weight = weights[item.id] || 0.25;
    weightedSum += item.score * weight;
    totalWeight += weight;
  });

  let baseScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // ============================================================
  // 복합 페널티 적용
  // ============================================================

  // 1. 다중 문제 페널티
  const warningCount = items.filter((item) => item.grade === 'warning').length;
  const dangerCount = items.filter((item) => item.grade === 'danger').length;

  // 주의 항목 2개 이상: -3점씩
  if (warningCount >= 2) {
    baseScore -= (warningCount - 1) * 3;
  }

  // 위험 항목 1개당: -5점
  if (dangerCount >= 1) {
    baseScore -= dangerCount * 5;
  }

  // 2. 연관 문제 페널티 (어깨+골반 동시 틀어짐)
  const shoulderItem = items.find((item) => item.id === 'shoulder_tilt');
  const pelvisItem = items.find((item) => item.id === 'pelvis_tilt');

  if (shoulderItem && pelvisItem) {
    // 둘 다 주의 이상일 경우 연관 페널티
    if (shoulderItem.grade !== 'good' && pelvisItem.grade !== 'good') {
      baseScore -= 5; // 척추 정렬 문제 가능성
    }
  }

  // 3. 거북목 심할 경우 추가 페널티 (연쇄 효과)
  const forwardHeadItem = items.find((item) => item.id === 'forward_head');
  if (forwardHeadItem && forwardHeadItem.score < 50) {
    baseScore -= 3; // 심한 거북목은 전신에 영향
  }

  // 점수 범위 제한 (0~100)
  return Math.max(0, Math.min(100, Math.round(baseScore)));
}

/**
 * 종합 점수에 따른 등급 결정
 *
 * ## 엄격한 기준
 * - 85점 이상: 양호 (good) - 좋은 자세
 * - 65점 이상: 주의 (warning) - 개선 필요
 * - 65점 미만: 위험 (danger) - 적극적 교정 필요
 */
function getOverallGrade(score: number): Grade {
  if (score >= 85) return 'good';
  if (score >= 65) return 'warning';
  return 'danger';
}

// ============================================================
// 메인 분석 함수
// ============================================================

/**
 * 자세 분석 메인 함수
 *
 * MediaPipe Pose에서 감지한 랜드마크를 입력받아
 * 전문적인 자세 분석 결과를 반환합니다.
 */
export function analyzePose(landmarks: PoseLandmark[]): AnalysisResult {
  // 랜드마크 유효성 검사
  if (!landmarks || landmarks.length < 33) {
    return {
      overallScore: 0,
      overallGrade: 'danger',
      items: [],
      analyzedAt: Date.now(),
      confidence: 0,
    };
  }

  // 각 항목 측정 및 분석
  const forwardHeadDistance = getForwardHeadDistance(landmarks);
  const shoulderTilt = getShoulderTilt(landmarks);
  const pelvisTilt = getPelvisTilt(landmarks);
  const kneeAngle = getKneeAngle(landmarks);

  // 분석 항목 생성
  const items: AnalysisItem[] = [
    analyzeForwardHead(forwardHeadDistance),
    analyzeShoulderTilt(shoulderTilt),
    analyzePelvisTilt(pelvisTilt),
    analyzeKneeAngle(kneeAngle),
  ];

  // 종합 점수 계산 (복합 페널티 적용)
  const overallScore = calculateOverallScore(items);
  const overallGrade = getOverallGrade(overallScore);

  // 분석 신뢰도 계산 (랜드마크 visibility 기반)
  const avgVisibility = landmarks.reduce((sum, lm) => sum + (lm.visibility || 0), 0) / landmarks.length;
  const confidence = Math.round(avgVisibility * 100) / 100;

  return {
    overallScore,
    overallGrade,
    items,
    analyzedAt: Date.now(),
    confidence,
  };
}

/**
 * 점수에 따른 메시지 생성
 */
export function getScoreMessage(score: number): { text: string; sub: string } {
  if (score >= 90) {
    return {
      text: '훌륭한 자세!',
      sub: '이상적인 자세를 유지하고 있어요',
    };
  }
  if (score >= 80) {
    return {
      text: '좋은 자세예요',
      sub: '조금만 신경쓰면 완벽해요',
    };
  }
  if (score >= 70) {
    return {
      text: '양호한 편이에요',
      sub: '몇 가지 개선점이 있어요',
    };
  }
  if (score >= 60) {
    return {
      text: '개선이 필요해요',
      sub: '스트레칭과 자세 교정을 시작해보세요',
    };
  }
  if (score >= 50) {
    return {
      text: '주의가 필요해요',
      sub: '적극적인 자세 교정이 필요합니다',
    };
  }
  return {
    text: '교정이 시급해요',
    sub: '전문가 상담과 함께 운동을 시작하세요',
  };
}

export default analyzePose;
