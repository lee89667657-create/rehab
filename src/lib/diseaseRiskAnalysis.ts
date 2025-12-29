/**
 * 질환 위험도 분석 모듈
 *
 * 자세 분석 결과를 기반으로 각 질환의 위험도를 계산합니다.
 * 위험도는 0~100% 사이의 값으로 표시됩니다.
 */

import type { AnalysisItem } from './poseAnalysis';

// ============================================================
// 타입 정의
// ============================================================

/**
 * 질환 위험도 정보
 */
export interface DiseaseRisk {
  id: string;           // 질환 ID
  name: string;         // 질환명
  risk: number;         // 위험도 (0-100)
  level: 'low' | 'medium' | 'high' | 'critical';  // 위험 레벨
  description: string;  // 설명
  symptoms: string[];   // 주요 증상
  causes: string[];     // 원인
  relatedParts: string[]; // 관련 신체 부위
}

/**
 * 전체 위험도 분석 결과
 */
export interface DiseaseRiskAnalysis {
  overallRisk: number;          // 전체 위험도 (0-100)
  overallLevel: 'low' | 'medium' | 'high' | 'critical';
  diseases: DiseaseRisk[];      // 개별 질환 위험도
  primaryConcern: DiseaseRisk | null;  // 가장 우려되는 질환
  recommendations: string[];    // 권장 사항
}

// ============================================================
// 질환 정의 데이터
// ============================================================

interface DiseaseDefinition {
  id: string;
  name: string;
  description: string;
  symptoms: string[];
  causes: string[];
  relatedParts: string[];
  // 위험도 계산에 사용되는 가중치
  weights: {
    forward_head?: number;
    shoulder_tilt?: number;
    pelvis_tilt?: number;
    knee_angle?: number;
  };
  // 각 분석 항목의 임계값
  thresholds: {
    forward_head?: { warning: number; danger: number };
    shoulder_tilt?: { warning: number; danger: number };
    pelvis_tilt?: { warning: number; danger: number };
    knee_angle?: { warning: number; danger: number };
  };
}

/**
 * 질환 정의 목록
 *
 * 현재 앱에서는 거북목/라운드숄더 2개 질환만 분석합니다.
 * - forward_head: 거북목 증후군 (머리가 앞으로 나온 자세)
 * - round_shoulder: 라운드숄더 (어깨가 앞으로 말린 자세)
 */
const DISEASE_DEFINITIONS: DiseaseDefinition[] = [
  {
    id: 'forward_head',
    name: '거북목 증후군',
    description: '머리가 어깨보다 앞으로 나와 목에 부담이 가는 자세',
    symptoms: ['목 통증', '두통', '어깨 결림', '집중력 저하'],
    causes: ['장시간 스마트폰 사용', '모니터 높이 불량', '잘못된 수면 자세'],
    relatedParts: ['목', '어깨', '머리'],
    weights: { forward_head: 0.8, shoulder_tilt: 0.2 },
    thresholds: {
      forward_head: { warning: 2, danger: 3.5 },
      shoulder_tilt: { warning: 1.5, danger: 3 },
    },
  },
  {
    id: 'round_shoulder',
    name: '라운드숄더',
    description: '어깨가 앞으로 말려 등이 굽어지는 자세',
    symptoms: ['어깨 통증', '등 결림', '가슴 답답함', '호흡 불편'],
    causes: ['장시간 컴퓨터 사용', '운동 부족', '가슴 근육 단축'],
    relatedParts: ['어깨', '등', '가슴'],
    weights: { shoulder_tilt: 0.7, forward_head: 0.3 },
    thresholds: {
      shoulder_tilt: { warning: 1.5, danger: 2.5 },
      forward_head: { warning: 3, danger: 5 },
    },
  },
];

// ============================================================
// 위험도 계산 함수
// ============================================================

/**
 * 분석 항목 값을 위험도 점수로 변환
 */
function calculateItemRisk(
  value: number,
  threshold: { warning: number; danger: number },
  isAngle: boolean = false
): number {
  // 각도의 경우 낮을수록 위험 (180도가 정상)
  if (isAngle) {
    if (value >= threshold.warning) return 0;
    if (value >= threshold.danger) {
      // warning과 danger 사이 선형 보간
      const range = threshold.warning - threshold.danger;
      const diff = threshold.warning - value;
      return Math.min((diff / range) * 50, 50);
    }
    // danger 이하
    const overDanger = threshold.danger - value;
    return Math.min(50 + overDanger * 5, 100);
  }

  // 거리/기울기의 경우 높을수록 위험
  if (value <= threshold.warning) return 0;
  if (value <= threshold.danger) {
    // warning과 danger 사이 선형 보간
    const range = threshold.danger - threshold.warning;
    const diff = value - threshold.warning;
    return Math.min((diff / range) * 50, 50);
  }
  // danger 이상
  const overDanger = value - threshold.danger;
  return Math.min(50 + overDanger * 10, 100);
}

/**
 * 위험도 레벨 결정
 */
function getRiskLevel(risk: number): 'low' | 'medium' | 'high' | 'critical' {
  if (risk < 25) return 'low';
  if (risk < 50) return 'medium';
  if (risk < 75) return 'high';
  return 'critical';
}

/**
 * 개별 질환 위험도 계산
 */
