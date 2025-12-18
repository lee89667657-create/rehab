/**
 * exercises.ts
 * 운동 데이터 상수 정의
 *
 * 자세 교정을 위한 운동 프로그램 데이터입니다.
 * 각 운동은 특정 자세 문제(targetCondition)를 개선하기 위해 설계되었습니다.
 *
 * ## 운동 카테고리
 * - stretching: 스트레칭 (근육 이완, 유연성)
 * - strengthening: 근력 강화
 * - mobility: 관절 가동성 향상
 *
 * ## 타겟 조건 (targetCondition)
 * - forward_head: 거북목
 * - round_shoulder: 라운드숄더
 * - pelvis_tilt: 골반 틀어짐
 * - knee_alignment: 무릎 정렬
 */

/**
 * 운동 데이터 타입 정의
 */
export interface ExerciseData {
  /** 운동 고유 ID */
  id: string;

  /** 운동 이름 (한글) */
  name: string;

  /** 운동 이름 (영어) */
  nameEn: string;

  /**
   * 운동 카테고리
   * - stretching: 스트레칭
   * - strengthening: 근력 강화
   * - mobility: 가동성
   */
  category: 'stretching' | 'strengthening' | 'mobility';

  /**
   * 타겟 조건 (어떤 자세 문제를 개선하는가)
   * - forward_head: 거북목
   * - round_shoulder: 라운드숄더
   * - pelvis_tilt: 골반 틀어짐
   * - knee_alignment: 무릎 정렬
   */
  targetCondition: 'forward_head' | 'round_shoulder' | 'pelvis_tilt' | 'knee_alignment';

  /** 1세트 수행 시간 (초) */
  duration: number;

  /** 총 세트 수 */
  sets: number;

  /** 운동 설명 (한 줄 요약) */
  description: string;

  /** 단계별 수행 방법 */
  instructions: string[];

  /**
   * 난이도 (1~3)
   * 1: 초급 (쉬움)
   * 2: 중급 (보통)
   * 3: 고급 (어려움)
   */
  difficulty: 1 | 2 | 3;

  /** 휴식 시간 (초, 세트 사이) */
  restTime?: number;
}

/**
 * 운동 프로그램 타입 정의
 */
export interface ExerciseProgram {
  /** 프로그램 ID */
  id: string;

  /** 프로그램 이름 */
  name: string;

  /** 프로그램 설명 */
  description: string;

  /** 타겟 조건 */
  targetCondition: string;

  /** 포함된 운동 ID 목록 */
  exerciseIds: string[];

  /** 예상 소요 시간 (분) */
  estimatedMinutes: number;

  /** 난이도 레벨 */
  level: '초급' | '중급' | '고급';
}

/**
 * 전체 운동 데이터 배열
 */
