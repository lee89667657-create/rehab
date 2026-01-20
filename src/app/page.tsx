/**
 * 홈페이지 - 인증 상태에 따른 분기
 *
 * / 경로
 * - 비로그인: LandingPage (서비스 소개)
 * - 로그인: Dashboard + Sidebar (대시보드)
 */

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import LandingPage from '@/components/landing/LandingPage';
import Dashboard from '@/components/home/Dashboard';
import Sidebar from '@/components/layout/Sidebar';

export default function HomePage() {
  // undefined = 로딩중, null = 비로그인, User = 로그인됨
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    // 현재 세션 확인
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    checkUser();

    // 인증 상태 변화 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 로딩 중 (undefined)
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  // 비로그인 (null) → 랜딩페이지
  if (user === null) {
    return <LandingPage />;
  }

  // 로그인됨 → 사이드바 + 대시보드
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-56">
        <Dashboard />
      </main>
    </div>
  );
}
