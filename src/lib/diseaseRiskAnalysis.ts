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

// 질환 정의 목록
const DISEASE_DEFINITIONS: DiseaseDefinition[] = [
  {
    id: 'cervical_disc',
    name: '경추 디스크',
    description: '목뼈 사이의 디스크가 탈출하여 신경을 압박하는 질환',
    symptoms: ['목 통증', '어깨/팔 저림', '두통', '손 힘 약화'],
    causes: ['거북목 자세', '장시간 컴퓨터 사용', '잘못된 수면 자세'],
    relatedParts: ['목', '어깨', '팔'],
    weights: { forward_head: 0.7, shoulder_tilt: 0.3 },
    thresholds: {
      forward_head: { warning: 2.5, danger: 4 },
      shoulder_tilt: { warning: 1.5, danger: 3 },
    },
  },
  {
    id: 'frozen_shoulder',
    name: '오십견 (동결견)',
    description: '어깨 관절의 움직임이 제한되는 질환',
    symptoms: ['어깨 통증', '팔 올리기 어려움', '야간 통증', '어깨 뻣뻣함'],
    causes: ['어깨 불균형', '근육 약화', '자세 불량', '운동 부족'],
    relatedParts: ['어깨', '팔'],
    weights: { shoulder_tilt: 0.6, forward_head: 0.4 },
    thresholds: {
      shoulder_tilt: { warning: 1.5, danger: 2.5 },
      forward_head: { warning: 3, danger: 5 },
    },
  },
  {
    id: 'lumbar_disc',
    name: '요추 디스크',
    description: '허리뼈 사이의 디스크가 탈출하여 신경을 압박하는 질환',
    symptoms: ['허리 통증', '다리 저림', '보행 장애', '하지 근력 약화'],
    causes: ['골반 틀어짐', '잘못된 자세', '무거운 물건 들기', '비만'],
    relatedParts: ['허리', '골반', '다리'],
    weights: { pelvis_tilt: 0.6, knee_angle: 0.2, shoulder_tilt: 0.2 },
    thresholds: {
      pelvis_tilt: { warning: 1, danger: 2 },
      knee_angle: { warning: 175, danger: 170 },
    },
  },
  {
    id: 'scoliosis',
    name: '척추측만증',
    description: '척추가 옆으로 휘어지는 질환',
    symptoms: ['허리 통증', '어깨 높이 차이', '골반 불균형', '피로감'],
    causes: ['자세 불량', '근력 불균형', '성장기 자세 습관', '유전'],
    relatedParts: ['척추', '어깨', '골반'],
    weights: { shoulder_tilt: 0.4, pelvis_tilt: 0.4, forward_head: 0.2 },
    thresholds: {
      shoulder_tilt: { warning: 1, danger: 2 },
      pelvis_tilt: { warning: 1, danger: 2 },
    },
  },
  {
    id: 'knee_arthritis',
    name: '무릎 관절염',
    description: '무릎 연골이 닳아 통증과 염증이 발생하는 질환',
    symptoms: ['무릎 통증', '관절 붓기', '계단 오르내리기 어려움', '무릎 소리'],
    causes: ['O다리/X다리', '과체중', '무릎 부상', '노화'],
    relatedParts: ['무릎', '다리'],
    weights: { knee_angle: 0.7, pelvis_tilt: 0.3 },
    thresholds: {
      knee_angle: { warning: 175, danger: 165 },
      pelvis_tilt: { warning: 1.5, danger: 2.5 },
    },
  },
  {
    id: 'tension_headache',
    name: '긴장성 두통',
    description: '근육 긴장으로 인한 만성 두통',
    symptoms: ['두통', '목/어깨 뻣뻣함', '집중력 저하', '눈 피로'],
    causes: ['거북목', '스트레스', '장시간 모니터 사용', '수면 부족'],
    relatedParts: ['머리', '목', '어깨'],
    weights: { forward_head: 0.8, shoulder_tilt: 0.2 },
    thresholds: {
      forward_head: { warning: 2, danger: 3.5 },
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

  // 전체 위험도 계산 (상위 3개 질환의 가중 평균)
  const topDiseases = diseases.slice(0, 3);
  const weights = [0.5, 0.3, 0.2];
  const overallRisk = Math.round(
    topDiseases.reduce((sum, d, i) => sum + d.risk * weights[i], 0)
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
  highRiskDiseases.slice(0, 2).forEach((disease) => {
    switch (disease.id) {
      case 'cervical_disc':
        recommendations.push('목 스트레칭과 자세 교정 운동을 매일 실시하세요.');
        break;
      case 'frozen_shoulder':
        recommendations.push('어깨 가동 범위 운동을 천천히 시작하세요.');
        break;
      case 'lumbar_disc':
        recommendations.push('코어 근육 강화 운동이 도움이 됩니다.');
        break;
      case 'scoliosis':
        recommendations.push('좌우 균형 맞추기 운동을 권장합니다.');
        break;
      case 'knee_arthritis':
        recommendations.push('하체 근력 강화와 체중 관리가 중요합니다.');
        break;
      case 'tension_headache':
        recommendations.push('목과 어깨 이완 운동을 자주 해주세요.');
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
