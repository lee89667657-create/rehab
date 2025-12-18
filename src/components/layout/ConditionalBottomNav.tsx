/**
 * ConditionalBottomNav
 *
 * 특정 페이지에서는 BottomNav를 숨깁니다.
 * SSR에서 안전하게 동작하도록 마운트 상태를 확인합니다.
 */

'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import BottomNav from './BottomNav';

// BottomNav를 숨길 경로들 (정확히 일치해야 하는 경로)
const EXACT_HIDDEN_PATHS = ['/', '/login', '/signup', '/reset-password', '/analyze'];

// BottomNav를 숨길 경로들 (해당 경로로 시작하면 숨김 - 단, /exercise는 제외)
const PREFIX_HIDDEN_PATHS = ['/exercise/'];

// 참고: /exercise (운동 목록 페이지)는 BottomNav 표시
// /exercise/[id] (운동 상세 페이지)는 BottomNav 숨김

export default function ConditionalBottomNav() {
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();

  // 클라이언트에서만 렌더링
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // SSR 중에는 아무것도 렌더링하지 않음
  if (!isMounted) {
    return null;
  }

  // 숨김 경로 체크
  const shouldHide =
    EXACT_HIDDEN_PATHS.includes(pathname) ||
    PREFIX_HIDDEN_PATHS.some((path) => pathname.startsWith(path));

  if (shouldHide) {
    return null;
  }

  return <BottomNav />;
}
