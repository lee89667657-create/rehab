/**
 * 위험도 기반 운동 추천 모듈
 *
 * 질환 위험도 분석 결과를 기반으로 맞춤 운동 프로그램을 추천합니다.
 */

import type { DiseaseRiskAnalysis, DiseaseRisk } from './diseaseRiskAnalysis';

// ============================================================
// 타입 정의
// ============================================================

/**
 * 운동 프로그램 정보
 */
export interface ExerciseProgram {
  id: string;              // 프로그램 ID
  name: string;            // 프로그램명
  targetDisease: string;   // 대상 질환
  duration: number;        // 소요 시간 (분)
  difficulty: 'easy' | 'medium' | 'hard';  // 난이도
  frequency: string;       // 권장 빈도
  exercises: ProgramExercise[];  // 포함된 운동 목록
  benefits: string[];      // 기대 효과
  precautions: string[];   // 주의사항
}

/**
 * 프로그램 내 개별 운동
 */
export interface ProgramExercise {
  id: string;
  name: string;
  sets: number;
  reps: number | string;   // 횟수 또는 '30초' 같은 시간
  description: string;
}

/**
 * 운동 추천 결과
 */
export interface ExerciseRecommendation {
  urgentPrograms: ExerciseProgram[];     // 긴급 추천 (높은 위험도)
  recommendedPrograms: ExerciseProgram[]; // 일반 추천
  preventivePrograms: ExerciseProgram[];  // 예방 추천
  dailyRoutine: ProgramExercise[];        // 일일 루틴
  weeklyGoal: string;                     // 주간 목표
}

// ============================================================
// 운동 프로그램 데이터베이스
// ============================================================

