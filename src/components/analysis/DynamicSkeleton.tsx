/**
 * DynamicSkeleton 컴포넌트
 *
 * 실제 MediaPipe 좌표를 기반으로 스켈레톤을 렌더링하는 컴포넌트입니다.
 * 정규화된 좌표(0~1)를 픽셀 좌표로 변환하여 SVG로 그립니다.
 *
 * 특징:
 * - 33개 관절점을 연결선과 함께 표시
 * - 가시성(visibility)이 낮은 관절은 표시하지 않음
 * - 중앙 기준선 표시 (자세 정렬 확인용)
 * - 반응형 크기 조절 지원
 */

'use client';

import { SkeletonPoint, LANDMARK_INDEX } from '@/lib/advancedAnalysis';

// ============================================================
// 타입 정의
// ============================================================

interface Props {
  landmarks: SkeletonPoint[] | null;  // 33개 관절 좌표 (0~1 정규화)
  width?: number;                      // 컴포넌트 너비 (픽셀)
  height?: number;                     // 컴포넌트 높이 (픽셀)
  showLabels?: boolean;                // 라벨 표시 여부
  className?: string;                  // 추가 CSS 클래스
}

// ============================================================
// 스켈레톤 연결선 정의
// ============================================================

/**
 * 관절 사이의 연결선 정의
 * 각 요소는 [시작 인덱스, 끝 인덱스] 쌍입니다.
 */
const SKELETON_CONNECTIONS: [number, number][] = [
  // 얼굴 연결선
  [LANDMARK_INDEX.NOSE, LANDMARK_INDEX.LEFT_EYE],       // 코 -> 왼쪽 눈
  [LANDMARK_INDEX.NOSE, LANDMARK_INDEX.RIGHT_EYE],      // 코 -> 오른쪽 눈
  [LANDMARK_INDEX.LEFT_EYE, LANDMARK_INDEX.LEFT_EAR],   // 왼쪽 눈 -> 왼쪽 귀
  [LANDMARK_INDEX.RIGHT_EYE, LANDMARK_INDEX.RIGHT_EAR], // 오른쪽 눈 -> 오른쪽 귀

  // 몸통 연결선
  [LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.RIGHT_SHOULDER], // 양 어깨
  [LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_HIP],       // 왼쪽 어깨 -> 골반
  [LANDMARK_INDEX.RIGHT_SHOULDER, LANDMARK_INDEX.RIGHT_HIP],     // 오른쪽 어깨 -> 골반
  [LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.RIGHT_HIP],           // 양 골반

  // 왼팔 연결선
  [LANDMARK_INDEX.LEFT_SHOULDER, LANDMARK_INDEX.LEFT_ELBOW],     // 어깨 -> 팔꿈치
  [LANDMARK_INDEX.LEFT_ELBOW, LANDMARK_INDEX.LEFT_WRIST],        // 팔꿈치 -> 손목

  // 오른팔 연결선
  [LANDMARK_INDEX.RIGHT_SHOULDER, LANDMARK_INDEX.RIGHT_ELBOW],   // 어깨 -> 팔꿈치
  [LANDMARK_INDEX.RIGHT_ELBOW, LANDMARK_INDEX.RIGHT_WRIST],      // 팔꿈치 -> 손목

  // 왼다리 연결선
  [LANDMARK_INDEX.LEFT_HIP, LANDMARK_INDEX.LEFT_KNEE],           // 골반 -> 무릎
  [LANDMARK_INDEX.LEFT_KNEE, LANDMARK_INDEX.LEFT_ANKLE],         // 무릎 -> 발목

  // 오른다리 연결선
  [LANDMARK_INDEX.RIGHT_HIP, LANDMARK_INDEX.RIGHT_KNEE],         // 골반 -> 무릎
  [LANDMARK_INDEX.RIGHT_KNEE, LANDMARK_INDEX.RIGHT_ANKLE],       // 무릎 -> 발목
];

/**
 * 렌더링할 관절 인덱스 목록
 * 모든 33개 관절 중 주요 관절만 표시
 */
