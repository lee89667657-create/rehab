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

  /**
   * 카메라 촬영 방향
   * - 'front': 정면 촬영 (기본값)
   * - 'side': 측면 촬영
   */
  cameraDirection?: 'front' | 'side';

  /**
   * 분석 방식
   * - 'position': 좌표 변화량 기반 (기본값)
   * - 'angle': 관절 각도 기반
   */
  analysisType?: 'position' | 'angle';

  /**
   * 각도 분석 설정 (analysisType이 'angle'일 때)
   * - joint1, joint2, joint3: 각도를 측정할 3개 관절
   * - startAngle: 시작 자세 각도
   * - targetAngle: 목표 자세 각도
   */
  angleConfig?: {
    joint1: string;  // 첫 번째 관절 (예: 'hip')
    joint2: string;  // 중심 관절 (예: 'knee') - 각도 측정 기준점
    joint3: string;  // 세 번째 관절 (예: 'ankle')
    startAngle: number;   // 시작 자세 각도 (예: 170)
    targetAngle: number;  // 목표 자세 각도 (예: 90)
  };

  /**
   * 캘리브레이션 기반 동작 감지용 변화량 임계값
   * baseline 대비 이 값 이상 변화해야 동작으로 인식
   * 기본값: 0.05 (5%)
   */
  deltaThreshold?: number;

  /**
   * 디바운싱 프레임 수
   * 연속으로 조건 만족해야 상태 전환 (노이즈 방지)
   * 기본값: 3
   */
  debounceFrames?: number;
}

/**
 * 타이머 기반 운동 타입 (유지 시간 방식)
 * - 동작이 미세하여 카메라 인식이 어려운 운동에 적합
 * - "N초 유지 x M세트" 방식
 */
export interface TimerExercise {
  /** 운동 고유 ID */
  id: string;

  /** 운동 이름 */
  name: string;

  /** 운동 설명 */
  description: string;

  /** 대상 질환/조건 */
  targetDisease: string;

  /** 세트 수 */
  sets: number;

  /** 1회 유지 시간 (초) */
  holdTime: number;

  /** 세트 간 휴식 시간 (초) */
  restTime: number;

  /** 자세 포인트 (사용자에게 표시할 주의사항) */
  keyPoints: string[];
}

/**
 * 시퀀스 운동의 자세 조건
 */
export interface PoseCondition {
  joint: 'wrist' | 'elbow' | 'shoulder' | 'nose';
  axis: 'x' | 'y';
  compare: 'above' | 'below' | 'between';
  threshold: number | [number, number];
  relativeTo?: {
    joint: 'wrist' | 'elbow' | 'shoulder' | 'hip';
    axis: 'x' | 'y';
    compare: 'above' | 'below';
  };
}

/**
 * 시퀀스 운동의 자세 정의
 */
export interface PoseDefinition {
  name: string;
  description: string;
  holdTime: number;
  conditions: PoseCondition[];
}

/**
 * 시퀀스 운동 타입 (Y-T-W 같은 연속 자세 운동)
 */
