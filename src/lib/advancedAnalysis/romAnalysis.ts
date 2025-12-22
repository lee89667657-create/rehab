/**
 * ROM(Range of Motion) 분석 모듈
 *
 * 관절가동범위(ROM)를 분석하여 정상 범위와 비교합니다.
 * 의학적 기준에 따라 제한(limited) 또는 과도(excessive) 상태를 판정합니다.
 *
 * 주요 기능:
 * - 개별 관절 ROM 분석
 * - 전체 관절 ROM 일괄 분석
 * - ROM 정상 비율 점수 계산
 *
 * 참고: ROM 정상 범위는 일반적인 의학적 기준을 따르며,
 *       개인차나 특정 운동에 따라 다를 수 있습니다.
 */

import { JointAngles } from './types';

// ============================================================
// ROM 결과 타입 정의
// ============================================================

/**
 * ROM 분석 결과 인터페이스
 *
 * 각 관절의 ROM 측정값과 정상 범위 비교 결과를 담습니다.
 */
export interface ROMResult {
  /** 관절명 (trunk, hip, knee, shoulder) */
  joint: string;

  /** 측정 부위 (left: 좌측, right: 우측, center: 중앙) */
  side: 'left' | 'right' | 'center';

  /** 실제 측정된 각도 (도 단위) */
  measured: number;

  /** 정상 범위 최소값 (도 단위) */
  normalMin: number;

  /** 정상 범위 최대값 (도 단위) */
  normalMax: number;

  /**
   * ROM 상태 판정 결과
   * - normal: 정상 범위 내
   * - limited: 정상 범위보다 작음 (관절 가동 제한)
   * - excessive: 정상 범위보다 큼 (과도한 가동)
   */
  status: 'normal' | 'limited' | 'excessive';

  /**
   * 정상 범위에서 벗어난 정도 (도 단위)
   * - 음수: 정상 최소값보다 작음 (제한)
   * - 양수: 정상 최대값보다 큼 (과도)
   * - 0: 정상 범위 내
   */
  deviation: number;

  /** 사용자에게 표시할 결과 메시지 (한글) */
  message: string;
}

// ============================================================
// 정상 ROM 범위 상수 정의
// ============================================================

/**
 * 관절별 정상 ROM 범위 (의학적 기준)
 *
 * 각 관절의 정상 가동 범위를 정의합니다.
 * min: 최소 정상 각도, max: 최대 정상 각도
 * name: 한글 관절명 (UI 표시용)
 *
 * 참고:
 * - trunk: 서 있는 자세에서 몸통의 전방 기울기 (0도가 수직)
 * - hip: 고관절 신전 각도 (완전 신전 시 약 180도)
 * - knee: 무릎 신전 각도 (완전 신전 시 약 180도)
 * - shoulder: 어깨 외전/굴곡 각도 (팔을 몸통에서 벌린 정도)
 */
const NORMAL_ROM: Record<string, { min: number; max: number; name: string }> = {
  trunk: { min: 0, max: 15, name: '몸통 기울기' },     // 정상: 0~15도 (15도 이상은 과도한 전방 기울기)
  hip: { min: 160, max: 180, name: '고관절' },        // 정상: 160~180도 (완전 신전에 가까움)
  knee: { min: 170, max: 180, name: '무릎' },         // 정상: 170~180도 (완전 신전에 가까움)
  shoulder: { min: 10, max: 45, name: '어깨' },       // 정상: 10~45도 (자연스러운 팔 위치)
};

// ============================================================
// ROM 상태 판정 함수
// ============================================================

/**
 * ROM 상태를 판정합니다.
 *
 * 측정값이 정상 범위 내에 있는지, 제한되어 있는지, 과도한지 판정합니다.
 *
 * @param measured - 실제 측정된 각도 (도 단위)
 * @param min - 정상 범위 최소값 (도 단위)
 * @param max - 정상 범위 최대값 (도 단위)
 * @returns 'normal' | 'limited' | 'excessive' 중 하나
 *
 * @example
 * ```typescript
 * getROMStatus(175, 170, 180); // 'normal' - 정상 범위 내
 * getROMStatus(160, 170, 180); // 'limited' - 최소값보다 작음
 * getROMStatus(190, 170, 180); // 'excessive' - 최대값보다 큼
 * ```
 */
const getROMStatus = (
  measured: number,
  min: number,
  max: number
): 'normal' | 'limited' | 'excessive' => {
  // 측정값이 최소값보다 작으면 제한됨
  if (measured < min) return 'limited';
  // 측정값이 최대값보다 크면 과도함
  if (measured > max) return 'excessive';
  // 그 외에는 정상 범위 내
  return 'normal';
};

// ============================================================
// ROM 메시지 생성 함수
// ============================================================

/**
 * 사용자에게 표시할 ROM 결과 메시지를 생성합니다.
 *
 * @param joint - 관절 식별자 (trunk, hip, knee, shoulder)
 * @param side - 측정 부위 (left, right, center)
 * @param status - ROM 상태 (normal, limited, excessive)
 * @param deviation - 정상 범위에서 벗어난 정도 (도 단위)
 * @returns 한글 결과 메시지
 *
 * @example
 * ```typescript
 * getROMMessage('knee', 'left', 'normal', 0);
 * // 반환: '좌측 무릎 정상 범위'
 *
 * getROMMessage('hip', 'right', 'limited', -15);
 * // 반환: '우측 고관절 15도 제한됨'
 * ```
 */
