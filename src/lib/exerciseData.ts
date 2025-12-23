/**
 * exerciseData.ts
 * 실시간 운동 분석을 위한 운동 데이터 정의
 *
 * 각 운동은 카메라 기반 자동 반복 카운팅을 위한 설정을 포함합니다.
 *
 * ## 반복 카운팅 원리
 * 1. 특정 관절(countingJoint)의 좌표를 추적
 * 2. 해당 축(countingAxis)의 값이 thresholdDown을 넘으면 'down' 상태
 * 3. 다시 thresholdUp 아래로 내려가면 'up' 상태 -> 1회 카운트
 * 4. hysteresis를 통해 진동/떨림으로 인한 중복 카운트 방지
 *
 * ## countingJoint 옵션
 * - 'nose': 코 위치 (턱 당기기 등)
 * - 'shoulder': 어깨 위치 (으쓱하기 등)
 * - 'hip': 골반 위치 (스쿼트, 골반 운동 등)
 * - 'knee': 무릎 위치 (무릎 굽히기 등)
 * - 'wrist': 손목 위치 (팔 운동 등)
 *
 * ## countingAxis 옵션
 * - 'x': 좌우 방향 (셀피 카메라 기준 좌/우 이동)
 * - 'y': 상하 방향 (위/아래 이동)
 */

import { LANDMARK_INDEX } from '@/lib/advancedAnalysis';

// ============================================================
// 타입 정의
// ============================================================

/**
 * 반복 카운팅이 가능한 운동 타입
 */
export interface CountableExercise {
  /** 운동 고유 ID */
  id: string;

  /** 운동 이름 */
  name: string;

  /** 운동 설명 */
  description: string;

  /** 대상 질환/조건 */
  targetDisease: string;

  /** 예상 소요 시간 (초) */
  duration: number;

  /** 세트 수 */
  sets: number;

  /** 세트당 반복 횟수 */
  reps: number;

  /** 세트 간 휴식 시간 (초) */
  restTime: number;

  // ========================================
  // 반복 카운팅 설정
  // ========================================

  /**
   * 감지할 관절
   * - 'nose': 코 (0번)
   * - 'shoulder': 어깨 (11, 12번 중 visibility 높은 쪽 또는 중점)
   * - 'hip': 골반 (23, 24번)
   * - 'knee': 무릎 (25, 26번)
   * - 'wrist': 손목 (15, 16번)
   * - 'elbow': 팔꿈치 (13, 14번)
   */
  countingJoint: 'nose' | 'shoulder' | 'hip' | 'knee' | 'wrist' | 'elbow';

  /**
   * 감지할 축
   * - 'x': 좌우 방향 (정규화 좌표 0~1)
   * - 'y': 상하 방향 (정규화 좌표 0~1)
   */
  countingAxis: 'x' | 'y';

  /**
   * 'up' 상태 임계값 (정규화 좌표)
   * 이 값 아래로 내려가면 up 상태로 판정
   */
  thresholdUp: number;

  /**
   * 'down' 상태 임계값 (정규화 좌표)
   * 이 값 위로 올라가면 down 상태로 판정
   */
  thresholdDown: number;

  /**
   * 자세 포인트 (사용자에게 표시할 주의사항)
   */
  keyPoints: string[];

  /**
   * 카운팅 쿨다운 시간 (밀리초)
   * 너무 빠른 연속 카운팅 방지
   * 기본값: 300ms
   */
  countingCooldown?: number;

  /**
   * 셀피 카메라 좌우반전 여부
   * true일 경우 x축 기반 운동에서 좌표를 반전하여 계산
   * 기본값: false
   */
  mirrorMode?: boolean;
}

/**
 * 운동 결과 타입
 */
export interface ExerciseResult {
  /** 운동 ID */
  exerciseId: string;

  /** 운동 이름 */
  exerciseName: string;

  /** 완료한 세트 수 */
  completedSets: number;

  /** 세트별 완료 횟수 배열 */
  completedReps: number[];

  /** 총 반복 횟수 */
  totalReps: number;

  /** 정확도 (0~100) */
  accuracy: number;

  /** 운동 소요 시간 (초) */
  duration: number;

  /** 완료 일시 (ISO 문자열) */
  date: string;
}

// ============================================================
// 관절 인덱스 매핑
// ============================================================

/**
 * countingJoint 문자열을 실제 랜드마크 인덱스로 변환
 * 좌/우 쌍이 있는 관절은 [left, right] 배열로 반환
 */
export const JOINT_INDEX_MAP: Record<CountableExercise['countingJoint'], number | [number, number]> = {
  nose: LANDMARK_INDEX.NOSE,
  shoulder: [LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.RIGHT_SHOULDER],
  hip: [LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.RIGHT_HIP],
  knee: [LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.RIGHT_KNEE],
  wrist: [LANDMARK_INDEX.LEFT_WRIST, LANDMARK_INDEX.RIGHT_WRIST],
  elbow: [LANDMARK_INDEX.LEFT_ELBOW, LANDMARK_INDEX.RIGHT_ELBOW],
};

