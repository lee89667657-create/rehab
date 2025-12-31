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

/**
 * 구현된 운동 목록 (6개):
 * - 타이머 운동: chin-tuck, shoulder-blade-squeeze
 * - 실시간 분석: neck-side-stretch, shoulder-squeeze, arm-raise, squat
 */
const EXERCISE_PROGRAMS: ExerciseProgram[] = [
  // 거북목 개선 프로그램
  {
    id: 'turtle_neck_recovery',
    name: '거북목 개선 프로그램',
    targetDisease: '거북목',
    duration: 10,
    difficulty: 'easy',
    frequency: '매일 2회',
    exercises: [
      { id: 'chin-tuck', name: '턱 당기기', sets: 3, reps: '10초 유지', description: '턱을 뒤로 당겨 이중턱 만들기 (타이머)' },
      { id: 'neck-side-stretch', name: '목 옆 스트레칭', sets: 2, reps: 8, description: '목을 옆으로 천천히 기울이기 (실시간 분석)' },
    ],
    benefits: ['목 통증 감소', '거북목 자세 교정', '두통 완화'],
    precautions: ['급격한 동작 금지', '통증 시 즉시 중단'],
  },

  // 라운드숄더 개선 프로그램
  {
    id: 'round_shoulder_recovery',
    name: '라운드숄더 개선 프로그램',
    targetDisease: '라운드숄더',
    duration: 15,
    difficulty: 'easy',
    frequency: '매일 1-2회',
    exercises: [
      { id: 'shoulder-blade-squeeze', name: '견갑골 모으기', sets: 3, reps: '5초 유지', description: '양쪽 견갑골을 가깝게 모으기 (타이머)' },
      { id: 'shoulder-squeeze', name: '어깨 으쓱하기', sets: 3, reps: 12, description: '어깨를 귀 쪽으로 올렸다 내리기 (실시간 분석)' },
      { id: 'arm-raise', name: '팔 들어올리기', sets: 2, reps: 10, description: '양팔을 천천히 위로 들어올리기 (실시간 분석)' },
    ],
    benefits: ['어깨 자세 교정', '등 근육 강화', '가슴 열림'],
    precautions: ['무리한 스트레칭 금지', '천천히 진행'],
  },

  // 하체 강화 프로그램
  {
    id: 'lower_body_strength',
    name: '하체 강화 프로그램',
    targetDisease: '하체 약화',
    duration: 10,
    difficulty: 'easy',
    frequency: '주 3-4회',
    exercises: [
      { id: 'squat', name: '스쿼트', sets: 3, reps: 10, description: '무릎을 굽혀 앉았다 일어나기 (실시간 분석)' },
    ],
    benefits: ['하체 근력 강화', '무릎 안정성 향상', '기초 대사량 증가'],
    precautions: ['무릎이 발끝을 넘지 않게', '허리는 곧게 유지'],
  },

  // 전신 예방 프로그램 (일일 루틴용)
  {
    id: 'daily_posture',
    name: '일일 자세 교정',
    targetDisease: '전신 예방',
    duration: 15,
    difficulty: 'easy',
    frequency: '매일',
    exercises: [
      { id: 'chin-tuck', name: '턱 당기기', sets: 3, reps: '10초 유지', description: '이중턱 만들기 (타이머)' },
      { id: 'shoulder-blade-squeeze', name: '견갑골 모으기', sets: 3, reps: '5초 유지', description: '견갑골 모으기 (타이머)' },
      { id: 'neck-side-stretch', name: '목 옆 스트레칭', sets: 2, reps: 8, description: '거북목 교정 (실시간 분석)' },
      { id: 'shoulder-squeeze', name: '어깨 으쓱하기', sets: 3, reps: 12, description: '어깨 으쓱하기 (실시간 분석)' },
      { id: 'arm-raise', name: '팔 들어올리기', sets: 2, reps: 10, description: '팔 들어올리기 (실시간 분석)' },
      { id: 'squat', name: '스쿼트', sets: 3, reps: 10, description: '스쿼트 (실시간 분석)' },
    ],
    benefits: ['자세 개선', '전신 근력 유지', '일상 피로 해소'],
    precautions: ['무리하지 않기', '호흡과 함께'],
  },
];

// ============================================================
// 운동 추천 함수
// ============================================================

/**
 * 질환에 맞는 운동 프로그램 찾기
 *
 * 현재 분석 질환:
 * - forward_head (거북목 증후군) → 거북목 개선 프로그램
 * - round_shoulder (라운드숄더) → 라운드숄더 개선 프로그램
 */
function findProgramsForDisease(diseaseId: string): ExerciseProgram[] {
  const diseaseMap: Record<string, string> = {
    // 거북목
    forward_head: '거북목',

    // 라운드숄더
    round_shoulder: '라운드숄더',
  };

  const targetDisease = diseaseMap[diseaseId];
  if (!targetDisease) {
    // 매핑되지 않은 질환은 일일 자세 교정 프로그램 반환
    return EXERCISE_PROGRAMS.filter((p) => p.id === 'daily_posture');
  }

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