function calculateDiseaseRisk(
  disease: DiseaseDefinition,
  analysisItems: AnalysisItem[]
): DiseaseRisk {
  let totalRisk = 0;
  let totalWeight = 0;

  // 각 분석 항목에 대해 위험도 계산
  Object.entries(disease.weights).forEach(([itemId, weight]) => {
    const item = analysisItems.find((i) => i.id === itemId);
    const threshold = disease.thresholds[itemId as keyof typeof disease.thresholds];

    if (item && threshold && weight) {
      const isAngle = itemId === 'knee_angle';
      const itemRisk = calculateItemRisk(item.value, threshold, isAngle);
      totalRisk += itemRisk * weight;
      totalWeight += weight;
    }
  });

  // 가중 평균 계산
  const finalRisk = totalWeight > 0 ? Math.round(totalRisk / totalWeight) : 0;

  return {
    id: disease.id,
    name: disease.name,
    risk: finalRisk,
    level: getRiskLevel(finalRisk),
    description: disease.description,
    symptoms: disease.symptoms,
    causes: disease.causes,
    relatedParts: disease.relatedParts,
  };
}

// ============================================================
// 메인 분석 함수
// ============================================================

/**
 * 자세 분석 결과를 기반으로 질환 위험도를 분석합니다.
 *
 * @param analysisItems - 자세 분석 결과 항목 배열
 * @returns 질환 위험도 분석 결과
 */
export function analyzeDiseaseRisk(analysisItems: AnalysisItem[]): DiseaseRiskAnalysis {
  // 각 질환별 위험도 계산
  const diseases = DISEASE_DEFINITIONS.map((def) =>
    calculateDiseaseRisk(def, analysisItems)
  );

  // 위험도 순으로 정렬
  diseases.sort((a, b) => b.risk - a.risk);

  // 전체 위험도 계산 (2개 질환의 가중 평균: 거북목 50%, 라운드숄더 50%)
  const weights = [0.5, 0.5];
  const overallRisk = Math.round(
    diseases.reduce((sum, d, i) => sum + d.risk * weights[i], 0)
  );

  // 가장 우려되는 질환 (위험도 30% 이상인 경우만)
  const primaryConcern = diseases[0]?.risk >= 30 ? diseases[0] : null;

  // 권장 사항 생성
  const recommendations = generateRecommendations(diseases, overallRisk);

  return {
    overallRisk,
    overallLevel: getRiskLevel(overallRisk),
    diseases,
    primaryConcern,
    recommendations,
  };
}

/**
 * 분석 결과에 따른 권장 사항 생성
 */
function generateRecommendations(diseases: DiseaseRisk[], overallRisk: number): string[] {
  const recommendations: string[] = [];

  // 전체 위험도에 따른 기본 권장 사항
  if (overallRisk >= 75) {
    recommendations.push('전문 의료진 상담을 강력히 권장합니다.');
    recommendations.push('무리한 운동은 피하고, 전문가 지도하에 운동을 시작하세요.');
  } else if (overallRisk >= 50) {
    recommendations.push('정기적인 자세 교정 운동이 필요합니다.');
    recommendations.push('증상이 지속되면 전문가 상담을 고려해 보세요.');
  } else if (overallRisk >= 25) {
    recommendations.push('예방 차원의 스트레칭을 꾸준히 실시하세요.');
    recommendations.push('장시간 같은 자세를 피하고 자주 움직이세요.');
  } else {
    recommendations.push('현재 자세 상태가 양호합니다.');
    recommendations.push('꾸준한 운동으로 좋은 자세를 유지하세요.');
  }

  // 상위 위험 질환에 대한 구체적 권장 사항
  const highRiskDiseases = diseases.filter((d) => d.risk >= 40);
  highRiskDiseases.forEach((disease) => {
    switch (disease.id) {
      case 'forward_head':
        recommendations.push('턱 당기기와 목 스트레칭을 매일 실시하세요.');
        break;
      case 'round_shoulder':
        recommendations.push('견갑골 모으기와 어깨 스트레칭을 권장합니다.');
        break;
    }
  });

  return recommendations.slice(0, 5); // 최대 5개 권장 사항
}

/**
 * 위험도 레벨에 따른 색상 클래스 반환
 */
export function getRiskColorClass(level: DiseaseRisk['level']): string {
  switch (level) {
    case 'low':
      return 'text-emerald-500';
    case 'medium':
      return 'text-yellow-500';
    case 'high':
      return 'text-orange-500';
    case 'critical':
      return 'text-red-500';
    default:
      return 'text-muted-foreground';
  }
}

/**
 * 위험도 레벨에 따른 배경색 클래스 반환
 */
export function getRiskBgClass(level: DiseaseRisk['level']): string {
  switch (level) {
    case 'low':
      return 'bg-emerald-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'high':
      return 'bg-orange-500';
    case 'critical':
      return 'bg-red-500';
    default:
      return 'bg-muted';
  }
}

/**
 * 위험도 레벨 한글 라벨
 */
export function getRiskLevelLabel(level: DiseaseRisk['level']): string {
  switch (level) {
    case 'low':
      return '낮음';
    case 'medium':
      return '보통';
    case 'high':
      return '높음';
    case 'critical':
      return '매우 높음';
    default:
      return '알 수 없음';
  }
}