// ============================================================
// 운동 데이터 정의
// ============================================================

/**
 * 실시간 카운팅 가능한 운동 목록
 */
export const COUNTABLE_EXERCISES: CountableExercise[] = [
  // ========================================
  // 거북목 개선 운동
  // ========================================
  {
    id: 'chin-tuck',
    name: '턱 당기기',
    description: '턱을 뒤로 당겨 이중턱을 만드세요',
    targetDisease: '거북목',
    duration: 60,
    sets: 3,
    reps: 10,
    restTime: 15,
    countingJoint: 'nose',
    countingAxis: 'y',
    // y축 기준: 값이 작을수록 위쪽 (턱을 당기면 코가 약간 위로)
    // 실제로는 턱을 당기면 코의 y 좌표가 약간 변화
    thresholdUp: 0.28,    // 턱 당긴 상태 (코가 약간 위로)
    thresholdDown: 0.32,  // 원래 상태 (코가 정상 위치)
    keyPoints: ['시선은 정면 유지', '어깨는 고정', '턱만 뒤로 당기기'],
    countingCooldown: 500,
  },
  {
    id: 'neck-side-stretch',
    name: '목 옆 스트레칭',
    description: '목을 옆으로 천천히 기울이세요',
    targetDisease: '거북목',
    duration: 60,
    sets: 2,
    reps: 8,
    restTime: 10,
    countingJoint: 'nose',
    countingAxis: 'x',
    // x축 기준: 머리를 옆으로 기울이면 코의 x 좌표 변화
    thresholdUp: 0.45,    // 중앙에서 왼쪽으로 기울인 상태
    thresholdDown: 0.55,  // 중앙에서 오른쪽으로 기울인 상태
    keyPoints: ['어깨는 고정', '귀가 어깨에 닿도록', '반대쪽도 동일하게'],
    countingCooldown: 800,
    mirrorMode: true,
  },

  // ========================================
  // 라운드숄더 개선 운동
  // ========================================
  {
    id: 'shoulder-squeeze',
    name: '어깨 으쓱하기',
    description: '어깨를 귀 쪽으로 올렸다 내리세요',
    targetDisease: '라운드숄더',
    duration: 60,
    sets: 3,
    reps: 12,
    restTime: 15,
    countingJoint: 'shoulder',
    countingAxis: 'y',
    // y축 기준: 어깨를 올리면 y 좌표가 작아짐 (위로 이동)
    thresholdUp: 0.32,    // 어깨 올린 상태
    thresholdDown: 0.38,  // 어깨 내린 상태
    keyPoints: ['팔은 옆에 붙이고', '어깨만 올리기', '천천히 내리기'],
    countingCooldown: 400,
  },
  {
    id: 'shoulder-blade-squeeze',
    name: '견갑골 모으기',
    description: '양쪽 견갑골을 서로 가깝게 모으세요',
    targetDisease: '라운드숄더',
    duration: 60,
    sets: 3,
    reps: 10,
    restTime: 15,
    countingJoint: 'shoulder',
    countingAxis: 'x',
    // x축 기준: 견갑골을 모으면 어깨가 뒤로 -> 어깨 사이 거리 변화
    // 여기서는 어깨의 x 좌표 변화를 감지
    thresholdUp: 0.35,    // 어깨 모은 상태 (어깨가 뒤로)
    thresholdDown: 0.42,  // 어깨 펴진 상태
    keyPoints: ['등 중앙에 연필을 끼운다는 느낌', '5초간 유지', '천천히 이완'],
    countingCooldown: 600,
  },

  // ========================================
  // 하체 운동
  // ========================================
  {
    id: 'squat',
    name: '스쿼트',
    description: '무릎을 굽혀 앉았다 일어나세요',
    targetDisease: '무릎/골반',
    duration: 90,
    sets: 3,
    reps: 10,
    restTime: 30,
    countingJoint: 'hip',
    countingAxis: 'y',
    // y축 기준: 앉으면 골반 y 좌표가 커짐 (아래로 이동)
    thresholdUp: 0.50,    // 선 상태
    thresholdDown: 0.65,  // 앉은 상태
    keyPoints: ['무릎이 발끝을 넘지 않게', '허리는 곧게', '엉덩이를 뒤로'],
    countingCooldown: 500,
  },
  {
    id: 'knee-lift',
    name: '무릎 들어올리기',
    description: '한쪽 무릎을 가슴 쪽으로 들어올리세요',
    targetDisease: '고관절/골반',
    duration: 60,
    sets: 2,
    reps: 10,
    restTime: 15,
    countingJoint: 'knee',
    countingAxis: 'y',
    // y축 기준: 무릎을 올리면 y 좌표가 작아짐 (위로 이동)
    thresholdUp: 0.55,    // 무릎 올린 상태
    thresholdDown: 0.75,  // 무릎 내린 상태
    keyPoints: ['상체 곧게 유지', '천천히 올리고 내리기', '양쪽 번갈아 실시'],
    countingCooldown: 400,
  },

  // ========================================
  // 팔 운동
  // ========================================
  {
    id: 'arm-raise',
    name: '팔 들어올리기',
    description: '양팔을 천천히 위로 들어올리세요',
    targetDisease: '어깨 가동성',
    duration: 60,
    sets: 2,
    reps: 10,
    restTime: 15,
    countingJoint: 'wrist',
    countingAxis: 'y',
    // y축 기준: 팔을 올리면 손목 y 좌표가 작아짐 (위로 이동)
    thresholdUp: 0.25,    // 팔 올린 상태
    thresholdDown: 0.55,  // 팔 내린 상태
    keyPoints: ['팔을 곧게 펴고', '어깨 높이 이상으로', '천천히 올리고 내리기'],
    countingCooldown: 500,
  },
  {
    id: 'elbow-flex',
    name: '팔꿈치 굽히기',
    description: '팔꿈치를 굽혀 손을 어깨 쪽으로 가져오세요',
    targetDisease: '팔 근력',
    duration: 60,
    sets: 3,
    reps: 12,
    restTime: 15,
    countingJoint: 'wrist',
    countingAxis: 'y',
    // y축 기준: 팔꿈치를 굽히면 손목이 위로 이동
    thresholdUp: 0.30,    // 팔꿈치 굽힌 상태
    thresholdDown: 0.50,  // 팔 펴진 상태
    keyPoints: ['팔꿈치는 몸에 붙이고', '손목만 올리기', '천천히 반복'],
    countingCooldown: 400,
  },
];

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * ID로 운동 찾기
 */
