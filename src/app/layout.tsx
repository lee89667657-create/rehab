/**
 * RootLayout
 * 앱의 루트 레이아웃 컴포넌트
 *
 * 모든 페이지에 공통으로 적용되는 레이아웃입니다.
 * - 폰트 설정 (Geist Sans, Geist Mono)
 * - 테마 관리 (ThemeProvider - 다크모드 지원)
 * - 인증 상태 관리 (AuthProvider)
 * - 하단 네비게이션 바 (ConditionalBottomNav)
 */

import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import ConditionalBottomNav from '@/components/layout/ConditionalBottomNav';

/** Geist Sans 폰트 설정 */
const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});

/** Geist Mono 폰트 설정 */
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

/** 앱 메타데이터 */
export const metadata: Metadata = {
  title: '재활 운동 도우미',
  description: 'AI 기반 재활 운동 분석 및 가이드 앱',
};

/**
 * RootLayout 컴포넌트
 *
 * 모든 페이지를 감싸는 최상위 레이아웃입니다.
 * ThemeProvider로 다크모드를 지원합니다.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {/* 메인 콘텐츠 영역 */}
            <main className="min-h-screen">
              {children}
            </main>

            {/* 하단 네비게이션 바 - 특정 페이지에서는 숨김 */}
            <ConditionalBottomNav />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
