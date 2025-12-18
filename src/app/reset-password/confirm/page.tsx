/**
 * 비밀번호 재설정 확인 페이지 - 삼성헬스 스타일
 *
 * 이메일 링크를 클릭한 후 새 비밀번호를 입력하는 페이지입니다.
 *
 * ## 디자인 특징
 * - 화이트/그레이 배경 그라데이션
 * - 블루 포인트 컬러 (삼성헬스 스타일)
 * - 글래스모피즘 카드 효과
 * - rounded-2xl 입력 필드
 * - h-14 버튼 (48px+)
 * - 비밀번호 강도 표시
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  KeyRound,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ============================================================
// 애니메이션 설정
// ============================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// ============================================================
// 유틸리티: 비밀번호 강도 계산
// ============================================================

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;

  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: '약함', color: 'bg-red-500' };
  if (score === 2) return { score, label: '보통', color: 'bg-yellow-500' };
  if (score === 3) return { score, label: '강함', color: 'bg-blue-500' };
  return { score, label: '매우 강함', color: 'bg-emerald-500' };
}

// ============================================================
// 컴포넌트: 비밀번호 강도 표시
// ============================================================

function PasswordStrengthIndicator({ password }: { password: string }) {
  const strength = getPasswordStrength(password);

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`
              h-1 flex-1 rounded-full transition-colors duration-200
              ${level <= strength.score ? strength.color : 'bg-zinc-200'}
            `}
          />
        ))}
      </div>
      <p className={`text-xs ${strength.score <= 1 ? 'text-red-500' : 'text-zinc-500'}`}>
        비밀번호 강도: {strength.label}
      </p>
    </div>
  );
}

// ============================================================
// 메인 컴포넌트: ResetPasswordConfirmPage
// ============================================================

export default function ResetPasswordConfirmPage() {
  const router = useRouter();

  // 상태
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  // 비밀번호 일치 여부
  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return true;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  // 세션 확인 (이메일 링크에서 온 건지 확인)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsValidSession(!!session);
    };
    checkSession();
  }, []);

  // 비밀번호 업데이트
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;
      setIsSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '비밀번호 변경에 실패했습니다. 다시 시도해주세요.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // 세션 확인 중
  // ============================================================
  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ============================================================
  // 유효하지 않은 세션
  // ============================================================
  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50/50 via-white to-slate-50 flex flex-col">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-red-400/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-zinc-400/15 rounded-full blur-3xl" />
        </div>

        <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="
              w-24 h-24 rounded-full
              bg-gradient-to-br from-red-400 to-red-600
              flex items-center justify-center
              mb-8 shadow-xl shadow-red-500/30
            "
          >
            <AlertCircle className="w-12 h-12 text-white" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <h1 className="text-2xl font-bold text-zinc-900 mb-3">
              링크가 만료되었습니다
            </h1>
            <p className="text-zinc-500 mb-8">
              비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다.
              <br />
              다시 요청해주세요.
            </p>

            <button
              onClick={() => router.push('/reset-password')}
              className="
                inline-flex items-center gap-2
                px-8 py-4
                bg-gradient-to-r from-blue-500 to-blue-600
                hover:from-blue-600 hover:to-blue-700
                text-white font-semibold
                rounded-2xl
                shadow-lg shadow-blue-500/30
                transition-all duration-200
                active:scale-[0.98]
              "
            >
              다시 요청하기
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ============================================================
  // 비밀번호 변경 성공 화면
  // ============================================================
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 via-white to-blue-50/30 flex flex-col">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-400/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-400/15 rounded-full blur-3xl" />
        </div>

        <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="
              w-24 h-24 rounded-full
              bg-gradient-to-br from-emerald-400 to-green-500
              flex items-center justify-center
              mb-8 shadow-xl shadow-emerald-500/30
            "
          >
            <ShieldCheck className="w-12 h-12 text-white" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <h1 className="text-2xl font-bold text-zinc-900 mb-3">
              비밀번호가 변경되었습니다
            </h1>
            <p className="text-zinc-500 mb-8">
              새 비밀번호로 로그인할 수 있습니다.
            </p>

            <button
              onClick={() => router.push('/login')}
              className="
                inline-flex items-center gap-2
                px-8 py-4
                bg-gradient-to-r from-blue-500 to-blue-600
                hover:from-blue-600 hover:to-blue-700
                text-white font-semibold
                rounded-2xl
                shadow-lg shadow-blue-500/30
                transition-all duration-200
                active:scale-[0.98]
              "
            >
              로그인하기
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ============================================================
  // 새 비밀번호 입력 폼
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30 flex flex-col">
      {/* 배경 장식 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-400/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-cyan-400/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* 메인 콘텐츠 */}
      <motion.div
        className="relative flex-1 flex flex-col items-center justify-center px-5 py-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="w-full max-w-sm">
          {/* 헤더 영역 */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="
              inline-flex items-center justify-center
              w-16 h-16 rounded-[22px]
              bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600
              mb-4 shadow-xl shadow-blue-500/30
              relative overflow-hidden
            ">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
              <KeyRound className="w-8 h-8 text-white relative z-10" />
            </div>

            <h1 className="text-2xl font-bold text-zinc-900 mb-2">
              새 비밀번호 설정
            </h1>
            <p className="text-zinc-500 text-sm">
              사용할 새 비밀번호를 입력해주세요.
            </p>
          </motion.div>

          {/* 비밀번호 입력 카드 */}
          <motion.div
            variants={itemVariants}
            className="
              bg-white/80 backdrop-blur-xl
              rounded-3xl
              shadow-xl shadow-zinc-200/50
              border border-white
              p-6
            "
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 새 비밀번호 */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  새 비밀번호
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6자 이상 입력하세요"
                    required
                    minLength={6}
                    className="
                      w-full pl-12 pr-12 py-3.5
                      bg-zinc-50/80 rounded-2xl
                      border border-zinc-200/80
                      text-zinc-900 placeholder:text-zinc-400
                      focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500
                      focus:bg-white
                      transition-all duration-200
                    "
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <PasswordStrengthIndicator password={password} />
              </div>

              {/* 비밀번호 확인 */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  비밀번호 확인
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="비밀번호를 다시 입력하세요"
                    required
                    className={`
                      w-full pl-12 pr-12 py-3.5
                      bg-zinc-50/80 rounded-2xl
                      border
                      text-zinc-900 placeholder:text-zinc-400
                      focus:outline-none focus:ring-2 focus:border-transparent
                      focus:bg-white
                      transition-all duration-200
                      ${!passwordsMatch
                        ? 'border-red-300 focus:ring-red-500/50'
                        : 'border-zinc-200/80 focus:ring-blue-500/50 focus:border-blue-500'
                      }
                    `}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {!passwordsMatch && (
                  <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    비밀번호가 일치하지 않습니다.
                  </p>
                )}
              </div>

              {/* 에러 메시지 */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-red-50 border border-red-100"
                >
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </motion.div>
              )}

              {/* 변경 버튼 */}
              <button
                type="submit"
                disabled={isLoading || !passwordsMatch}
                className="
                  w-full h-14
                  flex items-center justify-center gap-2
                  bg-gradient-to-r from-blue-500 to-blue-600
                  hover:from-blue-600 hover:to-blue-700
                  disabled:from-zinc-300 disabled:to-zinc-400
                  text-white font-semibold
                  rounded-2xl
                  shadow-lg shadow-blue-500/30
                  hover:shadow-xl hover:shadow-blue-500/40
                  disabled:shadow-none
                  transition-all duration-200
                  active:scale-[0.98]
                "
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    비밀번호 변경
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