export const exercises: ExerciseData[] = [
  // ========================================
  // 거북목(Forward Head) 개선 운동
  // ========================================
  {
    id: 'chin-tuck',
    name: '친 턱 운동',
    nameEn: 'Chin Tuck',
    category: 'strengthening',
    targetCondition: 'forward_head',
    duration: 30,
    sets: 3,
    description: '턱을 뒤로 당겨 목 뒤 근육을 강화합니다',
    instructions: [
      '정면을 바라보며 편하게 앉거나 섭니다',
      '턱을 목 쪽으로 부드럽게 당깁니다',
      '이중턱이 되는 느낌으로 5초간 유지합니다',
      '천천히 원래 위치로 돌아옵니다',
    ],
    difficulty: 1,
    restTime: 15,
  },
  {
    id: 'neck-stretch',
    name: '목 옆 스트레칭',
    nameEn: 'Neck Side Stretch',
    category: 'stretching',
    targetCondition: 'forward_head',
    duration: 30,
    sets: 2,
    description: '목 옆 근육을 이완시켜 긴장을 풀어줍니다',
    instructions: [
      '바른 자세로 앉습니다',
      '오른손으로 왼쪽 머리 위를 잡습니다',
      '부드럽게 오른쪽으로 머리를 기울입니다',
      '15초간 유지 후 반대쪽도 실시합니다',
    ],
    difficulty: 1,
    restTime: 10,
  },

  // ========================================
  // 라운드숄더(Round Shoulder) 개선 운동
  // ========================================
  {
    id: 'doorway-stretch',
    name: '도어웨이 스트레칭',
    nameEn: 'Doorway Stretch',
    category: 'stretching',
    targetCondition: 'round_shoulder',
    duration: 30,
    sets: 3,
    description: '가슴 근육을 스트레칭하여 어깨를 펴줍니다',
    instructions: [
      '문틀 양쪽에 팔꿈치를 90도로 세웁니다',
      '한 발을 앞으로 내딛습니다',
      '가슴이 늘어나는 느낌으로 앞으로 기울입니다',
      '20초간 유지합니다',
    ],
    difficulty: 1,
    restTime: 15,
  },
  {
    id: 'shoulder-blade-squeeze',
    name: '견갑골 조이기',
    nameEn: 'Shoulder Blade Squeeze',
    category: 'strengthening',
    targetCondition: 'round_shoulder',
    duration: 20,
    sets: 3,
    description: '등 근육을 강화하여 어깨를 뒤로 당깁니다',
    instructions: [
      '바른 자세로 앉거나 섭니다',
      '양쪽 견갑골을 서로 가깝게 모읍니다',
      '등 중앙에 연필을 끼운다는 느낌으로 조입니다',
      '5초간 유지 후 이완합니다',
    ],
    difficulty: 1,
    restTime: 10,
  },

  // ========================================
  // 골반 틀어짐(Pelvis Tilt) 개선 운동
  // ========================================
  {
    id: 'hip-flexor-stretch',
    name: '고관절 굴곡근 스트레칭',
    nameEn: 'Hip Flexor Stretch',
    category: 'stretching',
    targetCondition: 'pelvis_tilt',
    duration: 30,
    sets: 2,
    description: '골반 앞쪽 근육을 스트레칭합니다',
    instructions: [
      '한쪽 무릎을 바닥에 대고 런지 자세를 취합니다',
      '앞쪽 무릎은 90도를 유지합니다',
      '골반을 앞으로 밀어 앞쪽 허벅지가 늘어나게 합니다',
      '20초간 유지 후 반대쪽도 실시합니다',
    ],
    difficulty: 2,
    restTime: 15,
  },
  {
    id: 'pelvic-tilt-exercise',
    name: '골반 틸트 운동',
    nameEn: 'Pelvic Tilt Exercise',
    category: 'mobility',
    targetCondition: 'pelvis_tilt',
    duration: 25,
    sets: 3,
    description: '골반의 움직임을 인식하고 조절합니다',
    instructions: [
      '바닥에 누워 무릎을 세웁니다',
      '배꼽을 바닥으로 누르듯이 허리를 평평하게 만듭니다',
      '5초간 유지합니다',
      '허리를 살짝 들어 아치를 만들었다가 다시 평평하게 합니다',
    ],
    difficulty: 1,
    restTime: 10,
  },

  // ========================================
  // 무릎 정렬(Knee Alignment) 개선 운동
  // ========================================
  {
    id: 'quad-stretch',
    name: '대퇴사두근 스트레칭',
    nameEn: 'Quad Stretch',
    category: 'stretching',
    targetCondition: 'knee_alignment',
    duration: 30,
    sets: 2,
    description: '허벅지 앞쪽 근육을 스트레칭합니다',
    instructions: [
      '벽이나 의자를 잡고 한 발로 섭니다',
      '반대쪽 발목을 손으로 잡습니다',
      '무릎을 뒤로 당겨 허벅지 앞이 늘어나게 합니다',
      '20초간 유지 후 반대쪽도 실시합니다',
    ],
    difficulty: 1,
    restTime: 10,
  },
  {
    id: 'wall-sit',
    name: '월 시트',
    nameEn: 'Wall Sit',
    category: 'strengthening',
    targetCondition: 'knee_alignment',
    duration: 30,
    sets: 3,
    description: '하체 근력을 강화하여 무릎을 안정화합니다',
    instructions: [
      '등을 벽에 붙이고 섭니다',
      '무릎이 90도가 될 때까지 천천히 앉습니다',
      '허벅지가 바닥과 평행하게 유지합니다',
      '30초간 버팁니다',
    ],
    difficulty: 2,
    restTime: 20,
  },
];

