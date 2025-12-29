/**
 * 로그인 페이지 - Calm 스타일
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

// ============================================================
// 애니메이션 설정
// ============================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// ============================================================
// 메인 컴포넌트: LoginPage
// ============================================================

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '로그인에 실패했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-6 py-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="w-full max-w-sm">
          {/* 로고 및 타이틀 */}
          <motion.div variants={itemVariants} className="text-center mb-10">
            <Link href="/" className="inline-flex items-center gap-1.5 mb-6">
              <span className="text-2xl font-semibold text-gray-800">Posture</span>
              <span className="text-2xl font-light text-blue-500">AI</span>
            </Link>

            <h1 className="text-xl font-semibold text-gray-800 mb-2">
              로그인
            </h1>
            <p className="text-gray-500 text-sm">
              AI 기반 맞춤 재활 운동 가이드
            </p>
          </motion.div>

          {/* 로그인 카드 */}
          <motion.div variants={itemVariants}>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 이메일 입력 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이메일
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      required
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* 비밀번호 입력 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    비밀번호
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="비밀번호를 입력하세요"
                      required
                      className="w-full pl-12 pr-12 py-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* 에러 메시지 */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-red-50 border border-red-100"
                  >
                    <p className="text-sm text-red-600">{error}</p>
                  </motion.div>
                )}

                {/* 로그인 버튼 */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      로그인
                    </>
                  )}
                </button>
              </form>

              {/* 비밀번호 찾기 */}
              <div className="mt-4 text-center">
                <Link
                  href="/reset-password"
                  className="text-sm text-gray-500 hover:text-blue-500 transition-colors"
                >
                  비밀번호를 잊으셨나요?
                </Link>
              </div>
            </div>
          </motion.div>

          {/* 회원가입 안내 */}
          <motion.div variants={itemVariants} className="mt-8 text-center">
            <p className="text-gray-500 text-sm mb-3">아직 계정이 없으신가요?</p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1 px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-200 transition-colors"
            >
              회원가입
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* 하단 안내 */}
          <motion.p
            variants={itemVariants}
            className="mt-8 text-center text-xs text-gray-400"
          >
            로그인 시 서비스 이용약관 및<br />개인정보 처리방침에 동의하게 됩니다.
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
