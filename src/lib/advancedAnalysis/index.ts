/**
 * Advanced Analysis 모듈
 *
 * MediaPipe의 3D 좌표(world_landmarks)를 활용한 고급 자세 분석 모듈입니다.
 * 기존 poseAnalysis.ts와 독립적으로 동작하며, 더 정확한 3D 기반 분석을 제공합니다.
 *
 * 주요 기능:
 * - 3D 좌표 추출 및 처리
 * - 관절각 계산 (몸통, 고관절, 무릎, 어깨)
 * - 스켈레톤 렌더링용 좌표 변환
 *
 * 사용 예시:
 * ```typescript
 * import {
 *   extractWorldLandmarks,
 *   calculateAllJointAngles,
 *   LANDMARK_INDEX
 * } from '@/lib/advancedAnalysis';
 *
 * // MediaPipe 결과에서 3D 좌표 추출
 * const landmarks = extractWorldLandmarks(mediapipeResults);
 *
 * // 관절각 계산
 * const angles = calculateAllJointAngles(landmarks);
 *
 * console.log(`무릎 각도: ${angles.kneeLeft}도`);
 * ```
 */

// ============================================================
// 타입 내보내기
// ============================================================

// 타입 exports (isolatedModules 호환)
export type {
  Point3D,
  SkeletonPoint,
  JointAngles,
  LandmarkName,
  LandmarkIndex,
} from './types';

// 상수 export (런타임 값)
export { LANDMARK_INDEX } from './types';

// ============================================================
// 좌표 처리 함수 내보내기
// ============================================================

export {
  // 랜드마크 추출
  extractWorldLandmarks,
  extractNormalizedLandmarks,

  // 랜드마크 접근
  getLandmark,

  // 거리/중점 계산
  getMidpoint,
  getDistance3D,
  getDistance2D,

  // 벡터 유틸리티
  normalizeVector,
  createVector,
} from './worldLandmarks';

// ============================================================
// 관절각 계산 함수 내보내기
// ============================================================

export {
  // 기본 각도 계산
  calculateAngle3D,

  // 개별 관절각 계산
  calculateTrunkAngle,
  calculateHipAngle,
  calculateKneeAngle,
  calculateShoulderAngle,

  // 통합 계산
  calculateAllJointAngles,

  // 유틸리티
  formatJointAngles,
} from './jointAngles';

// ============================================================
// ROM 분석 함수 내보내기
// ============================================================

// 타입 exports (isolatedModules 호환)
export type { ROMResult } from './romAnalysis';

export {
  // 개별 관절 ROM 분석
  analyzeJointROM,

  // 전체 관절 ROM 분석
  analyzeAllROM,

  // ROM 점수 계산
  calculateROMScore,
} from './romAnalysis';

// ============================================================
// 비대칭 분석 함수 내보내기
// ============================================================

// 타입 exports (isolatedModules 호환)
export type { AsymmetryResult } from './asymmetryAnalysis';

export {
  // 개별 관절 비대칭 분석
  analyzeJointAsymmetry,

  // 전체 관절 비대칭 분석
  analyzeAllAsymmetry,

  // 비대칭 점수 계산
  calculateAsymmetryScore,

  // 비대칭 요약 메시지
  getAsymmetrySummary,
} from './asymmetryAnalysis';
