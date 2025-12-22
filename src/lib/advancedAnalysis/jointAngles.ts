/**
 * 관절각 계산 유틸리티
 *
 * 3D 좌표를 사용하여 재활 운동에 필요한 관절각들을 계산합니다.
 * 모든 각도는 도(degree) 단위로 반환됩니다.
 *
 * 계산되는 관절각:
 * - trunk: 몸통 기울기 (수직 기준)
 * - hip: 고관절 각도 (어깨-골반-무릎)
 * - knee: 무릎 각도 (골반-무릎-발목)
 * - shoulder: 어깨 각도 (팔 외전)
 */

import { Point3D, JointAngles, LANDMARK_INDEX } from './types';
import { getLandmark, getMidpoint } from './worldLandmarks';

// ============================================================
// 기본 각도 계산 함수
// ============================================================

/**
 * 세 점으로 각도 계산 (3D 벡터)
 *
 * 세 점 A, B, C가 있을 때, B를 꼭짓점으로 하는 각도를 계산합니다.
 * 즉, 벡터 BA와 벡터 BC 사이의 각도를 구합니다.
 *
 * 계산 원리:
 * 1. 벡터 BA = A - B, 벡터 BC = C - B 생성
 * 2. 두 벡터의 내적(dot product) 계산: BA . BC = |BA||BC|cos(theta)
 * 3. 각 벡터의 크기(magnitude) 계산
 * 4. cos(theta) = (BA . BC) / (|BA| * |BC|)
 * 5. theta = arccos(cos(theta))
 *
 * @param a - 첫 번째 점 (시작점)
 * @param b - 두 번째 점 (꼭짓점, 각도의 중심)
 * @param c - 세 번째 점 (끝점)
 * @returns 각도 (도 단위, 소수점 1자리)
 */
export const calculateAngle3D = (a: Point3D, b: Point3D, c: Point3D): number => {
  // 벡터 BA 계산 (B에서 A로 향하는 벡터)
  const ba = {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };

  // 벡터 BC 계산 (B에서 C로 향하는 벡터)
  const bc = {
    x: c.x - b.x,
    y: c.y - b.y,
    z: c.z - b.z,
  };

  // 두 벡터의 내적 (dot product) 계산
  // BA . BC = BA.x * BC.x + BA.y * BC.y + BA.z * BC.z
  const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;

  // 각 벡터의 크기 (magnitude) 계산
  // |v| = sqrt(v.x^2 + v.y^2 + v.z^2)
  const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2 + ba.z ** 2);
  const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2 + bc.z ** 2);

  // 벡터 길이가 0이면 각도 계산 불가
  if (magBA === 0 || magBC === 0) {
    return 0;
  }

  // cos(theta) 계산 후 범위 제한 (-1 ~ 1)
  // 부동소수점 오차로 인해 범위를 벗어날 수 있으므로 클램핑 필요
  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));

  // arccos로 각도 계산 (라디안 -> 도 변환)
  const angle = Math.acos(cosAngle) * (180 / Math.PI);

  // 소수점 1자리까지 반올림
  return Math.round(angle * 10) / 10;
};

// ============================================================
// 개별 관절각 계산 함수
// ============================================================

/**
 * 몸통 기울기 계산 (수직선 기준)
 *
 * 어깨 중점과 골반 중점을 연결한 선이 수직선과 이루는 각도를 계산합니다.
 * 완벽하게 수직으로 서 있으면 0도, 기울어질수록 값이 커집니다.
 *
 * 계산 방법:
 * 1. 양쪽 어깨의 중점 계산
 * 2. 양쪽 골반의 중점 계산
 * 3. 두 중점을 연결한 선과 수직선 사이의 각도 계산
 *
 * @param landmarks - 3D 좌표 배열 (33개)
 * @returns 몸통 기울기 (도 단위, 0 = 수직)
 */
