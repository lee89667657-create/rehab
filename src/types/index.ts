/**
 * index.ts
 * 앱 전역 타입 정의
 * - 포즈 랜드마크 타입
 * - 운동 관련 타입
 * - 사용자 프로필 타입
 * - API 응답 타입
 * - 공통 유틸리티 타입
 */

/**
 * MediaPipe 포즈 랜드마크 타입
 */
export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/**
 * 포즈 감지 상태 타입
 */
export interface PoseState {
  isDetecting: boolean;
  landmarks: PoseLandmark[];
}

/**
 * 운동 타입
 */
export interface Exercise {
  id: string;
  name: string;
  description: string;
  category: ExerciseCategory;
  difficulty: 'easy' | 'medium' | 'hard';
  targetReps: number;
  instructions: string[];
  targetAngles?: Record<string, number>;
}

/**
 * 운동 카테고리 타입
 */
export type ExerciseCategory =
  | 'shoulder'   // 어깨
  | 'back'       // 등/허리
  | 'knee'       // 무릎
  | 'hip'        // 엉덩이
  | 'neck'       // 목
  | 'full-body'; // 전신

/**
 * 사용자 프로필 타입
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

/**
 * 운동 기록 타입
 */
export interface ExerciseRecord {
  id: string;
  oderId: string;
  exerciseId: string;
  score: number;
  reps: number;
  duration: number;
  completedAt: string;
  feedback: string[];
}

/**
 * 운동 세션 타입
 */
export interface ExerciseSession {
  id: string;
  oderId: string;
  startedAt: string;
  endedAt?: string;
  exercises: ExerciseRecord[];
  totalScore: number;
}