export interface SequenceExercise {
  id: string;
  name: string;
  description: string;
  targetDisease: string;
  sets: number;
  cycles: number;
  restTime: number;
  keyPoints: string[];
  cameraDirection: 'front' | 'side';
  poses: PoseDefinition[];
  transitionTime?: number;
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

// ============================================================
// 타이머 기반 운동 데이터 (유지 시간 방식)
// ============================================================

/**
 * 타이머 기반 운동 목록
 * - 동작이 미세하여 카메라 인식이 어려운 운동
 * - "N초 유지 x M세트" 방식
 */
export const TIMER_EXERCISES: TimerExercise[] = [
  {
    id: 'chin-tuck',
    name: '턱 당기기',
    description: '턱을 뒤로 당겨 이중턱을 만들고 10초간 유지하세요',
    targetDisease: '거북목',
    sets: 3,
    holdTime: 10,  // 10초 유지
    restTime: 5,   // 세트 간 5초 휴식
    keyPoints: ['시선은 정면 유지', '어깨는 고정', '턱만 뒤로 당기기', '10초간 유지'],
  },
  {
    id: 'shoulder-blade-squeeze',
    name: '견갑골 모으기',
    description: '양쪽 견갑골을 서로 가깝게 모으고 5초간 유지하세요',
    targetDisease: '라운드숄더',
    sets: 3,
    holdTime: 5,   // 5초 유지
    restTime: 5,   // 세트 간 5초 휴식
    keyPoints: ['등 중앙에 연필을 끼운다는 느낌', '어깨는 내리고', '5초간 유지', '천천히 이완'],
  },
  {
    id: 'clasped-hands-back-stretch',
    name: '손깍지 뒤로 펴기',
    description: '등 뒤에서 손깍지를 끼고 팔을 펴서 가슴을 열어주세요',
    targetDisease: '등굽음',
    sets: 3,
    holdTime: 5,
    restTime: 10,
    keyPoints: [
      '바르게 서서 양손을 등 뒤로',
      '손깍지를 끼고 팔을 쭉 펴기',
      '가슴을 앞으로 내밀기',
      '5초간 유지 후 천천히 이완',
    ],
  },
  {
    id: 'ytw-exercise',
    name: 'Y-T-W 운동',
    description: 'Y, T, W 세 가지 자세로 등 근육을 강화합니다. 화면 안내에 따라 자세를 바꿔주세요.',
    targetDisease: '등굽음',
    sets: 3,
    holdTime: 9,  // Y(3초) + T(3초) + W(3초) = 9초
    restTime: 15,
    keyPoints: [
      'Y: 양팔을 위로 45도 벌려 Y 모양 (3초)',
      'T: 양팔을 수평으로 펴서 T 모양 (3초)',
      'W: 팔꿈치를 90도로 굽혀 W 모양 (3초)',
      '화면 안내에 따라 천천히 자세를 바꾸세요',
    ],
  },
];

// ============================================================
// 실시간 카운팅 운동 데이터
// ============================================================

export const COUNTABLE_EXERCISES: CountableExercise[] = [
  // ========================================
  // 거북목 개선 운동
  // ========================================
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
    thresholdUp: 0.45,
    thresholdDown: 0.55,
    keyPoints: ['어깨는 고정', '귀가 어깨에 닿도록', '반대쪽도 동일하게'],
    countingCooldown: 800,
    mirrorMode: true,
    deltaThreshold: 0.08,  // 8% 변화량 (목 기울이기는 큰 움직임)
    debounceFrames: 3,
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
    thresholdUp: 0.73,
    thresholdDown: 0.77,
    keyPoints: ['팔은 옆에 붙이고', '어깨만 올리기', '천천히 내리기'],
    countingCooldown: 400,
    deltaThreshold: 0.05,  // 5% 변화량
    debounceFrames: 3,
  },
  // ========================================
  // 하체 운동
  // ========================================
  {
    id: 'squat',
    name: '스쿼트',
    description: '무릎을 굽혀 앉았다 일어나세요. 측면에서 전신이 보이도록 촬영해주세요.',
    targetDisease: '무릎/골반',
    duration: 90,
    sets: 3,
    reps: 10,
    restTime: 30,
    countingJoint: 'knee',
    countingAxis: 'y',
    thresholdUp: 0.60,
    thresholdDown: 0.50,
    keyPoints: ['측면에서 촬영해주세요', '무릎이 발끝을 넘지 않게', '허리는 곧게', '엉덩이를 뒤로'],
    countingCooldown: 500,
    deltaThreshold: 0.08,
    debounceFrames: 3,
    // 측면 촬영 + 각도 분석
    cameraDirection: 'side',
    analysisType: 'angle',
    angleConfig: {
      joint1: 'hip',
      joint2: 'knee',
      joint3: 'ankle',
      startAngle: 170,  // 서 있을 때
      targetAngle: 90,  // 완전히 앉았을 때
    },
  },

  // ========================================
  // 어깨 가동성 운동
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
    thresholdUp: 0.25,
    thresholdDown: 0.55,
    keyPoints: ['팔을 곧게 펴고', '어깨 높이 이상으로', '천천히 올리고 내리기'],
    countingCooldown: 500,
    deltaThreshold: 0.10,
    debounceFrames: 3,
    // 정면 촬영 + 각도 분석
    cameraDirection: 'front',
    analysisType: 'angle',
    angleConfig: {
      joint1: 'hip',
      joint2: 'shoulder',
      joint3: 'wrist',
      startAngle: 20,   // 팔 내렸을 때 (몸통과 팔 사이 각도)
      targetAngle: 170, // 팔 올렸을 때
    },
  },
];

// ============================================================
// 시퀀스 운동 데이터 (연속 자세 운동)
// ============================================================

export const SEQUENCE_EXERCISES: SequenceExercise[] = [
  // 현재 시퀀스 운동 없음 (Y-T-W는 타이머 운동으로 이동)
];

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * ID로 카운팅 운동 찾기
 */
export function getCountableExerciseById(id: string): CountableExercise | undefined {
  return COUNTABLE_EXERCISES.find((ex) => ex.id === id);
}

/**
 * ID로 타이머 운동 찾기
 */
