/**
 * 분석 결과 페이지 - Calm 스타일
 */

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  Dumbbell,
  AlertCircle,
  Home,
  Download,
  FileText,
  ArrowLeft,
  Target,
  Sparkles,
  Scale,
  Activity,
  LucideIcon,
  AlertTriangle,
  HeartPulse,
  Clock,
  Lightbulb,
} from 'lucide-react';
import Link from 'next/link';
import { useAnalysisResult, useCapturedImages, useJointAngles, useLandmarks } from '@/store/useStore';
import { useAuth } from '@/components/providers/AuthProvider';
import { saveAnalysisResult, type AnalysisResultRow } from '@/lib/supabase';
import type { AnalysisItem } from '@/lib/poseAnalysis';
// AppHeader는 SidebarLayout에서 처리됨
import SidebarLayout from '@/components/layout/SidebarLayout';
import { devLog } from '@/lib/logger';

// 질환 위험도 분석 모듈
import {
  analyzeDiseaseRisk,
  getRiskColorClass,
  getRiskBgClass,
  getRiskLevelLabel,
  type DiseaseRiskAnalysis,
  type DiseaseRisk,
} from '@/lib/diseaseRiskAnalysis';

// 운동 추천 모듈
import {
  recommendExercises,
  getDifficultyLabel,
  type ExerciseRecommendation,
  type ExerciseProgram,
} from '@/lib/exerciseRecommendation';

// 고급 분석 모듈 (ROM, 비대칭 분석)
import {
  type JointAngles,
  type ROMResult,
  type AsymmetryResult,
  analyzeAllROM,
  analyzeAllAsymmetry,
  calculateROMScore,
  calculateAsymmetryScore,
  getAsymmetrySummary,
} from '@/lib/advancedAnalysis';

// 고급 분석 리포트 컴포넌트 (통합 섹션으로 이동하여 현재 미사용)
// import AdvancedReport, { BalanceCard } from '@/components/analysis/AdvancedReport';

// 3D 스켈레톤 시각화 컴포넌트 (추후 사용 예정)
// import Skeleton3D from '@/components/analysis/Skeleton3D';
// import Skeleton3DModel from '@/components/analysis/Skeleton3DModel';

// shadcn/ui 컴포넌트
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// ============================================================
// 타입 정의
// ============================================================

interface ExtendedAnalysisItem extends AnalysisItem {
  detail?: string;
  recommendation?: string;
}

interface PostureType {
  name: string;
  description: string;
  features: string[];
  icon: LucideIcon;  // 이모지 대신 Lucide 아이콘 사용
}

// ============================================================
// 상수 및 매핑 데이터
// ============================================================

import { filterEnabledItems, LOWER_BODY_ANALYSIS_ENABLED } from '@/constants/features';

const itemDetails: Record<string, { detail: string; recommendation: string; bodyPart: string; normalRange: string }> = {
  forward_head: {
    detail: '귀와 어깨 사이의 거리를 측정했습니다.',
    recommendation: '거북목 운동',
    bodyPart: 'head',
    normalRange: '0 ~ 2.5cm',
  },
  shoulder_tilt: {
    detail: '어깨가 앞으로 말린 정도를 측정했습니다.',
    recommendation: '라운드숄더 운동',
    bodyPart: 'shoulder',
    normalRange: '0 ~ 1cm',
  },
  // [하체 분석 - 추후 활성화 예정] features.ts의 ANALYSIS_FEATURES로 제어
  pelvis_tilt: {
    detail: '좌우 골반 높이 차이를 측정했습니다.',
    recommendation: '골반 교정 운동',
    bodyPart: 'pelvis',
    normalRange: '0 ~ 1cm',
  },
  knee_angle: {
    detail: '무릎 각도를 측정했습니다.',
    recommendation: '하체 강화 운동',
    bodyPart: 'knee',
    normalRange: '170° ~ 180°',
  },
};

// ============================================================
// 테스트용 더미 랜드마크 데이터 (33개 관절)
// MediaPipe Pose 형식 (normalized coordinates: 0~1 범위)
// ============================================================
const DUMMY_LANDMARKS: Array<{ x: number; y: number; z: number; visibility: number }> = [
  // 0: 코 (nose)
  { x: 0.50, y: 0.15, z: -0.05, visibility: 0.99 },
  // 1: 왼쪽 눈 안쪽 (left eye inner)
  { x: 0.48, y: 0.13, z: -0.04, visibility: 0.98 },
  // 2: 왼쪽 눈 (left eye)
  { x: 0.46, y: 0.13, z: -0.03, visibility: 0.98 },
  // 3: 왼쪽 눈 바깥쪽 (left eye outer)
  { x: 0.44, y: 0.13, z: -0.02, visibility: 0.97 },
  // 4: 오른쪽 눈 안쪽 (right eye inner)
  { x: 0.52, y: 0.13, z: -0.04, visibility: 0.98 },
  // 5: 오른쪽 눈 (right eye)
  { x: 0.54, y: 0.13, z: -0.03, visibility: 0.98 },
  // 6: 오른쪽 눈 바깥쪽 (right eye outer)
  { x: 0.56, y: 0.13, z: -0.02, visibility: 0.97 },
  // 7: 왼쪽 귀 (left ear)
  { x: 0.40, y: 0.14, z: 0.02, visibility: 0.90 },
  // 8: 오른쪽 귀 (right ear)
  { x: 0.60, y: 0.14, z: 0.02, visibility: 0.90 },
  // 9: 입 왼쪽 (mouth left)
  { x: 0.47, y: 0.19, z: -0.03, visibility: 0.95 },
  // 10: 입 오른쪽 (mouth right)
  { x: 0.53, y: 0.19, z: -0.03, visibility: 0.95 },
  // 11: 왼쪽 어깨 (left shoulder)
  { x: 0.35, y: 0.28, z: 0.00, visibility: 0.99 },
  // 12: 오른쪽 어깨 (right shoulder)
  { x: 0.65, y: 0.28, z: 0.00, visibility: 0.99 },
  // 13: 왼쪽 팔꿈치 (left elbow)
  { x: 0.28, y: 0.42, z: 0.02, visibility: 0.95 },
  // 14: 오른쪽 팔꿈치 (right elbow)
  { x: 0.72, y: 0.42, z: 0.02, visibility: 0.95 },
  // 15: 왼쪽 손목 (left wrist)
  { x: 0.25, y: 0.55, z: 0.05, visibility: 0.90 },
  // 16: 오른쪽 손목 (right wrist)
  { x: 0.75, y: 0.55, z: 0.05, visibility: 0.90 },
  // 17: 왼쪽 새끼손가락 (left pinky)
  { x: 0.23, y: 0.58, z: 0.06, visibility: 0.85 },
  // 18: 오른쪽 새끼손가락 (right pinky)
  { x: 0.77, y: 0.58, z: 0.06, visibility: 0.85 },
  // 19: 왼쪽 검지 (left index)
  { x: 0.24, y: 0.59, z: 0.04, visibility: 0.85 },
  // 20: 오른쪽 검지 (right index)
  { x: 0.76, y: 0.59, z: 0.04, visibility: 0.85 },
  // 21: 왼쪽 엄지 (left thumb)
  { x: 0.26, y: 0.57, z: 0.03, visibility: 0.85 },
  // 22: 오른쪽 엄지 (right thumb)
  { x: 0.74, y: 0.57, z: 0.03, visibility: 0.85 },
  // 23: 왼쪽 골반 (left hip)
  { x: 0.40, y: 0.52, z: 0.00, visibility: 0.99 },
  // 24: 오른쪽 골반 (right hip)
  { x: 0.60, y: 0.52, z: 0.00, visibility: 0.99 },
  // 25: 왼쪽 무릎 (left knee)
  { x: 0.38, y: 0.72, z: 0.02, visibility: 0.95 },
  // 26: 오른쪽 무릎 (right knee)
  { x: 0.62, y: 0.72, z: 0.02, visibility: 0.95 },
  // 27: 왼쪽 발목 (left ankle)
  { x: 0.37, y: 0.92, z: 0.00, visibility: 0.90 },
  // 28: 오른쪽 발목 (right ankle)
  { x: 0.63, y: 0.92, z: 0.00, visibility: 0.90 },
  // 29: 왼쪽 뒤꿈치 (left heel)
  { x: 0.36, y: 0.95, z: 0.02, visibility: 0.85 },
  // 30: 오른쪽 뒤꿈치 (right heel)
  { x: 0.64, y: 0.95, z: 0.02, visibility: 0.85 },
  // 31: 왼쪽 발끝 (left foot index)
  { x: 0.35, y: 0.97, z: -0.03, visibility: 0.85 },
  // 32: 오른쪽 발끝 (right foot index)
  { x: 0.65, y: 0.97, z: -0.03, visibility: 0.85 },
];

// 측면 뷰용 더미 랜드마크 (약간 다른 z값으로 깊이감 표현)
const DUMMY_LANDMARKS_SIDE: Array<{ x: number; y: number; z: number; visibility: number }> =
  DUMMY_LANDMARKS.map((lm, idx) => {
    // 측면에서는 x 좌표를 조정하여 측면 실루엣 표현
    // 머리가 살짝 앞으로 나온 자세 (거북목 경향)
    const forwardOffset = idx <= 10 ? 0.03 : 0; // 머리 부분만 앞으로
    return {
      ...lm,
      x: 0.5 + (lm.z * 2) + forwardOffset, // z를 x로 변환하여 측면 표현
      z: -(lm.x - 0.5) * 0.5, // 원래 x를 z로 변환
      visibility: lm.visibility * 0.9, // 측면은 가시성 약간 낮음
    };
  });

// 전체 분석 항목 (하체 포함)
const ALL_DUMMY_RESULTS: ExtendedAnalysisItem[] = [
  {
    id: 'forward_head',
    name: '거북목',
    value: 3.2,
    unit: 'cm',
    grade: 'warning',
    score: 72,
    description: '머리가 약간 앞으로 나와 있어요',
  },
  {
    id: 'shoulder_tilt',
    name: '라운드숄더',
    value: 1.5,
    unit: 'cm',
    grade: 'good',
    score: 92,
    description: '어깨가 균형잡혀 있어요',
  },
  // [하체 분석 - 추후 활성화 예정] features.ts의 ANALYSIS_FEATURES로 제어
  {
    id: 'pelvis_tilt',
    name: '골반 균형',
    value: 0.8,
    unit: 'cm',
    grade: 'good',
    score: 95,
    description: '골반이 균형잡혀 있어요',
  },
  {
    id: 'knee_angle',
    name: '무릎 정렬',
    value: 165,
    unit: '°',
    grade: 'danger',
    score: 55,
    description: '무릎 정렬에 주의가 필요해요',
  },
];

// 활성화된 분석 항목만 필터링
const DUMMY_RESULTS = filterEnabledItems(ALL_DUMMY_RESULTS);

// ============================================================
// 애니메이션 설정
// ============================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// ============================================================
// 컴포넌트: 스켈레톤 정렬 시각화 (통합형 - 상세 분석 + 균형 포함)
// ============================================================

interface SkeletonAlignmentProps {
  jointAngles: JointAngles | null;
  asymmetryResults?: AsymmetryResult[];
  capturedImage?: string | null;
  sideLandmarks?: { x: number; y: number; z: number; visibility: number }[];
}

// ============================================================
// 세련된 3구간 범위 표시 바 컴포넌트
// ============================================================

interface RangeBarProps {
  value: number;
  type: 'tilt' | 'forward' | 'angle' | 'balance';
  status: 'normal' | 'warning' | 'danger';
}

