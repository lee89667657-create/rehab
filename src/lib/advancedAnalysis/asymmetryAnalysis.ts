/**
 * 좌우 비대칭 분석 모듈
 *
 * 좌우 관절의 각도 차이를 분석하여 신체 균형 상태를 평가합니다.
 * 비대칭 정도에 따라 심각도를 분류하고 재활 필요성을 판단합니다.
 *
 * 주요 기능:
 * - 개별 관절 좌우 비대칭 분석
 * - 전체 관절 비대칭 일괄 분석
 * - 비대칭 점수 계산 (균형도 평가)
 * - 비대칭 요약 메시지 생성
 *
 * 임상적 의의:
 * - 5% 미만: 정상 범위 (미세한 개인차)
 * - 5~10%: 경미한 비대칭 (모니터링 권장)
 * - 10~20%: 중등도 비대칭 (재활 운동 권장)
 * - 20% 이상: 심각한 비대칭 (전문가 상담 필요)
 */

import { JointAngles } from './types';

// ============================================================
// 비대칭 결과 타입 정의
// ============================================================

/**
 * 비대칭 분석 결과 인터페이스
 *
 * 좌우 관절 각도를 비교하여 비대칭 정도와 심각도를 담습니다.
 */
export interface AsymmetryResult {
  /** 관절명 (한글, 예: '고관절', '무릎', '어깨') */
  joint: string;

  /** 좌측 관절 각도 (도 단위) */
  leftValue: number;

  /** 우측 관절 각도 (도 단위) */
  rightValue: number;

  /** 좌우 절대 차이 (도 단위) */
  difference: number;

  /** 백분율 차이 (평균 대비 차이 비율, %) */
  percentDiff: number;

  /**
   * 우세 측면 (더 큰 값을 가진 쪽)
   * - left: 좌측이 더 큼
   * - right: 우측이 더 큼
   * - balanced: 균형 상태 (차이 2도 이하)
   */
  dominantSide: 'left' | 'right' | 'balanced';

  /**
   * 비대칭 심각도
   * - minimal: 5% 미만 (정상)
   * - mild: 5~10% (경미)
   * - moderate: 10~20% (중등도)
   * - severe: 20% 이상 (심각)
   */
  severity: 'minimal' | 'mild' | 'moderate' | 'severe';

  /** 사용자에게 표시할 결과 메시지 (한글) */
  message: string;
}

// ============================================================
// 비대칭 심각도 판정 함수
// ============================================================

/**
 * 백분율 차이에 따른 비대칭 심각도를 판정합니다.
 *
 * 임상적 기준에 따라 비대칭 정도를 4단계로 분류합니다.
 *
 * @param percentDiff - 백분율 차이 (%)
 * @returns 심각도 ('minimal' | 'mild' | 'moderate' | 'severe')
 *
 * @example
 * ```typescript
 * getSeverity(3);   // 'minimal' - 5% 미만
 * getSeverity(7);   // 'mild' - 5~10%
 * getSeverity(15);  // 'moderate' - 10~20%
 * getSeverity(25);  // 'severe' - 20% 이상
 * ```
 */
const getSeverity = (
  percentDiff: number
): 'minimal' | 'mild' | 'moderate' | 'severe' => {
  if (percentDiff < 5) return 'minimal'; // 5% 미만: 정상
  if (percentDiff < 10) return 'mild'; // 5~10%: 경미
  if (percentDiff < 20) return 'moderate'; // 10~20%: 중등도
  return 'severe'; // 20% 이상: 심각
};

// ============================================================
// 심각도 한글명 변환 함수
// ============================================================

/**
 * 심각도 코드를 한글 텍스트로 변환합니다.
 *
 * @param severity - 심각도 코드
 * @returns 한글 심각도명
 *
 * @example
 * ```typescript
 * getSeverityText('minimal');  // '정상'
 * getSeverityText('mild');     // '경미'
 * getSeverityText('moderate'); // '중등도'
 * getSeverityText('severe');   // '심각'
 * ```
 */
