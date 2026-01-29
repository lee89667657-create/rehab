/**
 * 근육 불균형 분석 컴포넌트
 * - 스켈레톤/근육 탭 전환
 * - 근육 이미지 위에 문제 부위 오버레이
 * - 단축/약화 위험 근육 리스트
 */

'use client';

import { useState } from 'react';
import { Activity, AlertTriangle, TrendingDown } from 'lucide-react';
import Image from 'next/image';

// ============================================================
// 타입 정의
// ============================================================

interface MuscleInfo {
  name: string;
  position: { x: number; y: number }; // 이미지 상 위치 (%)
  view: 'front' | 'side' | 'both';
}

interface MuscleImbalance {
  shortened: MuscleInfo[]; // 단축된 근육 (빨강)
  weakened: MuscleInfo[];  // 약화된 근육 (파랑)
}

interface MuscleImbalanceAnalysisProps {
  hasForwardHead: boolean;      // 거북목 여부
  hasRoundShoulder: boolean;    // 라운드숄더 여부
  hasKyphosis: boolean;         // 등굽음(흉추 후만) 여부
  forwardHeadScore?: number;    // 거북목 점수 (0-100)
  roundShoulderScore?: number;  // 라운드숄더 점수 (0-100)
  kyphosisScore?: number;       // 등굽음 점수 (0-100)
}

// ============================================================
// 근육 데이터 정의
// ============================================================

// 거북목 관련 근육
const FORWARD_HEAD_MUSCLES: MuscleImbalance = {
  shortened: [
    { name: '흉쇄유돌근', position: { x: 45, y: 22 }, view: 'front' },
    { name: '상부승모근', position: { x: 30, y: 18 }, view: 'front' },
    { name: '후두하근', position: { x: 50, y: 8 }, view: 'side' },
  ],
  weakened: [
    { name: '심부목굴곡근', position: { x: 50, y: 15 }, view: 'side' },
    { name: '중하부승모근', position: { x: 50, y: 28 }, view: 'front' },
  ],
};

// 라운드숄더 관련 근육
const ROUND_SHOULDER_MUSCLES: MuscleImbalance = {
  shortened: [
    { name: '대흉근', position: { x: 35, y: 30 }, view: 'front' },
    { name: '소흉근', position: { x: 32, y: 28 }, view: 'front' },
    { name: '전면삼각근', position: { x: 22, y: 26 }, view: 'front' },
  ],
  weakened: [
    { name: '능형근', position: { x: 50, y: 32 }, view: 'side' },
    { name: '중하부승모근', position: { x: 50, y: 28 }, view: 'side' },
    { name: '후면삼각근', position: { x: 78, y: 26 }, view: 'side' },
  ],
};

// 등굽음(흉추 후만) 관련 근육
const KYPHOSIS_MUSCLES: MuscleImbalance = {
  shortened: [
    { name: '대흉근', position: { x: 35, y: 30 }, view: 'front' },
    { name: '복직근', position: { x: 50, y: 50 }, view: 'front' },
    { name: '상부승모근', position: { x: 30, y: 18 }, view: 'front' },
  ],
  weakened: [
    { name: '척추기립근', position: { x: 45, y: 45 }, view: 'side' },
    { name: '능형근', position: { x: 50, y: 32 }, view: 'side' },
    { name: '중하부승모근', position: { x: 50, y: 28 }, view: 'side' },
  ],
};

// ============================================================
// 컴포넌트
// ============================================================

