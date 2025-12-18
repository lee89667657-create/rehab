/**
 * angleCalculator.ts
 * 자세 측정을 위한 각도 및 거리 계산 유틸리티
 *
 * 이 파일은 MediaPipe Pose에서 감지한 랜드마크(관절 포인트)를 사용하여
 * 다양한 자세 지표를 측정하는 함수들을 제공합니다.
 *
 * ## 측정 원리
 * MediaPipe는 각 관절의 x, y 좌표를 0~1 사이로 정규화하여 반환합니다.
 * - x: 0(왼쪽) ~ 1(오른쪽)
 * - y: 0(위쪽) ~ 1(아래쪽)
 *
 * 실제 거리 계산을 위해서는 기준 길이(예: 어깨 너비)를 사용하여
 * 상대적인 거리를 cm 단위로 환산합니다.
 */

import type { PoseLandmark } from '@/types';

/**
 * ========================================
 * MediaPipe Pose 랜드마크 인덱스 상수
 * ========================================
 *
 * MediaPipe Pose는 총 33개의 관절 포인트를 인식합니다.
 * 자세 분석에 필요한 주요 포인트들만 정의합니다.
 *
 * 참고: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
 */
export const POSE_LANDMARKS = {
  // 얼굴
  NOSE: 0,              // 코 끝
  LEFT_EYE_INNER: 1,    // 왼쪽 눈 안쪽
  LEFT_EYE: 2,          // 왼쪽 눈
  LEFT_EYE_OUTER: 3,    // 왼쪽 눈 바깥쪽
  RIGHT_EYE_INNER: 4,   // 오른쪽 눈 안쪽
  RIGHT_EYE: 5,         // 오른쪽 눈
  RIGHT_EYE_OUTER: 6,   // 오른쪽 눈 바깥쪽
  LEFT_EAR: 7,          // 왼쪽 귀
  RIGHT_EAR: 8,         // 오른쪽 귀
  MOUTH_LEFT: 9,        // 입 왼쪽 끝
  MOUTH_RIGHT: 10,      // 입 오른쪽 끝

  // 상체
  LEFT_SHOULDER: 11,    // 왼쪽 어깨
  RIGHT_SHOULDER: 12,   // 오른쪽 어깨
  LEFT_ELBOW: 13,       // 왼쪽 팔꿈치
  RIGHT_ELBOW: 14,      // 오른쪽 팔꿈치
  LEFT_WRIST: 15,       // 왼쪽 손목
  RIGHT_WRIST: 16,      // 오른쪽 손목

  // 하체
  LEFT_HIP: 23,         // 왼쪽 엉덩이 (골반)
  RIGHT_HIP: 24,        // 오른쪽 엉덩이 (골반)
  LEFT_KNEE: 25,        // 왼쪽 무릎
  RIGHT_KNEE: 26,       // 오른쪽 무릎
  LEFT_ANKLE: 27,       // 왼쪽 발목
  RIGHT_ANKLE: 28,      // 오른쪽 발목
} as const;

/**
 * 평균 어깨 너비 (cm)
 *
 * 한국인 성인 평균 어깨 너비를 기준으로 합니다.
 * - 남성 평균: 약 45cm
 * - 여성 평균: 약 40cm
 * - 통합 평균: 약 42cm
 *
 * 이 값은 정규화된 좌표를 실제 cm로 환산할 때 기준이 됩니다.
 * 정확한 측정을 위해서는 사용자별 어깨 너비를 입력받는 것이 좋습니다.
 */
const AVERAGE_SHOULDER_WIDTH_CM = 42;

/**
 * ========================================
 * 기본 계산 함수
 * ========================================
 */

/**
 * 세 점 사이의 각도를 계산합니다.
 *
 * ## 계산 원리
 * 벡터 BA와 벡터 BC 사이의 각도를 구합니다.
 * 점 B가 꼭짓점(vertex)이 되며, A와 C는 각도를 이루는 두 점입니다.
 *
 * ## 수학적 공식
 * 1. 벡터 BA = (A.x - B.x, A.y - B.y)
 * 2. 벡터 BC = (C.x - B.x, C.y - B.y)
 * 3. 각도 = atan2(BC.y, BC.x) - atan2(BA.y, BA.x)
 *
 * @param pointA - 첫 번째 점 (시작점)
 * @param pointB - 두 번째 점 (꼭짓점, 각도의 중심)
 * @param pointC - 세 번째 점 (끝점)
 * @returns 각도 (도 단위, 0~180)
 *
 * @example
 * // 무릎 각도 계산 (엉덩이-무릎-발목)
 * const kneeAngle = calculateAngle(hip, knee, ankle);
 * // 180도에 가까울수록 다리가 펴진 상태
 */
export function calculateAngle(
  pointA: PoseLandmark,
  pointB: PoseLandmark,
  pointC: PoseLandmark
): number {
  // 각 점에서 꼭짓점(B)까지의 각도를 라디안으로 계산
  const radianAB = Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
  const radianCB = Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x);

  // 두 각도의 차이 계산
  const angleRadians = radianCB - radianAB;

  // 라디안을 도(degree)로 변환
  let angleDegrees = Math.abs(angleRadians * (180 / Math.PI));

  // 각도가 180도를 초과하면 360에서 빼서 보정
  // (항상 작은 각도를 반환하기 위함)
  if (angleDegrees > 180) {
    angleDegrees = 360 - angleDegrees;
  }

  return angleDegrees;
}

