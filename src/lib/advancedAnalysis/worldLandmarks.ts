/**
 * 3D 좌표 처리 유틸리티
 *
 * MediaPipe에서 추출한 world_landmarks(3D 실제 좌표)와
 * normalized landmarks(2D 정규화 좌표)를 처리하는 함수들입니다.
 *
 * world_landmarks: 실제 미터 단위의 3D 좌표 (깊이 정보 포함)
 * normalized landmarks: 0~1 사이의 화면 정규화 좌표 (렌더링용)
 */

import { Point3D, SkeletonPoint } from './types';

// ============================================================
// MediaPipe 결과 타입 정의
// ============================================================

/**
 * MediaPipe 랜드마크 단일 포인트 타입
 */
interface MediaPipeLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/**
 * MediaPipe Pose 결과 타입
 * poseLandmarks: 정규화된 2D 좌표 (0~1)
 * poseWorldLandmarks: 실제 3D 좌표 (미터 단위)
 */
interface MediaPipeResults {
  poseLandmarks?: MediaPipeLandmark[];
  poseWorldLandmarks?: MediaPipeLandmark[];
}

// ============================================================
// 랜드마크 추출 함수
// ============================================================

/**
 * MediaPipe 결과에서 world_landmarks (3D 좌표) 추출
 *
 * MediaPipe Pose는 두 종류의 좌표를 제공합니다:
 * 1. poseLandmarks: 화면 기준 정규화된 2D 좌표 (0~1)
 * 2. poseWorldLandmarks: 실제 미터 단위의 3D 좌표
 *
 * 이 함수는 가능하면 3D 좌표를 사용하고,
 * 없으면 2D 좌표를 fallback으로 사용합니다.
 *
 * @param results - MediaPipe Pose 모델의 결과 객체
 * @returns 3D 좌표 배열 (33개) 또는 null
 */
export const extractWorldLandmarks = (results: MediaPipeResults): Point3D[] | null => {
  // 결과 객체나 랜드마크가 없으면 null 반환
  if (!results?.poseLandmarks) {
    return null;
  }

  // world_landmarks가 있으면 사용, 없으면 일반 landmarks 사용
  // world_landmarks: 실제 3D 좌표 (미터 단위)
  // poseLandmarks: 정규화된 2D 좌표 (0~1)
  const landmarks = results.poseWorldLandmarks || results.poseLandmarks;

  // 각 랜드마크를 Point3D 형식으로 변환
  return landmarks.map((lm: MediaPipeLandmark) => ({
    x: lm.x,                    // x 좌표 (좌우)
    y: lm.y,                    // y 좌표 (상하)
    z: lm.z || 0,               // z 좌표 (앞뒤, 없으면 0)
    visibility: lm.visibility || 0,  // 가시성 점수
  }));
};

/**
 * MediaPipe 결과에서 2D 정규화 좌표 추출 (스켈레톤 렌더링용)
 *
 * 화면에 스켈레톤을 그리기 위한 정규화된 좌표입니다.
 * x, y는 0~1 사이의 값으로, 화면 크기에 곱하면 픽셀 좌표가 됩니다.
 *
 * @param results - MediaPipe Pose 모델의 결과 객체
 * @returns 2D 정규화 좌표 배열 (33개) 또는 null
 */
export const extractNormalizedLandmarks = (results: MediaPipeResults): SkeletonPoint[] | null => {
  // 결과 객체나 랜드마크가 없으면 null 반환
  if (!results?.poseLandmarks) {
    return null;
  }

  // 각 랜드마크를 SkeletonPoint 형식으로 변환
  return results.poseLandmarks.map((lm: MediaPipeLandmark) => ({
    x: lm.x,                    // x 좌표 (0~1 사이)
    y: lm.y,                    // y 좌표 (0~1 사이)
    visibility: lm.visibility || 0,  // 가시성 점수
  }));
};