export const calculateTrunkAngle = (landmarks: Point3D[]): number => {
  // 필요한 관절 좌표 가져오기
  const leftShoulder = getLandmark(landmarks, LANDMARK_INDEX.LEFT_SHOULDER);
  const rightShoulder = getLandmark(landmarks, LANDMARK_INDEX.RIGHT_SHOULDER);
  const leftHip = getLandmark(landmarks, LANDMARK_INDEX.LEFT_HIP);
  const rightHip = getLandmark(landmarks, LANDMARK_INDEX.RIGHT_HIP);

  // 관절이 하나라도 없으면 계산 불가
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return 0;
  }

  // 어깨 중점과 골반 중점 계산
  const shoulderMid = getMidpoint(leftShoulder, rightShoulder);
  const hipMid = getMidpoint(leftHip, rightHip);

  // 수평 방향 변위 (x축)
  const dx = shoulderMid.x - hipMid.x;

  // 수직 방향 변위 (y축)
  // MediaPipe에서 y축은 아래가 양수이므로 부호 반전
  const dy = shoulderMid.y - hipMid.y;

  // atan2로 각도 계산
  // 수직 기준이므로 x, y를 반전 (수직선과의 각도)
  // -dy: y축 방향 반전 (위가 양수가 되도록)
  const angle = Math.atan2(dx, -dy) * (180 / Math.PI);

  // 절대값으로 반환 (왼쪽/오른쪽 기울기 구분 없이)
  return Math.round(Math.abs(angle) * 10) / 10;
};

/**
 * 고관절 각도 계산 (몸통-허벅지 각도)
 *
 * 어깨-골반-무릎이 이루는 각도를 계산합니다.
 * 완전히 펴진 상태가 180도, 앉은 상태는 90도 정도입니다.
 *
 * @param landmarks - 3D 좌표 배열 (33개)
 * @param side - 측정할 방향 ('left' 또는 'right')
 * @returns 고관절 각도 (도 단위)
 */
export const calculateHipAngle = (landmarks: Point3D[], side: 'left' | 'right'): number => {
  // 측정할 방향에 따라 인덱스 선택
  const shoulderIdx = side === 'left' ? LANDMARK_INDEX.LEFT_SHOULDER : LANDMARK_INDEX.RIGHT_SHOULDER;
  const hipIdx = side === 'left' ? LANDMARK_INDEX.LEFT_HIP : LANDMARK_INDEX.RIGHT_HIP;
  const kneeIdx = side === 'left' ? LANDMARK_INDEX.LEFT_KNEE : LANDMARK_INDEX.RIGHT_KNEE;

  // 관절 좌표 가져오기
  const shoulder = getLandmark(landmarks, shoulderIdx);
  const hip = getLandmark(landmarks, hipIdx);
  const knee = getLandmark(landmarks, kneeIdx);

  // 관절이 하나라도 없으면 계산 불가
  if (!shoulder || !hip || !knee) {
    return 0;
  }

  // 골반을 꼭짓점으로 어깨-골반-무릎 각도 계산
  return calculateAngle3D(shoulder, hip, knee);
};

/**
 * 무릎 각도 계산 (허벅지-종아리 각도)
 *
 * 골반-무릎-발목이 이루는 각도를 계산합니다.
 * 완전히 펴진 상태가 180도, 90도로 구부린 상태는 90도입니다.
 *
 * @param landmarks - 3D 좌표 배열 (33개)
 * @param side - 측정할 방향 ('left' 또는 'right')
 * @returns 무릎 각도 (도 단위)
 */
export const calculateKneeAngle = (landmarks: Point3D[], side: 'left' | 'right'): number => {
  // 측정할 방향에 따라 인덱스 선택
  const hipIdx = side === 'left' ? LANDMARK_INDEX.LEFT_HIP : LANDMARK_INDEX.RIGHT_HIP;
  const kneeIdx = side === 'left' ? LANDMARK_INDEX.LEFT_KNEE : LANDMARK_INDEX.RIGHT_KNEE;
  const ankleIdx = side === 'left' ? LANDMARK_INDEX.LEFT_ANKLE : LANDMARK_INDEX.RIGHT_ANKLE;

  // 관절 좌표 가져오기
  const hip = getLandmark(landmarks, hipIdx);
  const knee = getLandmark(landmarks, kneeIdx);
  const ankle = getLandmark(landmarks, ankleIdx);

  // 관절이 하나라도 없으면 계산 불가
  if (!hip || !knee || !ankle) {
    return 0;
  }

  // 무릎을 꼭짓점으로 골반-무릎-발목 각도 계산
  return calculateAngle3D(hip, knee, ankle);
};

