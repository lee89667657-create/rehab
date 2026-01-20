/**
 * HomePage.tsx
 * 교수님 UTO 프로젝트 스타일의 심플한 홈페이지
 * 
 * - 깔끔한 카드 그리드 레이아웃
 * - 컬러풀한 아이콘
 * - 기술 스택 & 주요 기능 표시
 */

'use client';

import Link from 'next/link';
import {
  Camera,
  Dumbbell,
  BarChart3,
  Settings,
  User,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

// ============================================================
// 기능 카드 데이터
// ============================================================

const FEATURES = [
  {
    title: '자세 분석',
    description: '정면/측면 사진으로 거북목, 라운드숄더를 분석합니다.',
    icon: Camera,
    href: '/analyze',
    color: 'bg-blue-500/100/10 border-blue-500/20 hover:bg-blue-500/200/100/20',
    iconColor: 'text-blue-500',
  },
  {
    title: '맞춤 운동',
    description: '분석 결과에 맞는 교정 운동을 추천하고 실시간 카운팅합니다.',
    icon: Dumbbell,
    href: '/exercise',
    color: 'bg-green-500/100/10 border-green-500/20 hover:bg-green-500/100/20',
    iconColor: 'text-green-500',
  },
  {
    title: '운동 기록',
    description: '완료한 운동과 분석 기록을 확인할 수 있습니다.',
    icon: BarChart3,
    href: '/history',
    color: 'bg-purple-500/100/10 border-purple-500/20 hover:bg-purple-500/100/20',
    iconColor: 'text-purple-500',
  },
  {
    title: '통계',
    description: '주간/월간 운동 통계와 자세 개선 추이를 확인합니다.',
    icon: Activity,
    href: '/stats',
    color: 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20',
    iconColor: 'text-orange-500',
  },
  {
    title: '설정',
    description: '알림, 목표, 계정 설정을 관리합니다.',
    icon: Settings,
    href: '/settings',
    color: 'bg-muted0/10 border-gray-500/20 hover:bg-muted0/20',
    iconColor: 'text-muted-foreground',
  },
];

// ============================================================
// 기술 스택
// ============================================================

const TECH_STACK = [
  { name: 'MediaPipe', desc: 'Pose Detection' },
  { name: 'Next.js 14', desc: 'App Router' },
  { name: 'TypeScript', desc: 'Type Safety' },
  { name: 'Supabase', desc: 'Backend' },
];

// ============================================================
// 주요 기능 목록
// ============================================================

const FEATURES_LIST = [
  '33개 신체 랜드마크 실시간 감지',
  '거북목/라운드숄더 자동 분석',
  '물리치료사 설계 맞춤 운동',
  '실시간 운동 자동 카운팅',
  '한국어 음성 피드백',
  'Supabase 클라우드 저장',
];

// ============================================================
// 메인 컴포넌트
// ============================================================

export default function HomePage() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">PostureAI</h1>
            <p className="text-muted-foreground mt-1">
              AI 기반 자세 분석 및 교정 운동 시스템
            </p>
          </div>
          
          {/* 사용자 정보 */}
          {user && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {user.email?.split('@')[0]}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>

        {/* 기능 카드 그리드 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.href}
                href={feature.href}
                className={`
                  group relative rounded-xl border p-5 transition-all
                  ${feature.color}
                `}
              >
                <Icon className={`w-8 h-8 mb-3 ${feature.iconColor}`} />
                <h2 className="font-semibold mb-1">{feature.title}</h2>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Link>
            );
          })}
        </div>

        {/* 하단 정보 */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* 기술 스택 */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold mb-3">기술 스택</h3>
            <div className="grid grid-cols-2 gap-2">
              {TECH_STACK.map((tech) => (
                <div
                  key={tech.name}
                  className="rounded-lg bg-muted p-2.5 text-center"
                >
                  <div className="font-medium text-sm">{tech.name}</div>
                  <div className="text-xs text-muted-foreground">{tech.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 주요 기능 */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold mb-3">주요 기능</h3>
            <ul className="space-y-1.5">
              {FEATURES_LIST.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500/100 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 푸터 */}
        <div className="mt-8 pt-6 border-t text-center">
          <p className="text-sm text-muted-foreground">
            물리치료사가 설계한 자세 교정 프로그램
          </p>
        </div>
      </div>
    </div>
  );
}
