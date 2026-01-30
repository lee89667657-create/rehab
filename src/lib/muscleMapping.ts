// 근육 불균형 분석용 근육 매핑 데이터
// 거북목/라운드숄더/등굽음 관련 8개 근육

export interface MuscleData {
  id: string;
  name: string;
  position: string;
  x: number;  // % 단위
  y: number;  // % 단위
  size: number;  // px 단위
}

export interface MuscleGroup {
  shortened: MuscleData[];  // 단축 위험 (빨강)
  weakened: MuscleData[];   // 약화 위험 (파랑)
}

export interface PostureMuscles {
  turtleNeck?: MuscleGroup;      // 거북목
  roundShoulder?: MuscleGroup;   // 라운드숄더
  kyphosis?: MuscleGroup;        // 등굽음(흉추후만)
}

// ============================================================
// 측면 근육 좌표 (SIDE VIEW)
// 이미지 기준: 오른쪽 = 앞(전면), 왼쪽 = 뒤(후면)
// 사람이 왼쪽을 바라보는 측면 실루엣
// ============================================================
export const SIDE_MUSCLES: PostureMuscles = {
  // 거북목
  turtleNeck: {
    shortened: [
      { id: 'scm', name: '흉쇄유돌근', position: '목 앞 (귀~쇄골)', x: 52, y: 22, size: 18 },
    ],
    weakened: [
      { id: 'deepCervicalFlexor', name: '심부목굴곡근', position: '목 앞 깊은 곳', x: 48, y: 24, size: 16 },
    ]
  },
  // 라운드숄더
  roundShoulder: {
    shortened: [
      { id: 'pecMinor', name: '소흉근', position: '가슴 앞쪽 깊은 곳', x: 62, y: 32, size: 20 },
    ],
    weakened: [
      { id: 'rhomboid', name: '능형근', position: '등 뒤 (견갑골 사이)', x: 35, y: 32, size: 22 },
    ]
  },
  // 등굽음(흉추후만)
  kyphosis: {
    shortened: [
      { id: 'abdominals', name: '복근', position: '배 앞쪽', x: 62, y: 44, size: 22 },
    ],
    weakened: [
      { id: 'thoracicErector', name: '척추기립근', position: '등 중앙 (허리~흉추)', x: 38, y: 42, size: 24 },
    ]
  }
};

// ============================================================
// 정면 근육 좌표 (FRONT VIEW)
// 이미지 기준: 좌우 대칭
// ============================================================
export const FRONT_MUSCLES: PostureMuscles = {
  // 라운드숄더
  roundShoulder: {
    shortened: [
      { id: 'pecMajorL', name: '대흉근', position: '가슴 왼쪽', x: 42, y: 30, size: 26 },
      { id: 'pecMajorR', name: '대흉근', position: '가슴 오른쪽', x: 58, y: 30, size: 26 },
      { id: 'upperTrapL', name: '상부승모근', position: '어깨 왼쪽', x: 35, y: 26, size: 20 },
      { id: 'upperTrapR', name: '상부승모근', position: '어깨 오른쪽', x: 65, y: 26, size: 20 },
    ],
    weakened: [
      { id: 'serratusL', name: '전거근', position: '옆구리 왼쪽', x: 36, y: 35, size: 24 },
      { id: 'serratusR', name: '전거근', position: '옆구리 오른쪽', x: 64, y: 35, size: 24 },
    ]
  }
};

// ============================================================
// 오버레이 색상 정의
// ============================================================
export const OVERLAY_COLORS = {
  shortened: {
    fill: 'rgba(239, 68, 68, 0.4)',    // 빨강 (단축)
    border: 'rgba(239, 68, 68, 0.7)',
  },
  weakened: {
    fill: 'rgba(59, 130, 246, 0.4)',   // 파랑 (약화)
    border: 'rgba(59, 130, 246, 0.7)',
  }
};