function RangeBar({ value, type, status }: RangeBarProps) {
  // 마커 색상 (세련된 팔레트)
  const markerColor = status === 'danger' ? 'bg-rose-400' : status === 'warning' ? 'bg-amber-400' : 'bg-teal-400';

  // 상태 기반 마커 위치 계산
  // 바 구간: 0-20% (좌측 주의) | 20-80% (정상) | 80-100% (우측 주의)
  let markerPosition: number;

  if (type === 'tilt') {
    // 좌우 기울기 (어깨, 골반, 무릎)
    if (status === 'normal') {
      // 정상: 중앙 구간 (20-80%), 값에 따라 미세 조정
      markerPosition = 50 + (value * 3);
      markerPosition = Math.max(25, Math.min(75, markerPosition));
    } else if (value > 0) {
      // 우측으로 기울어짐: 오른쪽 구간 (80-100%)
      markerPosition = status === 'danger' ? 92 : 88;
    } else {
      // 좌측으로 기울어짐: 왼쪽 구간 (0-20%)
      markerPosition = status === 'danger' ? 8 : 12;
    }
  } else if (type === 'forward') {
    // 전방 거리 (거북목) - 정상은 왼쪽, 전방은 오른쪽
    if (status === 'normal') {
      // 정상: 왼쪽~중앙 구간 (20-50%)
      markerPosition = 25 + (value * 8);
      markerPosition = Math.max(22, Math.min(50, markerPosition));
    } else {
      // 주의/위험: 오른쪽 구간 (80-100%)
      markerPosition = status === 'danger' ? 92 : 85;
    }
  } else if (type === 'balance') {
    // 균형 - 정상은 왼쪽, 불균형은 오른쪽
    if (status === 'normal') {
      markerPosition = 25 + (value * 10);
      markerPosition = Math.max(22, Math.min(50, markerPosition));
    } else {
      markerPosition = status === 'danger' ? 92 : 85;
    }
  } else {
    // 각도 (등굽음, 허리 전만)
    // 정상 범위: 중앙, 감소: 왼쪽, 과도: 오른쪽
    if (status === 'normal') {
      // 정상: 중앙 구간
      markerPosition = 50;
    } else {
      // 등굽음: 40 이하 평평(좌), 50+ 과도(우)
      // 허리 전만: 30 미만 감소(좌), 45+ 과도(우)
      if (value < 30) {
        // 감소/평평: 왼쪽 구간
        markerPosition = status === 'danger' ? 8 : 12;
      } else {
        // 과도: 오른쪽 구간
        markerPosition = status === 'danger' ? 92 : 88;
      }
    }
  }

  markerPosition = Math.max(6, Math.min(94, markerPosition));

  return (
    <div className="relative h-2.5 rounded-full overflow-hidden flex bg-slate-700/30">
      {/* 왼쪽 주의 구간 20% */}
      <div className="h-full bg-slate-600/40" style={{ width: '20%' }} />
      {/* 중앙 정상 구간 60% */}
      <div className="h-full bg-teal-500/30" style={{ width: '60%' }} />
      {/* 오른쪽 주의 구간 20% */}
      <div className="h-full bg-slate-600/40" style={{ width: '20%' }} />

      {/* 마커 */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 ${markerColor} rounded-full border-2 border-slate-900/50 shadow-lg transition-all duration-300`}
        style={{ left: `calc(${markerPosition}% - 8px)` }}
      />
    </div>
  );
}

// ============================================================
// 분석 항목 카드 (간단 설명 포함)
// ============================================================

interface AnalysisItemRowProps {
  label: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'danger';
  description: string;
  itemType: 'shoulder' | 'hip' | 'knee' | 'neck' | 'thoracic' | 'lumbar';
}

function AnalysisItemRow({ label, value, unit, status, itemType }: AnalysisItemRowProps) {
  // 상태별 색상
  const valueColor = status === 'danger' ? 'text-rose-400' : status === 'warning' ? 'text-amber-400' : 'text-teal-400';
  const badgeBg = status === 'danger' ? 'bg-rose-500/20 text-rose-400' : status === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-teal-500/20 text-teal-400';
  const badgeText = status === 'danger' ? '위험' : status === 'warning' ? '주의' : '정상';

  // 간단 설명 생성
  const getSimpleDescription = (): string => {
    const absValue = Math.abs(value);

    switch (itemType) {
      case 'shoulder':
        if (absValue <= 2) return '균형이 잘 잡혀있어요';
        if (value > 0) return '왼쪽 어깨가 올라가 있어요';
        return '오른쪽 어깨가 올라가 있어요';
      case 'hip':
        if (absValue <= 2) return '골반이 수평이에요';
        if (value > 0) return '골반이 좌측으로 기울어져 있어요';
        return '골반이 우측으로 기울어져 있어요';
      case 'knee':
        if (absValue <= 2) return '무릎 정렬이 좋아요';
        if (value > 0) return '무릎이 좌측으로 틀어져 있어요';
        return '무릎이 우측으로 틀어져 있어요';
      case 'neck':
        if (absValue <= 2.5) return '목 위치가 정상이에요';
        return '머리가 앞으로 나와있어요';
      case 'thoracic':
        if (absValue <= 40) return '등 곡선이 정상이에요';
        return '등이 굽어있어요';
      case 'lumbar':
        if (absValue >= 30 && absValue <= 45) return '허리 곡선이 정상이에요';
        return '허리 곡선에 주의가 필요해요';
      default:
        return '';
    }
  };

  // 범위 라벨 생성
  const getRangeLabels = (): { left: string; center: string; right: string } => {
    switch (itemType) {
      case 'shoulder':
      case 'hip':
      case 'knee':
        return { left: '좌', center: '정상', right: '우' };
      case 'neck':
        return { left: '정상', center: '', right: '전방' };
      case 'thoracic':
        return { left: '평평', center: '정상', right: '과도' };
      case 'lumbar':
        return { left: '감소', center: '정상', right: '과도' };
      default:
        return { left: '', center: '', right: '' };
    }
  };

  const rangeLabels = getRangeLabels();

  // 바 타입 결정
  const barType = ['shoulder', 'hip', 'knee'].includes(itemType)
    ? 'tilt'
    : itemType === 'neck'
      ? 'forward'
      : 'angle';

  return (
    <div className="rounded-xl p-3.5 bg-slate-800/30 border border-slate-700/50 space-y-2.5">
      {/* 헤더: 항목명 + 값 | 상태 뱃지 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className={`text-base font-bold font-mono ${valueColor}`}>
            {Math.abs(value)}{unit}
          </span>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badgeBg}`}>
          {badgeText}
        </span>
      </div>

      {/* 3구간 범위 바 */}
      <RangeBar value={value} type={barType} status={status} />

      {/* 범위 라벨 */}
      <div className="flex justify-between text-[10px] text-muted-foreground -mt-1">
        <span>{rangeLabels.left}</span>
        {rangeLabels.center && <span>{rangeLabels.center}</span>}
        <span>{rangeLabels.right}</span>
      </div>

      {/* 간단 설명 */}
      <p className="text-xs text-muted-foreground">
        {getSimpleDescription()}
      </p>
    </div>
  );
}

// ============================================================
// 균형 시각화용 프로그레스 바
// ============================================================

interface AnalysisProgressBarProps {
  value: number;
  status: 'normal' | 'warning' | 'danger';
}

function AnalysisProgressBar({ value, status }: AnalysisProgressBarProps) {
  return <RangeBar value={value} type="balance" status={status} />;
}

// 균형 시각화 컴포넌트
interface BalanceVisualizationProps {
  title: string;
  percentDiff: number;
  dominantSide?: 'left' | 'right' | 'balanced';
}

