/**
 * 대시보드 페이지 (로그인 필수)
 *
 * /dashboard 경로
 * - 로그인한 사용자만 접근 가능
 * - 비로그인 시 /login으로 자동 리다이렉트 (AuthProvider에서 처리)
 */

'use client';

import Dashboard from '@/components/home/Dashboard';

export default function DashboardPage() {
  return <Dashboard />;
}