export function getTimerExerciseById(id: string): TimerExercise | undefined {
  return TIMER_EXERCISES.find((ex) => ex.id === id);
}

/**
 * ID로 시퀀스 운동 찾기
 */
export function getSequenceExerciseById(id: string): SequenceExercise | undefined {
  return SEQUENCE_EXERCISES.find((ex) => ex.id === id);
}

/**
 * ID로 모든 운동에서 찾기 (카운팅 + 타이머 + 시퀀스)
 */
export function getExerciseById(id: string): CountableExercise | TimerExercise | SequenceExercise | undefined {
  return getCountableExerciseById(id) || getTimerExerciseById(id) || getSequenceExerciseById(id);
}

/**
 * 대상 질환으로 운동 필터링 (카운팅 운동만)
 */
export function getExercisesByDisease(disease: string): CountableExercise[] {
  return COUNTABLE_EXERCISES.filter((ex) =>
    ex.targetDisease.toLowerCase().includes(disease.toLowerCase())
  );
}

/**
 * 대상 질환으로 타이머 운동 필터링
 */
export function getTimerExercisesByDisease(disease: string): TimerExercise[] {
  return TIMER_EXERCISES.filter((ex) =>
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

// ============================================================
// 시퀀스 운동 자세 감지 함수
// ============================================================

/**
 * 단일 자세 조건 검사
 * @param landmarks - 랜드마크 배열
 * @param condition - 검사할 조건
 * @returns 조건 충족 여부
 */
export function checkPoseCondition(
  landmarks: Array<{ x: number; y: number; visibility?: number }>,
  condition: PoseCondition
): boolean {
  const jointIndices: Record<string, number | [number, number]> = {
    nose: 0, shoulder: [11, 12], elbow: [13, 14], wrist: [15, 16], hip: [23, 24],
  };

  const getJointVal = (joint: string, axis: 'x' | 'y'): number | null => {
    const idx = jointIndices[joint];
    if (idx === undefined) return null;
    if (typeof idx === 'number') {
      const lm = landmarks[idx];
      if (!lm || (lm.visibility ?? 0) < 0.5) return null;
      return axis === 'x' ? lm.x : lm.y;
    }
    const [leftIdx, rightIdx] = idx;
    const left = landmarks[leftIdx], right = landmarks[rightIdx];
    const leftOk = left && (left.visibility ?? 0) >= 0.5;
    const rightOk = right && (right.visibility ?? 0) >= 0.5;
    if (leftOk && rightOk) return axis === 'x' ? (left.x + right.x) / 2 : (left.y + right.y) / 2;
    if (leftOk) return axis === 'x' ? left.x : left.y;
    if (rightOk) return axis === 'x' ? right.x : right.y;
    return null;
  };

  const jointValue = getJointVal(condition.joint, condition.axis);
  if (jointValue === null) return false;

  if (condition.relativeTo) {
    const refValue = getJointVal(condition.relativeTo.joint, condition.relativeTo.axis);
    if (refValue === null) return false;
    if (condition.relativeTo.compare === 'above' && jointValue >= refValue) return false;
    if (condition.relativeTo.compare === 'below' && jointValue <= refValue) return false;
  }

  if (condition.compare === 'above') return jointValue < (condition.threshold as number);
  if (condition.compare === 'below') return jointValue > (condition.threshold as number);
  if (condition.compare === 'between') {
    const [min, max] = condition.threshold as [number, number];
    return jointValue >= min && jointValue <= max;
  }
  return false;
}

/**
 * 현재 자세 감지
 * 조건이 더 많은(더 구체적인) 자세를 먼저 체크합니다.
 * 예: W(2개 조건)를 T(1개 조건)보다 먼저 체크
 *
 * @param landmarks - 랜드마크 배열
 * @param poses - 감지할 자세 목록
 * @returns 감지된 자세 정보 또는 null
 */
export function detectCurrentPose(
  landmarks: Array<{ x: number; y: number; visibility?: number }>,
  poses: PoseDefinition[]
): { poseIndex: number; poseName: string } | null {
  // 조건 개수가 많은 자세부터 체크 (더 구체적인 자세 우선)
  const sortedIndices = poses
    .map((pose, index) => ({ index, conditionCount: pose.conditions.length }))
    .sort((a, b) => b.conditionCount - a.conditionCount)
    .map((item) => item.index);

  for (const i of sortedIndices) {
    const allMet = poses[i].conditions.every((c) => checkPoseCondition(landmarks, c));
    if (allMet) return { poseIndex: i, poseName: poses[i].name };
  }
  return null;
}

export default COUNTABLE_EXERCISES;