const VISIBLE_LANDMARKS: number[] = [
  LANDMARK_INDEX.NOSE,
  LANDMARK_INDEX.LEFT_EYE,
  LANDMARK_INDEX.RIGHT_EYE,
  LANDMARK_INDEX.LEFT_EAR,
  LANDMARK_INDEX.RIGHT_EAR,
  LANDMARK_INDEX.LEFT_SHOULDER,
  LANDMARK_INDEX.RIGHT_SHOULDER,
  LANDMARK_INDEX.LEFT_ELBOW,
  LANDMARK_INDEX.RIGHT_ELBOW,
  LANDMARK_INDEX.LEFT_WRIST,
  LANDMARK_INDEX.RIGHT_WRIST,
  LANDMARK_INDEX.LEFT_HIP,
  LANDMARK_INDEX.RIGHT_HIP,
  LANDMARK_INDEX.LEFT_KNEE,
  LANDMARK_INDEX.RIGHT_KNEE,
  LANDMARK_INDEX.LEFT_ANKLE,
  LANDMARK_INDEX.RIGHT_ANKLE,
];

// ============================================================
// 컴포넌트
// ============================================================

/**
 * DynamicSkeleton 컴포넌트
 *
 * @param landmarks - 33개 관절의 정규화된 좌표 배열
 * @param width - 컴포넌트 너비 (기본값: 144px)
 * @param height - 컴포넌트 높이 (기본값: 192px)
 * @param showLabels - "실시간" 라벨 표시 여부
 * @param className - 추가 CSS 클래스
 */
export default function DynamicSkeleton({
  landmarks,
  width = 144,
  height = 192,
  showLabels = false,
  className = '',
}: Props) {

  // ============================================================
  // 좌표 변환 함수
  // ============================================================

  /**
   * 정규화된 좌표(0~1)를 픽셀 좌표로 변환
   *
   * @param point - 정규화된 좌표 (x, y는 0~1 사이)
   * @returns 픽셀 좌표 {x, y}
   */
  const toPixel = (point: SkeletonPoint) => ({
    x: point.x * width,   // x 좌표를 너비에 맞게 변환
    y: point.y * height,  // y 좌표를 높이에 맞게 변환
  });

  // ============================================================
  // 데이터 없음 상태 렌더링
  // ============================================================

  // landmarks가 없거나 비어있으면 기본 화면 표시
  if (!landmarks || landmarks.length === 0) {
    return (
      <div
        className={`relative bg-slate-900 rounded-lg overflow-hidden ${className}`}
        style={{ width, height }}
      >
        {/* 중앙에 안내 메시지 */}
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
          데이터 없음
        </div>
      </div>
    );
  }

  // ============================================================
  // 스켈레톤 렌더링
  // ============================================================

  return (
    <div
      className={`relative bg-slate-900 rounded-lg overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* 중앙 기준선 (자세 정렬 확인용) */}
      <div
        className="absolute left-1/2 top-2 bottom-2 w-px border-l border-dashed border-red-400 opacity-50"
      />

      {/* 스켈레톤 SVG */}
      <svg className="absolute inset-0 w-full h-full">
        {/* ============================================================
            연결선 렌더링
            ============================================================ */}
        {SKELETON_CONNECTIONS.map(([startIdx, endIdx], i) => {
          // 시작점과 끝점 좌표 가져오기
          const start = landmarks[startIdx];
          const end = landmarks[endIdx];

          // 좌표가 없으면 렌더링하지 않음
          if (!start || !end) return null;

          // 가시성이 낮으면 렌더링하지 않음 (임계값: 0.5)
          if (start.visibility < 0.5 || end.visibility < 0.5) return null;

          // 픽셀 좌표로 변환
          const p1 = toPixel(start);
          const p2 = toPixel(end);

          return (
            <line
              key={`line-${i}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="#22c55e"        // 초록색 (emerald-500)
              strokeWidth="1"          // 선 두께
              strokeLinecap="round"    // 선 끝 모양
            />
          );
        })}

        {/* ============================================================
            관절 포인트 렌더링
            ============================================================ */}
        {VISIBLE_LANDMARKS.map((idx) => {
          // 관절 좌표 가져오기
          const point = landmarks[idx];

          // 좌표가 없거나 가시성이 낮으면 렌더링하지 않음
          if (!point || point.visibility < 0.5) return null;

          // 픽셀 좌표로 변환
          const p = toPixel(point);

          return (
            <circle
              key={`point-${idx}`}
              cx={p.x}
              cy={p.y}
              r="2"                    // 원 반지름 (2px)
              fill="#22c55e"           // 초록색 채우기
              stroke="#15803d"         // 진한 초록색 테두리
              strokeWidth="0.5"        // 테두리 두께
            />
          );
        })}
      </svg>

      {/* ============================================================
          라벨 표시 (선택적)
          ============================================================ */}
      {showLabels && (
        <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded">
          실시간
        </span>
      )}
    </div>
  );
}