const EXERCISE_PROGRAMS: ExerciseProgram[] = [
  // 경추 디스크 관련
  {
    id: 'neck_recovery',
    name: '목 회복 프로그램',
    targetDisease: '경추 디스크',
    duration: 15,
    difficulty: 'easy',
    frequency: '매일 2회',
    exercises: [
      { id: 'chin_tuck', name: '턱 당기기', sets: 3, reps: 10, description: '턱을 뒤로 당겨 이중턱 만들기' },
      { id: 'neck_stretch', name: '목 스트레칭', sets: 2, reps: '30초', description: '좌우로 목을 천천히 기울이기' },
      { id: 'shoulder_roll', name: '어깨 돌리기', sets: 2, reps: 10, description: '어깨를 앞뒤로 크게 돌리기' },
      { id: 'neck_rotation', name: '목 회전', sets: 2, reps: 10, description: '천천히 좌우로 목 돌리기' },
    ],
    benefits: ['목 통증 감소', '자세 교정', '두통 완화'],
    precautions: ['급격한 동작 금지', '통증 시 즉시 중단'],
  },
  {
    id: 'neck_strengthening',
    name: '목 근력 강화',
    targetDisease: '경추 디스크',
    duration: 20,
    difficulty: 'medium',
    frequency: '주 3-4회',
    exercises: [
      { id: 'isometric_neck', name: '등척성 목 운동', sets: 3, reps: '10초', description: '손으로 저항하며 목 힘주기' },
      { id: 'prone_neck_lift', name: '엎드려 목 들기', sets: 2, reps: 10, description: '엎드린 상태에서 천천히 목 들기' },
      { id: 'neck_flexion', name: '목 굴곡 운동', sets: 2, reps: 15, description: '턱을 가슴 쪽으로 당기기' },
    ],
    benefits: ['목 근력 향상', '디스크 압박 감소', '자세 안정성 증가'],
    precautions: ['천천히 진행', '과도한 무게 사용 금지'],
  },

  // 오십견 관련
  {
    id: 'shoulder_mobility',
    name: '어깨 가동성 회복',
    targetDisease: '오십견',
    duration: 20,
    difficulty: 'easy',
    frequency: '매일 1-2회',
    exercises: [
      { id: 'pendulum', name: '진자 운동', sets: 3, reps: '1분', description: '팔을 늘어뜨리고 원형으로 흔들기' },
      { id: 'wall_climb', name: '벽 오르기', sets: 2, reps: 15, description: '손가락으로 벽을 타고 올라가기' },
      { id: 'towel_stretch', name: '수건 스트레칭', sets: 2, reps: 10, description: '수건을 잡고 어깨 뒤로 당기기' },
      { id: 'cross_body', name: '교차 스트레칭', sets: 2, reps: '30초', description: '팔을 반대쪽 어깨로 당기기' },
    ],
    benefits: ['어깨 가동범위 증가', '통증 감소', '일상생활 기능 향상'],
    precautions: ['무리한 스트레칭 금지', '따뜻하게 한 후 실시'],
  },

  // 요추 디스크 관련
  {
    id: 'core_stabilization',
    name: '코어 안정화 프로그램',
    targetDisease: '요추 디스크',
    duration: 25,
    difficulty: 'medium',
    frequency: '주 4-5회',
    exercises: [
      { id: 'dead_bug', name: '데드버그', sets: 3, reps: 10, description: '누워서 팔다리 교차 뻗기' },
      { id: 'bird_dog', name: '버드독', sets: 3, reps: 10, description: '네발 자세에서 반대편 팔다리 뻗기' },
      { id: 'pelvic_tilt', name: '골반 기울이기', sets: 3, reps: 15, description: '누워서 허리를 바닥에 붙이기' },
      { id: 'bridge', name: '브릿지', sets: 3, reps: 12, description: '누워서 엉덩이 들어올리기' },
    ],
    benefits: ['코어 근력 강화', '허리 안정성 증가', '디스크 압박 감소'],
    precautions: ['허리 과신전 금지', '통증 시 중단'],
  },
  {
    id: 'back_flexibility',
    name: '허리 유연성 프로그램',
    targetDisease: '요추 디스크',
    duration: 15,
    difficulty: 'easy',
    frequency: '매일',
    exercises: [
      { id: 'cat_cow', name: '고양이-소 자세', sets: 2, reps: 10, description: '네발 자세에서 등 굽히고 펴기' },
      { id: 'child_pose', name: '아이 자세', sets: 2, reps: '30초', description: '무릎 꿇고 앞으로 엎드리기' },
      { id: 'knee_to_chest', name: '무릎 당기기', sets: 2, reps: '30초', description: '누워서 무릎을 가슴으로 당기기' },
    ],
    benefits: ['허리 유연성 향상', '근육 이완', '통증 완화'],
    precautions: ['천천히 부드럽게', '과도한 스트레칭 금지'],
  },

  // 척추측만증 관련
  {
    id: 'balance_correction',
    name: '좌우 균형 교정',
    targetDisease: '척추측만증',
    duration: 20,
    difficulty: 'medium',
    frequency: '주 5회',
    exercises: [
      { id: 'side_plank', name: '사이드 플랭크', sets: 2, reps: '20초', description: '옆으로 누워 몸 들어올리기' },
      { id: 'single_leg_stand', name: '한발 서기', sets: 3, reps: '30초', description: '한 발로 균형 잡기' },
      { id: 'torso_rotation', name: '몸통 회전', sets: 2, reps: 10, description: '앉아서 상체 좌우 회전' },
      { id: 'lateral_stretch', name: '옆구리 스트레칭', sets: 2, reps: '30초', description: '팔을 위로 뻗고 옆으로 기울이기' },
    ],
    benefits: ['좌우 균형 개선', '척추 정렬', '코어 강화'],
    precautions: ['약한 쪽 더 집중', '거울 보며 자세 확인'],
  },

  // 무릎 관절염 관련
  {
    id: 'knee_strengthening',
    name: '무릎 근력 강화',
    targetDisease: '무릎 관절염',
    duration: 20,
    difficulty: 'easy',
    frequency: '주 3-4회',
    exercises: [
      { id: 'quad_sets', name: '대퇴사두근 수축', sets: 3, reps: 10, description: '앉아서 무릎 뒤 바닥 누르기' },
      { id: 'straight_leg_raise', name: '다리 들어올리기', sets: 3, reps: 12, description: '누워서 무릎 편 채로 다리 들기' },
      { id: 'wall_sit', name: '벽 스쿼트', sets: 2, reps: '20초', description: '벽에 기대어 앉은 자세 유지' },
      { id: 'calf_raise', name: '종아리 들기', sets: 2, reps: 15, description: '까치발 들었다 내리기' },
    ],
    benefits: ['무릎 안정성 향상', '관절 부담 감소', '보행 기능 개선'],
    precautions: ['충격 운동 피하기', '통증 범위 내에서 실시'],
  },

  // 긴장성 두통 관련
  {
    id: 'tension_relief',
    name: '긴장 완화 프로그램',
    targetDisease: '긴장성 두통',
    duration: 15,
    difficulty: 'easy',
    frequency: '필요시 수시로',
    exercises: [
      { id: 'scalp_massage', name: '두피 마사지', sets: 1, reps: '2분', description: '손가락으로 두피 원형 마사지' },
      { id: 'temple_press', name: '관자놀이 지압', sets: 2, reps: '30초', description: '관자놀이를 천천히 누르기' },
      { id: 'neck_release', name: '목 이완', sets: 2, reps: '30초', description: '목을 좌우로 기울여 이완' },
      { id: 'shoulder_shrug', name: '어깨 으쓱', sets: 2, reps: 10, description: '어깨를 귀 쪽으로 올렸다 내리기' },
    ],
    benefits: ['두통 완화', '근육 이완', '스트레스 해소'],
    precautions: ['조용한 환경에서 실시', '호흡에 집중'],
  },

  // 전신 예방 프로그램
  {
    id: 'daily_posture',
    name: '일일 자세 교정',
    targetDisease: '전신 예방',
    duration: 10,
    difficulty: 'easy',
    frequency: '매일',
    exercises: [
      { id: 'chin_tuck', name: '턱 당기기', sets: 2, reps: 10, description: '이중턱 만들기' },
      { id: 'chest_opener', name: '가슴 열기', sets: 2, reps: '20초', description: '팔을 뒤로 깍지 끼고 가슴 펴기' },
      { id: 'hip_flexor', name: '고관절 스트레칭', sets: 2, reps: '30초', description: '런지 자세로 고관절 늘리기' },
      { id: 'full_body_stretch', name: '전신 스트레칭', sets: 1, reps: '1분', description: '팔을 위로 뻗고 온몸 늘이기' },
    ],
    benefits: ['자세 개선', '유연성 유지', '일상 피로 해소'],
    precautions: ['무리하지 않기', '호흡과 함께'],
  },
];

