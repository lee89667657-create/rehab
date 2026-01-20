/**
 * 랜딩 페이지 - High-Fidelity EverEx 스타일
 *
 * 업그레이드 사항:
 * - Framer Motion 스크롤 애니메이션 적용
 * - 고급스러운 Card UI (rounded-3xl, shadow-xl)
 * - 3D 스타일 아이콘 그래픽 (HeroIllustration)
 * - 디테일한 타이포그래피 및 여백 조정
 */

'use client';

import Link from 'next/link';
import {
  ArrowRight, Menu, Globe, Award,
  Activity, Shield, Zap, CheckCircle2
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
// Hero Illustration 컴포넌트 (CSS Composition)
// ============================================================
const HeroIllustration = () => {
  return (
    <div className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center">
      {/* 배경 원형 그라데이션 */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, delay: 0.2 }}
        className="absolute w-[300px] h-[300px] md:w-[450px] md:h-[450px] bg-blue-100/50 rounded-full blur-3xl -z-10"
      />

      {/* 메인 대시보드 카드 */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="relative bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 w-[280px] md:w-[320px] z-10"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">Posture Score</div>
            <div className="text-xs text-slate-500">AI Analysis Report</div>
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
              className={`flex-1 rounded-t-lg ${i === 3 ? 'bg-blue-600' : 'bg-slate-200'}`}
            />
          ))}
        </div>
        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
          <span className="text-xs font-medium text-slate-600">Left Shoulder</span>
          <span className="text-xs font-bold text-red-500">Imbalanced</span>
        </div>
      </motion.div>

      {/* 플로팅 뱃지 1 (Top Right) */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.0 }}
        className="absolute top-10 right-10 md:right-20 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce-slow"
      >
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-800">Excellent</div>
          <div className="text-[10px] text-slate-500">Neck Posture</div>
        </div>
      </motion.div>

      {/* 플로팅 뱃지 2 (Bottom Left) */}
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.2 }}
        className="absolute bottom-20 left-4 md:left-10 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce-reverse"
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-800">Real-time</div>
          <div className="text-[10px] text-slate-500">Tracking</div>
        </div>
      </motion.div>
    </div>
  );
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden">
      {/* ============================================================
          네비게이션 바
          ============================================================ */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">Posture<span className="text-blue-600 group-hover:text-slate-900">AI</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {['Home', 'Products', 'News', 'Careers', 'Contact'].map((item) => (
              <Link key={item} href={`#${item.toLowerCase()}`} className="text-[15px] font-medium text-slate-600 hover:text-blue-600 transition-colors relative group">
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full"></span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-6 py-2 text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-200">
                Sign In
              </Button>
            </Link>
            <button className="md:hidden text-slate-900">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </motion.nav>

      <main className="pt-20">
        {/* ============================================================
            히어로 섹션 (Split Layout)
            ============================================================ */}
        <section id="home" className="relative pt-12 md:pt-20 pb-32 overflow-hidden bg-gradient-to-br from-white via-blue-50/20 to-white">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
            {/* 텍스트 영역 */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="max-w-xl relative z-10"
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-semibold text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                AI Powered Rehabilitation
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-5xl md:text-[5rem] font-extrabold text-slate-900 leading-[1.1] mb-8 tracking-tight">
                맞춤형 재활을<br />
                <span className="text-blue-600">처방합니다.</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-xl text-slate-600 leading-relaxed mb-10 font-medium max-w-lg">
                PostureAI는 병원과 일상을 연결하는<br className="hidden md:block" />
                차세대 근골격계 디지털 헬스케어 솔루션입니다.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                <Link href="#contact">
                  <Button size="lg" className="h-14 px-8 rounded-full text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xl hover:shadow-blue-200 hover:-translate-y-1 transition-all">
                    무료 체험하기
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="#demo">
                  <Button size="lg" variant="ghost" className="h-14 px-8 rounded-full text-lg text-slate-600 hover:bg-slate-100 transition-all">
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
            미션 섹션 (Card UI)
            ============================================================ */}
        <section className="py-28 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="grid md:grid-cols-2 gap-8 items-stretch"
            >
              {/* 왼쪽 타이틀 */}
              <motion.div variants={fadeUp} className="bg-slate-900 rounded-[2.5rem] p-12 text-white shadow-2xl relative overflow-hidden flex flex-col justify-center">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-8 relative z-10">
                  병원에서도,<br />
                  일상에서도<br />
                  <span className="text-blue-400">재활은 계속되어야<br />하니까.</span>
                </h2>
                <p className="text-slate-300 text-lg leading-relaxed relative z-10">
                  의료진 기술 없이도, 집에서 쉽고 정확하게.<br />
                  연속성 있는 치료를 위한 최적의 파트너.
                </p>
              </motion.div>

              {/* 오른쪽 콘텐츠 */}
              <div className="flex flex-col gap-8">
                <motion.div variants={fadeUp} className="flex-1 bg-blue-50 rounded-[2.5rem] p-10 hover:bg-blue-100/50 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                      <Activity className="w-7 h-7" />
                    </div>
                    <ArrowRight className="w-6 h-6 text-blue-300 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">MORA Cure</h3>
                  <p className="text-slate-600 font-medium">근골격계 질환 디지털 치료기기</p>
                </motion.div>

                <motion.div variants={fadeUp} className="flex-1 bg-slate-50 rounded-[2.5rem] p-10 hover:bg-slate-100 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-800 shadow-sm group-hover:scale-110 transition-transform">
                      <Shield className="w-7 h-7" />
                    </div>
                    <ArrowRight className="w-6 h-6 text-slate-300 group-hover:text-slate-600 transition-colors" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">MORA Vu</h3>
                  <p className="text-slate-600 font-medium">AI 동작 분석 소프트웨어</p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ============================================================
            성과/수상 섹션 (Premium Cards)
            ============================================================ */}
        <section className="py-28 bg-slate-50 border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl font-bold text-slate-900">Proven Excellence</h2>
              <p className="text-slate-500 mt-2">세계가 인정한 혁신적인 기술력</p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={staggerContainer}
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
            >
              {[
                { title: 'CES 2024', sub: '혁신상 수상', desc: 'Digital Health', icon: Globe, color: 'text-blue-600', bg: 'bg-blue-100' },
                { title: '3 Awards', sub: '디자인 어워드', desc: 'iF • Red Dot • K-Design', icon: Award, color: 'text-purple-600', bg: 'bg-purple-100' },
                { title: 'Partners', sub: '주요 의료기관', desc: '서울대병원 외 20+', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-100' },
                { title: 'FDA', sub: '등록 및 승인', desc: 'Class II SaMD', icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-100' },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  variants={fadeUp}
                  whileHover={{ y: -10 }}
                  className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 flex flex-col items-center justify-center text-center group border border-transparent hover:border-slate-100"
                >
                  <div className={`w-16 h-16 rounded-3xl ${item.bg} ${item.color} flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-300`}>
                    <item.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm font-bold text-slate-600 mb-2">{item.sub}</p>
                  <span className="text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1 rounded-full">{item.desc}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ============================================================
            히스토리 섹션 (Timeline)
            ============================================================ */}
        <section className="py-28 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-16 items-start">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                  History of<br />
                  <span className="text-blue-600">Innovation</span>
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed mb-8">
                  매년 새로운 기록을 경신하며<br />
                  글로벌 디지털 헬스케어 리더로 성장하고 있습니다.
                </p>
                <Link href="#history">
                  <Button variant="outline" className="rounded-full px-6 border-slate-300 text-slate-700 hover:text-blue-600 hover:border-blue-600">
                    전체 연혁 보기
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
                className="relative border-l-2 border-slate-100 pl-10 space-y-12"
              >
                {[
                  { date: '2024.01', title: 'CES 2024 참가', desc: '글로벌 무대에서 기술력 입증' },
                  { date: '2024.02', title: 'iF 디자인 어워드', desc: '사용자 경험 혁신 인정' },
                  { date: '2024.05', title: '미국 센터 선정', desc: '본격적인 북미 시장 진출' },
                ].map((item, idx) => (
                  <motion.div key={idx} variants={fadeUp} className="relative">
                    <span className="absolute -left-[45px] top-1 w-4 h-4 rounded-full bg-white border-4 border-blue-600"></span>
                    <span className="text-blue-600 font-bold text-sm mb-1 block">{item.date}</span>
                    <h4 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h4>
                    <p className="text-slate-500">{item.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ============================================================
            CTA Footer
            ============================================================ */}
      </main>
      <footer className="bg-slate-900 text-white rounded-t-[3rem] mt-20">
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-12">
          <div className="flex flex-col md:flex-row justify-between items-center mb-20 gap-8">
            <div className="text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">재활의 새로운 기준</h2>
              <p className="text-slate-400">지금 바로 PostureAI와 시작하세요.</p>
            </div>
            <div className="flex gap-4">
              <Button className="h-14 px-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold shadow-lg shadow-blue-900/50">
                무료로 시작하기
              </Button>
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
