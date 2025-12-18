/**
 * 랜딩 페이지 - 삼성 헬스케어 스타일
 *
 * 삼성 헬스케어 공식 사이트 디자인을 참고하여 제작
 * https://previous.samsunghealthcare.com/kr
 *
 * ## 디자인 특징
 * - 깔끔한 흰색 배경
 * - 삼성 블루 (#1428A0) 포인트 컬러
 * - 70px 고정 헤더 (흰색 배경 + 하단 보더)
 * - 큰 히어로 섹션 (그라데이션 배경)
 * - 미세한 그림자의 카드 컴포넌트
 * - 부드러운 호버 애니메이션
 *
 * ## 성능 최적화
 * - 서버 컴포넌트 (use client 없음)
 * - 정적 렌더링으로 빠른 초기 로딩
 */

import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ============================================================
          네비게이션 바 - 삼성 스타일
          - 흰색 배경, 하단 얇은 border
          - 높이 70px 고정
          - 좌측: 로고 (SAMSUNG 스타일)
          - 우측: 메뉴 링크들
          ============================================================ */}
      <nav className="
        fixed top-0 left-0 right-0 z-50
        bg-white
        border-b border-[#E5E8EB]
        h-[70px]
      ">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          {/* 로고 - 삼성 스타일 볼드체 */}
          <Link href="/" className="flex items-center gap-2">
            <span className="
              text-2xl font-bold tracking-tight
              text-[#1428A0]
            ">
              POSTURE
            </span>
            <span className="
              text-2xl font-light tracking-tight
              text-[#1A1A1A]
            ">
              AI
            </span>
          </Link>

          {/* 우측 메뉴 */}
          <div className="flex items-center gap-8">
            {/* 네비게이션 링크 - 데스크탑만 표시 */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="
                text-[15px] font-medium text-[#666666]
                hover:text-[#1428A0]
                transition-colors duration-300
              ">
                주요 기능
              </a>
              <a href="#how-it-works" className="
                text-[15px] font-medium text-[#666666]
                hover:text-[#1428A0]
                transition-colors duration-300
              ">
                이용 방법
              </a>
            </div>

            {/* 로그인 버튼 */}
            <Link
              href="/login"
              className="
                px-5 py-2.5
                text-[15px] font-semibold
                text-white
                bg-[#1428A0] hover:bg-[#0D1B6B]
                rounded-lg
                transition-all duration-300
                shadow-sm hover:shadow-md
              "
            >
              로그인
            </Link>
          </div>
        </div>
      </nav>

      {/* ============================================================
          히어로 섹션 - 삼성 스타일
          - 전체 너비 그라데이션 배경
          - 큰 제목 (48-60px)
          - 부제목 (18-20px)
          - CTA 버튼
          ============================================================ */}
      <section className="
        pt-[70px]
        min-h-[90vh]
        bg-gradient-to-br from-[#1428A0] via-[#1E3A8A] to-[#0D1B6B]
        flex items-center
        relative overflow-hidden
      ">
        {/* 배경 장식 요소 */}
        <div className="absolute inset-0 pointer-events-none">
          {/* 우측 상단 원형 그라데이션 */}
          <div className="
            absolute -top-20 -right-20
            w-[500px] h-[500px]
            bg-gradient-to-br from-[#0066FF]/20 to-transparent
            rounded-full blur-3xl
          " />
          {/* 좌측 하단 원형 그라데이션 */}
          <div className="
            absolute -bottom-40 -left-20
            w-[400px] h-[400px]
            bg-gradient-to-tr from-[#00D4FF]/10 to-transparent
            rounded-full blur-3xl
          " />
          {/* 그리드 패턴 오버레이 */}
          <div className="
            absolute inset-0
            bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDBNIDAgMjAgTCA0MCAyMCBNIDIwIDAgTCAyMCA0MCBNIDAgMzAgTCA0MCAzMCBNIDMwIDAgTCAzMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDMiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')]
            opacity-50
          " />
        </div>

        {/* 히어로 콘텐츠 */}
        <div className="relative max-w-7xl mx-auto px-6 py-20 w-full">
          <div className="max-w-3xl">
            {/* 뱃지 */}
            <div className="
              inline-flex items-center gap-2
              px-4 py-2 mb-6
              bg-white/10 backdrop-blur-sm
              rounded-full
              border border-white/20
            ">
              <span className="w-2 h-2 bg-[#00D4FF] rounded-full animate-pulse" />
              <span className="text-sm font-medium text-white/90">
                AI 기반 자세 분석 서비스
              </span>
            </div>

            {/* 메인 타이틀 - 삼성 스타일 큰 제목 */}
            <h1 className="
              text-5xl md:text-6xl lg:text-7xl
              font-bold
              text-white
              leading-[1.1]
              mb-6
            ">
              AI가 분석하는
              <br />
              <span className="text-[#00D4FF]">당신의 자세</span>
            </h1>

            {/* 서브 타이틀 */}
            <p className="
              text-lg md:text-xl
              text-white/80
              font-light
              leading-relaxed
              mb-10
              max-w-xl
            ">
              스마트폰 카메라만으로 전문가 수준의 자세 분석을 받아보세요.
              거북목, 라운드숄더, 골반 틀어짐을 정확하게 측정합니다.
            </p>

            {/* CTA 버튼 그룹 */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Primary CTA */}
              <Link
                href="/signup"
                className="
                  inline-flex items-center justify-center gap-2
                  px-8 py-4
                  bg-white
                  text-[#1428A0]
                  text-lg font-semibold
                  rounded-xl
                  shadow-lg shadow-black/10
                  hover:bg-[#F8F9FA]
                  hover:shadow-xl
                  transition-all duration-300
                  active:scale-[0.98]
                "
              >
                무료로 시작하기
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>

              {/* Secondary CTA */}
              <Link
                href="/login"
                className="
                  inline-flex items-center justify-center gap-2
                  px-8 py-4
                  bg-transparent
                  text-white
                  text-lg font-semibold
                  rounded-xl
                  border border-white/30
                  hover:bg-white/10
                  hover:border-white/50
                  transition-all duration-300
                  active:scale-[0.98]
                "
              >
                이미 계정이 있어요
              </Link>
            </div>
          </div>
        </div>

        {/* 하단 스크롤 표시 */}
        <div className="
          absolute bottom-8 left-1/2 -translate-x-1/2
          flex flex-col items-center gap-2
          animate-bounce
        ">
          <span className="text-sm text-white/60 font-medium">스크롤</span>
          <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* ============================================================
          주요 기능 섹션 - 삼성 스타일 카드
          - 흰색 카드, 미세한 그림자
          - 호버 시 그림자 증가
          ============================================================ */}
      <section id="features" className="py-24 px-6 bg-[#F8F9FA]">
        <div className="max-w-7xl mx-auto">
          {/* 섹션 헤더 */}
          <div className="text-center mb-16">
            <p className="
              text-sm font-semibold text-[#1428A0]
              uppercase tracking-wider
              mb-3
            ">
              Features
            </p>
            <h2 className="
              text-3xl md:text-4xl font-bold
              text-[#1A1A1A]
              mb-4
            ">
              주요 기능
            </h2>
            <p className="
              text-lg text-[#666666]
              max-w-2xl mx-auto
            ">
              AI 기술로 정확하고 빠른 자세 분석을 제공합니다
            </p>
          </div>

          {/* 기능 카드 그리드 */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* 카드 1: AI 자세 분석 */}
            <div className="
              bg-white
              rounded-2xl
              p-8
              border border-[#E5E8EB]
              shadow-sm
              hover:shadow-lg
              hover:border-[#1428A0]/20
              transition-all duration-300
              group
            ">
              {/* 아이콘 */}
              <div className="
                w-14 h-14
                bg-[#E8F0FE]
                rounded-xl
                flex items-center justify-center
                mb-6
                group-hover:bg-[#1428A0]
                transition-colors duration-300
              ">
                <svg className="w-7 h-7 text-[#1428A0] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              {/* 제목 */}
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">
                AI 자세 분석
              </h3>
              {/* 설명 */}
              <p className="text-[#666666] leading-relaxed">
                MediaPipe AI가 33개 관절을 실시간으로 인식하고 분석합니다.
                정면, 측면 촬영으로 정확한 결과를 제공해요.
              </p>
            </div>

            {/* 카드 2: 상세한 리포트 */}
            <div className="
              bg-white
              rounded-2xl
              p-8
              border border-[#E5E8EB]
              shadow-sm
              hover:shadow-lg
              hover:border-[#1428A0]/20
              transition-all duration-300
              group
            ">
              {/* 아이콘 */}
              <div className="
                w-14 h-14
                bg-[#E8F0FE]
                rounded-xl
                flex items-center justify-center
                mb-6
                group-hover:bg-[#1428A0]
                transition-colors duration-300
              ">
                <svg className="w-7 h-7 text-[#1428A0] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              {/* 제목 */}
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">
                상세한 리포트
              </h3>
              {/* 설명 */}
              <p className="text-[#666666] leading-relaxed">
                거북목, 라운드숄더, 골반 틀어짐, 무릎 정렬 상태를
                점수와 함께 상세하게 알려드립니다.
              </p>
            </div>

            {/* 카드 3: 맞춤 운동 추천 */}
            <div className="
              bg-white
              rounded-2xl
              p-8
              border border-[#E5E8EB]
              shadow-sm
              hover:shadow-lg
              hover:border-[#1428A0]/20
              transition-all duration-300
              group
            ">
              {/* 아이콘 */}
              <div className="
                w-14 h-14
                bg-[#E8F0FE]
                rounded-xl
                flex items-center justify-center
                mb-6
                group-hover:bg-[#1428A0]
                transition-colors duration-300
              ">
                <svg className="w-7 h-7 text-[#1428A0] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              {/* 제목 */}
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">
                맞춤 운동 추천
              </h3>
              {/* 설명 */}
              <p className="text-[#666666] leading-relaxed">
                분석 결과를 바탕으로 문제 부위에 맞는
                스트레칭과 교정 운동을 추천해드려요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          이용 방법 섹션 - 삼성 스타일 스텝
          ============================================================ */}
      <section id="how-it-works" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          {/* 섹션 헤더 */}
          <div className="text-center mb-16">
            <p className="
              text-sm font-semibold text-[#1428A0]
              uppercase tracking-wider
              mb-3
            ">
              How it works
            </p>
            <h2 className="
              text-3xl md:text-4xl font-bold
              text-[#1A1A1A]
              mb-4
            ">
              이렇게 사용해요
            </h2>
            <p className="
              text-lg text-[#666666]
              max-w-2xl mx-auto
            ">
              단 4단계로 자세 분석을 받을 수 있어요
            </p>
          </div>

          {/* 스텝 그리드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {/* 스텝 1 */}
            <div className="text-center">
              <div className="
                w-20 h-20 mx-auto mb-6
                bg-[#1428A0]
                rounded-2xl
                flex items-center justify-center
                shadow-lg shadow-[#1428A0]/30
              ">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">
                회원가입
              </h4>
              <p className="text-sm text-[#666666]">
                이메일로 간편 가입
              </p>
            </div>

            {/* 스텝 2 */}
            <div className="text-center">
              <div className="
                w-20 h-20 mx-auto mb-6
                bg-[#1428A0]
                rounded-2xl
                flex items-center justify-center
                shadow-lg shadow-[#1428A0]/30
              ">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">
                전신 촬영
              </h4>
              <p className="text-sm text-[#666666]">
                정면과 측면 촬영
              </p>
            </div>

            {/* 스텝 3 */}
            <div className="text-center">
              <div className="
                w-20 h-20 mx-auto mb-6
                bg-[#1428A0]
                rounded-2xl
                flex items-center justify-center
                shadow-lg shadow-[#1428A0]/30
              ">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">
                AI 분석
              </h4>
              <p className="text-sm text-[#666666]">
                자동으로 자세 분석
              </p>
            </div>

            {/* 스텝 4 */}
            <div className="text-center">
              <div className="
                w-20 h-20 mx-auto mb-6
                bg-[#1428A0]
                rounded-2xl
                flex items-center justify-center
                shadow-lg shadow-[#1428A0]/30
              ">
                <span className="text-3xl font-bold text-white">4</span>
              </div>
              <h4 className="text-lg font-bold text-[#1A1A1A] mb-2">
                맞춤 운동
              </h4>
              <p className="text-sm text-[#666666]">
                추천 운동 시작
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          CTA 섹션 - 삼성 스타일
          ============================================================ */}
      <section className="
        py-24 px-6
        bg-gradient-to-br from-[#1428A0] to-[#0D1B6B]
        relative overflow-hidden
      ">
        {/* 배경 장식 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="
            absolute top-0 right-0
            w-[400px] h-[400px]
            bg-white/5
            rounded-full blur-3xl
          " />
        </div>

        {/* CTA 콘텐츠 */}
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="
            text-3xl md:text-4xl font-bold
            text-white
            mb-6
          ">
            지금 바로 시작하세요
          </h2>
          <p className="
            text-lg text-white/80
            mb-10
          ">
            무료로 첫 자세 분석을 받아보세요. 당신의 자세가 달라집니다.
          </p>
          <Link
            href="/signup"
            className="
              inline-flex items-center gap-2
              px-10 py-5
              bg-white
              text-[#1428A0]
              text-lg font-bold
              rounded-xl
              shadow-lg
              hover:shadow-xl
              hover:bg-[#F8F9FA]
              transition-all duration-300
              active:scale-[0.98]
            "
          >
            무료 회원가입
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ============================================================
          푸터 - 삼성 스타일
          ============================================================ */}
      <footer className="py-16 px-6 bg-[#1A1A1A]">
        <div className="max-w-7xl mx-auto">
          {/* 상단 영역 */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-12">
            {/* 로고 */}
            <div className="mb-6 md:mb-0">
              <span className="text-2xl font-bold text-white">
                POSTURE<span className="font-light text-white/60">AI</span>
              </span>
            </div>

            {/* 링크들 */}
            <div className="flex gap-8">
              <a href="#" className="text-sm text-white/60 hover:text-white transition-colors">
                이용약관
              </a>
              <a href="#" className="text-sm text-white/60 hover:text-white transition-colors">
                개인정보처리방침
              </a>
              <a href="#" className="text-sm text-white/60 hover:text-white transition-colors">
                고객센터
              </a>
            </div>
          </div>

          {/* 하단 저작권 */}
          <div className="
            pt-8
            border-t border-white/10
            text-center
          ">
            <p className="text-sm text-white/40">
              © 2024 PostureAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
