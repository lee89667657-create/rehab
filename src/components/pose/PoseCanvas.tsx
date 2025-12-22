/**
 * PoseCanvas.tsx
 * 포즈 오버레이 캔버스 컴포넌트
 * - MediaPipe 포즈 감지 결과를 시각화
 * - 관절 포인트 및 스켈레톤 라인 그리기
 * - 실시간 각도 및 자세 피드백 표시
 * - 카메라 피드 위에 오버레이로 렌더링
 */

'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

// ============================================================
// 타입 정의
// ============================================================

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface AngleInfo {
  name: string;
  angle: number;
  position: { x: number; y: number };
  status: 'good' | 'warning' | 'danger';
}

export interface FeedbackOverlay {
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  position?: 'top' | 'center' | 'bottom';
}

export interface PoseCanvasProps {
  /** 랜드마크 데이터 (33개) */
  landmarks?: Landmark[];
  /** 캔버스 너비 */
  width?: number;
  /** 캔버스 높이 */
  height?: number;
  /** 포인트 표시 여부 */
  showPoints?: boolean;
  /** 스켈레톤 표시 여부 */
  showSkeleton?: boolean;
  /** 각도 표시 여부 */
  showAngles?: boolean;
  /** 피드백 오버레이 */
  feedback?: FeedbackOverlay | null;
  /** 미러 모드 */
  mirror?: boolean;
  /** 포인트 색상 */
  pointColor?: string;
  /** 라인 색상 */
  lineColor?: string;
  /** 표시할 각도 목록 */
  anglesToShow?: AngleInfo[];
  /** 투명도 (0-1) */
  opacity?: number;
  /** 포즈 감지 상태 */
  isDetected?: boolean;
}

// ============================================================
// 상수
// ============================================================

/**
 * MediaPipe Pose 연결선 정의
 */
const POSE_CONNECTIONS: [number, number][] = [
  // 얼굴
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],

  // 몸통
  [11, 12],   // 어깨 연결
  [11, 23], [12, 24],  // 어깨-엉덩이
  [23, 24],   // 엉덩이 연결

  // 왼팔
  [11, 13], [13, 15],
  [15, 17], [15, 19], [15, 21],
  [17, 19],

  // 오른팔
  [12, 14], [14, 16],
  [16, 18], [16, 20], [16, 22],
  [18, 20],

  // 왼쪽 다리
  [23, 25], [25, 27],
  [27, 29], [27, 31], [29, 31],

  // 오른쪽 다리
  [24, 26], [26, 28],
  [28, 30], [28, 32], [30, 32],
];

/**
 * 주요 랜드마크 인덱스
 */
const LANDMARK_INDICES = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
};

/**
 * 부위별 색상
 */
const BODY_PART_COLORS: Record<string, string> = {
  face: '#FFB6C1',      // 연분홍
  leftArm: '#87CEEB',   // 하늘색
  rightArm: '#98FB98',  // 연두색
  torso: '#DDA0DD',     // 자주색
  leftLeg: '#F0E68C',   // 카키색
  rightLeg: '#FFA07A',  // 연어색
};

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * 세 점 사이의 각도 계산
 */
function calculateAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return Math.round(angle);
}

/**
 * 연결선이 속한 부위 반환
 */
function getBodyPart(startIdx: number, endIdx: number): string {
  // 얼굴
  if (startIdx <= 10 && endIdx <= 10) return 'face';
  // 왼팔
  if ([11, 13, 15, 17, 19, 21].includes(startIdx) && [13, 15, 17, 19, 21].includes(endIdx)) return 'leftArm';
  // 오른팔
  if ([12, 14, 16, 18, 20, 22].includes(startIdx) && [14, 16, 18, 20, 22].includes(endIdx)) return 'rightArm';
  // 왼쪽 다리
  if ([23, 25, 27, 29, 31].includes(startIdx) && [25, 27, 29, 31].includes(endIdx)) return 'leftLeg';
  // 오른쪽 다리
  if ([24, 26, 28, 30, 32].includes(startIdx) && [26, 28, 30, 32].includes(endIdx)) return 'rightLeg';
  // 몸통
  return 'torso';
}

// ============================================================
// 서브 컴포넌트: 피드백 오버레이
// ============================================================

interface FeedbackOverlayDisplayProps {
  feedback: FeedbackOverlay;
}