const getSeverityText = (severity: string): string => {
  switch (severity) {
    case 'minimal':
      return '정상';
    case 'mild':
      return '경미';
    case 'moderate':
      return '중등도';
    case 'severe':
      return '심각';
    default:
      return '알 수 없음';
  }
};

// ============================================================
// 단일 관절 비대칭 분석 함수
// ============================================================

/**
 * 단일 관절의 좌우 비대칭을 분석합니다.
 *
 * 좌우 각도를 비교하여 절대 차이, 백분율 차이, 우세 측면,
 * 심각도를 계산하고 결과 메시지를 생성합니다.
 *
 * @param joint - 관절명 (한글, 예: '고관절')
 * @param leftValue - 좌측 관절 각도 (도 단위)
 * @param rightValue - 우측 관절 각도 (도 단위)
 * @returns AsymmetryResult 객체 - 비대칭 분석 결과 상세 정보
 *
 * @example
 * ```typescript
 * const result = analyzeJointAsymmetry('무릎', 175, 170);
 * console.log(result.difference);   // 5
 * console.log(result.percentDiff);  // 약 2.9%
 * console.log(result.severity);     // 'minimal'
 * ```
 */
export const analyzeJointAsymmetry = (
  joint: string,
  leftValue: number,
  rightValue: number
): AsymmetryResult => {
  // 좌우 절대 차이 계산
  const difference = Math.abs(leftValue - rightValue);

  // 좌우 평균값 계산 (백분율 계산에 사용)
  const average = (leftValue + rightValue) / 2;

  // 백분율 차이 계산 (평균 대비 차이 비율)
  // 평균이 0이면 0% 반환 (0으로 나누기 방지)
  const percentDiff = average > 0 ? (difference / average) * 100 : 0;

  // 우세 측면 결정
  // 차이가 2도 이하면 균형 상태로 판정
  let dominantSide: 'left' | 'right' | 'balanced' = 'balanced';
  if (difference > 2) {
    dominantSide = leftValue > rightValue ? 'left' : 'right';
  }

  // 심각도 판정
  const severity = getSeverity(percentDiff);

  // 결과 메시지 생성
  let message = '';
  if (severity === 'minimal') {
    // 정상 범위면 균형 메시지
    message = `${joint} 좌우 균형`;
  } else {
    // 비대칭이면 상세 정보 포함
    const sideText = dominantSide === 'left' ? '좌측' : '우측';
    const comparison = leftValue > rightValue ? '큼' : '작음';
    message = `${joint} ${sideText}이 ${Math.round(difference)}도 더 ${comparison} (${getSeverityText(severity)})`;
  }

  // 결과 객체 반환
  return {
    joint,
    leftValue: Math.round(leftValue * 10) / 10, // 소수점 첫째 자리까지 반올림
    rightValue: Math.round(rightValue * 10) / 10,
    difference: Math.round(difference * 10) / 10,
    percentDiff: Math.round(percentDiff * 10) / 10,
    dominantSide,
    severity,
    message,
  };
};

// ============================================================
// 전체 관절 비대칭 분석 함수
// ============================================================

/**
 * 모든 좌우 대칭 관절의 비대칭을 한 번에 분석합니다.
 *
 * JointAngles 객체를 입력받아 좌우가 있는 관절별로 비대칭 분석을 수행합니다.
 * 총 3쌍의 관절을 분석합니다:
 * - 고관절 (좌/우)
 * - 무릎 (좌/우)
 * - 어깨 (좌/우)
 *
 * 참고: 몸통(trunk)은 좌우 구분이 없으므로 비대칭 분석에서 제외됩니다.
 *
 * @param angles - 관절각 데이터 (calculateAllJointAngles 함수 결과)
 * @returns AsymmetryResult 배열 - 각 관절별 비대칭 분석 결과
 *
 * @example
 * ```typescript
 * const angles = calculateAllJointAngles(landmarks);
 * const asymResults = analyzeAllAsymmetry(angles);
 *
 * // 심각한 비대칭만 필터링
 * const severeAsym = asymResults.filter(r => r.severity === 'severe');
 * ```
 */