// ============================================================
// 랜드마크 접근 함수
// ============================================================

/**
 * 특정 인덱스의 관절 좌표 가져오기
 *
 * LANDMARK_INDEX 상수와 함께 사용합니다.
 * 예: getLandmark(landmarks, LANDMARK_INDEX.LEFT_SHOULDER)
 *
 * @param landmarks - 3D 좌표 배열
 * @param index - 가져올 관절의 인덱스 (0~32)
 * @returns 해당 관절의 3D 좌표 또는 null
 */
export const getLandmark = (landmarks: Point3D[], index: number): Point3D | null => {
  // 배열이 없거나 인덱스가 범위를 벗어나면 null 반환
  if (!landmarks || index < 0 || index >= landmarks.length) {
    return null;
  }
  return landmarks[index];
};

// ============================================================
// 좌표 계산 유틸리티
// ============================================================

/**
 * 두 점 사이의 중점 계산 (3D)
 *
 * 어깨 중점, 골반 중점 등을 계산할 때 사용합니다.
 * 가시성은 두 점 중 낮은 값을 사용합니다.
 *
 * @param p1 - 첫 번째 점
 * @param p2 - 두 번째 점
 * @returns 두 점의 중점 좌표
 */
export const getMidpoint = (p1: Point3D, p2: Point3D): Point3D => {
  return {
    x: (p1.x + p2.x) / 2,  // x 좌표의 평균
    y: (p1.y + p2.y) / 2,  // y 좌표의 평균
    z: (p1.z + p2.z) / 2,  // z 좌표의 평균
    visibility: Math.min(p1.visibility, p2.visibility),  // 더 낮은 가시성 사용
  };
};

/**
 * 두 점 사이의 3D 거리 계산 (유클리드 거리)
 *
 * 3차원 공간에서 두 점 사이의 직선 거리를 계산합니다.
 * 거리 = sqrt((x2-x1)^2 + (y2-y1)^2 + (z2-z1)^2)
 *
 * @param p1 - 첫 번째 점
 * @param p2 - 두 번째 점
 * @returns 두 점 사이의 거리 (미터 단위)
 */
export const getDistance3D = (p1: Point3D, p2: Point3D): number => {
  // 각 축의 차이를 제곱
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;

  // 피타고라스 정리로 거리 계산
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * 두 점 사이의 2D 거리 계산 (z축 무시)
 *
 * 화면상의 거리만 필요할 때 사용합니다.
 * 깊이(z)는 무시하고 x, y만으로 계산합니다.
 *
 * @param p1 - 첫 번째 점
 * @param p2 - 두 번째 점
 * @returns 두 점 사이의 2D 거리
 */
export const getDistance2D = (p1: Point3D, p2: Point3D): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * 벡터 정규화 (단위 벡터로 변환)
 *
 * 벡터의 방향은 유지하면서 길이를 1로 만듭니다.
 * 각도 계산 등에서 내적을 사용할 때 유용합니다.
 *
 * @param v - 정규화할 3D 벡터
 * @returns 길이가 1인 단위 벡터
 */
export const normalizeVector = (v: { x: number; y: number; z: number }): { x: number; y: number; z: number } => {
  const magnitude = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);

  // 길이가 0이면 영벡터 반환 (0으로 나누기 방지)
  if (magnitude === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  return {
    x: v.x / magnitude,
    y: v.y / magnitude,
    z: v.z / magnitude,
  };
};

/**
 * 두 점으로 벡터 생성
 *
 * 시작점에서 끝점으로 향하는 벡터를 계산합니다.
 *
 * @param from - 시작점
 * @param to - 끝점
 * @returns 시작점에서 끝점으로 향하는 벡터
 */
export const createVector = (from: Point3D, to: Point3D): { x: number; y: number; z: number } => {
  return {
    x: to.x - from.x,
    y: to.y - from.y,
    z: to.z - from.z,
  };
};