function FeedbackOverlayDisplay({ feedback }: FeedbackOverlayDisplayProps) {
  const bgColors = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  const positionClasses = {
    top: 'top-4',
    center: 'top-1/2 -translate-y-1/2',
    bottom: 'bottom-4',
  };

  return (
    <motion.div
      className={`absolute left-4 right-4 z-30 ${positionClasses[feedback.position || 'top']}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`${bgColors[feedback.type]} text-white px-4 py-3 rounded-xl shadow-lg text-center`}>
        <p className="font-medium text-sm">{feedback.message}</p>
      </div>
    </motion.div>
  );
}

// ============================================================
// 서브 컴포넌트: 각도 표시 배지
// ============================================================

interface AngleBadgeProps {
  angle: AngleInfo;
  canvasWidth: number;
  canvasHeight: number;
}

function AngleBadge({ angle, canvasWidth, canvasHeight }: AngleBadgeProps) {
  const x = angle.position.x * canvasWidth;
  const y = angle.position.y * canvasHeight;

  const statusColors = {
    good: 'bg-emerald-500 text-white',
    warning: 'bg-amber-500 text-white',
    danger: 'bg-red-500 text-white',
  };

  return (
    <motion.div
      className="absolute z-20"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Badge className={`${statusColors[angle.status]} text-xs font-bold shadow-md`}>
        {angle.name}: {angle.angle}°
      </Badge>
    </motion.div>
  );
}

// ============================================================
// 서브 컴포넌트: 포즈 미감지 안내
// ============================================================

function NoPoseDetected() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-black/60 backdrop-blur-sm px-6 py-4 rounded-2xl text-center">
        <div className="w-16 h-16 mx-auto mb-3 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        <p className="text-white font-medium">자세를 감지하는 중...</p>
        <p className="text-white/70 text-sm mt-1">카메라에 전신이 보이도록 해주세요</p>
      </div>
    </motion.div>
  );
}

// ============================================================
// 메인 컴포넌트
// ============================================================

export default function PoseCanvas({
  landmarks,
  width = 640,
  height = 480,
  showPoints = true,
  showSkeleton = true,
  showAngles = false,
  feedback = null,
  mirror = true,
  pointColor = '#FF0000',
  lineColor = '#00FF00',
  anglesToShow = [],
  opacity = 1,
  isDetected = true,
}: PoseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });

  // 계산된 각도 정보
  const calculatedAngles = useMemo(() => {
    if (!landmarks || landmarks.length < 33 || !showAngles) return [];

    const angles: AngleInfo[] = [];

    // 왼쪽 팔꿈치 각도
    const leftShoulder = landmarks[LANDMARK_INDICES.leftShoulder];
    const leftElbow = landmarks[LANDMARK_INDICES.leftElbow];
    const leftWrist = landmarks[LANDMARK_INDICES.leftWrist];
    if (leftShoulder.visibility > 0.5 && leftElbow.visibility > 0.5 && leftWrist.visibility > 0.5) {
      const angle = calculateAngle(leftShoulder, leftElbow, leftWrist);
      angles.push({
        name: '왼팔',
        angle,
        position: { x: leftElbow.x, y: leftElbow.y },
        status: angle >= 80 && angle <= 100 ? 'good' : angle >= 60 && angle <= 120 ? 'warning' : 'danger',
      });
    }

    // 오른쪽 팔꿈치 각도
    const rightShoulder = landmarks[LANDMARK_INDICES.rightShoulder];
    const rightElbow = landmarks[LANDMARK_INDICES.rightElbow];
    const rightWrist = landmarks[LANDMARK_INDICES.rightWrist];
    if (rightShoulder.visibility > 0.5 && rightElbow.visibility > 0.5 && rightWrist.visibility > 0.5) {
      const angle = calculateAngle(rightShoulder, rightElbow, rightWrist);
      angles.push({
        name: '오른팔',
        angle,
        position: { x: rightElbow.x, y: rightElbow.y },
        status: angle >= 80 && angle <= 100 ? 'good' : angle >= 60 && angle <= 120 ? 'warning' : 'danger',
      });
    }

    // 왼쪽 무릎 각도
    const leftHip = landmarks[LANDMARK_INDICES.leftHip];
    const leftKnee = landmarks[LANDMARK_INDICES.leftKnee];
    const leftAnkle = landmarks[LANDMARK_INDICES.leftAnkle];
    if (leftHip.visibility > 0.5 && leftKnee.visibility > 0.5 && leftAnkle.visibility > 0.5) {
      const angle = calculateAngle(leftHip, leftKnee, leftAnkle);
      angles.push({
        name: '왼무릎',
        angle,
        position: { x: leftKnee.x, y: leftKnee.y },
        status: angle >= 160 && angle <= 180 ? 'good' : angle >= 140 ? 'warning' : 'danger',
      });
    }

    // 오른쪽 무릎 각도
    const rightHip = landmarks[LANDMARK_INDICES.rightHip];
    const rightKnee = landmarks[LANDMARK_INDICES.rightKnee];
    const rightAnkle = landmarks[LANDMARK_INDICES.rightAnkle];
    if (rightHip.visibility > 0.5 && rightKnee.visibility > 0.5 && rightAnkle.visibility > 0.5) {
      const angle = calculateAngle(rightHip, rightKnee, rightAnkle);
      angles.push({
        name: '오른무릎',
        angle,
        position: { x: rightKnee.x, y: rightKnee.y },
        status: angle >= 160 && angle <= 180 ? 'good' : angle >= 140 ? 'warning' : 'danger',
      });
    }

    return angles;
  }, [landmarks, showAngles]);

  // 모든 각도 정보 (props + 계산된 값)
  const allAngles = useMemo(() => {
    return [...anglesToShow, ...calculatedAngles];
  }, [anglesToShow, calculatedAngles]);

  // 반응형 크기 조정
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: containerWidth, height: containerHeight } = entry.contentRect;
        if (containerWidth > 0 && containerHeight > 0) {
          setDimensions({
            width: containerWidth,
            height: containerHeight,
          });
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // 캔버스 그리기
  const drawPose = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 초기화
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    if (!landmarks || landmarks.length < 33) return;

    // 미러 모드 적용
    ctx.save();
    if (mirror) {
      ctx.translate(dimensions.width, 0);
      ctx.scale(-1, 1);
    }

    // 스켈레톤 그리기
    if (showSkeleton) {
      POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];

        if (start?.visibility > 0.5 && end?.visibility > 0.5) {
          const bodyPart = getBodyPart(startIdx, endIdx);
          ctx.strokeStyle = BODY_PART_COLORS[bodyPart] || lineColor;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';

          ctx.beginPath();
          ctx.moveTo(start.x * dimensions.width, start.y * dimensions.height);
          ctx.lineTo(end.x * dimensions.width, end.y * dimensions.height);
          ctx.stroke();
        }
      });
    }

    // 관절 포인트 그리기
    if (showPoints) {
      landmarks.forEach((landmark, idx) => {
        if (landmark?.visibility > 0.5) {
          const x = landmark.x * dimensions.width;
          const y = landmark.y * dimensions.height;

          // 외부 원 (그림자 효과)
          ctx.beginPath();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.arc(x, y, 7, 0, 2 * Math.PI);
          ctx.fill();

          // 내부 원
          ctx.beginPath();
          ctx.fillStyle = pointColor;
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fill();

          // 주요 관절에 하이라이트
          const mainJoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
          if (mainJoints.includes(idx)) {
            ctx.beginPath();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.arc(x, y, 8, 0, 2 * Math.PI);
            ctx.stroke();
          }
        }
      });
    }

    ctx.restore();
  }, [landmarks, dimensions, showPoints, showSkeleton, mirror, pointColor, lineColor]);

  // 애니메이션 프레임으로 캔버스 업데이트
  useEffect(() => {
    drawPose();
  }, [drawPose]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{ opacity }}
    >
      {/* 메인 캔버스 */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 10 }}
      />

      {/* 포즈 미감지 오버레이 */}
      <AnimatePresence>
        {!isDetected && <NoPoseDetected />}
      </AnimatePresence>

      {/* 각도 표시 배지 */}
      <AnimatePresence>
        {showAngles && allAngles.map((angle, idx) => (
          <AngleBadge
            key={`${angle.name}-${idx}`}
            angle={angle}
            canvasWidth={dimensions.width}
            canvasHeight={dimensions.height}
          />
        ))}
      </AnimatePresence>

      {/* 피드백 오버레이 */}
      <AnimatePresence>
        {feedback && <FeedbackOverlayDisplay feedback={feedback} />}
      </AnimatePresence>
    </div>
  );
}