export const analyzeAllAsymmetry = (angles: JointAngles): AsymmetryResult[] => {
  const results: AsymmetryResult[] = [];

  // 고관절 비대칭 분석
  results.push(analyzeJointAsymmetry('고관절', angles.hipLeft, angles.hipRight));

  // 무릎 비대칭 분석
  results.push(analyzeJointAsymmetry('무릎', angles.kneeLeft, angles.kneeRight));

  // 어깨 비대칭 분석
  results.push(
    analyzeJointAsymmetry('어깨', angles.shoulderLeft, angles.shoulderRight)
  );

  return results;
};

// ============================================================
// 비대칭 점수 계산 함수
// ============================================================

/**
 * 비대칭 점수를 계산합니다 (100점 만점).
 *
 * 비대칭이 심할수록 점수가 낮아집니다.
 * 각 심각도별로 감점이 적용됩니다:
 * - minimal: 0점 감점
 * - mild: 5점 감점
 * - moderate: 15점 감점
 * - severe: 25점 감점
 *
 * @param results - 비대칭 분석 결과 배열 (analyzeAllAsymmetry 함수 결과)
 * @returns 비대칭 점수 (0~100, 높을수록 균형 좋음)
 *
 * @example
 * ```typescript
 * const asymResults = analyzeAllAsymmetry(angles);
 * const score = calculateAsymmetryScore(asymResults);
 * console.log(`균형 점수: ${score}점`);  // 예: '균형 점수: 85점'
 * ```
 */
export const calculateAsymmetryScore = (results: AsymmetryResult[]): number => {
  // 결과가 없으면 만점 반환
  if (results.length === 0) return 100;

  // 총 감점 계산
  let totalDeduction = 0;

  results.forEach((r) => {
    switch (r.severity) {
      case 'minimal':
        totalDeduction += 0; // 정상: 감점 없음
        break;
      case 'mild':
        totalDeduction += 5; // 경미: 5점 감점
        break;
      case 'moderate':
        totalDeduction += 15; // 중등도: 15점 감점
        break;
      case 'severe':
        totalDeduction += 25; // 심각: 25점 감점
        break;
    }
  });

  // 100점에서 감점을 뺀 점수 반환 (최소 0점)
  return Math.max(0, 100 - totalDeduction);
};

// ============================================================
// 비대칭 요약 메시지 생성 함수
// ============================================================

/**
 * 전체 비대칭 상태를 요약하는 메시지를 생성합니다.
 *
 * 중등도 이상의 비대칭이 있는 관절을 나열하거나,
 * 모두 정상이면 긍정적인 메시지를 반환합니다.
 *
 * @param results - 비대칭 분석 결과 배열 (analyzeAllAsymmetry 함수 결과)
 * @returns 요약 메시지 (한글)
 *
 * @example
 * ```typescript
 * const asymResults = analyzeAllAsymmetry(angles);
 * const summary = getAsymmetrySummary(asymResults);
 * console.log(summary);
 * // 정상: '좌우 균형이 양호합니다.'
 * // 비대칭 있음: '고관절, 무릎의 좌우 비대칭이 확인됩니다.'
 * ```
 */
export const getAsymmetrySummary = (results: AsymmetryResult[]): string => {
  // 중등도(moderate) 이상의 심각한 비대칭 필터링
  const severeResults = results.filter(
    (r) => r.severity === 'severe' || r.severity === 'moderate'
  );

  // 심각한 비대칭이 없으면 양호 메시지 반환
  if (severeResults.length === 0) {
    return '좌우 균형이 양호합니다.';
  }

  // 비대칭 관절 이름들을 쉼표로 연결
  const joints = severeResults.map((r) => r.joint).join(', ');
  return `${joints}의 좌우 비대칭이 확인됩니다.`;
};
