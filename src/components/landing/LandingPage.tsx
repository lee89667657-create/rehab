/**
 * 랜딩 페이지 - PostureAI 다크모드
 *
 * PostureAI - AI 자세 분석 및 맞춤 운동 추천 서비스
 * 타겟: 자세 문제가 있는 학생, 직장인, 재활 환자
 */

'use client';

import Link from 'next/link';
import {
  ArrowRight, Menu, Camera, Dumbbell,
  Activity, Mic, Sparkles, CheckCircle2,
  Smartphone, Target, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

// ============================================================
// 애니메이션 변수
// ============================================================
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  visible: { transition: { staggerChildren: 0.1 } }
};

// ============================================================
// Hero Illustration 컴포넌트
// ============================================================
const HeroIllustration = () => {
  return (
    <div className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center">
      {/* 배경 그라데이션 */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, delay: 0.2 }}
        className="absolute w-[300px] h-[300px] md:w-[450px] md:h-[450px] bg-gradient-to-br from-violet-600/30 via-blue-600/20 to-transparent rounded-full blur-3xl -z-10"
      />

      {/* 메인 분석 카드 */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="relative bg-slate-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-slate-700/50 w-[280px] md:w-[320px] z-10"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">자세 분석 결과</div>
            <div className="text-xs text-slate-400">AI Analysis Complete</div>
          </div>
        </div>

        {/* 분석 결과 항목 */}
        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
            <span className="text-sm font-medium text-slate-300">거북목</span>
            <span className="text-sm font-bold text-amber-400">주의 필요</span>
          </div>
          <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
            <span className="text-sm font-medium text-slate-300">라운드숄더</span>
            <span className="text-sm font-bold text-emerald-400">정상</span>
          </div>
          <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
            <span className="text-sm font-medium text-slate-300">등굽음</span>
            <span className="text-sm font-bold text-emerald-400">정상</span>
          </div>
        </div>

        {/* 점수 */}
        <div className="flex items-center justify-between bg-gradient-to-r from-violet-600/20 to-blue-600/20 p-4 rounded-2xl border border-violet-500/30">
          <span className="text-sm font-medium text-slate-300">종합 점수</span>
          <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">85점</span>
        </div>
      </motion.div>

      {/* 플로팅 뱃지 1 - 실시간 감지 */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.0 }}
        className="absolute top-10 right-10 md:right-20 bg-slate-800/90 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-slate-700/50 flex items-center gap-3"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white">
          <Camera className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-white">실시간 감지</div>
          <div className="text-[10px] text-slate-400">MediaPipe AI</div>
        </div>
      </motion.div>

      {/* 플로팅 뱃지 2 - 운동 추천 */}
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.2 }}
        className="absolute bottom-20 left-4 md:left-10 bg-slate-800/90 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-slate-700/50 flex items-center gap-3"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white">
          <Dumbbell className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-white">맞춤 운동</div>
          <div className="text-[10px] text-slate-400">3개 추천됨</div>
        </div>
      </motion.div>
    </div>
  );
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden">
      {/* ============================================================
          네비게이션 바
          ============================================================ */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Posture</span>
              <span className="text-white">AI</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[15px] font-medium text-slate-400 hover:text-white transition-colors">
              주요 기능
            </a>
            <a href="#how-it-works" className="text-[15px] font-medium text-slate-400 hover:text-white transition-colors">
              이용 방법
            </a>
            <a href="#target" className="text-[15px] font-medium text-slate-400 hover:text-white transition-colors">
              추천 대상
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white rounded-full px-6 py-2 text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-violet-900/30">
                로그인
              </Button>
            </Link>
            <button className="md:hidden text-white">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </motion.nav>

      <main className="pt-20">
        {/* ============================================================
            히어로 섹션
            ============================================================ */}
        <section id="home" className="relative pt-12 md:pt-20 pb-32 overflow-hidden">
          {/* 배경 그라데이션 효과 */}
          <div className="absolute inset-0 bg-gradient-to-b from-violet-950/50 via-slate-950 to-slate-950 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-violet-600/20 via-blue-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center relative z-10">
            {/* 텍스트 영역 */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="max-w-xl relative z-10"
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 font-semibold text-sm">
                <Sparkles className="w-4 h-4" />
                AI 기반 자세 분석 서비스
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.15] mb-8 tracking-tight">
                AI 자세 분석으로<br />
                <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">건강한 일상을 시작하세요</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-lg md:text-xl text-slate-400 leading-relaxed mb-10 font-medium max-w-lg">
                스마트폰 카메라만으로 거북목, 라운드숄더, 등굽음을 분석하고 맞춤 운동을 받아보세요.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                <Link href="/analyze">
                  <Button size="lg" className="h-14 px-8 rounded-full text-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-xl shadow-violet-900/30 hover:-translate-y-1 transition-all">
                    무료 분석 시작하기
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="ghost" className="h-14 px-8 rounded-full text-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all border border-slate-700">
                    로그인
                  </Button>
                </Link>
              </motion.div>

              {/* 신뢰 지표 */}
              <motion.div variants={fadeUp} className="flex items-center gap-6 mt-10 pt-10 border-t border-slate-800">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">100%</div>
                  <div className="text-xs text-slate-500">무료 이용</div>
                </div>
                <div className="w-px h-10 bg-slate-800" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">30초</div>
                  <div className="text-xs text-slate-500">빠른 분석</div>
                </div>
                <div className="w-px h-10 bg-slate-800" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">AI</div>
                  <div className="text-xs text-slate-500">정밀 감지</div>
                </div>
              </motion.div>
            </motion.div>

            {/* 그래픽 영역 */}
            <div className="relative">
              <HeroIllustration />
            </div>
          </div>
        </section>

        {/* ============================================================
            핵심 기능 섹션
            ============================================================ */}
        <section id="features" className="py-28 bg-slate-950">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">핵심 기능</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                AI가 분석하고, 맞춤 운동으로 교정합니다
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="grid md:grid-cols-3 gap-8"
            >
              {/* 기능 1: AI 자세 분석 */}
              <motion.div
                variants={fadeUp}
                className="bg-slate-900/50 backdrop-blur-sm rounded-[2rem] p-8 border border-slate-800 hover:border-violet-500/50 transition-colors group"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-violet-900/30">
                  <Camera className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">AI 자세 분석</h3>
                <p className="text-slate-400 leading-relaxed mb-4">
                  MediaPipe 기반 정밀 AI가 스마트폰 카메라로 거북목, 라운드숄더, 등굽음을 정확하게 분석합니다.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    거북목 각도 측정
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    어깨 정렬 분석
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    등굽음 정도 평가
                  </li>
                </ul>
              </motion.div>

              {/* 기능 2: 맞춤 운동 추천 */}
              <motion.div
                variants={fadeUp}
                className="bg-slate-900/50 backdrop-blur-sm rounded-[2rem] p-8 border border-slate-800 hover:border-blue-500/50 transition-colors group"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-blue-900/30">
                  <Target className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">맞춤 운동 추천</h3>
                <p className="text-slate-400 leading-relaxed mb-4">
                  분석 결과에 따라 개인화된 운동 프로그램을 추천합니다. 난이도별 스트레칭과 근력 운동을 제공합니다.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    개인 맞춤 운동 프로그램
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    난이도별 단계적 구성
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    스트레칭 & 근력 운동
                  </li>
                </ul>
              </motion.div>

              {/* 기능 3: 실시간 코칭 */}
              <motion.div
                variants={fadeUp}
                className="bg-slate-900/50 backdrop-blur-sm rounded-[2rem] p-8 border border-slate-800 hover:border-emerald-500/50 transition-colors group"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-cyan-600 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-900/30">
                  <Mic className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">실시간 코칭</h3>
                <p className="text-slate-400 leading-relaxed mb-4">
                  카메라로 운동 자세를 실시간 감지하고, 자동 카운팅과 음성 안내로 정확한 운동을 도와드립니다.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    실시간 자세 감지
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    자동 횟수 카운팅
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    음성 피드백 안내
                  </li>
                </ul>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ============================================================
            이용 방법 섹션
            ============================================================ */}
        <section id="how-it-works" className="py-28 bg-slate-900/50 border-y border-slate-800">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">이용 방법</h2>
              <p className="text-slate-400 text-lg">스마트폰 하나로 시작하는 자세 교정</p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid md:grid-cols-3 gap-8"
            >
              {[
                {
                  step: '01',
                  title: '카메라로 촬영',
                  desc: '스마트폰 카메라 앞에 서서 정면/측면 자세를 촬영합니다.',
                  icon: Smartphone,
                  gradient: 'from-violet-600 to-blue-600'
                },
                {
                  step: '02',
                  title: 'AI가 분석',
                  desc: 'MediaPipe AI가 자세를 분석하여 문제점을 찾아냅니다.',
                  icon: Activity,
                  gradient: 'from-blue-600 to-cyan-600'
                },
                {
                  step: '03',
                  title: '맞춤 운동 시작',
                  desc: '분석 결과에 맞는 운동을 실시간 코칭과 함께 시작합니다.',
                  icon: TrendingUp,
                  gradient: 'from-emerald-600 to-cyan-600'
                }
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  variants={fadeUp}
                  className="relative text-center"
                >
                  {/* 연결선 */}
                  {idx < 2 && (
                    <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-slate-700 to-slate-800" />
                  )}

                  <div className={`w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-xl relative z-10`}>
                    <item.icon className="w-10 h-10" />
                  </div>
                  <div className="text-violet-400 font-bold text-sm mb-2">STEP {item.step}</div>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-slate-400">{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ============================================================
            추천 대상 섹션
            ============================================================ */}
        <section id="target" className="py-28 bg-slate-950">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="grid md:grid-cols-2 gap-8 items-center"
            >
              {/* 왼쪽 타이틀 */}
              <motion.div variants={fadeUp}>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                  이런 분들께<br />
                  <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">추천합니다</span>
                </h2>
                <p className="text-slate-400 text-lg leading-relaxed mb-8">
                  장시간 앉아서 공부하거나 일하는 분들,<br />
                  자세 문제로 불편함을 겪는 모든 분들을 위한 서비스입니다.
                </p>
                <Link href="/analyze">
                  <Button className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white rounded-full px-8 py-3 text-lg font-semibold shadow-lg shadow-violet-900/30">
                    무료 분석 시작하기
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </motion.div>

              {/* 오른쪽 카드 */}
              <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
                {[
                  { title: '학생', desc: '장시간 공부하는', icon: '📚' },
                  { title: '직장인', desc: '오래 앉아 일하는', icon: '💼' },
                  { title: '재활 환자', desc: '자세 교정이 필요한', icon: '🏥' },
                  { title: '운동 초보자', desc: '올바른 자세를 배우고 싶은', icon: '🏃' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-800 hover:border-violet-500/30 transition-colors"
                  >
                    <div className="text-3xl mb-3">{item.icon}</div>
                    <div className="text-sm text-slate-500 mb-1">{item.desc}</div>
                    <div className="text-lg font-bold text-white">{item.title}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ============================================================
            CTA 섹션
            ============================================================ */}
        <section className="py-28 bg-gradient-to-b from-slate-950 to-slate-900">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                당신의 자세,<br />
                <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">AI가 케어합니다</span>
              </h2>
              <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
                지금 바로 무료로 자세를 분석하고<br />
                맞춤 운동 프로그램을 받아보세요.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/analyze">
                  <Button size="lg" className="h-14 px-10 rounded-full text-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-xl shadow-violet-900/30">
                    무료 분석 시작하기
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="lg" variant="outline" className="h-14 px-10 rounded-full text-lg border-slate-700 text-white hover:bg-slate-800">
                    회원가입
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ============================================================
          Footer
          ============================================================ */}
      <footer className="bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold">
                <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Posture</span>
                <span className="text-white">AI</span>
              </span>
              <span className="text-slate-500 text-sm ml-4">AI 자세 분석 서비스</span>
            </div>
            <div className="flex gap-6 text-sm text-slate-500">
              <Link href="/login" className="hover:text-white transition-colors">로그인</Link>
              <Link href="/signup" className="hover:text-white transition-colors">회원가입</Link>
              <Link href="/analyze" className="hover:text-white transition-colors">자세 분석</Link>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-600">
            © 2024 PostureAI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
