/**
 * calibration.ts
 * 캘리브레이션 유틸리티 함수
 * 
 * 교수님 프로젝트(UTO)의 캘리브레이션 로직을 참고하여
 * 더 안정적인 baseline 측정을 지원합니다.
 * 
 * ## 개선점
 * 1. 중앙값(median) 사용 → 이상치 제거 효과
 * 2. 최소 샘플 수 체크 → 신뢰성 보장
 * 3. 유효성 검사 → 잘못된 캘리브레이션 방지
 */

// ============================================================
// 타입 정의
// ============================================================

/**
 * 캘리브레이션 결과
 */
export interface CalibrationResult {
  /** 측정된 baseline 값 */
  baseline: number;
  /** 샘플 수 */
  sampleCount: number;
  /** 유효성 여부 */
  isValid: boolean;
  /** 표준편차 (안정성 지표) */
  standardDeviation: number;
}

/**
 * 캘리브레이션 설정
 */
export interface CalibrationConfig {
  /** 최소 샘플 수 (기본값: 10) */
  minSamples: number;
  /** 최대 표준편차 (기본값: 0.05) - 이 이상이면 불안정으로 판단 */
  maxStdDev: number;
}

// ============================================================
// 기본 설정
// ============================================================

export const DEFAULT_CALIBRATION_CONFIG: CalibrationConfig = {
  minSamples: 10,      // 3초 동안 약 10~15개 샘플 예상
  maxStdDev: 0.05,     // 5% 이상 변동이면 불안정
};

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * 중앙값 계산
 * - 이상치 제거 효과가 있어 평균보다 안정적
 * 
 * @param arr - 숫자 배열
 * @returns 중앙값 (배열이 비어있으면 0)
 */
export function calculateMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * 평균 계산
 * 
 * @param arr - 숫자 배열
 * @returns 평균 (배열이 비어있으면 0)
 */
export function calculateMean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * 표준편차 계산
 * - 값들이 얼마나 퍼져있는지 측정
 * - 작을수록 안정적인 자세
 * 
 * @param arr - 숫자 배열
 * @returns 표준편차 (배열이 비어있으면 0)
 */
export function calculateStandardDeviation(arr: number[]): number {
  if (arr.length === 0) return 0;
  
  const mean = calculateMean(arr);
  const squaredDiffs = arr.map(value => Math.pow(value - mean, 2));
  const avgSquaredDiff = calculateMean(squaredDiffs);
  
  return Math.sqrt(avgSquaredDiff);
}

/**
 * 캘리브레이션 결과 계산
 * 
 * @param samples - 측정된 샘플 배열
 * @param config - 캘리브레이션 설정 (선택)
 * @returns 캘리브레이션 결과
 */
export function calculateCalibration(
  samples: number[],
  config: CalibrationConfig = DEFAULT_CALIBRATION_CONFIG
): CalibrationResult {
  const sampleCount = samples.length;
  
  // 샘플이 충분하지 않은 경우
  if (sampleCount < config.minSamples) {
    return {
      baseline: sampleCount > 0 ? calculateMedian(samples) : 0.5,
      sampleCount,
      isValid: false,
      standardDeviation: calculateStandardDeviation(samples),
    };
  }
  
  // 중앙값과 표준편차 계산
  const baseline = calculateMedian(samples);
  const stdDev = calculateStandardDeviation(samples);
  
  // 유효성 검사: 표준편차가 너무 크면 불안정
  const isValid = stdDev <= config.maxStdDev;
  
  return {
    baseline,
    sampleCount,
    isValid,
    standardDeviation: stdDev,
  };
}

/**
 * 동작 감지 임계값 계산
 * 
 * @param baseline - 캘리브레이션된 기준값
 * @param deltaThreshold - 운동별 변화량 임계값
 * @returns 동작/복귀 임계값
 */
export function calculateThresholds(
  baseline: number,
  deltaThreshold: number
): {
  /** 동작 수행 임계값 (baseline에서 이만큼 변화하면 동작 인식) */
  actionThreshold: number;
  /** 복귀 임계값 (baseline 근처로 돌아오면 복귀 인식) */
  returnThreshold: number;
} {
  return {
    actionThreshold: baseline - deltaThreshold,
    returnThreshold: baseline - (deltaThreshold * 0.5),
  };
}

/**
 * 이상치 제거 (IQR 방식)
 * - 상하위 25% 경계 밖의 값 제거
 * - 극단적인 노이즈 제거에 유용
 * 
 * @param arr - 숫자 배열
 * @returns 이상치가 제거된 배열
 */
export function removeOutliers(arr: number[]): number[] {
  if (arr.length < 4) return arr;
  
  const sorted = [...arr].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  return arr.filter(value => value >= lowerBound && value <= upperBound);
}

/**
 * 스무딩 (이동평균)
 * - 노이즈 감소를 위한 이동평균 계산
 * 
 * @param arr - 숫자 배열
 * @param windowSize - 윈도우 크기 (기본값: 3)
 * @returns 스무딩된 배열
 */
export function smoothData(arr: number[], windowSize: number = 3): number[] {
  if (arr.length < windowSize) return arr;
  
  const result: number[] = [];
  
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(arr.length, i + Math.ceil(windowSize / 2));
    const window = arr.slice(start, end);
    result.push(calculateMean(window));
  }
  
  return result;
}
