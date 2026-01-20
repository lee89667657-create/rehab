/**
 * 랜딩 페이지 - Dark Mode MORA Vu 스타일
 *
 * 디자인 특징:
 * - 다크모드 배경 (어두운 색상)
 * - MORA Vu 스타일 참고
 * - 보라색/파란색 그라데이션 버튼
 * - Framer Motion 애니메이션
 */

'use client';

import Link from 'next/link';
import {
  ArrowRight, Menu, Globe, Award,
  Activity, Shield, Zap, CheckCircle2, Sparkles
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
// Hero Illustration 컴포넌트 (다크모드)
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

      {/* 메인 대시보드 카드 */}
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
            <div className="text-sm font-bold text-white">Posture Score</div>
            <div className="text-xs text-slate-400">AI Analysis Report</div>
          </div>
        </div>
        {/* 차트 시각화 */}
        <div className="flex items-end gap-2 h-32 mb-4 px-2">
          {[40, 65, 50, 85, 60].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ duration: 0.5, delay: 0.8 + (i * 0.1) }}
              className={`flex-1 rounded-t-lg ${i === 3 ? 'bg-gradient-to-t from-violet-600 to-blue-500' : 'bg-slate-700'}`}
            />
          ))}
        </div>
        <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-2xl border border-slate-700/50">
          <span className="text-xs font-medium text-slate-300">Left Shoulder</span>
          <span className="text-xs font-bold text-amber-400">Imbalanced</span>
        </div>
      </motion.div>

      {/* 플로팅 뱃지 1 (Top Right) */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.0 }}
        className="absolute top-10 right-10 md:right-20 bg-slate-800/90 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-slate-700/50 flex items-center gap-3 animate-bounce-slow"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-white">Excellent</div>
          <div className="text-[10px] text-slate-400">Neck Posture</div>
        </div>
      </motion.div>

      {/* 플로팅 뱃지 2 (Bottom Left) */}
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.2 }}
        className="absolute bottom-20 left-4 md:left-10 bg-slate-800/90 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-slate-700/50 flex items-center gap-3 animate-bounce-reverse"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-white">Real-time</div>
          <div className="text-[10px] text-slate-400">Tracking</div>
        </div>
      </motion.div>
    </div>
  );
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden">
      {/* ============================================================
          네비게이션 바 (다크모드)
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
            {['Home', 'Products', 'News', 'Careers', 'Contact'].map((item) => (
              <Link key={item} href={`#${item.toLowerCase()}`} className="text-[15px] font-medium text-slate-400 hover:text-white transition-colors relative group">
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-blue-500 transition-all group-hover:w-full"></span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white rounded-full px-6 py-2 text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-violet-900/30">
                Sign In
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
            히어로 섹션 (다크모드)
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
                AI Powered Rehabilitation
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-5xl md:text-[5rem] font-extrabold leading-[1.1] mb-8 tracking-tight">
                맞춤형 재활을<br />
                <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">처방합니다.</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-xl text-slate-400 leading-relaxed mb-10 font-medium max-w-lg">
                PostureAI는 병원과 일상을 연결하는<br className="hidden md:block" />
                차세대 근골격계 디지털 헬스케어 솔루션입니다.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                <Link href="/signup">
                  <Button size="lg" className="h-14 px-8 rounded-full text-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-xl shadow-violet-900/30 hover:-translate-y-1 transition-all">
                    무료 체험하기
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="#demo">
                  <Button size="lg" variant="ghost" className="h-14 px-8 rounded-full text-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all border border-slate-700">
                    데모 영상 보기
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            {/* 그래픽 영역 */}
            <div className="relative">
              <HeroIllustration />
            </div>
          </div>
        </section>

        {/* ============================================================
            미션 섹션 (다크모드 Card UI)
            ============================================================ */}
        <section className="py-28 bg-slate-950">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="grid md:grid-cols-2 gap-8 items-stretch"
            >
              {/* 왼쪽 타이틀 */}
              <motion.div variants={fadeUp} className="bg-gradient-to-br from-violet-900/50 to-blue-900/50 rounded-[2.5rem] p-12 text-white shadow-2xl relative overflow-hidden flex flex-col justify-center border border-violet-700/30">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-8 relative z-10">
                  병원에서도,<br />
                  일상에서도<br />
                  <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">재활은 계속되어야<br />하니까.</span>
                </h2>
                <p className="text-slate-300 text-lg leading-relaxed relative z-10">
                  의료진 기술 없이도, 집에서 쉽고 정확하게.<br />
                  연속성 있는 치료를 위한 최적의 파트너.
                </p>
              </motion.div>

              {/* 오른쪽 콘텐츠 */}
              <div className="flex flex-col gap-8">
                <motion.div variants={fadeUp} className="flex-1 bg-slate-900/50 backdrop-blur-sm rounded-[2.5rem] p-10 hover:bg-slate-800/50 transition-colors cursor-pointer group border border-slate-800">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-900/30 group-hover:scale-110 transition-transform">
                      <Activity className="w-7 h-7" />
                    </div>
                    <ArrowRight className="w-6 h-6 text-slate-600 group-hover:text-violet-400 transition-colors" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">MORA Cure</h3>
                  <p className="text-slate-400 font-medium">근골격계 질환 디지털 치료기기</p>
                </motion.div>

                <motion.div variants={fadeUp} className="flex-1 bg-slate-900/50 backdrop-blur-sm rounded-[2.5rem] p-10 hover:bg-slate-800/50 transition-colors cursor-pointer group border border-slate-800">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-900/30 group-hover:scale-110 transition-transform">
                      <Shield className="w-7 h-7" />
                    </div>
                    <ArrowRight className="w-6 h-6 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">MORA Vu</h3>
                  <p className="text-slate-400 font-medium">AI 동작 분석 소프트웨어</p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ============================================================
            성과/수상 섹션 (다크모드 Premium Cards)
            ============================================================ */}
        <section className="py-28 bg-slate-900/50 border-y border-slate-800">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl font-bold text-white">Proven Excellence</h2>
              <p className="text-slate-400 mt-2">세계가 인정한 혁신적인 기술력</p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={staggerContainer}
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
            >
              {[
                { title: 'CES 2024', sub: '혁신상 수상', desc: 'Digital Health', icon: Globe, gradient: 'from-violet-600 to-blue-600' },
                { title: '3 Awards', sub: '디자인 어워드', desc: 'iF · Red Dot · K-Design', icon: Award, gradient: 'from-purple-600 to-pink-600' },
                { title: 'Partners', sub: '주요 의료기관', desc: '서울대병원 외 20+', icon: Activity, gradient: 'from-emerald-600 to-cyan-600' },
                { title: 'FDA', sub: '등록 및 승인', desc: 'Class II SaMD', icon: Shield, gradient: 'from-blue-600 to-indigo-600' },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  variants={fadeUp}
                  whileHover={{ y: -10 }}
                  className="bg-slate-900/80 backdrop-blur-sm p-8 rounded-[2rem] shadow-xl border border-slate-800 flex flex-col items-center justify-center text-center group hover:border-slate-700 transition-colors"
                >
                  <div className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${item.gradient} text-white flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-300 shadow-lg`}>
                    <item.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-sm font-bold text-slate-300 mb-2">{item.sub}</p>
                  <span className="text-xs text-slate-500 font-medium bg-slate-800 px-3 py-1 rounded-full">{item.desc}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ============================================================
            히스토리 섹션 (다크모드 Timeline)
            ============================================================ */}
        <section className="py-28 overflow-hidden bg-slate-950">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-16 items-start">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                  History of<br />
                  <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Innovation</span>
                </h2>
                <p className="text-lg text-slate-400 leading-relaxed mb-8">
                  매년 새로운 기록을 경신하며<br />
                  글로벌 디지털 헬스케어 리더로 성장하고 있습니다.
                </p>
                <Link href="#history">
                  <Button variant="outline" className="rounded-full px-6 border-slate-700 text-slate-300 hover:text-white hover:border-violet-500 hover:bg-violet-500/10">
                    전체 연혁 보기
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
                className="relative border-l-2 border-slate-800 pl-10 space-y-12"
              >
                {[
                  { date: '2024.01', title: 'CES 2024 참가', desc: '글로벌 무대에서 기술력 입증' },
                  { date: '2024.02', title: 'iF 디자인 어워드', desc: '사용자 경험 혁신 인정' },
                  { date: '2024.05', title: '미국 센터 선정', desc: '본격적인 북미 시장 진출' },
                ].map((item, idx) => (
                  <motion.div key={idx} variants={fadeUp} className="relative">
                    <span className="absolute -left-[45px] top-1 w-4 h-4 rounded-full bg-slate-950 border-4 border-violet-500"></span>
                    <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent font-bold text-sm mb-1 block">{item.date}</span>
                    <h4 className="text-xl font-bold text-white mb-2">{item.title}</h4>
                    <p className="text-slate-400">{item.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================
          Footer (다크모드)
          ============================================================ */}
      <footer className="bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-12">
          <div className="flex flex-col md:flex-row justify-between items-center mb-20 gap-8">
            <div className="text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">재활의 새로운 기준</h2>
              <p className="text-slate-400">지금 바로 PostureAI와 시작하세요.</p>
            </div>
            <div className="flex gap-4">
              <Link href="/signup">
                <Button className="h-14 px-8 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-lg font-bold shadow-lg shadow-violet-900/30">
                  무료로 시작하기
                </Button>
              </Link>
              <Button variant="outline" className="h-14 px-8 rounded-full border-slate-700 text-white hover:bg-slate-800 hover:text-white text-lg">
                문의하기
              </Button>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-10 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500 gap-4">
            <p>© 2024 PostureAI Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms</Link>
              <Link href="#" className="hover:text-white transition-colors">Sitemap</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