/**
 * 두 점 사이의 정규화된 거리를 계산합니다.
 *
 * @param point1 - 첫 번째 점
 * @param point2 - 두 번째 점
 * @returns 정규화된 거리 (0~1 범위의 상대적 거리)
 */
export function calculateDistance(
  point1: PoseLandmark,
  point2: PoseLandmark
): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 정규화된 거리를 cm 단위로 환산합니다.
 *
 * ## 환산 원리
 * 어깨 너비를 기준으로 비율을 계산합니다.
 * 예: 어깨 너비가 정규화 좌표로 0.3이고, 측정 거리가 0.06이면
 *     실제 거리 = (0.06 / 0.3) × 42cm = 8.4cm
 *
 * @param normalizedDistance - 정규화된 거리
 * @param shoulderWidthNormalized - 정규화된 어깨 너비 (기준)
 * @returns cm 단위의 실제 거리
 */
export function normalizedToCm(
  normalizedDistance: number,
  shoulderWidthNormalized: number
): number {
  // 어깨 너비가 0이면 계산 불가
  if (shoulderWidthNormalized === 0) return 0;

  // 비율 계산: (측정 거리 / 어깨 너비) × 평균 어깨 너비(cm)
  return (normalizedDistance / shoulderWidthNormalized) * AVERAGE_SHOULDER_WIDTH_CM;
}

/**
 * ========================================
 * 자세 측정 함수
 * ========================================
 */

/**
 * 어깨 너비를 정규화된 좌표로 계산합니다.
 * 다른 측정의 기준으로 사용됩니다.
 *
 * @param landmarks - 33개 랜드마크 배열
 * @returns 정규화된 어깨 너비
 */
export function getShoulderWidth(landmarks: PoseLandmark[]): number {
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  return calculateDistance(leftShoulder, rightShoulder);
}

/**
 * 거북목(일자목) 정도를 측정합니다.
 *
 * ## 측정 원리
 * 정상적인 자세에서 귀는 어깨 바로 위에 위치합니다.
 * 거북목이 되면 머리가 앞으로 나오면서 귀가 어깨보다 앞쪽에 위치하게 됩니다.
 *
 * ## 측정 방법
 * 측면에서 봤을 때 귀(ear)와 어깨(shoulder)의 수평 거리를 측정합니다.
 * - 거리가 클수록 머리가 앞으로 많이 나온 상태 (심한 거북목)
 * - 거리가 작을수록 정상에 가까운 상태
 *
 * ## 의학적 근거
 * - 정상: 귀와 어깨가 수직선상에 위치 (거리 < 2.5cm)
 * - 경미한 거북목: 2.5cm ~ 5cm
 * - 심한 거북목: 5cm 이상
 *
 * 참고: 거북목 증후군(Forward Head Posture)의 일반적인 진단 기준
 *
 * @param landmarks - 33개 랜드마크 배열
 * @returns 거북목 거리 (cm 단위, 양수일수록 앞으로 나옴)
 */
export function getForwardHeadDistance(landmarks: PoseLandmark[]): number {
  // 랜드마크 추출
  const leftEar = landmarks[POSE_LANDMARKS.LEFT_EAR];
  const rightEar = landmarks[POSE_LANDMARKS.RIGHT_EAR];
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  // 양쪽 귀와 어깨의 중점 계산 (더 정확한 측정을 위해)
  const earCenterX = (leftEar.x + rightEar.x) / 2;
  const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;

  // 수평 거리 계산 (정규화된 좌표)
  // 양수: 머리가 어깨보다 앞으로 나옴
  // 음수: 머리가 어깨보다 뒤로 감 (드문 경우)
  const normalizedDistance = Math.abs(earCenterX - shoulderCenterX);

  // 어깨 너비를 기준으로 cm 환산
  const shoulderWidth = getShoulderWidth(landmarks);
  const distanceCm = normalizedToCm(normalizedDistance, shoulderWidth);

  return distanceCm;
}

/**
 * 어깨 기울기(좌우 높이 차이)를 측정합니다.
 *
 * ## 측정 원리
 * 정상적인 자세에서 양쪽 어깨는 수평을 이룹니다.
 * 어깨가 틀어지면 한쪽이 높거나 낮아집니다.
 *
 * ## 측정 방법
 * 정면에서 봤을 때 왼쪽 어깨와 오른쪽 어깨의 y 좌표 차이를 측정합니다.
 * - 양수: 오른쪽 어깨가 낮음
 * - 음수: 왼쪽 어깨가 낮음
 *
 * ## 의학적 근거
 * - 정상: 좌우 어깨 높이 차이 < 1cm
 * - 경미한 불균형: 1cm ~ 2cm
 * - 심한 불균형: 2cm 이상 (척추측만증 의심 가능)
 *
 * 참고: 어깨 높이 차이는 척추측만증, 골반 틀어짐,
 *       습관적 자세 불균형 등의 지표가 됩니다.
 *
 * @param landmarks - 33개 랜드마크 배열
 * @returns 어깨 높이 차이 (cm 단위, 절대값)
 */