export function getCountableExerciseById(id: string): CountableExercise | undefined {
  return COUNTABLE_EXERCISES.find((ex) => ex.id === id);
}

/**
 * 대상 질환으로 운동 필터링
 */
export function getExercisesByDisease(disease: string): CountableExercise[] {
  return COUNTABLE_EXERCISES.filter((ex) =>
    ex.targetDisease.toLowerCase().includes(disease.toLowerCase())
  );
}

/**
 * 운동 기록 저장 (localStorage)
 */
export function saveExerciseResult(result: ExerciseResult): void {
  try {
    const history = JSON.parse(localStorage.getItem('exerciseHistory') || '[]');
    history.unshift(result);
    // 최대 100개까지만 저장
    if (history.length > 100) {
      history.pop();
    }
    localStorage.setItem('exerciseHistory', JSON.stringify(history));
  } catch (error) {
    console.error('운동 기록 저장 실패:', error);
  }
}

/**
 * 운동 기록 조회 (localStorage)
 */
export function getExerciseHistory(): ExerciseResult[] {
  try {
    return JSON.parse(localStorage.getItem('exerciseHistory') || '[]');
  } catch {
    return [];
  }
}

/**
 * 관절의 정규화 좌표 값 추출
 *
 * 좌/우 쌍이 있는 관절의 경우:
 * - 둘 다 visibility가 0.5 이상이면 중점(midpoint) 반환
 * - 하나만 보이면 보이는 쪽 반환
 * - 둘 다 안 보이면 null 반환
 *
 * @param landmarks - MediaPipe 랜드마크 배열
 * @param joint - 관절 이름
 * @param axis - 추출할 축 ('x' | 'y')
 * @param mirrorX - x축 반전 여부 (셀피 카메라용)
 * @returns 정규화된 좌표 값 또는 null
 */
export function getJointValue(
  landmarks: Array<{ x: number; y: number; visibility?: number }>,
  joint: CountableExercise['countingJoint'],
  axis: 'x' | 'y',
  mirrorX: boolean = false
): number | null {
  const indexOrPair = JOINT_INDEX_MAP[joint];

  // 단일 관절 (nose)
  if (typeof indexOrPair === 'number') {
    const lm = landmarks[indexOrPair];
    if (!lm || (lm.visibility ?? 0) < 0.5) return null;

    let value = axis === 'x' ? lm.x : lm.y;
    if (axis === 'x' && mirrorX) {
      value = 1 - value;
    }
    return value;
  }

  // 좌/우 쌍 관절
  const [leftIdx, rightIdx] = indexOrPair;
  const left = landmarks[leftIdx];
  const right = landmarks[rightIdx];

  const leftVisible = left && (left.visibility ?? 0) >= 0.5;
  const rightVisible = right && (right.visibility ?? 0) >= 0.5;

  let value: number;

  if (leftVisible && rightVisible) {
    // 둘 다 보이면 중점 사용
    value = axis === 'x'
      ? (left.x + right.x) / 2
      : (left.y + right.y) / 2;
  } else if (leftVisible) {
    value = axis === 'x' ? left.x : left.y;
  } else if (rightVisible) {
    value = axis === 'x' ? right.x : right.y;
  } else {
    return null;
  }

  if (axis === 'x' && mirrorX) {
    value = 1 - value;
  }

  return value;
}

export default COUNTABLE_EXERCISES;
