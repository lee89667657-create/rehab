/**
 * 랜딩 페이지 - Calm 스타일
 *
 * 차분하고 미니멀한 디자인
 * - 밝고 깨끗한 화이트/그레이 배경
 * - 부드러운 블루 (#3B82F6) 포인트
 * - 넉넉한 여백과 둥근 모서리
 */

import Link from 'next/link';
import { Camera, BarChart3, Heart, ArrowRight, ChevronDown } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ============================================================
          네비게이션 바 - Calm 스타일
          ============================================================ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-xl font-semibold text-gray-800">Posture</span>
            <span className="text-xl font-light text-blue-500">AI</span>
          </Link>

          {/* 우측 메뉴 */}
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
                기능
              </a>
              <a href="#how-it-works" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
                이용방법
              </a>
            </div>

            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
            >
              시작하기
            </Link>
          </div>
        </div>
      </nav>

      {/* ============================================================
          히어로 섹션 - Calm 스타일
          부드러운 그라데이션 배경
          ============================================================ */}
      <section className="pt-16 min-h-[85vh] bg-gradient-to-b from-blue-50 via-white to-white flex items-center">
        <div className="max-w-6xl mx-auto px-6 py-20 w-full">
          <div className="max-w-2xl mx-auto text-center">
            {/* 뱃지 */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 bg-blue-50 border border-blue-100 rounded-full">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              <span className="text-xs font-medium text-blue-600">AI 기반 자세 분석</span>
            </div>

            {/* 메인 타이틀 */}
            <h1 className="text-4xl md:text-5xl font-semibold text-gray-800 leading-tight mb-6">
              당신의 자세를
              <br />
              <span className="text-blue-500">건강하게</span> 바꿔드려요
            </h1>

            {/* 서브 타이틀 */}
            <p className="text-lg text-gray-500 leading-relaxed mb-10 max-w-lg mx-auto">
              장시간 앉아있는 학생과 직장인을 위한 스마트 자세 분석.
              스마트폰 카메라로 간편하게 확인하세요.
            </p>

            {/* CTA 버튼 그룹 */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
              >
                무료로 시작하기
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-200 transition-all"
              >
                로그인
              </Link>
            </div>
          </div>
        </div>

        {/* 스크롤 표시 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce">
          <ChevronDown className="w-5 h-5 text-gray-300" />
        </div>
      </section>

      {/* ============================================================
          주요 기능 섹션 - Calm 스타일 카드
          ============================================================ */}
      <section id="features" className="py-20 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          {/* 섹션 헤더 */}
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-blue-500 mb-2">Features</p>
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-3">
              주요 기능
            </h2>
            <p className="text-gray-500 max-w-md mx-auto">
              AI 기술로 정확하고 빠른 자세 분석을 제공합니다
            </p>
          </div>

          {/* 기능 카드 그리드 */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* 카드 1: AI 자세 분석 */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-5">
                <Camera className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                AI 자세 분석
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                MediaPipe AI가 33개 관절을 실시간으로 인식하고 분석합니다.
              </p>
            </div>

            {/* 카드 2: 상세한 리포트 */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-5">
                <BarChart3 className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                상세한 리포트
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                거북목, 라운드숄더 상태를 점수와 함께 상세하게 분석해드려요.
              </p>
            </div>

            {/* 카드 3: 맞춤 운동 추천 */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mb-5">
                <Heart className="w-6 h-6 text-rose-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                맞춤 운동 추천
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                분석 결과를 바탕으로 문제 부위에 맞는 교정 운동을 추천해요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          이용 방법 섹션 - Calm 스타일 스텝
          ============================================================ */}
      <section id="how-it-works" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          {/* 섹션 헤더 */}
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-blue-500 mb-2">How it works</p>
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-3">
              이렇게 사용해요
            </h2>
            <p className="text-gray-500">
              단 4단계로 자세 분석을 받을 수 있어요
            </p>
          </div>

          {/* 스텝 그리드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { step: 1, title: '회원가입', desc: '이메일로 간편 가입' },
              { step: 2, title: '전신 촬영', desc: '정면과 측면 촬영' },
              { step: 3, title: 'AI 분석', desc: '자동으로 자세 분석' },
              { step: 4, title: '맞춤 운동', desc: '추천 운동 시작' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 bg-blue-500 rounded-2xl flex items-center justify-center shadow-sm">
                  <span className="text-xl font-semibold text-white">{item.step}</span>
                </div>
                <h4 className="text-base font-semibold text-gray-800 mb-1">
                  {item.title}
                </h4>
                <p className="text-sm text-gray-500">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          CTA 섹션 - Calm 스타일
          ============================================================ */}
      <section className="py-20 px-6 bg-gradient-to-br from-blue-500 to-blue-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-white mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-blue-100 mb-8">
            무료로 첫 자세 분석을 받아보세요
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all"
          >
            무료 회원가입
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ============================================================
          푸터 - Calm 스타일
          ============================================================ */}
      <footer className="py-12 px-6 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <span className="text-lg font-medium text-white mb-4 md:mb-0">
              Posture<span className="font-light text-gray-400">AI</span>
            </span>

            <div className="flex gap-6">
              <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                이용약관
              </a>
              <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                개인정보처리방침
              </a>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-800 text-center">
            <p className="text-sm text-gray-500">
              © 2024 PostureAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