// ============================================================
// 운동 추천 함수
// ============================================================

/**
 * 질환에 맞는 운동 프로그램 찾기
 */
function findProgramsForDisease(diseaseId: string): ExerciseProgram[] {
  const diseaseMap: Record<string, string> = {
    cervical_disc: '경추 디스크',
    frozen_shoulder: '오십견',
    lumbar_disc: '요추 디스크',
    scoliosis: '척추측만증',
    knee_arthritis: '무릎 관절염',
    tension_headache: '긴장성 두통',
  };

  const targetDisease = diseaseMap[diseaseId];
  if (!targetDisease) return [];

  return EXERCISE_PROGRAMS.filter((p) => p.targetDisease === targetDisease);
}

/**
 * 위험도에 따른 난이도 필터링
 */
function filterByDifficulty(
  programs: ExerciseProgram[],
  riskLevel: DiseaseRisk['level']
): ExerciseProgram[] {
  // 높은 위험도일수록 쉬운 운동 우선
  if (riskLevel === 'critical' || riskLevel === 'high') {
    return programs.filter((p) => p.difficulty === 'easy');
  }
  if (riskLevel === 'medium') {
    return programs.filter((p) => p.difficulty !== 'hard');
  }
  return programs;
}

/**
 * 일일 루틴 생성
 */