const getROMMessage = (
  joint: string,
  side: string,
  status: string,
  deviation: number
): string => {
  // 좌측/우측 텍스트 결정 (center일 경우 빈 문자열)
  const sideText = side === 'left' ? '좌측' : side === 'right' ? '우측' : '';

  // 관절 한글명 가져오기 (없으면 원본 키 사용)
  const jointName = NORMAL_ROM[joint]?.name || joint;

  // 상태에 따른 메시지 생성
  if (status === 'normal') {
    return `${sideText} ${jointName} 정상 범위`;
  } else if (status === 'limited') {
    return `${sideText} ${jointName} ${Math.abs(deviation)}도 제한됨`;
  } else {
    return `${sideText} ${jointName} ${Math.abs(deviation)}도 과도함`;
  }
};

// ============================================================
// 단일 관절 ROM 분석 함수
// ============================================================

/**
 * 단일 관절의 ROM을 분석합니다.
 *
 * 측정된 각도를 정상 범위와 비교하여 상태를 판정하고
 * 상세한 분석 결과를 반환합니다.
 *
 * @param joint - 분석할 관절 식별자 (trunk, hip, knee, shoulder)
 * @param side - 측정 부위 (left: 좌측, right: 우측, center: 중앙)
 * @param measured - 실제 측정된 각도 (도 단위)
 * @returns ROMResult 객체 - 분석 결과 상세 정보
 *
 * @example
 * ```typescript
 * const result = analyzeJointROM('knee', 'left', 175);
 * console.log(result.status);   // 'normal'
 * console.log(result.message);  // '좌측 무릎 정상 범위'
 * ```
 */
export const analyzeJointROM = (
  joint: string,
  side: 'left' | 'right' | 'center',
  measured: number
): ROMResult => {
  // 해당 관절의 정상 범위 가져오기
  const range = NORMAL_ROM[joint];

  // 정의되지 않은 관절인 경우 기본값 반환
  if (!range) {
    return {
      joint,
      side,
      measured,
      normalMin: 0,
      normalMax: 180,
      status: 'normal',
      deviation: 0,
      message: '데이터 없음',
    };
  }

  // ROM 상태 판정
  const status = getROMStatus(measured, range.min, range.max);

  // 편차 계산 (정상 범위에서 얼마나 벗어났는지)
  let deviation = 0;

  if (status === 'limited') {
    // 제한된 경우: 최소값과의 차이 (음수)
    deviation = measured - range.min;
  } else if (status === 'excessive') {
    // 과도한 경우: 최대값과의 차이 (양수)
    deviation = measured - range.max;
  }

  // 결과 객체 반환
  return {
    joint,
    side,
    measured,
    normalMin: range.min,
    normalMax: range.max,
    status,
    deviation: Math.round(deviation * 10) / 10, // 소수점 첫째 자리까지 반올림
    message: getROMMessage(joint, side, status, deviation),
  };
};

// ============================================================
// 전체 관절 ROM 분석 함수
// ============================================================

/**
 * 모든 관절의 ROM을 한 번에 분석합니다.
 *
 * JointAngles 객체를 입력받아 각 관절별로 ROM 분석을 수행합니다.
 * 총 7개의 측정점을 분석합니다:
 * - 몸통 (1개): 중앙
 * - 고관절 (2개): 좌/우
 * - 무릎 (2개): 좌/우
 * - 어깨 (2개): 좌/우
 *
 * @param angles - 관절각 데이터 (calculateAllJointAngles 함수 결과)
 * @returns ROMResult 배열 - 각 관절별 분석 결과
 *
 * @example
 * ```typescript
 * const angles = calculateAllJointAngles(landmarks);
 * const romResults = analyzeAllROM(angles);
 *
 * // 비정상 관절만 필터링
 * const abnormalJoints = romResults.filter(r => r.status !== 'normal');
 * ```
 */
export const analyzeAllROM = (angles: JointAngles): ROMResult[] => {
  const results: ROMResult[] = [];

  // 몸통 기울기 분석 (중앙, 단일 측정)
  results.push(analyzeJointROM('trunk', 'center', angles.trunk));

  // 고관절 분석 (좌/우)
  results.push(analyzeJointROM('hip', 'left', angles.hipLeft));
  results.push(analyzeJointROM('hip', 'right', angles.hipRight));

  // 무릎 분석 (좌/우)
  results.push(analyzeJointROM('knee', 'left', angles.kneeLeft));
  results.push(analyzeJointROM('knee', 'right', angles.kneeRight));

  // 어깨 분석 (좌/우)
  results.push(analyzeJointROM('shoulder', 'left', angles.shoulderLeft));
  results.push(analyzeJointROM('shoulder', 'right', angles.shoulderRight));

  return results;
};

// ============================================================
// ROM 정상 비율 점수 계산 함수
// ============================================================

/**
 * ROM 정상 비율 점수를 계산합니다.
 *
 * 분석된 관절 중 정상 상태인 관절의 비율을 백분율로 반환합니다.
 * 모든 관절이 정상이면 100점, 모두 비정상이면 0점입니다.
 *
 * @param results - ROM 분석 결과 배열 (analyzeAllROM 함수 결과)
 * @returns 정상 비율 점수 (0~100, 정수)
 *
 * @example
 * ```typescript
 * const romResults = analyzeAllROM(angles);
 * const score = calculateROMScore(romResults);
 * console.log(`ROM 점수: ${score}점`);  // 예: 'ROM 점수: 85점'
 * ```
 */
export const calculateROMScore = (results: ROMResult[]): number => {
  // 결과가 없으면 100점 반환 (오류 방지)
  if (results.length === 0) return 100;

  // 정상 상태인 관절 수 계산
  const normalCount = results.filter((r) => r.status === 'normal').length;

  // 백분율 계산 후 정수로 반올림
  return Math.round((normalCount / results.length) * 100);
};
