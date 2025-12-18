/**
 * 앱 공통 헤더 컴포넌트 - shadcn/ui 스타일
 *
 * 모든 페이지 상단에 표시되는 로고 + 앱 이름 헤더입니다.
 * 로고 클릭 시 홈(/)으로 이동합니다.
 *
 * ## 기능
 * - 다크모드 토글 버튼
 * - 설정 버튼
 *
 * ## 사용법
 * - 랜딩 페이지를 제외한 모든 페이지에서 사용
 * - 페이지 본문에 pt-14 추가 필요 (헤더 높이만큼 패딩)
 */

'use client';

import Link from 'next/link';
import { Settings, Activity } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';

export default function AppHeader() {
  return (
    <header
      className="
        fixed top-0 left-0 right-0 z-50
        bg-card
        border-b border-border
        h-14
        flex items-center justify-between
        px-4
      "
    >
      {/* 로고 + 앱 이름 - 클릭 시 홈으로 이동 */}
      <Link
        href="/"
        className="
          flex items-center gap-2.5
          hover:opacity-80
          transition-opacity duration-300
        "
      >
        {/* 로고 아이콘 (이모지 대신 Lucide 아이콘 사용) */}
        <div
          className="
            w-8 h-8
            bg-primary
            rounded-lg
            flex items-center justify-center
            shadow-sm
          "
        >
          <Activity className="w-4 h-4 text-primary-foreground" />
        </div>

        {/* 앱 이름 */}
        <span className="font-bold text-lg text-foreground">
          PostureAI
        </span>
      </Link>

      {/* 오른쪽 액션 버튼들 */}
      <div className="flex items-center gap-1">
        {/* 다크모드 토글 */}
        <ThemeToggle />

        {/* 설정 버튼 */}
        <Button variant="ghost" size="icon" asChild className="h-9 w-9">
          <Link href="/settings">
            <Settings className="h-4 w-4" />
            <span className="sr-only">설정</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
