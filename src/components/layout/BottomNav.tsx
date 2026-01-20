/**
 * 하단 네비게이션 바 컴포넌트 - shadcn/ui 스타일
 *
 * 모든 인증된 페이지 하단에 표시되는 네비게이션 바입니다.
 * 현재 경로에 따라 활성 상태가 표시됩니다.
 *
 * ## 기능
 * - 다크모드 지원
 *
 * ## 사용법
 * - 인증된 페이지에서 사용
 * - 페이지 본문에 pb-24 추가 필요 (네비게이션 높이만큼 패딩)
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Camera, Dumbbell, History, Settings, LucideIcon } from 'lucide-react';

// 네비게이션 아이템 타입
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// 네비게이션 아이템 목록
const navItems: NavItem[] = [
  { href: '/', label: '홈', icon: Home },
  { href: '/analyze', label: '분석', icon: Camera },
  { href: '/exercise', label: '운동', icon: Dumbbell },
  { href: '/history', label: '기록', icon: History },
  { href: '/settings', label: '설정', icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  // 현재 경로가 네비게이션 아이템과 일치하는지 확인
  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-50
        bg-card
        border-t border-border
        shadow-[0_-2px_10px_rgba(0,0,0,0.05)]
        dark:shadow-[0_-2px_10px_rgba(0,0,0,0.2)]
      "
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center
                flex-1 h-full
                transition-colors duration-300
                ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}
              `}
            >
              {/* 아이콘 */}
              <div className="relative">
                <Icon
                  className={`
                    w-6 h-6
                    transition-all duration-300
                    ${active ? 'scale-110' : 'scale-100'}
                  `}
                  strokeWidth={active ? 2.5 : 2}
                />

                {/* 활성 상태 dot 인디케이터 */}
                {active && (
                  <div
                    className="
                      absolute -bottom-1 left-1/2 -translate-x-1/2
                      w-1 h-1
                      bg-primary
                      rounded-full
                    "
                  />
                )}
              </div>

              {/* 라벨 */}
              <span
                className={`
                  text-[10px] mt-1
                  transition-all duration-300
                  ${active ? 'font-bold' : 'font-medium'}
                `}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
