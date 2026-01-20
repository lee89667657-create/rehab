/**
 * Sidebar.tsx
 * 교수님 UTO 프로젝트 스타일의 좌측 사이드바 네비게이션
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Camera,
  Dumbbell,
  BarChart3,
  Settings,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

// ============================================================
// 메뉴 데이터
// ============================================================

const MENU_ITEMS = [
  { icon: Home, label: '홈', href: '/' },
  { icon: Camera, label: '자세 분석', href: '/analyze' },
  { icon: Dumbbell, label: '운동', href: '/exercise' },
  { icon: BarChart3, label: '기록', href: '/history' },
  { icon: Settings, label: '설정', href: '/settings' },
];

const THEME_OPTIONS = [
  { icon: Sun, label: '라이트', value: 'light' },
  { icon: Moon, label: '다크', value: 'dark' },
];

// ============================================================
// 메인 컴포넌트
// ============================================================

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-56 border-r border-border bg-card">
      <div className="flex h-full flex-col">
        {/* 로고 */}
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Dumbbell className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold">PostureAI</h1>
            <p className="text-xs text-muted-foreground">자세 분석</p>
          </div>
        </div>

        {/* 메뉴 */}
        <div className="flex-1 overflow-y-auto p-3">
          <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">메뉴</p>
          <nav className="space-y-1">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || 
                (item.href !== '/' && pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* 모드 선택 */}
          <div className="mt-6">
            <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">모드</p>
            <div className="space-y-1">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = theme === option.value;
                
                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 하단 로그아웃 */}
        <div className="border-t border-border p-3">
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>
      </div>
    </aside>
  );
}
