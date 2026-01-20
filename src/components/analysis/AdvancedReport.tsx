/**
 * 고급 분석 리포트 컴포넌트 - 개선된 카드형 UI
 *
 * 재활 운동 분석의 상세 결과를 카드 형태로 시각화합니다.
 * 정상 범위와 현재 값을 마커로 표시하여 직관적으로 파악 가능합니다.
 *
 * 주요 기능:
 * - 좌/우 값을 한 카드에 합쳐서 표시
 * - 핵심 항목 (몸통, 어깨) 카드형 표시
 * - 프로그레스 바에 정상 범위 배경 + 마커 표시
 * - 고관절/무릎은 더보기 아코디언으로 숨김
 *
 * 컬러 기준:
 * - 정상: green-500 (#10B981)
 * - 주의: yellow-500 (#F59E0B)
 * - 위험: red-500 (#EF4444)
 */

'use client';

import { useState } from 'react';
// ChevronDown, motion, AnimatePresence - 추후 더보기 기능에 사용 예정
// import { ChevronDown } from 'lucide-react';
// import { motion, AnimatePresence } from 'framer-motion';
import {
  JointAngles,
  ROMResult,
  AsymmetryResult,
} from '@/lib/advancedAnalysis';

// ============================================================
// Props 타입 정의
// ============================================================

interface Props {
  jointAngles: JointAngles | null;
  romResults: ROMResult[];
  asymmetryResults: AsymmetryResult[];
}

// ============================================================
// 정상 범위 상수
// ============================================================

interface JointRange {
  min: number;
  max: number;
  normalMin: number;
  normalMax: number;
  name: string;
  unit: string;
}

const JOINT_RANGES: Record<string, JointRange> = {
  neck: { min: 0, max: 30, normalMin: 0, normalMax: 10, name: '목 전방 각도', unit: '°' },
  trunk: { min: 0, max: 30, normalMin: 0, normalMax: 15, name: '몸통 기울기', unit: '°' },
  shoulder: { min: 0, max: 60, normalMin: 10, normalMax: 45, name: '어깨', unit: '°' },
  hip: { min: 140, max: 180, normalMin: 160, normalMax: 180, name: '고관절', unit: '°' },
  knee: { min: 150, max: 180, normalMin: 170, normalMax: 180, name: '무릎', unit: '°' },
};

// ============================================================
// 유틸리티 함수
// ============================================================

type Status = 'normal' | 'warning' | 'danger';

const getStatus = (value: number, range: JointRange): Status => {
  if (value >= range.normalMin && value <= range.normalMax) {
    return 'normal';
  }
  const margin = (range.normalMax - range.normalMin) * 0.5;
  if (Math.abs(value - range.normalMin) <= margin || Math.abs(value - range.normalMax) <= margin) {
    return 'warning';
  }
  return 'danger';
};

const getCombinedStatus = (leftValue: number, rightValue: number, range: JointRange): Status => {
  const leftStatus = getStatus(leftValue, range);
  const rightStatus = getStatus(rightValue, range);

  if (leftStatus === 'danger' || rightStatus === 'danger') return 'danger';
  if (leftStatus === 'warning' || rightStatus === 'warning') return 'warning';
  return 'normal';
};

