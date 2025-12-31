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
  Check,
  AlertCircle,
  TrendingUp,
  Home,
  Download,
  FileText,
  ArrowLeft,
  Loader2,
  Target,
  Sparkles,
  Scale,
  Activity,
  LucideIcon,
  AlertTriangle,
  HeartPulse,
  Clock,
  Lightbulb,
  Camera,
  Box,
} from 'lucide-react';
import Link from 'next/link';
import { useAnalysisResult, useCapturedImages, useJointAngles, useLandmarks } from '@/store/useStore';
import { useAuth } from '@/components/providers/AuthProvider';
import { saveAnalysisResult, type AnalysisResultRow } from '@/lib/supabase';
import type { AnalysisItem } from '@/lib/poseAnalysis';
import AppHeader from '@/components/layout/AppHeader';
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

// 고급 분석 리포트 컴포넌트
import AdvancedReport, { BalanceCard } from '@/components/analysis/AdvancedReport';

// 3D 스켈레톤 시각화 컴포넌트 (OpenCap Kinematic 스타일)
import Skeleton3D from '@/components/analysis/Skeleton3D';
// 3D 모델 스켈레톤 (ReadyPlayerMe GLTF)
import Skeleton3DModel from '@/components/analysis/Skeleton3DModel';

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
          disease.level === 'low' ? 'bg-emerald-100' :
          disease.level === 'medium' ? 'bg-yellow-100' :
          disease.level === 'high' ? 'bg-orange-100' : 'bg-red-100'
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
            ${item.grade === 'good' ? 'bg-green-100' : item.grade === 'warning' ? 'bg-amber-100' : 'bg-red-100'}
          `}>
            <div className={`w-3 h-3 rounded-full ${item.grade === 'good' ? 'bg-green-500' : item.grade === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`} />
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

                <div className={`rounded-xl p-3 mb-3 ${item.grade === 'good' ? 'bg-green-50' : item.grade === 'warning' ? 'bg-amber-50' : 'bg-red-50'}`}>
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
  // 3D 스켈레톤 뷰 전환 상태 ('front' | 'side')
  const [skeleton3DView, setSkeleton3DView] = useState<'front' | 'side'>('front');
  // 3D 모델 모드 토글 (true: GLTF 모델, false: 스틱 피겨)
  const [use3DModel, setUse3DModel] = useState<boolean>(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 아코디언 상태 (기본 접힘)
  const [isSkeletonOpen, setIsSkeletonOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isBalanceOpen, setIsBalanceOpen] = useState(false);
  const [isDetailedOpen, setIsDetailedOpen] = useState(false);
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
    // localStorage 기록인 경우
    if (localHistoryRecord?.items) {
      return localHistoryRecord.items as ExtendedAnalysisItem[];
    }
    return [];
  }, [historyRecord, localHistoryRecord]);

  const results = isFromHistory && (historyRecord || localHistoryRecord)
    ? historyResults
    : (analysisResult?.items || DUMMY_RESULTS);
  const overallScore = isFromHistory
    ? (historyRecord?.overall_score ?? localHistoryRecord?.score ?? 72)
    : (analysisResult?.overallScore || 72);

  // 기록 조회 시 이미지는 기록에서 가져오기
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
   * ROM 분석 결과
   * 관절각 데이터를 기반으로 ROM 분석을 수행합니다.
   */
  const romResults = useMemo((): ROMResult[] => {
    if (!jointAngles) return [];
    return analyzeAllROM(jointAngles);
  }, [jointAngles]);

  /**
   * 좌우 비대칭 분석 결과
   * 관절각 데이터를 기반으로 좌우 비대칭을 분석합니다.
   */
  const asymmetryResults = useMemo((): AsymmetryResult[] => {
    if (!jointAngles) return [];
    return analyzeAllAsymmetry(jointAngles);
  }, [jointAngles]);

  /**
   * ROM 점수 (0~100)
   * 정상 범위 내 관절 비율
   */
  const romScore = useMemo((): number => {
    return calculateROMScore(romResults);
  }, [romResults]);

  /**
   * 비대칭 점수 (0~100)
   * 좌우 균형도 점수
   */
  const asymmetryScore = useMemo((): number => {
    return calculateAsymmetryScore(asymmetryResults);
  }, [asymmetryResults]);

  /**
   * 비대칭 요약 메시지
   */
  const asymmetrySummary = useMemo((): string => {
    return getAsymmetrySummary(asymmetryResults);
  }, [asymmetryResults]);

  // 분석 결과 저장
  useEffect(() => {
    const saveResult = async () => {
      if (!user || !analysisResult || hasSavedRef.current || isFromHistory) return;

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

        setIsSaved(true);
      } catch (error) {
        console.error('분석 결과 저장 실패:', error);
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
  const scoreMessage = getScoreMessage(overallScore);

  // ============================================================
  // 전체 자세 점수 계산 (요약 카드용)
  // ============================================================
  const summaryScore = useMemo(() => {
    // 거북목, 라운드숄더 위험도 기반 계산
    const forwardHeadRisk = diseaseRiskAnalysis.diseases.find(d => d.id === 'forward_head')?.risk ?? 50;
    const roundShoulderRisk = diseaseRiskAnalysis.diseases.find(d => d.id === 'round_shoulder')?.risk ?? 50;

    // (100 - 거북목위험도 + 100 - 라운드숄더위험도) / 2
    const score = Math.round((100 - forwardHeadRisk + 100 - roundShoulderRisk) / 2);
    return Math.max(0, Math.min(100, score));
  }, [diseaseRiskAnalysis]);

  const getSummaryMessage = (score: number): string => {
    if (score >= 90) return '아주 좋은 자세예요!';
    if (score >= 70) return '전반적으로 양호해요';
    if (score >= 50) return '조금 신경 쓰면 좋겠어요';
    return '교정이 필요해요';
  };

  const getSummaryScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-blue-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <>
      <AppHeader />

      <div className="min-h-screen bg-slate-50 pb-32 pt-14">
        {/* 상단 헤더 */}
        <motion.header
          className="bg-white px-5 pt-4 pb-4 border-b border-gray-100 sticky top-14 z-30"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => isFromHistory ? router.push('/history') : router.push('/dashboard')}
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
          {/* 전체 자세 점수 요약 카드 */}
          {/* ============================================================ */}
          <motion.section variants={itemVariants}>
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-center">
              <p className="text-sm text-gray-500 mb-2">전체 자세 점수</p>
              <p className={`text-4xl font-bold ${getSummaryScoreColor(summaryScore)}`}>
                {summaryScore}점 <span className="text-lg font-normal text-gray-400">/ 100점</span>
              </p>
              <p className="text-gray-600 mt-3">{getSummaryMessage(summaryScore)}</p>
            </div>
          </motion.section>

          {/* ============================================================ */}
          {/* 거북목 위험도 카드 - 항상 표시 (간소화) */}
          {/* ============================================================ */}
          <motion.section variants={itemVariants} className="space-y-3">
            {diseaseRiskAnalysis.diseases.map((disease) => (
              <div key={disease.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      disease.level === 'low' ? 'bg-emerald-100' :
                      disease.level === 'medium' ? 'bg-yellow-100' :
                      disease.level === 'high' ? 'bg-orange-100' : 'bg-red-100'
                    }`}>
                      <HeartPulse className={`w-5 h-5 ${getRiskColorClass(disease.level)}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{disease.name}</p>
                      <p className="text-xs text-gray-500">{disease.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-bold ${getRiskColorClass(disease.level)}`}>
                      {disease.risk}%
                    </span>
                    <Badge variant={
                      disease.level === 'low' ? 'default' :
                      disease.level === 'medium' ? 'secondary' : 'destructive'
                    } className="ml-2 text-[10px]">
                      {getRiskLevelLabel(disease.level)}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </motion.section>

          {/* ============================================================ */}
          {/* 맞춤 운동 버튼 - 항상 표시 */}
          {/* ============================================================ */}
          <motion.section variants={itemVariants}>
            {exerciseRecommendation.recommendedPrograms.length > 0 && (
              <button
                className="w-full py-4 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium rounded-2xl border border-blue-100 shadow-sm transition-all"
                onClick={() => router.push(`/exercise?program=${exerciseRecommendation.recommendedPrograms[0].id}`)}
              >
                <Dumbbell className="w-5 h-5" />
                {exerciseRecommendation.recommendedPrograms[0].name} 시작하기
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </motion.section>

          {/* ============================================================ */}
          {/* 아코디언 섹션들 (기본 접힘) */}
          {/* ============================================================ */}
          <motion.section variants={itemVariants} className="space-y-4">

            {/* 🦴 3D 스켈레톤 보기 */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setIsSkeletonOpen(!isSkeletonOpen)}
                className="w-full p-4 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-800 flex items-center gap-2">
                  <Box className="w-4 h-4 text-blue-500" />
                  3D 스켈레톤 보기
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isSkeletonOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {isSkeletonOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-gray-200 bg-gray-50"
                  >
                    <div className="p-4">
                      {/* 뷰 버튼 */}
                      <div className="flex justify-center mb-4">
                        <div className="flex gap-1 bg-white border p-1 rounded-lg">
                          {(['front', 'side'] as const).map((view) => (
                            <button
                              key={view}
                              onClick={() => setSkeleton3DView(view)}
                              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                skeleton3DView === view
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-muted-foreground hover:bg-gray-100'
                              }`}
                            >
                              {view === 'front' ? '정면' : '측면'}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setUse3DModel(!use3DModel)}
                          className="ml-2 px-3 py-1.5 text-xs font-medium rounded-lg border bg-white hover:bg-gray-50"
                        >
                          {use3DModel ? '3D 모델' : '스틱'}
                        </button>
                      </div>

                      {/* 3D 뷰어 */}
                      <div className="flex justify-center">
                        {displayLandmarks[skeleton3DView] ? (
                          use3DModel ? (
                            <Skeleton3DModel
                              landmarks={displayLandmarks[skeleton3DView]}
                              viewMode={skeleton3DView}
                              width={320}
                              height={400}
                            />
                          ) : (
                            <Skeleton3D
                              landmarks={displayLandmarks[skeleton3DView]}
                              viewMode={skeleton3DView}
                              width={320}
                              height={400}
                            />
                          )
                        ) : (
                          <div className="w-[320px] h-[400px] bg-gray-200 rounded-lg flex items-center justify-center">
                            <p className="text-sm text-gray-500">데이터 없음</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 📐 상세 각도 분석 */}
            {jointAngles && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  className="w-full p-4 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-800 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    상세 각도 분석
                    <span className="text-xs text-muted-foreground ml-1">ROM {romScore}%</span>
                  </span>
                  <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isAdvancedOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {isAdvancedOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-gray-200 bg-gray-50"
                    >
                      <div className="p-4">
                        <AdvancedReport
                          jointAngles={jointAngles}
                          romResults={romResults}
                          asymmetryResults={asymmetryResults}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* 좌우 균형 (별도 아코디언) */}
            {asymmetryResults.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setIsBalanceOpen(!isBalanceOpen)}
                  className="w-full p-4 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-800 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-blue-500" />
                    좌우 균형
                    <span className="text-xs text-muted-foreground ml-1">균형 {asymmetryScore}점</span>
                  </span>
                  <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isBalanceOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {isBalanceOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-gray-200 bg-gray-50"
                    >
                      <div className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          {/* [MVP] 어깨만 표시 - 고관절/무릎은 추후 활성화 */}
                          {asymmetryResults
                            .filter((asym) => asym.joint === '어깨')
                            .map((asym, idx) => (
                              <BalanceCard
                                key={idx}
                                label={asym.joint}
                                percentDiff={asym.percentDiff}
                                dominantSide={asym.dominantSide}
                              />
                            ))}
                        </div>
                        <Card className="mt-3 bg-white">
                          <CardContent className="p-3">
                            <p className="text-sm text-foreground">{asymmetrySummary}</p>
                          </CardContent>
                        </Card>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* 📊 항목별 상세 분석 */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setIsDetailedOpen(!isDetailedOpen)}
                className="w-full p-4 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-800 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  항목별 상세 분석
                  <span className="text-xs text-muted-foreground ml-1">정상 {normalCount}개 · 주의 {warningCount}개</span>
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isDetailedOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {isDetailedOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-gray-200 bg-gray-50"
                  >
                    <div className="p-4 space-y-3">
                      {results.map((item, index) => (
                        <AnalysisItemCard
                          key={item.id}
                          item={item}
                          isOpen={openItemId === item.id}
                          onToggle={() => handleToggleItem(item.id)}
                          index={index}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </motion.section>

          {/* 팁 카드 */}
          <motion.section variants={itemVariants}>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                <strong>💡 팁</strong> · 하루 10분씩 스트레칭을 하면 자세 개선에 효과적이에요!
              </p>
            </div>
          </motion.section>
        </motion.div>

        {/* 하단 액션 버튼 */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
          <div className="flex gap-3">
            <button
              className="flex-1 py-3 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-600 font-medium rounded-2xl border border-gray-200 shadow-sm transition-all"
              onClick={handleDownloadPDF}
            >
              <FileText className="w-5 h-5" />
              PDF 저장
            </button>

            <button
              className="flex-1 py-3 flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-medium rounded-2xl border border-emerald-100 shadow-sm transition-all"
              onClick={() => router.push('/exercise')}
            >
              <Dumbbell className="w-5 h-5" />
              맞춤 운동 시작
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
