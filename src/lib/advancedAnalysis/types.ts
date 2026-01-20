/**
 * Advanced Analysis 타입 정의
 *
 * MediaPipe에서 추출한 3D 좌표와 관절각 계산에 필요한 타입들을 정의합니다.
 * 기존 poseAnalysis.ts와 독립적으로 동작합니다.
 */

// ============================================================
// 3D 좌표 타입
// ============================================================

/**
 * 3D 공간 좌표 타입
 * MediaPipe world_landmarks에서 추출한 실제 미터 단위 좌표
 */
export interface Point3D {
  x: number;  // 좌우 방향 (미터 단위, 오른쪽이 양수)
  y: number;  // 상하 방향 (미터 단위, 아래쪽이 양수)
  z: number;  // 앞뒤 방향 (미터 단위, 카메라 방향이 음수)
  visibility: number;  // 가시성 점수 (0~1, 1에 가까울수록 잘 보임)
}

/**
 * 2D 정규화 좌표 타입
 * 스켈레톤 렌더링용 (화면 좌표)
 */
export interface SkeletonPoint {
  x: number;  // 0~1 정규화 좌표 (화면 기준)
  y: number;  // 0~1 정규화 좌표 (화면 기준)
  visibility: number;  // 가시성 점수 (0~1)
}

// ============================================================
// 관절각 타입
// ============================================================

/**
 * 모든 관절각을 담는 인터페이스
 * 재활 운동 분석에 필요한 주요 관절각들
 */
export interface JointAngles {
  trunk: number;         // 몸통 기울기 (수직 기준, 도 단위)
  neck: number;          // 목 전방 각도 (거북목 측정용, 귀-어깨 수직선 기준)
  hipLeft: number;       // 왼쪽 고관절 각도 (어깨-골반-무릎)
  hipRight: number;      // 오른쪽 고관절 각도
  kneeLeft: number;      // 왼쪽 무릎 각도 (골반-무릎-발목)
  kneeRight: number;     // 오른쪽 무릎 각도
  shoulderLeft: number;  // 왼쪽 어깨 각도 (팔 외전 각도)
  shoulderRight: number; // 오른쪽 어깨 각도
}

// ============================================================
// MediaPipe 33개 관절 인덱스 상수
// ============================================================

/**
 * MediaPipe Pose 모델의 랜드마크 인덱스
 * 총 33개의 관절점을 정의합니다.
 *
 * 참고: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
 */
export const LANDMARK_INDEX = {
  // 얼굴 관절
  NOSE: 0,              // 코
  LEFT_EYE_INNER: 1,    // 왼쪽 눈 안쪽
  LEFT_EYE: 2,          // 왼쪽 눈
  LEFT_EYE_OUTER: 3,    // 왼쪽 눈 바깥쪽
  RIGHT_EYE_INNER: 4,   // 오른쪽 눈 안쪽
  RIGHT_EYE: 5,         // 오른쪽 눈
  RIGHT_EYE_OUTER: 6,   // 오른쪽 눈 바깥쪽
  LEFT_EAR: 7,          // 왼쪽 귀
  RIGHT_EAR: 8,         // 오른쪽 귀
  MOUTH_LEFT: 9,        // 입 왼쪽
  MOUTH_RIGHT: 10,      // 입 오른쪽

  // 상체 관절
  LEFT_SHOULDER: 11,    // 왼쪽 어깨
  RIGHT_SHOULDER: 12,   // 오른쪽 어깨
  LEFT_ELBOW: 13,       // 왼쪽 팔꿈치
  RIGHT_ELBOW: 14,      // 오른쪽 팔꿈치
  LEFT_WRIST: 15,       // 왼쪽 손목
  RIGHT_WRIST: 16,      // 오른쪽 손목
  LEFT_PINKY: 17,       // 왼쪽 새끼손가락
  RIGHT_PINKY: 18,      // 오른쪽 새끼손가락
  LEFT_INDEX: 19,       // 왼쪽 검지
  RIGHT_INDEX: 20,      // 오른쪽 검지
  LEFT_THUMB: 21,       // 왼쪽 엄지
  RIGHT_THUMB: 22,      // 오른쪽 엄지

  // 하체 관절
  LEFT_HIP: 23,         // 왼쪽 골반
  RIGHT_HIP: 24,        // 오른쪽 골반
  LEFT_KNEE: 25,        // 왼쪽 무릎
  RIGHT_KNEE: 26,       // 오른쪽 무릎
  LEFT_ANKLE: 27,       // 왼쪽 발목
  RIGHT_ANKLE: 28,      // 오른쪽 발목
  LEFT_HEEL: 29,        // 왼쪽 발뒤꿈치
  RIGHT_HEEL: 30,       // 오른쪽 발뒤꿈치
  LEFT_FOOT_INDEX: 31,  // 왼쪽 발가락
  RIGHT_FOOT_INDEX: 32, // 오른쪽 발가락
} as const;

/**
 * LANDMARK_INDEX의 키 타입
 */
export type LandmarkName = keyof typeof LANDMARK_INDEX;

/**
 * LANDMARK_INDEX의 값 타입 (0~32)
 */
export type LandmarkIndex = typeof LANDMARK_INDEX[LandmarkName];