function BalanceVisualization({ title, percentDiff, dominantSide }: BalanceVisualizationProps) {
  const status: 'normal' | 'warning' | 'danger' = percentDiff <= 2 ? 'normal' : percentDiff <= 5 ? 'warning' : 'danger';
  const valueColor = status === 'danger' ? 'text-rose-400' : status === 'warning' ? 'text-amber-400' : 'text-teal-400';
  const badgeBg = status === 'danger' ? 'bg-rose-500/20 text-rose-400' : status === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-teal-500/20 text-teal-400';
  const badgeText = status === 'danger' ? '불균형' : status === 'warning' ? '주의' : '균형';

  // 간단 설명
  const getDescription = (): string => {
    if (status === 'normal') return '좌우 균형이 잘 맞아요';
    const side = dominantSide === 'left' ? '좌측' : dominantSide === 'right' ? '우측' : '';
    if (status === 'warning') return side ? `${side}이 약간 우세해요` : '약간의 차이가 있어요';
    return side ? `${side}으로 많이 치우쳐 있어요` : '균형 조절이 필요해요';
  };

  return (
    <div className="rounded-xl p-3.5 bg-slate-800/30 border border-slate-700/50 space-y-2.5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{title}</span>
          <span className={`text-base font-bold font-mono ${valueColor}`}>
            {percentDiff.toFixed(1)}%
          </span>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badgeBg}`}>
          {badgeText}
        </span>
      </div>

      {/* 범위 바 */}
      <AnalysisProgressBar value={percentDiff} status={status} />

      {/* 간단 설명 */}
      <p className="text-xs text-muted-foreground">
        {getDescription()}
      </p>
    </div>
  );
}

function SkeletonAlignmentVisualization({ jointAngles, asymmetryResults, sideLandmarks }: SkeletonAlignmentProps) {
  const [frontImageError, setFrontImageError] = useState(false);
  const [sideImageError, setSideImageError] = useState(false);

  // jointAngles가 없으면 기본값 사용 (모든 각도 0)
  const angles: JointAngles = jointAngles || {
    shoulderLeft: 0,
    shoulderRight: 0,
    hipLeft: 0,
    hipRight: 0,
    kneeLeft: 0,
    kneeRight: 0,
    neck: 0,
    trunk: 0
  };

  // ===== 정면 측정값 계산 =====
  const shoulderDiff = angles.shoulderLeft - angles.shoulderRight;
  const shoulderTiltAngle = Number((shoulderDiff / 2).toFixed(1));
  const shoulderStatus: 'normal' | 'warning' | 'danger' = Math.abs(shoulderTiltAngle) <= 2 ? 'normal' : Math.abs(shoulderTiltAngle) <= 5 ? 'warning' : 'danger';

  const hipDiff = angles.hipLeft - angles.hipRight;
  const hipTiltAngle = Number((hipDiff / 5).toFixed(1));
  const hipStatus: 'normal' | 'warning' | 'danger' = Math.abs(hipTiltAngle) <= 2 ? 'normal' : Math.abs(hipTiltAngle) <= 5 ? 'warning' : 'danger';

  const kneeDiff = angles.kneeLeft - angles.kneeRight;
  const kneeTiltAngle = Number((kneeDiff / 3).toFixed(1));
  const kneeStatus: 'normal' | 'warning' | 'danger' = Math.abs(kneeTiltAngle) <= 2 ? 'normal' : Math.abs(kneeTiltAngle) <= 5 ? 'warning' : 'danger';

  // ===== 측면 측정값 계산 =====
  // 거북목 각도 (FHA: Forward Head Angle) - 귀와 어깨 수직선 기준 전방 각도
  // 0° = 정상 (귀가 어깨 바로 위), 15°+ = 거북목
  const earX = sideLandmarks?.[7]?.x ?? 0.5;
  const shoulderX = sideLandmarks?.[11]?.x ?? 0.5;
  const forwardHeadAngle = Number((Math.max(0, (earX - shoulderX)) * 100).toFixed(1)); // 전방 이동 정도를 각도로 변환
  const neckStatus: 'normal' | 'warning' | 'danger' = forwardHeadAngle <= 15 ? 'normal' : forwardHeadAngle <= 30 ? 'warning' : 'danger';

  // 허리 전만각 (Lumbar Lordosis)
  const lumbarLordosis = Number((45 - angles.trunk * 0.8).toFixed(1));
  const lumbarStatus: 'normal' | 'warning' | 'danger' = lumbarLordosis >= 30 && lumbarLordosis <= 45 ? 'normal' : lumbarLordosis >= 20 && lumbarLordosis <= 55 ? 'warning' : 'danger';

  // 무릎 신전 각도 (Knee Extension Angle) - 측면 랜드마크 기반 계산
  // 골반(23), 무릎(25), 발목(27) 좌표로 실제 각도 계산
  const hipLm = sideLandmarks?.[23];
  const kneeLm = sideLandmarks?.[25];
  const ankleLm = sideLandmarks?.[27];
  let kneeExtensionAngle = 175; // 기본값
  if (hipLm && kneeLm && ankleLm) {
    // 두 벡터의 각도 계산: 골반→무릎, 무릎→발목
    const v1 = { x: hipLm.x - kneeLm.x, y: hipLm.y - kneeLm.y };
    const v2 = { x: ankleLm.x - kneeLm.x, y: ankleLm.y - kneeLm.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    if (mag1 > 0 && mag2 > 0) {
      const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
      kneeExtensionAngle = Number((180 - Math.acos(cosAngle) * 180 / Math.PI).toFixed(1));
    }
  }
  // 175-180° = 정상, 180°+ = 과신전
  const kneeExtensionStatus: 'normal' | 'warning' | 'danger' = kneeExtensionAngle <= 180 ? 'normal' : kneeExtensionAngle <= 185 ? 'warning' : 'danger';

  // 기존 변수 호환용 (다른 곳에서 사용)
  const cvaAngle = forwardHeadAngle;
  const neckForwardDistance = forwardHeadAngle / 4; // cm 환산 근사값
  const thoracicKyphosis = Number((angles.trunk * 1.5 + 25).toFixed(1));
  const thoracicStatus: 'normal' | 'warning' | 'danger' = thoracicKyphosis <= 40 ? 'normal' : thoracicKyphosis <= 50 ? 'warning' : 'danger';

  // ===== 균형 계산 =====
  const shoulderBalance = asymmetryResults?.find(a => a.joint === '어깨');
  const frontBalancePercent = shoulderBalance?.percentDiff ?? Math.abs(shoulderTiltAngle) * 0.8;
  const frontBalanceSide = shoulderTiltAngle > 0 ? 'left' : shoulderTiltAngle < 0 ? 'right' : 'balanced';

  const sideBalancePercent = neckForwardDistance * 0.6;

  // ===== 색상 =====
  const colors = {
    normal: '#22c55e',
    warning: '#fbbf24',
    danger: '#ef4444',
    reference: '#3b82f6',
  };

  const getStatusColor = (status: string) => colors[status as keyof typeof colors] || '#6B7280';

  // ===== SVG 좌표 (180x400 이미지 기준, viewBox 100x220) =====
  const vw = 100, vh = 220;
  const cx = 50; // 중앙 정렬 (좌우 대칭)

  // 정면 좌표 (사용자 측정 기반) - 좌우 대칭
  const f = { shoulderY: 52, hipY: 88, kneeY: 130, sw: 12, hw: 9, kw: 7 };
  // 측면 좌표 (사용자 측정 기반)
  const cxSide = 42; // 측면 골격은 중앙보다 왼쪽(뒤쪽)으로 조정
  const s = { earY: 38, neckY: 44, shoulderY: 50, thoracicY: 58, lumbarY: 75, hipY: 88, kneeY: 130, ankleY: 175 };

  // 기울기 적용
  const sLeftY = f.shoulderY - shoulderTiltAngle * 1.2;
  const sRightY = f.shoulderY + shoulderTiltAngle * 1.2;
  const hLeftY = f.hipY - hipTiltAngle * 1.2;
  const hRightY = f.hipY + hipTiltAngle * 1.2;
  const kLeftY = f.kneeY - kneeTiltAngle * 1.0;
  const kRightY = f.kneeY + kneeTiltAngle * 1.0;
  const headOffset = neckForwardDistance * 2.5;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          자세 정렬 분석
        </h3>
      </div>

      <div className="p-4 space-y-6">
        {/* ==================== 정면 섹션 (에버엑스 스타일) ==================== */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            정면 · FRONT VIEW
          </p>

          <div className="flex gap-4">
            {/* 왼쪽: 정면 전신 이미지 + 마커/라인 오버레이 */}
            <div
              className="relative rounded-xl overflow-hidden border border-border/50 flex-shrink-0 bg-gradient-to-b from-slate-800 to-slate-900"
              style={{ width: '180px', height: '400px' }}
            >
              {!frontImageError && (
                <img
                  src="/images/skeleton_front1image.png"
                  alt="Front Skeleton"
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ filter: 'brightness(0.85) contrast(1.05)' }}
                  onError={() => setFrontImageError(true)}
                />
              )}

              {/* SVG 오버레이 - 깔끔한 라인 스타일 */}
              <svg viewBox={`0 0 ${vw} ${vh}`} className="absolute inset-0 w-full h-full" style={{ zIndex: 10 }}>
                {/* 중앙 기준선 */}
                <line x1={cx} y1="30" x2={cx} y2={vh - 25} stroke={colors.reference} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.25" />

                {/* ===== 어깨 좌우 기울기 ===== */}
                {/* 수평 기준선 (점선) */}
                <line x1={cx - f.sw} y1={f.shoulderY} x2={cx + f.sw} y2={f.shoulderY} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" strokeDasharray="2 1" />
                {/* 실제 어깨 라인 */}
                <line x1={cx - f.sw} y1={sLeftY} x2={cx + f.sw} y2={sRightY} stroke={getStatusColor(shoulderStatus)} strokeWidth="0.8" />
                {/* 마커 */}
                <circle cx={cx - f.sw} cy={sLeftY} r="1.5" fill={getStatusColor(shoulderStatus)} />
                <circle cx={cx + f.sw} cy={sRightY} r="1.5" fill={getStatusColor(shoulderStatus)} />

                {/* ===== 골반 좌우 기울기 ===== */}
                {/* 수평 기준선 (점선) */}
                <line x1={cx - f.hw} y1={f.hipY} x2={cx + f.hw} y2={f.hipY} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" strokeDasharray="2 1" />
                {/* 실제 골반 라인 */}
                <line x1={cx - f.hw} y1={hLeftY} x2={cx + f.hw} y2={hRightY} stroke={getStatusColor(hipStatus)} strokeWidth="0.8" />
                {/* 마커 */}
                <circle cx={cx - f.hw} cy={hLeftY} r="1.5" fill={getStatusColor(hipStatus)} />
                <circle cx={cx + f.hw} cy={hRightY} r="1.5" fill={getStatusColor(hipStatus)} />

                {/* ===== 무릎 좌우 정렬 ===== */}
                {/* 수평 기준선 (점선) */}
                <line x1={cx - f.kw} y1={f.kneeY} x2={cx + f.kw} y2={f.kneeY} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" strokeDasharray="2 1" />
                {/* 실제 무릎 라인 */}
                <line x1={cx - f.kw} y1={kLeftY} x2={cx + f.kw} y2={kRightY} stroke={getStatusColor(kneeStatus)} strokeWidth="0.8" />
                {/* 마커 */}
                <circle cx={cx - f.kw} cy={kLeftY} r="1.5" fill={getStatusColor(kneeStatus)} />
                <circle cx={cx + f.kw} cy={kRightY} r="1.5" fill={getStatusColor(kneeStatus)} />

                {/* 라벨 */}
                <text x="6" y="14" fontSize="6" fill="rgba(255,255,255,0.35)" fontWeight="500">좌</text>
                <text x={vw - 10} y="14" fontSize="6" fill="rgba(255,255,255,0.35)" fontWeight="500">우</text>
              </svg>
            </div>

            {/* 오른쪽: 부위별 분석 카드 3개 (세로 배치) */}
            <div className="flex-1 flex flex-col gap-2.5">
              {/* 어깨 기울기 카드 */}
              <div className={`rounded-lg border p-3 ${shoulderStatus === 'normal' ? 'border-teal-500/30 bg-teal-500/5' : shoulderStatus === 'warning' ? 'border-amber-500/30 bg-amber-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${shoulderStatus === 'normal' ? 'bg-teal-500/20' : shoulderStatus === 'warning' ? 'bg-amber-500/20' : 'bg-rose-500/20'}`}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={getStatusColor(shoulderStatus)} strokeWidth="2">
                      <path d="M4 12h16M4 12l4-4M4 12l4 4M20 12l-4-4M20 12l-4 4" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">어깨 기울기</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${shoulderStatus === 'normal' ? 'bg-teal-500/20 text-teal-400' : shoulderStatus === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {shoulderStatus === 'normal' ? '정상' : shoulderStatus === 'warning' ? '주의' : '위험'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-2">
                      어깨 좌우 기울기가 <span className={`font-bold ${shoulderStatus === 'normal' ? 'text-teal-400' : shoulderStatus === 'warning' ? 'text-amber-400' : 'text-rose-400'}`}>{Math.abs(shoulderTiltAngle)}°</span>로 {shoulderStatus === 'normal' ? '정상' : shoulderStatus === 'warning' ? '경미한 불균형' : '심한 불균형'} 단계입니다
                    </p>
                    {/* 게이지바 (0-10° 범위, 0-3° 정상) + 마커 */}
                    <div className="relative h-2 bg-slate-700/50 rounded-full">
                      {/* 정상 범위 배경 (0-3°) */}
                      <div className="absolute left-0 top-0 h-full rounded-l-full bg-teal-500/20" style={{ width: '30%' }} />
                      {/* 주의 범위 배경 (3-5°) */}
                      <div className="absolute left-[30%] top-0 h-full bg-amber-500/10" style={{ width: '20%' }} />
                      {/* 현재 위치 마커 */}
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md transition-all ${shoulderStatus === 'normal' ? 'bg-teal-400' : shoulderStatus === 'warning' ? 'bg-amber-400' : 'bg-rose-400'}`}
                        style={{ left: `calc(${Math.min(100, Math.max(0, Math.abs(shoulderTiltAngle) / 10 * 100))}% - 6px)` }}
                      />
                      {/* 기준선 */}
                      <div className="absolute top-0 left-[30%] w-px h-full bg-white/50" title="정상 기준 (3°)" />
                      <div className="absolute top-0 left-[50%] w-px h-full bg-white/30" title="주의 기준 (5°)" />
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
                      <span>0°</span>
                      <span className="text-teal-400/70">3°</span>
                      <span>10°</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 골반 기울기 카드 */}
              <div className={`rounded-lg border p-3 ${hipStatus === 'normal' ? 'border-teal-500/30 bg-teal-500/5' : hipStatus === 'warning' ? 'border-amber-500/30 bg-amber-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${hipStatus === 'normal' ? 'bg-teal-500/20' : hipStatus === 'warning' ? 'bg-amber-500/20' : 'bg-rose-500/20'}`}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={getStatusColor(hipStatus)} strokeWidth="2">
                      <ellipse cx="12" cy="12" rx="8" ry="4" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">골반 기울기</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${hipStatus === 'normal' ? 'bg-teal-500/20 text-teal-400' : hipStatus === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {hipStatus === 'normal' ? '정상' : hipStatus === 'warning' ? '주의' : '위험'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-2">
                      골반 좌우 기울기가 <span className={`font-bold ${hipStatus === 'normal' ? 'text-teal-400' : hipStatus === 'warning' ? 'text-amber-400' : 'text-rose-400'}`}>{Math.abs(hipTiltAngle)}°</span>로 {hipStatus === 'normal' ? '정상' : hipStatus === 'warning' ? '경미한 불균형' : '심한 불균형'} 단계입니다
                    </p>
                    {/* 게이지바 (0-10° 범위, 0-3° 정상) + 마커 */}
                    <div className="relative h-2 bg-slate-700/50 rounded-full">
                      {/* 정상 범위 배경 (0-3°) */}
                      <div className="absolute left-0 top-0 h-full rounded-l-full bg-teal-500/20" style={{ width: '30%' }} />
                      {/* 주의 범위 배경 (3-5°) */}
                      <div className="absolute left-[30%] top-0 h-full bg-amber-500/10" style={{ width: '20%' }} />
                      {/* 현재 위치 마커 */}
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md transition-all ${hipStatus === 'normal' ? 'bg-teal-400' : hipStatus === 'warning' ? 'bg-amber-400' : 'bg-rose-400'}`}
                        style={{ left: `calc(${Math.min(100, Math.max(0, Math.abs(hipTiltAngle) / 10 * 100))}% - 6px)` }}
                      />
                      {/* 기준선 */}
                      <div className="absolute top-0 left-[30%] w-px h-full bg-white/50" title="정상 기준 (3°)" />
                      <div className="absolute top-0 left-[50%] w-px h-full bg-white/30" title="주의 기준 (5°)" />
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
                      <span>0°</span>
                      <span className="text-teal-400/70">3°</span>
                      <span>10°</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 무릎 정렬 카드 */}
              <div className={`rounded-lg border p-3 ${kneeStatus === 'normal' ? 'border-teal-500/30 bg-teal-500/5' : kneeStatus === 'warning' ? 'border-amber-500/30 bg-amber-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${kneeStatus === 'normal' ? 'bg-teal-500/20' : kneeStatus === 'warning' ? 'bg-amber-500/20' : 'bg-rose-500/20'}`}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={getStatusColor(kneeStatus)} strokeWidth="2">
                      <circle cx="8" cy="12" r="3" />
                      <circle cx="16" cy="12" r="3" />
                      <line x1="11" y1="12" x2="13" y2="12" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">무릎 정렬</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${kneeStatus === 'normal' ? 'bg-teal-500/20 text-teal-400' : kneeStatus === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {kneeStatus === 'normal' ? '정상' : kneeStatus === 'warning' ? '주의' : '위험'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-2">
                      무릎 좌우 정렬이 <span className={`font-bold ${kneeStatus === 'normal' ? 'text-teal-400' : kneeStatus === 'warning' ? 'text-amber-400' : 'text-rose-400'}`}>{Math.abs(kneeTiltAngle)}°</span>로 {kneeStatus === 'normal' ? '정상' : kneeStatus === 'warning' ? '경미한 불균형' : '심한 불균형'} 단계입니다
                    </p>
                    {/* 게이지바 (0-10° 범위, 0-2° 정상) + 마커 */}
                    <div className="relative h-2 bg-slate-700/50 rounded-full">
                      {/* 정상 범위 배경 (0-2°) */}
                      <div className="absolute left-0 top-0 h-full rounded-l-full bg-teal-500/20" style={{ width: '20%' }} />
                      {/* 주의 범위 배경 (2-5°) */}
                      <div className="absolute left-[20%] top-0 h-full bg-amber-500/10" style={{ width: '30%' }} />
                      {/* 현재 위치 마커 */}
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md transition-all ${kneeStatus === 'normal' ? 'bg-teal-400' : kneeStatus === 'warning' ? 'bg-amber-400' : 'bg-rose-400'}`}
                        style={{ left: `calc(${Math.min(100, Math.max(0, Math.abs(kneeTiltAngle) / 10 * 100))}% - 6px)` }}
                      />
                      {/* 기준선 */}
                      <div className="absolute top-0 left-[20%] w-px h-full bg-white/50" title="정상 기준 (2°)" />
                      <div className="absolute top-0 left-[50%] w-px h-full bg-white/30" title="주의 기준 (5°)" />
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
                      <span>0°</span>
                      <span className="text-teal-400/70">2°</span>
                      <span>10°</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 구분선 */}
        <div className="border-t border-border/50" />

        {/* ==================== 측면 섹션 (에버엑스 스타일) ==================== */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            측면 · SIDE VIEW
          </p>

          <div className="flex gap-4">
            {/* 왼쪽: 측면 전신 이미지 + 마커/각도선 오버레이 */}
            <div
              className="relative rounded-xl overflow-hidden border border-border/50 flex-shrink-0 bg-gradient-to-b from-slate-800 to-slate-900"
              style={{ width: '180px', height: '400px' }}
            >
              {!sideImageError && (
                <img
                  src="/images/skeleton_side1image.png"
                  alt="Side Skeleton"
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{
                    filter: 'brightness(0.85) contrast(1.05)',
                    objectPosition: 'center 20%'
                  }}
                  onError={() => setSideImageError(true)}
                />
              )}

              {/* SVG 오버레이 - 깔끔한 호(arc) 스타일 */}
              <svg viewBox={`0 0 ${vw} ${vh}`} className="absolute inset-0 w-full h-full" style={{ zIndex: 10 }}>
                {/* 중앙 기준선 */}
                <line x1={cxSide} y1="30" x2={cxSide} y2={vh - 25} stroke={colors.reference} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.25" />

                {/* ===== 거북목 (귀-목-어깨) ===== */}
                {/* 수직 기준선 (점선) */}
                <line x1={cxSide} y1={s.earY} x2={cxSide} y2={s.shoulderY} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" strokeDasharray="2 1" />
                {/* 실제 목 라인 */}
                <line x1={cxSide + forwardHeadAngle * 0.25} y1={s.earY} x2={cxSide} y2={s.neckY} stroke={getStatusColor(neckStatus)} strokeWidth="0.8" />
                <line x1={cxSide} y1={s.neckY} x2={cxSide} y2={s.shoulderY} stroke={getStatusColor(neckStatus)} strokeWidth="0.8" />
                {/* 각도 호 */}
                <path
                  d={`M ${cxSide} ${s.neckY - 5} A 5 5 0 0 1 ${cxSide + Math.min(5, forwardHeadAngle * 0.12)} ${s.neckY - 4}`}
                  fill="none"
                  stroke={getStatusColor(neckStatus)}
                  strokeWidth="0.6"
                  opacity="0.8"
                />
                {/* 마커 (귀-목-어깨) */}
                <circle cx={cxSide + forwardHeadAngle * 0.25} cy={s.earY} r="1.5" fill={getStatusColor(neckStatus)} />
                <circle cx={cxSide} cy={s.neckY} r="1.5" fill={getStatusColor(neckStatus)} />
                <circle cx={cxSide} cy={s.shoulderY} r="1.5" fill={getStatusColor(neckStatus)} />

                {/* ===== 허리 전만 (어깨-허리-골반) ===== */}
                {/* 직선 기준 (점선) */}
                <line x1={cxSide} y1={s.shoulderY} x2={cxSide} y2={s.hipY} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" strokeDasharray="2 1" />
                {/* 실제 척추 라인 */}
                <line x1={cxSide} y1={s.shoulderY} x2={cxSide - 3} y2={s.lumbarY} stroke={getStatusColor(lumbarStatus)} strokeWidth="0.8" />
                <line x1={cxSide - 3} y1={s.lumbarY} x2={cxSide} y2={s.hipY} stroke={getStatusColor(lumbarStatus)} strokeWidth="0.8" />
                {/* 각도 호 */}
                <path
                  d={`M ${cxSide - 1} ${s.lumbarY - 5} A 5 5 0 0 0 ${cxSide - 1} ${s.lumbarY + 5}`}
                  fill="none"
                  stroke={getStatusColor(lumbarStatus)}
                  strokeWidth="0.6"
                  opacity="0.8"
                />
                {/* 마커 (어깨-허리-골반) */}
                <circle cx={cxSide} cy={s.shoulderY} r="1.5" fill={getStatusColor(lumbarStatus)} />
                <circle cx={cxSide - 3} cy={s.lumbarY} r="1.5" fill={getStatusColor(lumbarStatus)} />
                <circle cx={cxSide} cy={s.hipY} r="1.5" fill={getStatusColor(lumbarStatus)} />

                {/* ===== 무릎 신전 (골반-무릎-발목) ===== */}
                {/* 직선 기준 (점선) */}
                <line x1={cxSide} y1={s.hipY} x2={cxSide} y2={s.ankleY} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" strokeDasharray="2 1" />
                {/* 실제 다리 라인 */}
                <line x1={cxSide} y1={s.hipY} x2={cxSide + (kneeExtensionAngle > 180 ? 1.5 : 0)} y2={s.kneeY} stroke={getStatusColor(kneeExtensionStatus)} strokeWidth="0.8" />
                <line x1={cxSide + (kneeExtensionAngle > 180 ? 1.5 : 0)} y1={s.kneeY} x2={cxSide} y2={s.ankleY} stroke={getStatusColor(kneeExtensionStatus)} strokeWidth="0.8" />
                {/* 각도 호 */}
                <path
                  d={`M ${cxSide + 1} ${s.kneeY - 5} A 5 5 0 0 1 ${cxSide + 1} ${s.kneeY + 5}`}
                  fill="none"
                  stroke={getStatusColor(kneeExtensionStatus)}
                  strokeWidth="0.6"
                  opacity="0.8"
                />
                {/* 마커 (골반-무릎-발목) */}
                <circle cx={cxSide} cy={s.hipY} r="1.5" fill={getStatusColor(kneeExtensionStatus)} />
                <circle cx={cxSide + (kneeExtensionAngle > 180 ? 1.5 : 0)} cy={s.kneeY} r="1.5" fill={getStatusColor(kneeExtensionStatus)} />
                <circle cx={cxSide} cy={s.ankleY} r="1.5" fill={getStatusColor(kneeExtensionStatus)} />

                {/* 라벨 */}
                <text x="6" y="14" fontSize="6" fill="rgba(255,255,255,0.35)" fontWeight="500">후</text>
                <text x={vw - 10} y="14" fontSize="6" fill="rgba(255,255,255,0.35)" fontWeight="500">전</text>
              </svg>
            </div>

            {/* 오른쪽: 부위별 분석 카드 3개 (세로 배치) */}
            <div className="flex-1 flex flex-col gap-2.5">
              {/* 거북목 카드 */}
              <div className={`rounded-lg border p-3 ${neckStatus === 'normal' ? 'border-teal-500/30 bg-teal-500/5' : neckStatus === 'warning' ? 'border-amber-500/30 bg-amber-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${neckStatus === 'normal' ? 'bg-teal-500/20' : neckStatus === 'warning' ? 'bg-amber-500/20' : 'bg-rose-500/20'}`}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={getStatusColor(neckStatus)} strokeWidth="2">
                      <circle cx="12" cy="5" r="3" />
                      <path d="M12 8v4M12 12c-3 0-5 2-5 5v3h10v-3c0-3-2-5-5-5z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">거북목</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${neckStatus === 'normal' ? 'bg-teal-500/20 text-teal-400' : neckStatus === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {neckStatus === 'normal' ? '정상' : neckStatus === 'warning' ? '주의' : '위험'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-2">
                      목 전방 각도가 <span className={`font-bold ${neckStatus === 'normal' ? 'text-teal-400' : neckStatus === 'warning' ? 'text-amber-400' : 'text-rose-400'}`}>{forwardHeadAngle}°</span>로 {neckStatus === 'normal' ? '정상' : neckStatus === 'warning' ? '경미한 거북목' : '심한 거북목'} 단계입니다
                    </p>
                    {/* 각도 게이지바 (0-45° 범위, 0-15° 정상) + 마커 */}
                    <div className="relative h-2 bg-slate-700/50 rounded-full">
                      {/* 정상 범위 배경 (0-15°) */}
                      <div className="absolute left-0 top-0 h-full rounded-l-full bg-teal-500/20" style={{ width: '33%' }} />
                      {/* 주의 범위 배경 (15-30°) */}
                      <div className="absolute left-[33%] top-0 h-full bg-amber-500/10" style={{ width: '34%' }} />
                      {/* 현재 위치 마커 */}
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md transition-all ${neckStatus === 'normal' ? 'bg-teal-400' : neckStatus === 'warning' ? 'bg-amber-400' : 'bg-rose-400'}`}
                        style={{ left: `calc(${Math.min(100, Math.max(0, forwardHeadAngle / 45 * 100))}% - 6px)` }}
                      />
                      {/* 기준선 */}
                      <div className="absolute top-0 left-[33%] w-px h-full bg-white/50" title="정상 기준 (15°)" />
                      <div className="absolute top-0 left-[67%] w-px h-full bg-white/30" title="주의 기준 (30°)" />
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
                      <span>0°</span>
                      <span className="text-teal-400/70">15°</span>
                      <span>45°</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 허리 전만 카드 */}
              <div className={`rounded-lg border p-3 ${lumbarStatus === 'normal' ? 'border-teal-500/30 bg-teal-500/5' : lumbarStatus === 'warning' ? 'border-amber-500/30 bg-amber-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${lumbarStatus === 'normal' ? 'bg-teal-500/20' : lumbarStatus === 'warning' ? 'bg-amber-500/20' : 'bg-rose-500/20'}`}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={getStatusColor(lumbarStatus)} strokeWidth="2">
                      <path d="M12 2v6M12 22v-6M12 8c-2 0-4 2-4 6s2 6 4 6 4-2 4-6-2-6-4-6z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">허리 전만</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${lumbarStatus === 'normal' ? 'bg-teal-500/20 text-teal-400' : lumbarStatus === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {lumbarStatus === 'normal' ? '정상' : lumbarStatus === 'warning' ? '주의' : '위험'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-2">
                      요추 전만각이 <span className={`font-bold ${lumbarStatus === 'normal' ? 'text-teal-400' : lumbarStatus === 'warning' ? 'text-amber-400' : 'text-rose-400'}`}>{lumbarLordosis}°</span>로 {lumbarStatus === 'normal' ? '정상 범위' : lumbarLordosis > 45 ? '과전만 상태' : '평탄화 상태'}입니다
                    </p>
                    {/* 각도 게이지바 (0-60° 범위, 30-45° 정상) + 마커 */}
                    <div className="relative h-2 bg-slate-700/50 rounded-full">
                      {/* 정상 범위 배경 (30-45°) */}
                      <div className="absolute left-[50%] top-0 h-full bg-teal-500/20" style={{ width: '25%' }} />
                      {/* 현재 위치 마커 */}
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md transition-all ${lumbarStatus === 'normal' ? 'bg-teal-400' : lumbarStatus === 'warning' ? 'bg-amber-400' : 'bg-rose-400'}`}
                        style={{ left: `calc(${Math.min(100, Math.max(0, lumbarLordosis / 60 * 100))}% - 6px)` }}
                      />
                      {/* 기준선 */}
                      <div className="absolute top-0 left-[50%] w-px h-full bg-white/50" title="정상 시작 (30°)" />
                      <div className="absolute top-0 left-[75%] w-px h-full bg-white/50" title="정상 끝 (45°)" />
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
                      <span>0°</span>
                      <span className="text-teal-400/70">30-45°</span>
                      <span>60°</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 무릎 과신전 카드 */}
              <div className={`rounded-lg border p-3 ${kneeExtensionStatus === 'normal' ? 'border-teal-500/30 bg-teal-500/5' : kneeExtensionStatus === 'warning' ? 'border-amber-500/30 bg-amber-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${kneeExtensionStatus === 'normal' ? 'bg-teal-500/20' : kneeExtensionStatus === 'warning' ? 'bg-amber-500/20' : 'bg-rose-500/20'}`}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={getStatusColor(kneeExtensionStatus)} strokeWidth="2">
                      <path d="M12 2v8M12 22v-8M8 10h8M8 14h8" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">무릎 과신전</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${kneeExtensionStatus === 'normal' ? 'bg-teal-500/20 text-teal-400' : kneeExtensionStatus === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {kneeExtensionStatus === 'normal' ? '정상' : kneeExtensionStatus === 'warning' ? '주의' : '위험'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-2">
                      무릎 신전 각도가 <span className={`font-bold ${kneeExtensionStatus === 'normal' ? 'text-teal-400' : kneeExtensionStatus === 'warning' ? 'text-amber-400' : 'text-rose-400'}`}>{kneeExtensionAngle}°</span>로 {kneeExtensionStatus === 'normal' ? '정상 범위' : '과신전 상태'}입니다
                    </p>
                    {/* 각도 게이지바 (170-190° 범위, 175-180° 정상) + 마커 */}
                    <div className="relative h-2 bg-slate-700/50 rounded-full">
                      {/* 정상 범위 배경 (175-180°) */}
                      <div className="absolute left-[25%] top-0 h-full bg-teal-500/20" style={{ width: '25%' }} />
                      {/* 과신전 범위 배경 (180°+) */}
                      <div className="absolute left-[50%] top-0 h-full rounded-r-full bg-rose-500/10" style={{ width: '50%' }} />
                      {/* 현재 위치 마커 */}
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md transition-all ${kneeExtensionStatus === 'normal' ? 'bg-teal-400' : kneeExtensionStatus === 'warning' ? 'bg-amber-400' : 'bg-rose-400'}`}
                        style={{ left: `calc(${Math.min(100, Math.max(0, (kneeExtensionAngle - 170) / 20 * 100))}% - 6px)` }}
                      />
                      {/* 기준선 */}
                      <div className="absolute top-0 left-[25%] w-px h-full bg-white/50" title="정상 시작 (175°)" />
                      <div className="absolute top-0 left-[50%] w-px h-full bg-white/50" title="과신전 기준 (180°)" />
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
                      <span>170°</span>
                      <span className="text-teal-400/70">175-180°</span>
                      <span>190°</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex items-center justify-center gap-6 pt-2 text-[10px] text-muted-foreground border-t border-border/30 mt-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.normal }}></span>정상
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.warning }}></span>주의
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.danger }}></span>위험
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 컴포넌트: 질환 위험도 카드 (추후 사용 예정)
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _DiseaseRiskCard({
  disease,
  isExpanded,
  onToggle,
}: {
  disease: DiseaseRisk;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const riskColorClass = getRiskColorClass(disease.level);
  const riskBgClass = getRiskBgClass(disease.level);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-4 flex items-center gap-3 text-left transition-colors hover:bg-muted/50"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          disease.level === 'low' ? 'bg-emerald-500/20' :
          disease.level === 'medium' ? 'bg-yellow-500/20' :
          disease.level === 'high' ? 'bg-orange-500/20' : 'bg-red-500/20'
        }`}>
          <HeartPulse className={`w-5 h-5 ${riskColorClass}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground">{disease.name}</p>
            <Badge variant={
              disease.level === 'low' ? 'default' :
              disease.level === 'medium' ? 'secondary' :
              'destructive'
            } className="text-[10px]">
              {getRiskLevelLabel(disease.level)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">
            {disease.description}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-lg font-bold ${riskColorClass}`}>
            {disease.risk}%
          </span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0 pb-4 border-t">
              {/* 위험도 바 */}
              <div className="py-3">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${riskBgClass}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${disease.risk}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* 주요 증상 */}
              <div className="mb-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  주요 증상
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {disease.symptoms.map((symptom, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {symptom}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 원인 */}
              <div className="mb-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" />
                  주요 원인
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {disease.causes.map((cause, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {cause}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 관련 부위 */}
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold">관련 부위:</span>{' '}
                  {disease.relatedParts.join(', ')}
                </p>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ============================================================
// 컴포넌트: 운동 프로그램 카드 (추후 사용 예정)
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _ExerciseProgramCard({
  program,
  isPrimary = false,
}: {
  program: ExerciseProgram;
  isPrimary?: boolean;
}) {
  return (
    <Card className={isPrimary ? 'border-primary/50 bg-primary/5' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isPrimary ? 'bg-primary' : 'bg-muted'
          }`}>
            <Dumbbell className={`w-5 h-5 ${isPrimary ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-foreground">{program.name}</h4>
              {isPrimary && (
                <Badge variant="default" className="text-[10px]">추천</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {program.targetDisease} | {program.frequency}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {program.duration}분
              </span>
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                {getDifficultyLabel(program.difficulty)}
              </span>
              <span>{program.exercises.length}개 운동</span>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <Button
            asChild
            size="sm"
            variant={isPrimary ? 'default' : 'outline'}
            className="w-full"
          >
            <Link href={`/exercise?program=${program.id}`}>
              시작하기
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// 컴포넌트: 자세 유형 카드 (추후 사용 예정)
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _PostureTypeCard({ postureType }: { postureType: PostureType }) {
  // 아이콘 컴포넌트
  const PostureIcon = postureType.icon;

  return (
    <motion.section variants={itemVariants} className="mb-5">
      <Card className="bg-primary text-primary-foreground border-0">
        <CardContent className="p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            {/* 타겟 아이콘 (이모지 대신 Lucide 아이콘) */}
            <Target className="w-5 h-5" />
            자세 유형 분석
          </h3>

          <div className="flex items-center gap-4">
            {/* 자세 유형 아이콘 (이모지 대신 Lucide 아이콘) */}
            <div className="w-16 h-16 bg-primary-foreground/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <PostureIcon className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xl font-bold mb-1">{postureType.name}</p>
              <p className="text-sm opacity-80">{postureType.description}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {postureType.features.map((feature, idx) => (
              <Badge key={idx} variant="secondary" className="bg-primary-foreground/10 text-primary-foreground border-0 justify-start">
                {feature}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}

// ============================================================
// 컴포넌트: 인체도 (추후 사용 예정)
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _BodyDiagram({ items }: { items: AnalysisItem[] }) {
  const getPartColor = (partId: string) => {
    const item = items.find((i) => itemDetails[i.id]?.bodyPart === partId || i.id.includes(partId));
    if (!item) return 'hsl(var(--muted))';
    if (item.grade === 'good') return 'hsl(142, 76%, 36%)';
    if (item.grade === 'warning') return 'hsl(38, 92%, 50%)';
    return 'hsl(0, 84%, 60%)';
  };

  return (
    <svg viewBox="0 0 100 200" className="w-full h-full" fill="none">
      <motion.ellipse
        cx="50" cy="22" rx="14" ry="16"
        fill={getPartColor('head')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      />
      <rect x="46" y="38" width="8" height="10" fill="hsl(var(--muted))" rx="2" />
      <motion.path
        d="M 25 50 L 30 50 L 30 95 L 70 95 L 70 50 L 75 50 L 75 55 L 72 100 L 28 100 L 25 55 Z"
        fill={getPartColor('shoulder')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      />
      <motion.path
        d="M 30 100 L 32 115 L 68 115 L 70 100 Z"
        fill={getPartColor('pelvis')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      />
      <path d="M 25 50 L 15 85 L 10 115 L 15 117 L 22 90 L 28 55 Z" fill="hsl(var(--muted))" />
      <path d="M 75 50 L 85 85 L 90 115 L 85 117 L 78 90 L 72 55 Z" fill="hsl(var(--muted))" />
      <motion.path
        d="M 35 115 L 32 160 L 28 195 L 38 195 L 42 160 L 45 115 Z"
        fill={getPartColor('knee')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      />
      <motion.path
        d="M 55 115 L 58 160 L 62 195 L 72 195 L 68 160 L 65 115 Z"
        fill={getPartColor('knee')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      />
    </svg>
  );
}

// ============================================================
// 컴포넌트: 분석 항목 카드
// ============================================================

function AnalysisItemCard({
  item,
  isOpen,
  onToggle,
  index = 0,
}: {
  item: AnalysisItem | ExtendedAnalysisItem;
  isOpen: boolean;
  onToggle: () => void;
  index?: number;
}) {
  const detail = (item as ExtendedAnalysisItem).detail || itemDetails[item.id]?.detail || item.description;
  const recommendation = (item as ExtendedAnalysisItem).recommendation || itemDetails[item.id]?.recommendation || '맞춤 운동';
  const scoreValue = item.score || (item.grade === 'good' ? 90 : item.grade === 'warning' ? 60 : 30);

  const badgeVariant = item.grade === 'good' ? 'default' : item.grade === 'warning' ? 'secondary' : 'destructive';
  const badgeLabel = item.grade === 'good' ? '정상' : item.grade === 'warning' ? '주의' : '위험';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: index * 0.08 }}
    >
      <Card className="overflow-hidden">
        <button
          onClick={onToggle}
          className="w-full px-4 py-4 flex items-center gap-3 text-left transition-colors hover:bg-muted/50"
        >
          <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
            ${item.grade === 'good' ? 'bg-green-500/20' : item.grade === 'warning' ? 'bg-amber-500/20' : 'bg-red-500/20'}
          `}>
            <div className={`w-3 h-3 rounded-full ${item.grade === 'good' ? 'bg-green-500/100' : item.grade === 'warning' ? 'bg-amber-500/100' : 'bg-red-500/100'}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground">{item.name}</p>
              <Badge variant={badgeVariant} className="text-[10px]">
                {badgeLabel}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {item.description}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm font-semibold text-foreground">
              {item.value}{item.unit}
            </span>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            </motion.div>
          </div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="pt-0 pb-4 border-t">
                <div className="py-3">
                  <Progress value={scoreValue} className="h-2" />
                </div>

                <div className={`rounded-xl p-3 mb-3 ${item.grade === 'good' ? 'bg-green-500/10' : item.grade === 'warning' ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
                  <p className="text-sm text-foreground leading-relaxed">
                    {detail}
                  </p>
                </div>

                <Button asChild size="sm">
                  <Link href={`/exercise?type=${item.id}`}>
                    <Dumbbell className="w-4 h-4 mr-1" />
                    {recommendation} 시작하기
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ============================================================
// 컴포넌트: 자세 유형 진단 카드
// ============================================================

interface PostureTypeDiagnosisProps {
  score: number;
  results: ExtendedAnalysisItem[];
  measurements?: {
    neckForwardDistance: number;
    shoulderTiltAngle: number;
    hipTiltAngle: number;
    kneeTiltAngle: number;
  };
}

function PostureTypeDiagnosisCard({ score, results, measurements }: PostureTypeDiagnosisProps) {
  // 자세 유형 판단
  const getPostureType = () => {
    const forwardHead = results.find(r => r.id === 'forward_head');
    const shoulderTilt = results.find(r => r.id === 'shoulder_tilt');
    const pelvisTilt = results.find(r => r.id === 'pelvis_tilt');
    const kneeAngle = results.find(r => r.id === 'knee_angle');

    // 측정값 기반 grade 계산 함수
    const getGradeFromMeasurement = (value: number, normalMax: number, warningMax: number): 'good' | 'warning' | 'danger' => {
      if (Math.abs(value) <= normalMax) return 'good';
      if (Math.abs(value) <= warningMax) return 'warning';
      return 'danger';
    };

    // 실시간 측정값 기반 grade (measurements가 있으면 사용, 없으면 results 사용)
    const forwardHeadGrade = measurements
      ? getGradeFromMeasurement(measurements.neckForwardDistance, 2.5, 5)
      : forwardHead?.grade || 'good';

    const shoulderGrade = measurements
      ? getGradeFromMeasurement(measurements.shoulderTiltAngle, 2, 5)
      : shoulderTilt?.grade || 'good';

    const pelvisGrade = measurements
      ? getGradeFromMeasurement(measurements.hipTiltAngle, 2, 5)
      : pelvisTilt?.grade || 'good';

    const kneeGrade = measurements
      ? getGradeFromMeasurement(measurements.kneeTiltAngle, 2, 5)
      : kneeAngle?.grade || 'good';

    // features 배열 동적 생성
    const getFeatureText = (label: string, grade?: string) => {
      const status = grade === 'danger' ? '위험' : grade === 'warning' ? '주의' : '정상';
      return `${label} ${status}`;
    };

    const features = [
      getFeatureText('거북목', forwardHeadGrade),
      getFeatureText('어깨 균형', shoulderGrade),
      getFeatureText('골반 균형', pelvisGrade),
      getFeatureText('무릎 정렬', kneeGrade),
    ];

    // danger 상태 우선 체크
    if (forwardHeadGrade === 'danger') {
      return {
        name: '거북목 위험',
        description: '머리가 어깨보다 상당히 앞으로 나와 목과 어깨에 큰 부담이 가는 자세입니다.',
        severity: 'danger' as const,
        features,
      };
    }
    if (shoulderGrade === 'danger') {
      return {
        name: '어깨 불균형 위험',
        description: '어깨가 심하게 틀어져 있어 등과 목에 부담이 가는 자세입니다.',
        severity: 'danger' as const,
        features,
      };
    }

    // warning 상태 체크
    if (forwardHeadGrade === 'warning') {
      return {
        name: '경미한 거북목',
        description: '머리가 어깨보다 앞으로 나와 목에 부담이 가는 자세입니다.',
        severity: 'warning' as const,
        features,
      };
    }
    if (shoulderGrade === 'warning') {
      return {
        name: '어깨 불균형 주의',
        description: '어깨가 약간 틀어져 있어 주의가 필요합니다.',
        severity: 'warning' as const,
        features,
      };
    }

    // 모두 정상
    return {
      name: '정상 자세',
      description: '전반적으로 균형 잡힌 좋은 자세를 유지하고 있습니다.',
      severity: 'normal' as const,
      features,
    };
  };

  const postureType = getPostureType();

  // 점수에 따른 원형 그래프 색상
  const getScoreColor = () => {
    if (score >= 80) return { stroke: '#14b8a6', bg: 'text-teal-400' }; // teal
    if (score >= 60) return { stroke: '#f59e0b', bg: 'text-amber-400' }; // amber
    return { stroke: '#f43f5e', bg: 'text-rose-400' }; // rose
  };

  const scoreColor = getScoreColor();

  // SVG 원형 프로그레스 계산
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // 상태 뱃지 색상
  const getBadgeStyle = (grade: string) => {
    if (grade === 'good') return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
    if (grade === 'warning') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  };

  const getBadgeText = (grade: string) => {
    if (grade === 'good') return '정상';
    if (grade === 'warning') return '주의';
    return '위험';
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-5">
        {/* 왼쪽: 원형 점수 그래프 */}
        <div className="relative flex-shrink-0">
          <svg width="100" height="100" className="transform -rotate-90">
            {/* 배경 원 */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-slate-700/30"
            />
            {/* 프로그레스 원 */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={scoreColor.stroke}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          {/* 중앙 점수 텍스트 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${scoreColor.bg}`}>{score}</span>
            <span className="text-[10px] text-muted-foreground">/ 100</span>
          </div>
        </div>

        {/* 오른쪽: 자세 유형 정보 */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1">당신의 자세 유형</p>
          <h3 className={`text-xl font-bold mb-1 ${
            postureType.severity === 'danger' ? 'text-rose-400' :
            postureType.severity === 'warning' ? 'text-amber-400' : 'text-teal-400'
          }`}>
            {postureType.name}
          </h3>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {postureType.description}
          </p>

          {/* 상태 뱃지들 */}
          <div className="flex flex-wrap gap-1.5">
            {results.map((item) => (
              <span
                key={item.id}
                className={`text-[10px] px-2 py-0.5 rounded-full border ${getBadgeStyle(item.grade)}`}
              >
                {item.name} {getBadgeText(item.grade)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 메인 컴포넌트: ResultPage
// ============================================================

export default function ResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const analysisResult = useAnalysisResult();
  const capturedImages = useCapturedImages();
  const storedJointAngles = useJointAngles();
  const storedLandmarks = useLandmarks();

  const [openItemId, setOpenItemId] = useState<string | null>(null);
  // 3D 스켈레톤 뷰 전환 상태 (추후 사용 예정)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [skeleton3DView, setSkeleton3DView] = useState<'front' | 'side'>('front');
  // 3D 모델 모드 토글 (추후 사용 예정)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [use3DModel, setUse3DModel] = useState<boolean>(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isSaved, setIsSaved] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isSaving, setIsSaving] = useState(false);

  // 아코디언 상태 (기본 접힘)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isSkeletonOpen, setIsSkeletonOpen] = useState(false);
  // 통합 섹션으로 이동하여 미사용
  // const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  // const [isBalanceOpen, setIsBalanceOpen] = useState(false);
  // const [isDetailedOpen, setIsDetailedOpen] = useState(false);
  const hasSavedRef = useRef(false);

  const [isFromHistory, setIsFromHistory] = useState(false);
  const [historyRecord, setHistoryRecord] = useState<AnalysisResultRow | null>(null);
  const [localHistoryRecord, setLocalHistoryRecord] = useState<{
    id: string;
    date: string;
    score: number;
    postureType?: string | null;
    capturedImages?: {
      front: string | null;
      side: string | null;
      back?: string | null; // 하위호환용 (기존 데이터)
    };
    landmarks?: Record<string, unknown>;
    items?: ExtendedAnalysisItem[];
  } | null>(null);

  // 기록에서 온 경우 데이터 로드
  useEffect(() => {
    const fromHistory = searchParams.get('from') === 'history';

    if (fromHistory) {
      setIsFromHistory(true);
      setIsSaved(true);
      try {
        const viewing = localStorage.getItem('viewingRecord');
        if (viewing) {
          const record = JSON.parse(viewing);
          // Supabase 기록인지 localStorage 기록인지 구분
          if (record.created_at) {
            // Supabase 기록
            setHistoryRecord(record as AnalysisResultRow);
          } else if (record.date) {
            // localStorage 기록
            setLocalHistoryRecord(record);
          }
        }
      } catch (error) {
        console.error('Failed to load history record:', error);
      }
    }
  }, [searchParams]);

  // 기록에서 온 경우 변환된 결과 사용
  const historyResults: ExtendedAnalysisItem[] = useMemo(() => {
    // Supabase 기록인 경우
    if (historyRecord) {
      const allItems: ExtendedAnalysisItem[] = [
        {
          id: 'forward_head',
          name: '거북목',
          value: Math.round((100 - historyRecord.head_forward) / 10),
          unit: 'cm',
          grade: historyRecord.head_forward >= 80 ? 'good' : historyRecord.head_forward >= 60 ? 'warning' : 'danger',
          score: historyRecord.head_forward,
          description: historyRecord.head_forward >= 80 ? '정상 범위입니다' : '주의가 필요합니다',
        },
        {
          id: 'shoulder_tilt',
          name: '라운드숄더',
          value: Math.round((100 - historyRecord.shoulder_balance) / 20),
          unit: 'cm',
          grade: historyRecord.shoulder_balance >= 80 ? 'good' : historyRecord.shoulder_balance >= 60 ? 'warning' : 'danger',
          score: historyRecord.shoulder_balance,
          description: historyRecord.shoulder_balance >= 80 ? '균형이 좋습니다' : '주의가 필요합니다',
        },
        // [하체 분석 - 추후 활성화 예정] features.ts의 ANALYSIS_FEATURES로 제어
        {
          id: 'pelvis_tilt',
          name: '골반 균형',
          value: Math.round((100 - historyRecord.pelvic_tilt) / 20),
          unit: 'cm',
          grade: historyRecord.pelvic_tilt >= 80 ? 'good' : historyRecord.pelvic_tilt >= 60 ? 'warning' : 'danger',
          score: historyRecord.pelvic_tilt,
          description: historyRecord.pelvic_tilt >= 80 ? '균형이 좋습니다' : '주의가 필요합니다',
        },
        {
          id: 'knee_angle',
          name: '무릎 정렬',
          value: 170 + Math.round(historyRecord.knee_alignment / 10),
          unit: '°',
          grade: historyRecord.knee_alignment >= 80 ? 'good' : historyRecord.knee_alignment >= 60 ? 'warning' : 'danger',
          score: historyRecord.knee_alignment,
          description: historyRecord.knee_alignment >= 80 ? '정렬이 좋습니다' : '주의가 필요합니다',
        },
      ];
      // 활성화된 분석 항목만 필터링
      return filterEnabledItems(allItems);
    }
    // localStorage 기록인 경우 - 활성화된 항목만 필터링
    if (localHistoryRecord?.items) {
      return filterEnabledItems(localHistoryRecord.items as ExtendedAnalysisItem[]);
    }
    return [];
  }, [historyRecord, localHistoryRecord]);

  const results = isFromHistory && (historyRecord || localHistoryRecord)
    ? historyResults
    : (analysisResult?.items || DUMMY_RESULTS);
  const overallScore = isFromHistory
    ? (historyRecord?.overall_score ?? localHistoryRecord?.score ?? 72)
    : (analysisResult?.overallScore || 72);

  // 기록 조회 시 이미지는 기록에서 가져오기 (추후 사용 예정)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const displayImages = useMemo(() => {
    if (isFromHistory && localHistoryRecord?.capturedImages) {
      return localHistoryRecord.capturedImages;
    }
    return capturedImages;
  }, [isFromHistory, localHistoryRecord, capturedImages]);

  // 3D 스켈레톤용 랜드마크 데이터
  // ============================================================
  // 랜드마크 데이터 소스 결정
  // ============================================================
  // 우선순위:
  // 1. 히스토리에서 온 경우: localHistoryRecord.landmarks 사용
  // 2. 새 분석인 경우: store의 storedLandmarks 사용
  // 3. 데이터 없는 경우: 테스트용 더미 데이터 사용

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { displayLandmarks } = useMemo(() => {
    // 1. 히스토리에서 온 경우
    if (isFromHistory && localHistoryRecord?.landmarks) {
      const lm = localHistoryRecord.landmarks as {
        front?: Array<{ x: number; y: number; z: number; visibility: number }> | null;
        side?: Array<{ x: number; y: number; z: number; visibility: number }> | null;
        back?: Array<{ x: number; y: number; z: number; visibility: number }> | null;
      };

      // 디버깅 로그 (개발 모드 전용)
      devLog('[Skeleton3D] Data source: HISTORY');
      devLog('[Skeleton3D] Front landmarks:', lm.front?.length || 0, 'points');
      devLog('[Skeleton3D] Side landmarks:', lm.side?.length || 0, 'points');

      return {
        displayLandmarks: {
          front: lm.front || null,
          side: lm.side || null,
        },
      };
    }

    // 2. store에 저장된 랜드마크가 있는 경우 (실시간 촬영 데이터)
    if (storedLandmarks.front || storedLandmarks.side) {
      return {
        displayLandmarks: storedLandmarks,
      };
    }

    // 3. 데이터가 없는 경우 테스트용 더미 데이터 반환
    return {
      displayLandmarks: {
        front: DUMMY_LANDMARKS,
        side: DUMMY_LANDMARKS_SIDE,
      },
    };
  }, [isFromHistory, localHistoryRecord, storedLandmarks]);

  // 질환 위험도 분석
  const diseaseRiskAnalysis = useMemo((): DiseaseRiskAnalysis => {
    return analyzeDiseaseRisk(results);
  }, [results]);

  // 운동 프로그램 추천
  const exerciseRecommendation = useMemo((): ExerciseRecommendation => {
    return recommendExercises(diseaseRiskAnalysis);
  }, [diseaseRiskAnalysis]);

  // ============================================================
  // 고급 분석 데이터 (ROM, 비대칭)
  // ============================================================

  /**
   * 관절각 데이터
   * 1순위: store에 저장된 실제 계산값 (analyze 페이지에서 계산)
   * 2순위: 기존 분석 결과에서 추정값 생성 (히스토리 조회 시)
   */
  const jointAngles = useMemo((): JointAngles | null => {
    // 1순위: store에 저장된 실제 관절각 데이터
    if (storedJointAngles && !isFromHistory) {
      return storedJointAngles;
    }

    // 2순위: localHistoryRecord에 landmarks가 있으면 계산
    // TODO: landmarks에서 jointAngles 재계산 구현

    // 3순위: 분석 결과에서 추정값 생성 (히스토리 조회 시 폴백)
    if (results && results.length > 0) {
      const headItem = results.find((i) => i.id === 'forward_head');
      const shoulderItem = results.find((i) => i.id === 'shoulder_tilt');
      const pelvisItem = results.find((i) => i.id === 'pelvis_tilt');
      const kneeItem = results.find((i) => i.id === 'knee_angle');

      // 분석 결과에서 관절각 추정
      return {
        neck: headItem ? Math.min(30, Math.max(0, headItem.value * 3)) : 15,
        trunk: headItem ? Math.min(25, Math.max(0, headItem.value * 2)) : 8,
        hipLeft: 175 - (pelvisItem?.value || 0) * 2,
        hipRight: 175 + (pelvisItem?.value || 0) * 2,
        kneeLeft: kneeItem?.value || 175,
        kneeRight: (kneeItem?.value || 175) - 2,
        shoulderLeft: 20 + (shoulderItem?.value || 0) * 5,
        shoulderRight: 20 - (shoulderItem?.value || 0) * 5,
      };
    }

    return null;
  }, [storedJointAngles, isFromHistory, results]);

  /**
   * 좌우 비대칭 분석 결과 (통합 섹션에서 사용)
   */
  const asymmetryResults = useMemo((): AsymmetryResult[] => {
    if (!jointAngles) return [];
    return analyzeAllAsymmetry(jointAngles);
  }, [jointAngles]);

  /**
   * 자세 유형 진단을 위한 측정값 계산
   */
  const postureMeasurements = useMemo(() => {
    const side = storedLandmarks?.side;

    // FHP 거리 (cm) - 랜드마크 기반 우선
    const neckForwardDistance = side
      ? Number((Math.abs((side[7]?.x ?? 0.5) - (side[11]?.x ?? 0.5)) * 40).toFixed(1))
      : jointAngles ? Number((jointAngles.neck * 0.3).toFixed(1)) : 2.0;

    // 어깨 기울기 (°)
    const shoulderTiltAngle = jointAngles
      ? Number(((jointAngles.shoulderLeft - jointAngles.shoulderRight) / 2).toFixed(1))
      : 0;

    // 골반 기울기 (°)
    const hipTiltAngle = jointAngles
      ? Number(((jointAngles.hipLeft - jointAngles.hipRight) / 5).toFixed(1))
      : 0;

    // 무릎 기울기 (°)
    const kneeTiltAngle = jointAngles
      ? Number(((jointAngles.kneeLeft - jointAngles.kneeRight) / 3).toFixed(1))
      : 0;

    return { neckForwardDistance, shoulderTiltAngle, hipTiltAngle, kneeTiltAngle };
  }, [jointAngles, storedLandmarks]);

  // ROM 분석 및 점수/요약은 통합 섹션으로 이동하여 미사용
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _romResults = useMemo((): ROMResult[] => {
    if (!jointAngles) return [];
    return analyzeAllROM(jointAngles);
  }, [jointAngles]);

  // 분석 결과 저장 (Supabase)
  // ============================================================
  // 중복 저장 방지:
  // 1. hasSavedRef로 컴포넌트 내 중복 호출 방지
  // 2. sessionStorage로 같은 분석 결과 재저장 방지 (브라우저 탭 내)
  // 3. isFromHistory로 기록 조회 시 저장 방지
  // ============================================================
  useEffect(() => {
    const saveResult = async () => {
      // 기본 조건 체크
      if (!user || !analysisResult || isFromHistory) return;
      
      // 이미 저장된 경우 스킵 (ref 체크)
      if (hasSavedRef.current) return;
      
      // 같은 분석 결과 중복 저장 방지 (analyzedAt을 키로 사용)
      const saveKey = `saved_analysis_${analysisResult.analyzedAt}`;
      if (sessionStorage.getItem(saveKey)) {
        devLog('[Result] 이미 저장된 분석 결과, 스킵:', analysisResult.analyzedAt);
        setIsSaved(true);
        return;
      }

      hasSavedRef.current = true;
      setIsSaving(true);

      try {
        const getItemScore = (id: string) =>
          analysisResult.items.find((item) => item.id === id)?.score || 0;

        await saveAnalysisResult(user.id, {
          overall_score: analysisResult.overallScore,
          head_forward: getItemScore('forward_head'),
          shoulder_balance: getItemScore('shoulder_tilt'),
          pelvic_tilt: getItemScore('pelvis_tilt'),
          knee_alignment: getItemScore('knee_angle'),
          primary_issue: analysisResult.items.find((item) => item.grade === 'danger')?.id || null,
          recommendations: analysisResult.items.filter((item) => item.grade !== 'good').map((item) => item.id),
          pose_data: { analyzedAt: analysisResult.analyzedAt },
        });

        // 저장 완료 표시 (sessionStorage)
        sessionStorage.setItem(saveKey, 'true');
        setIsSaved(true);
        devLog('[Result] 분석 결과 저장 완료:', analysisResult.analyzedAt);
      } catch (error) {
        console.error('분석 결과 저장 실패:', error);
        // 저장 실패 시 ref 리셋 (재시도 가능하도록)
        hasSavedRef.current = false;
      } finally {
        setIsSaving(false);
      }
    };

    saveResult();
  }, [user, analysisResult, isFromHistory]);

  // 자세 유형 분류 (추후 사용 예정)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _postureType = useMemo((): PostureType => {
    const headItem = results.find(i => i.id === 'forward_head');
    const shoulderItem = results.find(i => i.id === 'shoulder_tilt');
    const kneeItem = results.find(i => i.id === 'knee_angle');

    // 거북목 자세 - AlertCircle 아이콘
    if (headItem && headItem.value > 3) {
      return {
        name: '거북목 자세',
        description: '머리가 앞으로 나와 있는 자세입니다.',
        features: ['목 통증 유발 가능', '어깨 긴장', '두통 원인', '집중력 저하'],
        icon: AlertCircle,
      };
    }

    // 라운드숄더/불균형 자세 - Scale 아이콘
    if (shoulderItem && shoulderItem.value > 2) {
      return {
        name: '라운드숄더',
        description: '어깨가 앞으로 말린 자세입니다.',
        features: ['어깨 전방 이동', '등 상부 긴장', '가슴 근육 단축', '호흡 제한 가능'],
        icon: Scale,
      };
    }

    // [하체 분석 - 추후 활성화 예정] O다리 경향 - Activity 아이콘
    if (LOWER_BODY_ANALYSIS_ENABLED && kneeItem && kneeItem.value < 170) {
      return {
        name: 'O다리 경향',
        description: '무릎이 바깥쪽으로 휘어진 경향이 있습니다.',
        features: ['무릎 관절 부담', '보행 불균형', '하체 피로', '무릎 통증 가능'],
        icon: Activity,
      };
    }

    // 정상 자세 - Sparkles 아이콘
    const normalFeatures = LOWER_BODY_ANALYSIS_ENABLED
      ? ['균형 잡힌 척추', '정렬된 골반', '적절한 무릎 각도', '건강한 자세']
      : ['바른 목 정렬', '균형잡힌 어깨', '올바른 척추 정렬', '건강한 자세'];

    return {
      name: '정상 자세',
      description: '전반적으로 균형 잡힌 좋은 자세입니다.',
      features: normalFeatures,
      icon: Sparkles,
    };
  }, [results]);

  const getScoreMessage = (score: number) => {
    if (score >= 90) return { text: '훌륭해요!', sub: '자세가 매우 좋습니다' };
    if (score >= 80) return { text: '좋아요!', sub: '조금만 신경쓰면 완벽해요' };
    if (score >= 70) return { text: '양호해요', sub: '개선이 필요한 부분이 있어요' };
    if (score >= 60) return { text: '주의 필요', sub: '교정 운동을 시작해보세요' };
    return { text: '교정 필요', sub: '꾸준한 관리가 필요해요' };
  };

  const handleToggleItem = (itemId: string) => {
    setOpenItemId(openItemId === itemId ? null : itemId);
  };

  const handleDownloadPDF = useCallback(() => {
    alert('PDF 리포트 다운로드 기능은 추후 업데이트 예정입니다.');
  }, []);

  const normalCount = results.filter((item) => item.grade === 'good').length;
  const warningCount = results.filter((item) => item.grade !== 'good').length;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const scoreMessage = getScoreMessage(overallScore);

  // ============================================================
  // 전체 자세 점수 (요약 카드용) - 실제 분석 점수 사용
  // ============================================================
  // 기존: diseaseRiskAnalysis 기반 계산 → 버그 원인 (항상 100점에 가깝게 나옴)
  // 수정: poseAnalysis에서 계산된 실제 overallScore 사용
  const summaryScore = overallScore;

  const getSummaryMessage = (score: number): string => {
    if (score >= 90) return '매우 좋은 자세예요!';
    if (score >= 75) return '양호한 자세예요';
    if (score >= 65) return '평균적인 자세예요';
    if (score >= 55) return '개선이 필요해요';
    if (score >= 45) return '주의가 필요해요';
    return '교정이 필요해요';
  };

  const getSummaryScoreColor = (score: number): string => {
    if (score >= 75) return 'text-teal-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-rose-500';
  };

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-background pb-32">
        {/* 상단 헤더 */}
        <motion.header
          className="bg-card px-5 pt-4 pb-4 border-b border-border sticky top-0 z-30"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => isFromHistory ? router.push('/history') : router.push('/')}
            >
              {isFromHistory ? <ArrowLeft className="h-4 w-4" /> : <Home className="h-4 w-4" />}
            </Button>

            <div className="text-center">
              <h1 className="text-lg font-semibold text-foreground">분석 리포트</h1>
              {isFromHistory && (historyRecord || localHistoryRecord) && (
                <p className="text-xs text-muted-foreground">
                  {new Date(historyRecord?.created_at ?? localHistoryRecord?.date ?? '').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>

            <Button variant="outline" size="icon" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </motion.header>

        <motion.div
          className="px-4 sm:px-6 py-6 space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* ============================================================ */}
          {/* 자세 유형 진단 카드 (원형 점수 + 유형 정보) */}
          {/* ============================================================ */}
          <motion.section variants={itemVariants}>
            <PostureTypeDiagnosisCard
              score={summaryScore}
              results={results}
              measurements={postureMeasurements}
            />
          </motion.section>

          {/* ============================================================ */}
          {/* 스켈레톤 정렬 시각화 (상세 각도 분석 + 좌우 균형 통합) */}
          {/* ============================================================ */}
          {jointAngles && (
            <motion.section variants={itemVariants}>
              <SkeletonAlignmentVisualization
                jointAngles={jointAngles}
                asymmetryResults={asymmetryResults}
                capturedImage={capturedImages?.front}
                sideLandmarks={storedLandmarks?.side ?? undefined}
              />
            </motion.section>
          )}

          {/* ============================================================ */}
          {/* 측정 항목 정의 테이블 */}
          {/* ============================================================ */}
          <motion.section variants={itemVariants}>
            <div className="bg-card rounded-xl border border-slate-700 overflow-hidden">
              {/* 헤더 */}
              <div className="px-4 py-3 border-b border-slate-700 bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  측정 항목 정의
                </h3>
              </div>

              {/* 테이블 */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  {/* 테이블 헤더 */}
                  <thead>
                    <tr className="bg-slate-800/80 text-slate-400 text-[11px] font-medium">
                      <th className="px-4 py-2.5 text-left">항목</th>
                      <th className="px-4 py-2.5 text-left">정의</th>
                      <th className="px-4 py-2.5 text-center whitespace-nowrap">정상 범위</th>
                    </tr>
                  </thead>
                  {/* 테이블 바디 */}
                  <tbody className="divide-y divide-slate-700/50">
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">어깨 좌우 기울기</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">수평선과 양쪽 어깨를 연결하는 선 사이의 각도</td>
                      <td className="px-4 py-3 text-center text-teal-400 font-medium whitespace-nowrap">0° ~ 2°</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">골반 좌우 기울기</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">수평선과 양쪽 대전자를 연결하는 선 사이의 각도</td>
                      <td className="px-4 py-3 text-center text-teal-400 font-medium whitespace-nowrap">0° ~ 2°</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">무릎 정렬</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">양쪽 무릎의 높이 차이를 측정</td>
                      <td className="px-4 py-3 text-center text-teal-400 font-medium whitespace-nowrap">0° ~ 2°</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">목 앞뒤 편차</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">어깨를 지나는 수직선과 귀 위치 사이의 앞뒤 편차</td>
                      <td className="px-4 py-3 text-center text-teal-400 font-medium whitespace-nowrap">0 ~ 2.5cm</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">흉추 후만각</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">등의 굽은 정도를 각도로 측정</td>
                      <td className="px-4 py-3 text-center text-teal-400 font-medium whitespace-nowrap">20° ~ 40°</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">요추 전만각</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">허리의 굽은 정도를 각도로 측정</td>
                      <td className="px-4 py-3 text-center text-teal-400 font-medium whitespace-nowrap">30° ~ 45°</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </motion.section>

          {/* ============================================================ */}
          {/* 맞춤 운동 버튼 - 항상 표시 */}
          {/* ============================================================ */}
          <motion.section variants={itemVariants}>
            {exerciseRecommendation.recommendedPrograms.length > 0 && (
              <button
                className="w-full py-4 flex items-center justify-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 font-medium rounded-2xl border border-blue-500/30 shadow-sm transition-all"
                onClick={() => router.push(`/exercise?program=${exerciseRecommendation.recommendedPrograms[0].id}`)}
              >
                <Dumbbell className="w-5 h-5" />
                {exerciseRecommendation.recommendedPrograms[0].name} 시작하기
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </motion.section>

          {/* 맞춤 권장사항 카드 */}
          <motion.section variants={itemVariants}>
            <div className="bg-gradient-to-br from-teal-500/10 to-blue-500/10 border border-teal-500/30 rounded-xl p-5">
              <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-teal-400" />
                맞춤 권장사항
              </h3>

              <div className="space-y-3">
                {/* 주의/위험 항목에 대한 권장사항 */}
                {results.filter(item => item.grade === 'warning' || item.grade === 'danger').length > 0 ? (
                  <>
                    {results.filter(item => item.grade === 'warning' || item.grade === 'danger').map((item) => {
                      // 항목별 맞춤 운동 추천
                      const getRecommendation = () => {
                        switch (item.id) {
                          case 'forward_head':
                            return {
                              title: '거북목 교정 운동 권장',
                              description: `목이 ${item.value}cm 앞으로 나와있어요. 목 스트레칭과 턱 당기기 운동을 추천합니다.`,
                            };
                          case 'shoulder_tilt':
                            return {
                              title: '어깨 교정 운동 권장',
                              description: `어깨 불균형이 감지되었어요. 승모근 스트레칭과 어깨 회전 운동을 추천합니다.`,
                            };
                          case 'pelvis_tilt':
                            return {
                              title: '골반 교정 운동 권장',
                              description: `골반 기울기가 ${item.value}° 입니다. 골반 스트레칭과 코어 강화 운동을 추천합니다.`,
                            };
                          case 'knee_angle':
                            return {
                              title: '무릎 정렬 운동 권장',
                              description: `무릎 정렬에 주의가 필요해요. 하체 스트레칭과 균형 운동을 추천합니다.`,
                            };
                          default:
                            return {
                              title: '자세 교정 운동 권장',
                              description: `${item.name} 항목에 주의가 필요합니다. 관련 스트레칭을 권장합니다.`,
                            };
                        }
                      };
                      const recommendation = getRecommendation();
                      const isDanger = item.grade === 'danger';

                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 bg-slate-800/50 rounded-lg p-4"
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isDanger ? 'bg-rose-500/20' : 'bg-amber-500/20'}`}>
                            <AlertTriangle className={`w-3.5 h-3.5 ${isDanger ? 'text-rose-400' : 'text-amber-400'}`} />
                          </div>
                          <div>
                            <p className={`font-medium ${isDanger ? 'text-rose-400' : 'text-amber-400'}`}>
                              {recommendation.title}
                            </p>
                            <p className="text-sm text-slate-400 mt-0.5">
                              {recommendation.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : null}

                {/* 정상 상태 메시지 */}
                <div className="flex items-start gap-3 bg-slate-800/50 rounded-lg p-4">
                  <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  </div>
                  <div>
                    <p className="font-medium text-teal-400">
                      {results.every(item => item.grade === 'good') ? '훌륭한 자세에요!' : '좋은 자세 유지'}
                    </p>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {results.every(item => item.grade === 'good')
                        ? '모든 항목이 정상 범위에 있어요. 하루 10분씩 스트레칭으로 현재 상태를 유지하세요.'
                        : '정상 항목들은 잘 유지되고 있어요. 꾸준한 스트레칭으로 자세를 개선해보세요.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        </motion.div>

        {/* 하단 액션 버튼 */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border">
          <div className="flex gap-3">
            <button
              className="flex-1 py-3 flex items-center justify-center gap-2 bg-card hover:bg-muted text-muted-foreground font-medium rounded-2xl border border-border shadow-sm transition-all"
              onClick={handleDownloadPDF}
            >
              <FileText className="w-5 h-5" />
              PDF 저장
            </button>

            <button
              className="flex-1 py-3 flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 font-medium rounded-2xl border border-emerald-500/30 shadow-sm transition-all"
              onClick={() => router.push('/exercise')}
            >
              <Dumbbell className="w-5 h-5" />
              맞춤 운동 시작
            </button>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
