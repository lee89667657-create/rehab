/**
 * Header.tsx
 * 앱 상단 헤더 컴포넌트
 *
 * 모바일 앱 스타일의 상단 헤더입니다.
 * - title: 페이지 제목 표시
 * - showBack: 뒤로가기 버튼 표시 여부
 * - rightAction: 오른쪽 영역 커스텀 버튼
 * - sticky 포지션으로 상단 고정
 */

'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

/**
 * Header 컴포넌트의 Props 타입 정의
 */
interface HeaderProps {
  /** 페이지 제목 (중앙에 표시) */
  title: string;

  /**
   * 뒤로가기 버튼 표시 여부
   * true면 왼쪽에 < 아이콘 버튼이 나타남
   * 클릭시 router.back() 호출
   */
  showBack?: boolean;

  /**
   * 오른쪽 영역 커스텀 액션
   * 버튼, 아이콘 등 원하는 ReactNode를 전달
   * @example
   * rightAction={<button onClick={handleSave}>저장</button>}
   */
  rightAction?: ReactNode;
}

/**
 * Header 컴포넌트
 *
 * 앱 상단에 고정되는 네비게이션 헤더입니다.
 * 페이지 제목을 표시하고, 뒤로가기 및 커스텀 액션을 지원합니다.
 *
 * @example
 * // 기본 사용법 (제목만)
 * <Header title="홈" />
 *
 * @example
 * // 뒤로가기 버튼 포함
 * <Header title="운동 상세" showBack />
 *
 * @example
 * // 오른쪽 액션 버튼 포함
 * <Header
 *   title="프로필"
 *   rightAction={<Button size="sm">편집</Button>}
 * />
 */
export default function Header({
  title,
  showBack = false,
  rightAction,
}: HeaderProps) {
  const router = useRouter();

  /**
   * 뒤로가기 버튼 클릭 핸들러
   * 브라우저 히스토리에서 이전 페이지로 이동
   */
  const handleBack = () => {
    router.back();
  };

  return (
    <header
      className="
        sticky top-0 z-50
        h-14
        flex items-center justify-between
        px-4
        bg-white
        border-b border-zinc-200
      "
    >
      {/* 왼쪽 영역: 뒤로가기 버튼 또는 빈 공간 */}
      <div className="w-10 flex items-center justify-start">
        {showBack && (
          <button
            onClick={handleBack}
            className="
              -ml-2 p-2
              rounded-lg
              text-zinc-700
              hover:bg-zinc-100
              active:bg-zinc-200
              transition-colors duration-150
            "
            aria-label="뒤로 가기"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* 중앙 영역: 페이지 제목 */}
      <h1 className="text-base font-semibold text-zinc-900">
        {title}
      </h1>

      {/* 오른쪽 영역: 커스텀 액션 또는 빈 공간 */}
      <div className="w-10 flex items-center justify-end">
        {rightAction}
      </div>
    </header>
  );
}