/**
 * 어깨 각도 계산 (팔 외전 각도)
 *
 * 골반-어깨-팔꿈치가 이루는 각도를 계산합니다.
 * 팔을 몸통에 붙인 상태가 0도에 가깝고,
 * 팔을 수평으로 들어올리면 약 90도입니다.
 *
 * @param landmarks - 3D 좌표 배열 (33개)
 * @param side - 측정할 방향 ('left' 또는 'right')
 * @returns 어깨 각도 (도 단위)
 */
export const calculateShoulderAngle = (landmarks: Point3D[], side: 'left' | 'right'): number => {
  // 측정할 방향에 따라 인덱스 선택
  const hipIdx = side === 'left' ? LANDMARK_INDEX.LEFT_HIP : LANDMARK_INDEX.RIGHT_HIP;
  const shoulderIdx = side === 'left' ? LANDMARK_INDEX.LEFT_SHOULDER : LANDMARK_INDEX.RIGHT_SHOULDER;
  const elbowIdx = side === 'left' ? LANDMARK_INDEX.LEFT_ELBOW : LANDMARK_INDEX.RIGHT_ELBOW;

  // 관절 좌표 가져오기
  const hip = getLandmark(landmarks, hipIdx);
  const shoulder = getLandmark(landmarks, shoulderIdx);
  const elbow = getLandmark(landmarks, elbowIdx);

  // 관절이 하나라도 없으면 계산 불가
  if (!hip || !shoulder || !elbow) {
    return 0;
  }

  // 어깨를 꼭짓점으로 골반-어깨-팔꿈치 각도 계산
  return calculateAngle3D(hip, shoulder, elbow);
};

// ============================================================
// 통합 계산 함수
// ============================================================

/**
 * 모든 관절각 한번에 계산
 *
 * 재활 운동 분석에 필요한 모든 관절각을 한 번에 계산합니다.
 * 왼쪽/오른쪽 각도를 모두 포함합니다.
 *
 * @param landmarks - 3D 좌표 배열 (33개)
 * @returns 모든 관절각이 담긴 JointAngles 객체
 */
export const calculateAllJointAngles = (landmarks: Point3D[]): JointAngles => {
  return {
    // 몸통 기울기
    trunk: calculateTrunkAngle(landmarks),

    // 고관절 각도 (좌/우)
    hipLeft: calculateHipAngle(landmarks, 'left'),
    hipRight: calculateHipAngle(landmarks, 'right'),

    // 무릎 각도 (좌/우)
    kneeLeft: calculateKneeAngle(landmarks, 'left'),
    kneeRight: calculateKneeAngle(landmarks, 'right'),

    // 어깨 각도 (좌/우)
    shoulderLeft: calculateShoulderAngle(landmarks, 'left'),
    shoulderRight: calculateShoulderAngle(landmarks, 'right'),
  };
};

/**
 * 관절각을 읽기 쉬운 문자열로 변환
 *
 * 디버깅이나 로깅용으로 관절각 정보를 문자열로 변환합니다.
 *
 * @param angles - JointAngles 객체
 * @returns 포맷팅된 문자열
 */
export const formatJointAngles = (angles: JointAngles): string => {
  return [
    `몸통 기울기: ${angles.trunk}도`,
    `고관절 (좌): ${angles.hipLeft}도`,
    `고관절 (우): ${angles.hipRight}도`,
    `무릎 (좌): ${angles.kneeLeft}도`,
    `무릎 (우): ${angles.kneeRight}도`,
    `어깨 (좌): ${angles.shoulderLeft}도`,
    `어깨 (우): ${angles.shoulderRight}도`,
  ].join('\n');
};