function createDailyRoutine(programs: ExerciseProgram[]): ProgramExercise[] {
  const routine: ProgramExercise[] = [];
  const exerciseIds = new Set<string>();

  // 각 프로그램에서 중요한 운동 선택
  programs.slice(0, 3).forEach((program) => {
    program.exercises.slice(0, 2).forEach((exercise) => {
      if (!exerciseIds.has(exercise.id) && routine.length < 6) {
        routine.push(exercise);
        exerciseIds.add(exercise.id);
      }
    });
  });

  return routine;
}

/**
 * 주간 목표 생성
 */
function createWeeklyGoal(overallRisk: number): string {
  if (overallRisk >= 70) {
    return '주 3회 이상 가벼운 스트레칭으로 시작하세요';
  }
  if (overallRisk >= 50) {
    return '주 4회 이상 맞춤 운동 프로그램을 실시하세요';
  }
  if (overallRisk >= 25) {
    return '주 5회 이상 꾸준한 운동으로 건강을 유지하세요';
  }
  return '현재 상태를 유지하며 주 3회 이상 운동하세요';
}

// ============================================================
// 메인 추천 함수
// ============================================================

/**
 * 질환 위험도 분석 결과를 기반으로 운동 프로그램을 추천합니다.
 *
 * @param riskAnalysis - 질환 위험도 분석 결과
 * @returns 운동 추천 결과
 */
export function recommendExercises(riskAnalysis: DiseaseRiskAnalysis): ExerciseRecommendation {
  const urgentPrograms: ExerciseProgram[] = [];
  const recommendedPrograms: ExerciseProgram[] = [];
  const preventivePrograms: ExerciseProgram[] = [];
  const usedProgramIds = new Set<string>();

  // 위험도가 높은 질환 순으로 처리
  riskAnalysis.diseases.forEach((disease) => {
    const programs = findProgramsForDisease(disease.id);
    const filtered = filterByDifficulty(programs, disease.level);

    filtered.forEach((program) => {
      if (usedProgramIds.has(program.id)) return;

      if (disease.level === 'critical' || disease.level === 'high') {
        if (urgentPrograms.length < 3) {
          urgentPrograms.push(program);
          usedProgramIds.add(program.id);
        }
      } else if (disease.level === 'medium') {
        if (recommendedPrograms.length < 3) {
          recommendedPrograms.push(program);
          usedProgramIds.add(program.id);
        }
      } else {
        if (preventivePrograms.length < 2) {
          preventivePrograms.push(program);
          usedProgramIds.add(program.id);
        }
      }
    });
  });

  // 전신 예방 프로그램 추가 (아직 추천이 적은 경우)
  const dailyPosture = EXERCISE_PROGRAMS.find((p) => p.id === 'daily_posture');
  if (dailyPosture && !usedProgramIds.has(dailyPosture.id)) {
    preventivePrograms.push(dailyPosture);
  }

  // 모든 추천 프로그램 합쳐서 일일 루틴 생성
  const allPrograms = [...urgentPrograms, ...recommendedPrograms, ...preventivePrograms];
  const dailyRoutine = createDailyRoutine(allPrograms);

  // 주간 목표 생성
  const weeklyGoal = createWeeklyGoal(riskAnalysis.overallRisk);

  return {
    urgentPrograms,
    recommendedPrograms,
    preventivePrograms,
    dailyRoutine,
    weeklyGoal,
  };
}

/**
 * 난이도 한글 라벨
 */
export function getDifficultyLabel(difficulty: ExerciseProgram['difficulty']): string {
  switch (difficulty) {
    case 'easy':
      return '초급';
    case 'medium':
      return '중급';
    case 'hard':
      return '고급';
    default:
      return '알 수 없음';
  }
}

/**
 * 난이도 색상 클래스
 */
export function getDifficultyColorClass(difficulty: ExerciseProgram['difficulty']): string {
  switch (difficulty) {
    case 'easy':
      return 'bg-emerald-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'hard':
      return 'bg-red-500';
    default:
      return 'bg-muted';
  }
}