export default function MuscleImbalanceAnalysis({
  hasForwardHead,
  hasRoundShoulder,
  hasKyphosis,
  forwardHeadScore = 70,
  roundShoulderScore = 70,
  kyphosisScore = 70,
}: MuscleImbalanceAnalysisProps) {
  const [activeTab, setActiveTab] = useState<'skeleton' | 'muscle'>('muscle');
  const [activeView, setActiveView] = useState<'front' | 'side'>('front');

  // 활성화된 근육 불균형 데이터 수집
  const getActiveMuscles = (): MuscleImbalance => {
    const shortened: MuscleInfo[] = [];
    const weakened: MuscleInfo[] = [];

    if (hasForwardHead) {
      shortened.push(...FORWARD_HEAD_MUSCLES.shortened);
      weakened.push(...FORWARD_HEAD_MUSCLES.weakened);
    }

    if (hasRoundShoulder) {
      shortened.push(...ROUND_SHOULDER_MUSCLES.shortened);
      weakened.push(...ROUND_SHOULDER_MUSCLES.weakened);
    }

    if (hasKyphosis) {
      shortened.push(...KYPHOSIS_MUSCLES.shortened);
      weakened.push(...KYPHOSIS_MUSCLES.weakened);
    }

    // 중복 제거
    const uniqueShortened = shortened.filter(
      (muscle, index, self) => self.findIndex((m) => m.name === muscle.name) === index
    );
    const uniqueWeakened = weakened.filter(
      (muscle, index, self) => self.findIndex((m) => m.name === muscle.name) === index
    );

    return { shortened: uniqueShortened, weakened: uniqueWeakened };
  };

  const activeMuscles = getActiveMuscles();

  // 현재 뷰에 해당하는 근육 필터링
  const getVisibleMuscles = (muscles: MuscleInfo[], view: 'front' | 'side') => {
    return muscles.filter((m) => m.view === view || m.view === 'both');
  };

  const visibleShortened = getVisibleMuscles(activeMuscles.shortened, activeView);
  const visibleWeakened = getVisibleMuscles(activeMuscles.weakened, activeView);

  // 문제가 없으면 표시하지 않음
  if (!hasForwardHead && !hasRoundShoulder && !hasKyphosis) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          근육 불균형 분석
        </h3>
      </div>

      <div className="p-4">
        {/* 탭 전환 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('muscle')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'muscle'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            근육 분석
          </button>
          <button
            onClick={() => setActiveTab('skeleton')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'skeleton'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            스켈레톤
          </button>
        </div>

        {/* 정면/측면 전환 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveView('front')}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
              activeView === 'front'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
            }`}
          >
            정면
          </button>
          <button
            onClick={() => setActiveView('side')}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
              activeView === 'side'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
            }`}
          >
            측면
          </button>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex gap-4">
          {/* 이미지 영역 */}
          <div className="relative w-48 h-72 bg-slate-800/50 rounded-lg overflow-hidden flex-shrink-0">
            {activeTab === 'muscle' ? (
              <>
                {/* 근육 이미지 */}
                <Image
                  src={activeView === 'front' ? '/images/muscle_front.png' : '/images/muscle_side.png'}
                  alt={activeView === 'front' ? '정면 근육' : '측면 근육'}
                  fill
                  className="object-contain p-2"
                  onError={(e) => {
                    // 이미지 로드 실패 시 플레이스홀더
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />

                {/* 단축 근육 마커 (빨강) */}
                {visibleShortened.map((muscle, idx) => (
                  <div
                    key={`short-${idx}`}
                    className="absolute w-4 h-4 bg-red-500/80 rounded-full border-2 border-red-300 animate-pulse cursor-pointer group"
                    style={{
                      left: `${muscle.position.x}%`,
                      top: `${muscle.position.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    title={`${muscle.name} (단축)`}
                  >
                    <span className="absolute left-full ml-1 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      {muscle.name}
                    </span>
                  </div>
                ))}

                {/* 약화 근육 마커 (파랑) */}
                {visibleWeakened.map((muscle, idx) => (
                  <div
                    key={`weak-${idx}`}
                    className="absolute w-4 h-4 bg-blue-500/80 rounded-full border-2 border-blue-300 animate-pulse cursor-pointer group"
                    style={{
                      left: `${muscle.position.x}%`,
                      top: `${muscle.position.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    title={`${muscle.name} (약화)`}
                  >
                    <span className="absolute left-full ml-1 top-1/2 -translate-y-1/2 bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      {muscle.name}
                    </span>
                  </div>
                ))}

                {/* 이미지 없을 때 플레이스홀더 */}
                <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">
                  <MuscleSkeletonSVG view={activeView} shortened={visibleShortened} weakened={visibleWeakened} />
                </div>
              </>
            ) : (
              /* 스켈레톤 뷰 */
              <div className="absolute inset-0 flex items-center justify-center">
                <SkeletonSVG view={activeView} hasForwardHead={hasForwardHead} hasRoundShoulder={hasRoundShoulder} hasKyphosis={hasKyphosis} />
              </div>
            )}
          </div>

          {/* 근육 리스트 */}
          <div className="flex-1 space-y-3">
            {/* 단축 위험 근육 */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-xs font-semibold text-red-400">단축 위험 근육</span>
              </div>
              <ul className="space-y-1">
                {activeMuscles.shortened.map((muscle, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    {muscle.name}
                  </li>
                ))}
              </ul>
            </div>

            {/* 약화 위험 근육 */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-blue-400">약화 위험 근육</span>
              </div>
              <ul className="space-y-1">
                {activeMuscles.weakened.map((muscle, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    {muscle.name}
                  </li>
                ))}
              </ul>
            </div>

            {/* 진단 요약 */}
            <div className="bg-slate-800/50 rounded-lg p-3 space-y-1">
              {hasForwardHead && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">거북목</span>
                  <span className={`font-medium ${forwardHeadScore >= 75 ? 'text-green-400' : forwardHeadScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                    {forwardHeadScore}점
                  </span>
                </div>
              )}
              {hasRoundShoulder && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">라운드숄더</span>
                  <span className={`font-medium ${roundShoulderScore >= 75 ? 'text-green-400' : roundShoulderScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                    {roundShoulderScore}점
                  </span>
                </div>
              )}
              {hasKyphosis && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">등굽음</span>
                  <span className={`font-medium ${kyphosisScore >= 75 ? 'text-green-400' : kyphosisScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                    {kyphosisScore}점
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 근육 스켈레톤 SVG (이미지 대체용)
// ============================================================

interface MuscleSkeletonSVGProps {
  view: 'front' | 'side';
  shortened: MuscleInfo[];
  weakened: MuscleInfo[];
}

function MuscleSkeletonSVG({ view, shortened, weakened }: MuscleSkeletonSVGProps) {
  if (view === 'front') {
    return (
      <svg viewBox="0 0 100 150" className="w-full h-full">
        {/* 머리 */}
        <ellipse cx="50" cy="15" rx="12" ry="14" fill="none" stroke="#475569" strokeWidth="1" />

        {/* 목 */}
        <line x1="50" y1="29" x2="50" y2="38" stroke="#475569" strokeWidth="1" />

        {/* 흉쇄유돌근 (단축 시 빨강) */}
        <path
          d={`M 44 25 Q 42 32 38 38`}
          fill="none"
          stroke={shortened.some(m => m.name === '흉쇄유돌근') ? '#ef4444' : '#475569'}
          strokeWidth={shortened.some(m => m.name === '흉쇄유돌근') ? '2' : '1'}
        />
        <path
          d={`M 56 25 Q 58 32 62 38`}
          fill="none"
          stroke={shortened.some(m => m.name === '흉쇄유돌근') ? '#ef4444' : '#475569'}
          strokeWidth={shortened.some(m => m.name === '흉쇄유돌근') ? '2' : '1'}
        />

        {/* 상부승모근 (단축 시 빨강) */}
        <path
          d={`M 38 38 Q 44 35 50 36 Q 56 35 62 38`}
          fill="none"
          stroke={shortened.some(m => m.name === '상부승모근') ? '#ef4444' : '#475569'}
          strokeWidth={shortened.some(m => m.name === '상부승모근') ? '2' : '1'}
        />

        {/* 어깨 */}
        <line x1="25" y1="42" x2="75" y2="42" stroke="#475569" strokeWidth="1" />

        {/* 대흉근 (단축 시 빨강) */}
        <ellipse
          cx="40" cy="52"
          rx="10" ry="8"
          fill={shortened.some(m => m.name === '대흉근') ? 'rgba(239,68,68,0.3)' : 'none'}
          stroke={shortened.some(m => m.name === '대흉근') ? '#ef4444' : '#475569'}
          strokeWidth={shortened.some(m => m.name === '대흉근') ? '2' : '1'}
        />
        <ellipse
          cx="60" cy="52"
          rx="10" ry="8"
          fill={shortened.some(m => m.name === '대흉근') ? 'rgba(239,68,68,0.3)' : 'none'}
          stroke={shortened.some(m => m.name === '대흉근') ? '#ef4444' : '#475569'}
          strokeWidth={shortened.some(m => m.name === '대흉근') ? '2' : '1'}
        />

        {/* 전면삼각근 (단축 시 빨강) */}
        <ellipse
          cx="26" cy="46"
          rx="5" ry="6"
          fill={shortened.some(m => m.name === '전면삼각근') ? 'rgba(239,68,68,0.3)' : 'none'}
          stroke={shortened.some(m => m.name === '전면삼각근') ? '#ef4444' : '#475569'}
          strokeWidth={shortened.some(m => m.name === '전면삼각근') ? '2' : '1'}
        />
        <ellipse
          cx="74" cy="46"
          rx="5" ry="6"
          fill={shortened.some(m => m.name === '전면삼각근') ? 'rgba(239,68,68,0.3)' : 'none'}
          stroke={shortened.some(m => m.name === '전면삼각근') ? '#ef4444' : '#475569'}
          strokeWidth={shortened.some(m => m.name === '전면삼각근') ? '2' : '1'}
        />

        {/* 중하부승모근 (약화 시 파랑) - 정면에서 표시 */}
        <path
          d={`M 38 50 L 50 65 L 62 50`}
          fill={weakened.some(m => m.name === '중하부승모근') ? 'rgba(59,130,246,0.2)' : 'none'}
          stroke={weakened.some(m => m.name === '중하부승모근') ? '#3b82f6' : '#475569'}
          strokeWidth={weakened.some(m => m.name === '중하부승모근') ? '2' : '1'}
        />

        {/* 복직근 (단축 시 빨강) */}
        <rect
          x="43" y="62"
          width="14" height="28"
          rx="2"
          fill={shortened.some(m => m.name === '복직근') ? 'rgba(239,68,68,0.3)' : 'none'}
          stroke={shortened.some(m => m.name === '복직근') ? '#ef4444' : '#475569'}
          strokeWidth={shortened.some(m => m.name === '복직근') ? '2' : '1'}
        />
        {/* 복직근 세그먼트 */}
        {shortened.some(m => m.name === '복직근') && (
          <>
            <line x1="43" y1="70" x2="57" y2="70" stroke="#ef4444" strokeWidth="1" />
            <line x1="43" y1="78" x2="57" y2="78" stroke="#ef4444" strokeWidth="1" />
            <line x1="43" y1="86" x2="57" y2="86" stroke="#ef4444" strokeWidth="1" />
          </>
        )}

        {/* 몸통 */}
        <rect x="35" y="60" width="30" height="35" fill="none" stroke="#475569" strokeWidth="1" rx="3" />

        {/* 팔 */}
        <line x1="25" y1="42" x2="20" y2="75" stroke="#475569" strokeWidth="1" />
        <line x1="75" y1="42" x2="80" y2="75" stroke="#475569" strokeWidth="1" />

        {/* 다리 */}
        <line x1="42" y1="95" x2="38" y2="140" stroke="#475569" strokeWidth="1" />
        <line x1="58" y1="95" x2="62" y2="140" stroke="#475569" strokeWidth="1" />
      </svg>
    );
  }

  // 측면 뷰
  return (
    <svg viewBox="0 0 100 150" className="w-full h-full">
      {/* 머리 */}
      <ellipse cx="55" cy="15" rx="10" ry="12" fill="none" stroke="#475569" strokeWidth="1" />

      {/* 후두하근 (단축 시 빨강) */}
      <ellipse
        cx="48" cy="10"
        rx="4" ry="3"
        fill={shortened.some(m => m.name === '후두하근') ? 'rgba(239,68,68,0.3)' : 'none'}
        stroke={shortened.some(m => m.name === '후두하근') ? '#ef4444' : '#475569'}
        strokeWidth={shortened.some(m => m.name === '후두하근') ? '2' : '1'}
      />

      {/* 심부목굴곡근 (약화 시 파랑) */}
      <line
        x1="55" y1="22"
        x2="50" y2="35"
        stroke={weakened.some(m => m.name === '심부목굴곡근') ? '#3b82f6' : '#475569'}
        strokeWidth={weakened.some(m => m.name === '심부목굴곡근') ? '2' : '1'}
      />

      {/* 목-어깨 연결 */}
      <line x1="50" y1="27" x2="45" y2="40" stroke="#475569" strokeWidth="1" />

      {/* 능형근 (약화 시 파랑) */}
      <ellipse
        cx="40" cy="55"
        rx="6" ry="10"
        fill={weakened.some(m => m.name === '능형근') ? 'rgba(59,130,246,0.2)' : 'none'}
        stroke={weakened.some(m => m.name === '능형근') ? '#3b82f6' : '#475569'}
        strokeWidth={weakened.some(m => m.name === '능형근') ? '2' : '1'}
      />

      {/* 후면삼각근 (약화 시 파랑) */}
      <ellipse
        cx="38" cy="44"
        rx="4" ry="5"
        fill={weakened.some(m => m.name === '후면삼각근') ? 'rgba(59,130,246,0.2)' : 'none'}
        stroke={weakened.some(m => m.name === '후면삼각근') ? '#3b82f6' : '#475569'}
        strokeWidth={weakened.some(m => m.name === '후면삼각근') ? '2' : '1'}
      />

      {/* 척추기립근 (약화 시 파랑) */}
      <path
        d="M 42 45 Q 38 60 40 75 Q 42 85 45 90"
        fill="none"
        stroke={weakened.some(m => m.name === '척추기립근') ? '#3b82f6' : '#475569'}
        strokeWidth={weakened.some(m => m.name === '척추기립근') ? '3' : '1'}
      />
      {weakened.some(m => m.name === '척추기립근') && (
        <ellipse
          cx="40" cy="68"
          rx="4" ry="18"
          fill="rgba(59,130,246,0.15)"
          stroke="none"
        />
      )}

      {/* 척추 */}
      <path d="M 45 40 Q 42 60 45 80 Q 48 90 50 95" fill="none" stroke="#475569" strokeWidth="1" />

      {/* 몸통 */}
      <ellipse cx="52" cy="60" rx="12" ry="20" fill="none" stroke="#475569" strokeWidth="1" />

      {/* 팔 */}
      <line x1="45" y1="42" x2="48" y2="75" stroke="#475569" strokeWidth="1" />

      {/* 다리 */}
      <line x1="50" y1="95" x2="52" y2="140" stroke="#475569" strokeWidth="1" />
    </svg>
  );
}

// ============================================================
// 스켈레톤 SVG (자세 문제 표시)
// ============================================================

interface SkeletonSVGProps {
  view: 'front' | 'side';
  hasForwardHead: boolean;
  hasRoundShoulder: boolean;
  hasKyphosis: boolean;
}

function SkeletonSVG({ view, hasForwardHead, hasRoundShoulder, hasKyphosis }: SkeletonSVGProps) {
  if (view === 'front') {
    return (
      <svg viewBox="0 0 100 150" className="w-full h-full">
        {/* 머리 */}
        <circle cx="50" cy="15" r="10" fill="none" stroke="#475569" strokeWidth="1.5" />

        {/* 목 */}
        <line x1="50" y1="25" x2="50" y2="35" stroke="#475569" strokeWidth="1.5" />

        {/* 어깨 */}
        <line
          x1="25" y1={hasRoundShoulder ? "42" : "40"}
          x2="75" y2={hasRoundShoulder ? "42" : "40"}
          stroke={hasRoundShoulder ? "#ef4444" : "#475569"}
          strokeWidth="1.5"
        />

        {/* 척추 */}
        <line x1="50" y1="35" x2="50" y2="85" stroke="#475569" strokeWidth="1.5" />

        {/* 골반 */}
        <line x1="35" y1="85" x2="65" y2="85" stroke="#475569" strokeWidth="1.5" />

        {/* 팔 */}
        <line x1="25" y1="40" x2="20" y2="70" stroke="#475569" strokeWidth="1.5" />
        <line x1="75" y1="40" x2="80" y2="70" stroke="#475569" strokeWidth="1.5" />

        {/* 다리 */}
        <line x1="40" y1="85" x2="35" y2="130" stroke="#475569" strokeWidth="1.5" />
        <line x1="60" y1="85" x2="65" y2="130" stroke="#475569" strokeWidth="1.5" />

        {/* 관절 */}
        <circle cx="50" cy="15" r="3" fill="#475569" />
        <circle cx="25" cy="40" r="3" fill={hasRoundShoulder ? "#ef4444" : "#475569"} />
        <circle cx="75" cy="40" r="3" fill={hasRoundShoulder ? "#ef4444" : "#475569"} />
        <circle cx="50" cy="85" r="3" fill="#475569" />
      </svg>
    );
  }

  // 측면 뷰
  const headOffset = hasForwardHead ? 8 : 0;
  const shoulderOffset = hasRoundShoulder ? 4 : 0;
  const kyphosisOffset = hasKyphosis ? 8 : 0; // 등굽음 정도

  return (
    <svg viewBox="0 0 100 150" className="w-full h-full">
      {/* 정상 위치 기준선 (점선) */}
      <line x1="50" y1="5" x2="50" y2="140" stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />

      {/* 머리 (거북목 시 전방 이동) */}
      <circle
        cx={50 + headOffset}
        cy="15"
        r="10"
        fill="none"
        stroke={hasForwardHead ? "#ef4444" : "#475569"}
        strokeWidth="1.5"
      />

      {/* 목 (기울어짐) */}
      <line
        x1={50 + headOffset} y1="25"
        x2={50 + shoulderOffset} y2="40"
        stroke={hasForwardHead ? "#ef4444" : "#475569"}
        strokeWidth="1.5"
      />

      {/* 어깨 (라운드숄더 시 전방 이동) */}
      <circle
        cx={50 + shoulderOffset}
        cy="40"
        r="4"
        fill={hasRoundShoulder ? "#ef4444" : "#475569"}
      />

      {/* 척추 (등굽음 시 더 굽은 커브) */}
      <path
        d={`M ${50 + shoulderOffset} 40 Q ${42 - kyphosisOffset} 55 ${45 - kyphosisOffset/2} 65 Q 48 75 50 85`}
        fill="none"
        stroke={hasKyphosis ? "#ef4444" : "#475569"}
        strokeWidth="1.5"
      />

      {/* 등굽음 영역 표시 */}
      {hasKyphosis && (
        <ellipse
          cx={43 - kyphosisOffset/2}
          cy="55"
          rx="6"
          ry="10"
          fill="rgba(239,68,68,0.15)"
          stroke="#ef4444"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
      )}

      {/* 골반 */}
      <circle cx="50" cy="85" r="4" fill="#475569" />

      {/* 다리 */}
      <line x1="50" y1="85" x2="52" y2="130" stroke="#475569" strokeWidth="1.5" />

      {/* 전방 이동 표시 화살표 */}
      {hasForwardHead && (
        <path
          d={`M 50 15 L ${50 + headOffset - 2} 15`}
          fill="none"
          stroke="#ef4444"
          strokeWidth="1"
          markerEnd="url(#arrowhead)"
        />
      )}

      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M 0 0 L 6 3 L 0 6 Z" fill="#ef4444" />
        </marker>
      </defs>
    </svg>
  );
}