/**
 * 운동 프로그램 목록
 * 조건별로 그룹화된 운동 세트
 */
export const exercisePrograms: ExerciseProgram[] = [
  {
    id: 'forward-head-program',
    name: '거북목 개선 프로그램',
    description: '목과 어깨 주변 근육을 강화하고 스트레칭합니다',
    targetCondition: 'forward_head',
    exerciseIds: ['chin-tuck', 'neck-stretch'],
    estimatedMinutes: 8,
    level: '초급',
  },
  {
    id: 'round-shoulder-program',
    name: '라운드숄더 개선 프로그램',
    description: '가슴과 등 근육의 균형을 맞춥니다',
    targetCondition: 'round_shoulder',
    exerciseIds: ['doorway-stretch', 'shoulder-blade-squeeze'],
    estimatedMinutes: 10,
    level: '초급',
  },
  {
    id: 'pelvis-program',
    name: '골반 교정 프로그램',
    description: '골반 주변 근육을 스트레칭하고 안정화합니다',
    targetCondition: 'pelvis_tilt',
    exerciseIds: ['hip-flexor-stretch', 'pelvic-tilt-exercise'],
    estimatedMinutes: 10,
    level: '중급',
  },
  {
    id: 'knee-program',
    name: '무릎 정렬 프로그램',
    description: '하체 근력을 강화하고 유연성을 향상시킵니다',
    targetCondition: 'knee_alignment',
    exerciseIds: ['quad-stretch', 'wall-sit'],
    estimatedMinutes: 10,
    level: '초급',
  },
];

/**
 * ID로 운동 찾기
 */
export function getExerciseById(id: string): ExerciseData | undefined {
  return exercises.find((ex) => ex.id === id);
}

/**
 * 조건별 운동 필터링
 */
export function getExercisesByCondition(
  condition: ExerciseData['targetCondition']
): ExerciseData[] {
  return exercises.filter((ex) => ex.targetCondition === condition);
}

/**
 * 프로그램 ID로 운동 목록 가져오기
 */
export function getExercisesForProgram(programId: string): ExerciseData[] {
  const program = exercisePrograms.find((p) => p.id === programId);
  if (!program) return [];

  return program.exerciseIds
    .map((id) => getExerciseById(id))
    .filter((ex): ex is ExerciseData => ex !== undefined);
}

/**
 * 난이도 레벨을 점 개수로 표시 (이모지 대신 텍스트 사용)
 */
export function getDifficultyStars(difficulty: 1 | 2 | 3): string {
  return '●'.repeat(difficulty) + '○'.repeat(3 - difficulty);
}

/**
 * 총 운동 시간 계산 (분)
 */
export function calculateTotalDuration(exerciseIds: string[]): number {
  let totalSeconds = 0;

  exerciseIds.forEach((id) => {
    const exercise = getExerciseById(id);
    if (exercise) {
      // 운동 시간 + (세트 수 - 1) × 휴식 시간
      const exerciseTime = exercise.duration * exercise.sets;
      const restTime = (exercise.restTime || 15) * (exercise.sets - 1);
      totalSeconds += exerciseTime + restTime;
    }
  });

  return Math.ceil(totalSeconds / 60);
}

export default exercises;