// ============================================================
// 헬퍼 함수: 자세 점수에 따라 표시할 근육 필터링
// ============================================================
export function getMusclesForPosture(
  postureScores: { turtleNeck?: number; roundShoulder?: number; kyphosis?: number },
  threshold: number = 75,
  view: 'front' | 'side' = 'side'
): { shortened: MuscleData[]; weakened: MuscleData[] } {
  const muscles = view === 'front' ? FRONT_MUSCLES : SIDE_MUSCLES;
  const result: { shortened: MuscleData[]; weakened: MuscleData[] } = {
    shortened: [],
    weakened: []
  };

  // 거북목 점수가 낮으면 해당 근육 추가
  if (postureScores.turtleNeck !== undefined && postureScores.turtleNeck < threshold) {
    if (muscles.turtleNeck) {
      result.shortened.push(...muscles.turtleNeck.shortened);
      result.weakened.push(...muscles.turtleNeck.weakened);
    }
  }

  // 라운드숄더 점수가 낮으면 해당 근육 추가
  if (postureScores.roundShoulder !== undefined && postureScores.roundShoulder < threshold) {
    if (muscles.roundShoulder) {
      result.shortened.push(...muscles.roundShoulder.shortened);
      result.weakened.push(...muscles.roundShoulder.weakened);
    }
  }

  // 등굽음 점수가 낮으면 해당 근육 추가
  if (postureScores.kyphosis !== undefined && postureScores.kyphosis < threshold) {
    if (muscles.kyphosis) {
      result.shortened.push(...muscles.kyphosis.shortened);
      result.weakened.push(...muscles.kyphosis.weakened);
    }
  }

  return result;
}

// ============================================================
// 자세 문제 판정 인터페이스 및 함수
// ============================================================
export interface PostureProblems {
  hasTurtleNeck: boolean;     // 거북목
  hasRoundShoulder: boolean;  // 라운드숄더
  hasKyphosis: boolean;       // 등굽음
}

export interface PostureScores {
  forwardHead?: number;      // 거북목 점수
  roundShoulder?: number;    // 라운드숄더 점수
  kyphosis?: number;         // 등굽음 점수
}

/**
 * 분석 점수 기반으로 자세 문제 판정
 * @param scores - 각 항목의 점수 (0-100)
 * @param threshold - 문제 판정 기준 점수 (기본값: 75)
 * @returns 각 자세 문제 유무
 */
export function getPostureProblems(
  scores: PostureScores,
  threshold: number = 75
): PostureProblems {
  return {
    hasTurtleNeck: (scores.forwardHead ?? 100) < threshold,
    hasRoundShoulder: (scores.roundShoulder ?? 100) < threshold,
    hasKyphosis: (scores.kyphosis ?? 100) < threshold,
  };
}

/**
 * 자세 문제에 따라 표시할 근육 목록 반환
 * @param problems - 자세 문제 판정 결과
 * @param view - 'front' | 'side'
 * @returns 단축/약화 위험 근육 배열
 */
export function getMusclesByProblems(
  problems: PostureProblems,
  view: 'front' | 'side' = 'side'
): { shortened: MuscleData[]; weakened: MuscleData[] } {
  const muscles = view === 'front' ? FRONT_MUSCLES : SIDE_MUSCLES;
  const result: { shortened: MuscleData[]; weakened: MuscleData[] } = {
    shortened: [],
    weakened: []
  };

  // 거북목일 때 (측면만)
  if (problems.hasTurtleNeck && muscles.turtleNeck) {
    result.shortened.push(...muscles.turtleNeck.shortened);
    result.weakened.push(...muscles.turtleNeck.weakened);
  }

  // 라운드숄더일 때 (정면 + 측면)
  if (problems.hasRoundShoulder && muscles.roundShoulder) {
    result.shortened.push(...muscles.roundShoulder.shortened);
    result.weakened.push(...muscles.roundShoulder.weakened);
  }

  // 등굽음일 때 (측면만)
  if (problems.hasKyphosis && muscles.kyphosis) {
    result.shortened.push(...muscles.kyphosis.shortened);
    result.weakened.push(...muscles.kyphosis.weakened);
  }

  return result;
}

/**
 * 표시할 근육 리스트 텍스트 생성
 * @param muscles - 근육 데이터 배열
 * @returns 중복 제거된 근육 이름 + 위치 배열
 */
export function getMuscleListText(muscles: MuscleData[]): string[] {
  const uniqueNames = new Map<string, string>();
  muscles.forEach(m => {
    if (!uniqueNames.has(m.name)) {
      uniqueNames.set(m.name, m.position);
    }
  });
  return Array.from(uniqueNames.entries()).map(([name, pos]) => `${name} (${pos})`);
}