const getStatusColors = (status: Status) => {
  switch (status) {
    case 'normal':
      return { marker: 'bg-green-500/100', text: 'text-green-600', bg: 'bg-green-500/10', border: 'border-green-200' };
    case 'warning':
      return { marker: 'bg-yellow-500/100', text: 'text-yellow-600', bg: 'bg-yellow-500/10', border: 'border-yellow-200' };
    case 'danger':
      return { marker: 'bg-red-500/100', text: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-200' };
  }
};

// 추후 사용 예정 함수들
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getStatusText = (status: Status): string => {
  switch (status) {
    case 'normal': return '정상';
    case 'warning': return '주의';
    case 'danger': return '위험';
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const calculateMarkerPosition = (value: number, range: JointRange): number => {
  const percent = ((value - range.min) / (range.max - range.min)) * 100;
  return Math.min(100, Math.max(0, percent));
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const calculateNormalRangePosition = (range: JointRange) => {
  const start = ((range.normalMin - range.min) / (range.max - range.min)) * 100;
  const end = ((range.normalMax - range.min) / (range.max - range.min)) * 100;
  return { left: `${start}%`, width: `${end - start}%` };
};

// ============================================================
// 서브 컴포넌트: 통일된 관절각 카드 (구간별 색상 + 한 줄 해석)
// ============================================================

interface JointCardProps {
  label: string;
  range: JointRange;
  // 단일 값
  value?: number;
  // 좌/우 값 (둘 다 있으면 좌우 모드)
  leftValue?: number;
  rightValue?: number;
}

// 한 줄 해석 메시지
const getInterpretation = (status: Status): string => {
  switch (status) {
    case 'normal': return '좋은 자세예요';
    case 'warning': return '조금 신경 쓰면 좋겠어요';
    case 'danger': return '교정이 필요해요';
  }
};

function JointCard({ label, range, value, leftValue, rightValue }: JointCardProps) {
  // 좌우 값이 모두 있으면 좌우 모드
  const isPaired = leftValue !== undefined && rightValue !== undefined;

  // 상태 계산
  const status = isPaired
    ? getCombinedStatus(leftValue, rightValue, range)
    : getStatus(value ?? 0, range);
  const colors = getStatusColors(status);

  // 마커 위치 계산 (상태에 따라 구간 내 위치)
  // 위험: 0-20%, 주의: 20-50%, 정상: 50-100%
  const getMarkerPosition = (): number => {
    switch (status) {
      case 'danger': return 10; // 위험 구간 중앙
      case 'warning': return 35; // 주의 구간 중앙
      case 'normal': return 75; // 정상 구간 중앙
    }
  };
  const markerPos = getMarkerPosition();

  // 값 표시 문자열
  const valueText = isPaired
    ? `${leftValue}${range.unit} / ${rightValue}${range.unit}`
    : `${value}${range.unit}`;

  return (
    <div className="bg-card border border-border rounded-xl p-4 min-h-[140px] flex flex-col justify-between">
      {/* 상단: 레이블 + 값 */}
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold text-foreground text-sm">{label}</h4>
          {isPaired && (
            <span className="text-[11px] text-muted-foreground">좌 / 우</span>
          )}
        </div>
        <span className={`text-lg font-bold ${colors.text}`}>
          {valueText}
        </span>
      </div>

      {/* 구간별 프로그레스 바 (고정 비율) */}
      <div className="my-3">
        <div className="relative h-3 rounded-full overflow-hidden flex">
          {/* 위험 구간 20% */}
          <div className="bg-red-200 h-full" style={{ width: '20%' }} />
          {/* 주의 구간 30% */}
          <div className="bg-yellow-200 h-full" style={{ width: '30%' }} />
          {/* 정상 구간 50% */}
          <div className="bg-green-200 h-full" style={{ width: '50%' }} />

          {/* 마커 */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 ${colors.marker} rounded-full border-2 border-white shadow-md transition-all duration-300`}
            style={{ left: `calc(${markerPos}% - 8px)` }}
          />
        </div>

        {/* 구간 라벨 */}
        <div className="flex text-[10px] text-muted-foreground mt-1">
          <span style={{ width: '20%' }} className="text-center">위험</span>
          <span style={{ width: '30%' }} className="text-center">주의</span>
          <span style={{ width: '50%' }} className="text-center">정상</span>
        </div>
      </div>

      {/* 한 줄 해석 */}
      <p className={`text-sm font-medium ${colors.text}`}>
        {getInterpretation(status)}
      </p>
    </div>
  );
}

// ============================================================
// 서브 컴포넌트: 좌우 균형 카드 (통일된 스타일)
// ============================================================

interface BalanceCardProps {
  label: string;
  percentDiff: number;
  dominantSide: 'left' | 'right' | 'balanced';
}

// 좌우 균형 해석 메시지
const getBalanceInterpretation = (percentDiff: number): { status: Status; message: string } => {
  if (percentDiff <= 2) {
    return { status: 'normal', message: '좌우 균형이 잘 맞아요' };
  } else if (percentDiff <= 5) {
    return { status: 'warning', message: '약간 차이가 있어요' };
  } else {
    return { status: 'danger', message: '불균형이 있어요' };
  }
};

// BalanceCard를 export하여 외부에서도 사용 가능하게
export function BalanceCard({ label, percentDiff, dominantSide }: BalanceCardProps) {
  const { status, message } = getBalanceInterpretation(percentDiff);
  const colors = getStatusColors(status);

  // 마커 위치: 0%=균형(좌측), 5%=약간차이(중간), 10%+=불균형(우측)
  // 0~10% 범위를 0~100%로 매핑
  const markerPos = Math.min(percentDiff * 10, 100);

  // 우세한 쪽 표시
  const sideText = dominantSide === 'balanced'
    ? ''
    : dominantSide === 'left' ? '(좌측 우세)' : '(우측 우세)';

  return (
    <div className="bg-card border border-border rounded-xl p-4 min-h-[140px] flex flex-col justify-between">
      {/* 상단: 레이블 + 값 */}
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold text-foreground text-sm">{label} 균형</h4>
          {sideText && (
            <span className="text-[11px] text-muted-foreground">{sideText}</span>
          )}
        </div>
        <span className={`text-lg font-bold ${colors.text}`}>
          {percentDiff}% 차이
        </span>
      </div>

      {/* 구간별 프로그레스 바 */}
      <div className="my-3">
        <div className="relative h-3 rounded-full overflow-hidden flex">
          {/* 균형 구간 (0-2%) = 20% */}
          <div className="bg-green-200 h-full" style={{ width: '20%' }} />
          {/* 약간 차이 구간 (2-5%) = 30% */}
          <div className="bg-yellow-200 h-full" style={{ width: '30%' }} />
          {/* 불균형 구간 (5%+) = 50% */}
          <div className="bg-red-200 h-full" style={{ width: '50%' }} />

          {/* 마커 */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 ${colors.marker} rounded-full border-2 border-white shadow-md transition-all duration-300`}
            style={{ left: `calc(${markerPos}% - 8px)` }}
          />
        </div>

        {/* 구간 라벨 */}
        <div className="flex text-[10px] text-muted-foreground mt-1">
          <span style={{ width: '20%' }} className="text-center">균형</span>
          <span style={{ width: '30%' }} className="text-center">약간</span>
          <span style={{ width: '50%' }} className="text-center">불균형</span>
        </div>
      </div>

      {/* 한 줄 해석 */}
      <p className={`text-sm font-medium ${colors.text}`}>
        {message}
      </p>
    </div>
  );
}

// ============================================================
// 메인 컴포넌트
// ============================================================

export default function AdvancedReport({
  jointAngles,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  romResults,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  asymmetryResults,
}: Props) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showMore, setShowMore] = useState(false);

  if (!jointAngles) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 핵심 항목 카드 (2열 그리드) */}
      <div className="grid grid-cols-2 gap-4">
        <JointCard
          label="목 전방 각도"
          value={jointAngles.neck}
          range={JOINT_RANGES.neck}
        />
        <JointCard
          label="몸통 기울기"
          value={jointAngles.trunk}
          range={JOINT_RANGES.trunk}
        />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <JointCard
          label="어깨"
          leftValue={jointAngles.shoulderLeft}
          rightValue={jointAngles.shoulderRight}
          range={JOINT_RANGES.shoulder}
        />
      </div>

      {/* [MVP 제외] 하체 관절 상세 (고관절, 무릎) - 추후 활성화 예정
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <button
          onClick={() => setShowMore(!showMore)}
          className="w-full px-4 py-3 flex justify-between items-center hover:bg-muted transition-colors"
        >
          <span className="text-sm text-muted-foreground font-medium">
            하체 관절 상세 (고관절, 무릎)
          </span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showMore ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showMore && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-border"
            >
              <div className="p-4 grid grid-cols-2 gap-4">
                <JointCard
                  label="고관절"
                  leftValue={jointAngles.hipLeft}
                  rightValue={jointAngles.hipRight}
                  range={JOINT_RANGES.hip}
                />
                <JointCard
                  label="무릎"
                  leftValue={jointAngles.kneeLeft}
                  rightValue={jointAngles.kneeRight}
                  range={JOINT_RANGES.knee}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      */}
    </div>
  );
}