export function getShoulderTilt(landmarks: PoseLandmark[]): number {
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  // y 좌표 차이 계산 (정규화된 좌표)
  // MediaPipe에서 y는 위가 0, 아래가 1이므로
  // 값이 클수록 아래쪽에 위치
  const normalizedDiff = Math.abs(leftShoulder.y - rightShoulder.y);

  // 어깨 너비를 기준으로 cm 환산
  const shoulderWidth = getShoulderWidth(landmarks);
  const diffCm = normalizedToCm(normalizedDiff, shoulderWidth);

  return diffCm;
}

/**
 * 골반 기울기(좌우 높이 차이)를 측정합니다.
 *
 * ## 측정 원리
 * 정상적인 자세에서 양쪽 골반(엉덩이)은 수평을 이룹니다.
 * 골반이 틀어지면 한쪽이 높거나 낮아집니다.
 *
 * ## 측정 방법
 * 정면에서 봤을 때 왼쪽 골반과 오른쪽 골반의 y 좌표 차이를 측정합니다.
 *
 * ## 의학적 근거
 * - 정상: 좌우 골반 높이 차이 < 1cm
 * - 경미한 불균형: 1cm ~ 2cm
 * - 심한 불균형: 2cm 이상
 *
 * 골반 불균형은 허리 통증, 다리 길이 차이감,
 * 걸음걸이 이상 등의 원인이 될 수 있습니다.
 *
 * @param landmarks - 33개 랜드마크 배열
 * @returns 골반 높이 차이 (cm 단위, 절대값)
 */
export function getPelvisTilt(landmarks: PoseLandmark[]): number {
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];

  // y 좌표 차이 계산
  const normalizedDiff = Math.abs(leftHip.y - rightHip.y);

  // 어깨 너비를 기준으로 cm 환산
  const shoulderWidth = getShoulderWidth(landmarks);
  const diffCm = normalizedToCm(normalizedDiff, shoulderWidth);

  return diffCm;
}

/**
 * 무릎 각도를 측정합니다.
 *
 * ## 측정 원리
 * 엉덩이-무릎-발목 세 점이 이루는 각도를 측정합니다.
 * - 180도: 다리가 완전히 펴진 상태
 * - 90도: 무릎이 직각으로 굽혀진 상태
 *
 * ## 측정 방법
 * 양쪽 무릎 각도를 각각 측정하여 평균을 반환합니다.
 *
 * ## 의학적 근거
 * - 정상 서있는 자세: 175도 ~ 180도
 * - 무릎이 과신전(hyperextension)된 경우: 180도 초과
 * - 무릎이 굽혀진 경우: 175도 미만
 *
 * O다리, X다리 등의 하지 정렬 이상 판단에 사용될 수 있습니다.
 *
 * @param landmarks - 33개 랜드마크 배열
 * @returns 평균 무릎 각도 (도 단위)
 */
export function getKneeAngle(landmarks: PoseLandmark[]): number {
  // 왼쪽 무릎 각도
  const leftKneeAngle = calculateAngle(
    landmarks[POSE_LANDMARKS.LEFT_HIP],
    landmarks[POSE_LANDMARKS.LEFT_KNEE],
    landmarks[POSE_LANDMARKS.LEFT_ANKLE]
  );

  // 오른쪽 무릎 각도
  const rightKneeAngle = calculateAngle(
    landmarks[POSE_LANDMARKS.RIGHT_HIP],
    landmarks[POSE_LANDMARKS.RIGHT_KNEE],
    landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
  );

  // 양쪽 평균 반환
  return (leftKneeAngle + rightKneeAngle) / 2;
}

/**
 * 목 기울기(고개 숙임/들림)를 측정합니다.
 *
 * ## 측정 원리
 * 코와 어깨 중점 사이의 각도를 측정합니다.
 * - 90도에 가까울수록: 고개가 바로 선 상태
 * - 90도보다 작을수록: 고개를 숙인 상태
 * - 90도보다 클수록: 고개를 든 상태
 *
 * @param landmarks - 33개 랜드마크 배열
 * @returns 목 기울기 각도 (도 단위)
 */
export function getNeckTilt(landmarks: PoseLandmark[]): number {
  const nose = landmarks[POSE_LANDMARKS.NOSE];
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  // 어깨 중점 계산
  const shoulderCenter: PoseLandmark = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
    z: (leftShoulder.z + rightShoulder.z) / 2,
    visibility: 1,
  };

  // 수직선상의 가상 점 (어깨 중점 바로 위)
  const verticalPoint: PoseLandmark = {
    x: shoulderCenter.x,
    y: shoulderCenter.y - 0.1, // 위쪽으로 이동
    z: shoulderCenter.z,
    visibility: 1,
  };

  // 수직선과 코 사이의 각도
  return calculateAngle(verticalPoint, shoulderCenter, nose);
}

export default calculateAngle;
