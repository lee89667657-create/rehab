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
  ShieldAlert,
  Clock,
  Lightbulb,
  Camera,
  Bone,
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
import AdvancedReport from '@/components/analysis/AdvancedReport';

// 3D 스켈레톤 시각화 컴포넌트 (OpenCap Kinematic 스타일)
import Skeleton3D from '@/components/analysis/Skeleton3D';
// 3D 모델 스켈레톤 (ReadyPlayerMe GLTF)
import Skeleton3DModel from '@/components/analysis/Skeleton3DModel';

// shadcn/ui 컴포넌트
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    recommendation: '목 스트레칭',
    bodyPart: 'head',
    normalRange: '0 ~ 2.5cm',
  },
  shoulder_tilt: {
    detail: '좌우 어깨 높이 차이를 측정했습니다.',
    recommendation: '어깨 스트레칭',
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
// 컴포넌트: 질환 위험도 카드
// ============================================================

function DiseaseRiskCard({
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
// 컴포넌트: 운동 프로그램 카드
// ============================================================

function ExerciseProgramCard({
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
// 컴포넌트: 자세 유형 카드
// ============================================================

function PostureTypeCard({ postureType }: { postureType: PostureType }) {
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
// 컴포넌트: 인체도
// ============================================================

function BodyDiagram({ items }: { items: AnalysisItem[] }) {
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
}: {
  item: AnalysisItem | ExtendedAnalysisItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const detail = (item as ExtendedAnalysisItem).detail || itemDetails[item.id]?.detail || item.description;
  const recommendation = (item as ExtendedAnalysisItem).recommendation || itemDetails[item.id]?.recommendation || '맞춤 운동';
  const scoreValue = item.score || (item.grade === 'good' ? 90 : item.grade === 'warning' ? 60 : 30);

  const badgeVariant = item.grade === 'good' ? 'default' : item.grade === 'warning' ? 'secondary' : 'destructive';
  const badgeLabel = item.grade === 'good' ? '정상' : item.grade === 'warning' ? '주의' : '위험';

  return (
    <motion.div variants={itemVariants}>
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
  const [expandedDiseaseId, setExpandedDiseaseId] = useState<string | null>(null);
  // 3D 스켈레톤 뷰 전환 상태 ('front' | 'side')
  const [skeleton3DView, setSkeleton3DView] = useState<'front' | 'side'>('front');
  // 3D 모델 모드 토글 (true: GLTF 모델, false: 스틱 피겨)
  const [use3DModel, setUse3DModel] = useState<boolean>(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  // 자세 유형 분류
  const postureType = useMemo((): PostureType => {
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
          className="px-5 pt-5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* ============================================================ */}
          {/* 촬영 이미지 섹션 - 항상 표시 */}
          {/* ============================================================ */}
          <motion.section variants={itemVariants}>
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Camera className="w-4 h-4" />
                  촬영 이미지
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {/* 정면 이미지 */}
                  <div className="flex-shrink-0 text-center">
                    <div className="w-28 h-36 bg-gray-200 rounded-lg overflow-hidden">
                      {displayImages.front ? (
                        <img
                          src={displayImages.front}
                          alt="정면"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                          이미지 없음
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">정면</p>
                  </div>
                  {/* 측면 이미지 */}
                  <div className="flex-shrink-0 text-center">
                    <div className="w-28 h-36 bg-gray-200 rounded-lg overflow-hidden">
                      {displayImages.side ? (
                        <img
                          src={displayImages.side}
                          alt="측면"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                          이미지 없음
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">측면</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* ============================================================ */}
          {/* 스켈레톤 정렬 분석 섹션 - Calm 스타일 */}
          {/* ============================================================ */}
          <motion.section variants={itemVariants}>
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bone className="w-4 h-4 text-blue-500" />
                  정렬 분석
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* 정면/측면 그리드 - 크고 밝은 스타일 */}
                <div className="grid grid-cols-2 gap-4">
                  {/* 정면 스켈레톤 */}
                  <div className="relative bg-slate-50 border border-gray-200 rounded-xl p-4 aspect-[3/4] flex items-center justify-center overflow-hidden">
                    {/* 배경 이미지 (있으면) */}
                    {displayImages.front && (
                      <img
                        src={displayImages.front}
                        alt="정면"
                        className="absolute inset-0 w-full h-full object-cover opacity-20"
                      />
                    )}

                    {/* 중앙 기준선 */}
                    <div className="absolute left-1/2 top-4 bottom-4 w-px border-l-2 border-dashed border-rose-300" />

                    {/* 수평 기준선 (어깨, 골반) */}
                    <div className="absolute left-4 right-4 top-[22%] border-t border-dashed border-amber-300" />
                    <div className="absolute left-4 right-4 top-[48%] border-t border-dashed border-amber-300" />

                    {/* 정면 스켈레톤 SVG */}
                    <svg className="absolute inset-0 w-full h-full" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}>
                      {/* 머리 */}
                      <circle cx="50%" cy="14%" r="8" fill="#3B82F6" />
                      {/* 목 */}
                      <line x1="50%" y1="14%" x2="50%" y2="22%" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
                      {/* 어깨 라인 */}
                      <line x1="30%" y1="22%" x2="70%" y2="22%" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="30%" cy="22%" r="6" fill="#3B82F6" />
                      <circle cx="70%" cy="22%" r="6" fill="#3B82F6" />
                      {/* 척추 */}
                      <line x1="50%" y1="22%" x2="50%" y2="48%" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
                      {/* 골반 라인 */}
                      <line x1="36%" y1="48%" x2="64%" y2="48%" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="36%" cy="48%" r="6" fill="#3B82F6" />
                      <circle cx="64%" cy="48%" r="6" fill="#3B82F6" />
                      {/* 허벅지 */}
                      <line x1="36%" y1="48%" x2="36%" y2="72%" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
                      <line x1="64%" y1="48%" x2="64%" y2="72%" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="36%" cy="72%" r="5" fill="#3B82F6" />
                      <circle cx="64%" cy="72%" r="5" fill="#3B82F6" />
                      {/* 종아리 */}
                      <line x1="36%" y1="72%" x2="36%" y2="88%" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
                      <line x1="64%" y1="72%" x2="64%" y2="88%" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="36%" cy="88%" r="4" fill="#3B82F6" />
                      <circle cx="64%" cy="88%" r="4" fill="#3B82F6" />
                    </svg>

                    {/* 뷰 라벨 */}
                    <span className="absolute bottom-2 left-2 text-xs font-medium text-gray-500 bg-white/80 px-2 py-1 rounded-md">
                      정면
                    </span>
                  </div>

                  {/* 측면 스켈레톤 */}
                  <div className="relative bg-slate-50 border border-gray-200 rounded-xl p-4 aspect-[3/4] flex items-center justify-center overflow-hidden">
                    {/* 배경 이미지 (있으면) */}
                    {displayImages.side && (
                      <img
                        src={displayImages.side}
                        alt="측면"
                        className="absolute inset-0 w-full h-full object-cover opacity-20"
                      />
                    )}

                    {/* 이상적 정렬선 (수직) */}
                    <div className="absolute left-1/2 top-4 bottom-4 w-px border-l-2 border-emerald-400" />

                    {/* 측면 스켈레톤 SVG */}
                    <svg className="absolute inset-0 w-full h-full" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}>
                      {/* 머리 - 약간 앞으로 */}
                      <circle cx="54%" cy="14%" r="8" fill="#3B82F6" />
                      {/* 목 */}
                      <line x1="54%" y1="14%" x2="52%" y2="22%" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
                      {/* 어깨 */}
                      <circle cx="52%" cy="22%" r="6" fill="#3B82F6" />
                      {/* 척추 - 자연스러운 S커브 */}
                      <line x1="52%" y1="22%" x2="48%" y2="48%" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
                      {/* 골반 */}
                      <circle cx="48%" cy="48%" r="6" fill="#3B82F6" />
                      {/* 허벅지 */}
                      <line x1="48%" y1="48%" x2="50%" y2="72%" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
                      {/* 무릎 */}
                      <circle cx="50%" cy="72%" r="5" fill="#3B82F6" />
                      {/* 종아리 */}
                      <line x1="50%" y1="72%" x2="50%" y2="88%" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
                      {/* 발목 */}
                      <circle cx="50%" cy="88%" r="4" fill="#3B82F6" />
                    </svg>

                    {/* 뷰 라벨 */}
                    <span className="absolute bottom-2 left-2 text-xs font-medium text-gray-500 bg-white/80 px-2 py-1 rounded-md">
                      측면
                    </span>
                  </div>
                </div>

                {/* 범례 */}
                <div className="flex justify-center gap-6 mt-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span>관절</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-0.5 bg-rose-300 rounded" />
                    <span>중앙선</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-0.5 bg-emerald-400 rounded" />
                    <span>이상 정렬</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* ============================================================ */}
          {/* 3D Postural Analysis (깔끔한 단일 UI) */}
          {/* ============================================================ */}
          <motion.section variants={itemVariants}>
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Box className="w-4 h-4" />
                      Postural Analysis
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Postural alignment relative to global reference frame
                    </p>
                  </div>
                  {/* 모델 타입 토글 */}
                  <button
                    onClick={() => setUse3DModel(!use3DModel)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      use3DModel
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {use3DModel ? '3D Model' : 'Skeleton'}
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {/* 뷰 버튼 - 정면/측면만 */}
                <div className="flex justify-center mb-4">
                  <div className="flex gap-1 bg-muted p-1 rounded-lg">
                    {(['front', 'side'] as const).map((view) => (
                      <button
                        key={view}
                        onClick={() => setSkeleton3DView(view)}
                        disabled={!displayLandmarks[view]}
                        className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          skeleton3DView === view
                            ? 'bg-primary text-primary-foreground'
                            : displayLandmarks[view]
                              ? 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                              : 'text-muted-foreground/40 cursor-not-allowed'
                        }`}
                      >
                        {view === 'front' ? '정면' : '측면'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3D 스켈레톤 / 모델 */}
                <div className="flex justify-center">
                  {displayLandmarks[skeleton3DView] ? (
                    use3DModel ? (
                      <Skeleton3DModel
                        landmarks={displayLandmarks[skeleton3DView]}
                        viewMode={skeleton3DView}
                        width={400}
                        height={480}
                      />
                    ) : (
                      <Skeleton3D
                        landmarks={displayLandmarks[skeleton3DView]}
                        viewMode={skeleton3DView}
                        width={400}
                        height={480}
                      />
                    )
                  ) : (
                    <div className="w-[400px] h-[480px] bg-[#0d1117] rounded-lg flex items-center justify-center">
                      <div className="text-center text-[#8b949e]">
                        <p className="text-sm font-medium">No data for {skeleton3DView} view</p>
                        <p className="text-xs mt-1">Capture this angle first</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 범례 */}
                <div className="flex justify-center gap-6 mt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-[#60a5fa]"></div>
                    <span>Vertical ref</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-[#4ade80]"></div>
                    <span>Shoulder line</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-[#fbbf24]"></div>
                    <span>Pelvis line</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* ============================================================ */}
          {/* 고급 분석 리포트 (ROM, 비대칭) */}
          {/* ============================================================ */}
          {jointAngles && (
            <motion.section variants={itemVariants} className="mb-5">
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                고급 분석
              </h2>
              <AdvancedReport
                jointAngles={jointAngles}
                romResults={romResults}
                asymmetryResults={asymmetryResults}
              />
              {/* ROM/비대칭 점수 요약 */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">ROM 정상 비율</p>
                    <p className="text-2xl font-bold text-primary">{romScore}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">좌우 균형 점수</p>
                    <p className="text-2xl font-bold text-primary">{asymmetryScore}점</p>
                  </CardContent>
                </Card>
              </div>
              {/* 비대칭 요약 메시지 */}
              <Card className="mt-3 bg-muted/50">
                <CardContent className="p-3">
                  <p className="text-sm text-foreground">{asymmetrySummary}</p>
                </CardContent>
              </Card>
            </motion.section>
          )}

          {/* ============================================================ */}
          {/* 자세 유형 분류 */}
          {/* ============================================================ */}
          <PostureTypeCard postureType={postureType} />

          {/* ============================================================ */}
          {/* 종합 점수 + 인체도 */}
          {/* ============================================================ */}
          <motion.section variants={itemVariants} className="mb-5">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-5">
                  <div className="w-24 h-40 flex-shrink-0">
                    <BodyDiagram items={results} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-baseline gap-1 mb-2">
                      <motion.span
                        className="text-5xl font-bold text-foreground"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                      >
                        {overallScore}
                      </motion.span>
                      <span className="text-lg text-muted-foreground font-medium">점</span>
                    </div>

                    <div className="mb-3">
                      <Progress value={overallScore} className="h-2" />
                    </div>

                    <p className="text-base font-bold text-foreground">
                      {scoreMessage.text}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {scoreMessage.sub}
                    </p>

                    <div className="mt-3 flex items-center gap-1.5">
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span className="text-xs text-primary font-medium">저장 중...</span>
                        </>
                      ) : isSaved ? (
                        <>
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-xs text-green-500 font-medium">클라우드에 저장됨</span>
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-4 h-4 text-primary" />
                          <span className="text-xs text-primary font-medium">분석 완료</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* 요약 카드 */}
          <motion.section className="grid grid-cols-2 gap-3 mb-5" variants={itemVariants}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">정상</span>
                </div>
                <p className="text-2xl font-bold text-green-500">{normalCount}개</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">주의/위험</span>
                </div>
                <p className="text-2xl font-bold text-amber-500">{warningCount}개</p>
              </CardContent>
            </Card>
          </motion.section>

          {/* ============================================================ */}
          {/* 거북목 / 라운드숄더 분석 섹션 */}
          {/* ============================================================ */}
          <motion.section variants={itemVariants} className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-primary" />
                거북목 / 라운드숄더 분석
              </h2>
              <Badge variant={
                diseaseRiskAnalysis.overallLevel === 'low' ? 'default' :
                diseaseRiskAnalysis.overallLevel === 'medium' ? 'secondary' :
                'destructive'
              }>
                전체 {diseaseRiskAnalysis.overallRisk}%
              </Badge>
            </div>

            {/* 가장 우려되는 질환 */}
            {diseaseRiskAnalysis.primaryConcern && (
              <Card className="mb-3 border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-semibold text-orange-700">주요 우려</span>
                  </div>
                  <p className="text-base font-bold text-foreground">
                    {diseaseRiskAnalysis.primaryConcern.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    위험도 {diseaseRiskAnalysis.primaryConcern.risk}% - {diseaseRiskAnalysis.primaryConcern.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 거북목 / 라운드숄더 위험도 카드 */}
            <div className="space-y-3">
              {diseaseRiskAnalysis.diseases.map((disease) => (
                <DiseaseRiskCard
                  key={disease.id}
                  disease={disease}
                  isExpanded={expandedDiseaseId === disease.id}
                  onToggle={() => setExpandedDiseaseId(
                    expandedDiseaseId === disease.id ? null : disease.id
                  )}
                />
              ))}
            </div>

            {/* 권장 사항 */}
            {diseaseRiskAnalysis.recommendations.length > 0 && (
              <Card className="mt-4 bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold text-primary mb-2 flex items-center gap-1">
                    <Lightbulb className="w-4 h-4" />
                    권장 사항
                  </p>
                  <ul className="space-y-1.5">
                    {diseaseRiskAnalysis.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </motion.section>

          {/* 맞춤 운동 프로그램 추천 섹션 */}
          <motion.section variants={itemVariants} className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-primary" />
                맞춤 운동 프로그램
              </h2>
            </div>

            {/* 주간 목표 */}
            <Card className="mb-3 bg-muted/50">
              <CardContent className="p-3">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  {exerciseRecommendation.weeklyGoal}
                </p>
              </CardContent>
            </Card>

            {/* 긴급 추천 프로그램 */}
            {exerciseRecommendation.urgentPrograms.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  긴급 추천
                </p>
                <div className="space-y-3">
                  {exerciseRecommendation.urgentPrograms.map((program, idx) => (
                    <ExerciseProgramCard
                      key={program.id}
                      program={program}
                      isPrimary={idx === 0}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 일반 추천 프로그램 */}
            {exerciseRecommendation.recommendedPrograms.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-primary mb-2 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  추천 프로그램
                </p>
                <div className="space-y-3">
                  {exerciseRecommendation.recommendedPrograms.map((program) => (
                    <ExerciseProgramCard
                      key={program.id}
                      program={program}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 예방 프로그램 */}
            {exerciseRecommendation.preventivePrograms.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4" />
                  예방 프로그램
                </p>
                <div className="space-y-3">
                  {exerciseRecommendation.preventivePrograms.map((program) => (
                    <ExerciseProgramCard
                      key={program.id}
                      program={program}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 일일 루틴 */}
            {exerciseRecommendation.dailyRoutine.length > 0 && (
              <Card className="mt-4 bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold text-primary mb-3 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    오늘의 루틴
                  </p>
                  <div className="space-y-2">
                    {exerciseRecommendation.dailyRoutine.map((exercise, idx) => (
                      <div key={exercise.id} className="flex items-center gap-3 text-sm">
                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="flex-1 font-medium text-foreground">{exercise.name}</span>
                        <span className="text-muted-foreground">{exercise.sets}세트 x {exercise.reps}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.section>

          {/* ============================================================ */}
          {/* 항목별 상세 분석 섹션 */}
          {/* ============================================================ */}
          <motion.section variants={itemVariants} className="mt-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">
              항목별 상세 분석
            </h2>

            <div className="space-y-3">
              {results.map((item) => (
                <AnalysisItemCard
                  key={item.id}
                  item={item}
                  isOpen={openItemId === item.id}
                  onToggle={() => handleToggleItem(item.id)}
                />
              ))}
            </div>
          </motion.section>

          {/* 팁 카드 */}
          <motion.section variants={itemVariants} className="mt-5">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <p className="text-sm text-foreground">
                  <strong className="text-primary">오늘의 팁</strong>
                  <span className="mx-2">|</span>
                  하루 10분씩 스트레칭을 하면 자세 개선에 효과적이에요!
                </p>
              </CardContent>
            </Card>
          </motion.section>
        </motion.div>

        {/* 하단 액션 버튼 */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
          <div className="flex gap-3 max-w-lg mx-auto">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={handleDownloadPDF}
            >
              <FileText className="w-5 h-5 mr-2" />
              PDF 저장
            </Button>

            <Button
              className="flex-1 h-12"
              onClick={() => router.push('/exercise')}
            >
              <Dumbbell className="w-5 h-5 mr-2" />
              맞춤 운동 시작
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
