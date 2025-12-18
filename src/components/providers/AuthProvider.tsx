/**
 * AuthProvider
 * Supabase 인증 상태를 관리하는 Context Provider
 * SSR에서 안전하게 동작하도록 마운트 상태를 확인합니다.
 */

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 인증이 필요 없는 공개 페이지 목록
// - '/' : 랜딩 페이지 (누구나 접근 가능)
// - '/login', '/signup', '/reset-password' : 인증 관련 페이지
const PUBLIC_PATHS = ['/', '/login', '/signup', '/reset-password'];

// 로그인한 사용자가 접근하면 /dashboard로 리다이렉트할 페이지
const AUTH_REDIRECT_PATHS = ['/login', '/signup'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // 클라이언트 마운트 확인
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 초기 세션 확인
  useEffect(() => {
    if (!isMounted) return;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN') {
          // 로그인 성공 시 대시보드로 이동
          router.push('/dashboard');
        } else if (event === 'SIGNED_OUT') {
          // 로그아웃 시 홈(랜딩 페이지)으로 이동
          router.push('/');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router, isMounted]);

  // 보호된 라우트 체크
  useEffect(() => {
    if (!isMounted || isLoading) return;

    // '/' 경로는 page.tsx에서 직접 처리하므로 여기서는 스킵
    if (pathname === '/') return;

    // 공개 페이지인지 확인 (정확히 매칭 또는 서브 경로)
    const isPublicPath = PUBLIC_PATHS.some((path) =>
      pathname === path || pathname.startsWith(path + '/')
    );

    // 로그인 사용자가 접근하면 /dashboard로 리다이렉트할 페이지인지 확인
    const shouldRedirectToDashboard = AUTH_REDIRECT_PATHS.some((path) =>
      pathname === path || pathname.startsWith(path + '/')
    );

    if (!user && !isPublicPath) {
      // 비로그인 사용자가 보호된 페이지 접근 시 → 랜딩 페이지로 리다이렉트
      router.push('/');
    } else if (user && shouldRedirectToDashboard) {
      // 로그인 사용자가 로그인/회원가입 페이지 접근 시 → /dashboard로 리다이렉트
      router.push('/dashboard');
    }
  }, [user, isLoading, pathname, router, isMounted]);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }, []);

  const handleSignUp = useCallback(
    async (email: string, password: string, name: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      if (error) throw error;
    },
    []
  );

  const handleSignOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  // 로딩 중 또는 마운트 전 스켈레톤 UI 표시
  if (!isMounted || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* 상단 헤더 스켈레톤 */}
        <div className="p-5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 w-40 bg-zinc-200 rounded-lg animate-pulse" />
              <div className="h-4 w-32 bg-zinc-100 rounded-lg animate-pulse" />
            </div>
            <div className="w-11 h-11 bg-zinc-200 rounded-full animate-pulse" />
          </div>
          {/* 메인 카드 스켈레톤 */}
          <div className="h-40 bg-zinc-200 rounded-3xl animate-pulse" />
          {/* 버튼 스켈레톤 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="h-14 bg-zinc-200 rounded-2xl animate-pulse" />
            <div className="h-14 bg-zinc-100 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * 인증 컨텍스트 훅
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
