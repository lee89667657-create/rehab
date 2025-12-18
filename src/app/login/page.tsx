/**
 * 로그인 페이지 - shadcn/ui 스타일 (다크모드 지원)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, Activity, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

// shadcn/ui 컴포넌트
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
// 메인 컴포넌트: LoginPage
// ============================================================

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  // 폼 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 로그인 처리
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
    <div className="min-h-screen bg-background flex flex-col">
      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-5 py-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="w-full max-w-sm">
          {/* 로고 및 타이틀 영역 */}
          <motion.div variants={itemVariants} className="text-center mb-10">
            <div className="
              inline-flex items-center justify-center
              w-20 h-20 rounded-2xl
              bg-primary
              mb-5
              shadow-lg
            ">
              <Activity className="w-10 h-10 text-primary-foreground" />
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-2">
              재활 운동 도우미
            </h1>
            <p className="text-muted-foreground text-sm">
              AI 기반 맞춤 재활 운동 가이드
            </p>
          </motion.div>

          {/* 로그인 카드 */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle>로그인</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* 이메일 입력 필드 */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      이메일
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@email.com"
                        required
                        className="
                          w-full pl-12 pr-4 py-3.5
                          bg-muted rounded-xl
                          border border-border
                          text-foreground placeholder:text-muted-foreground
                          focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary
                          focus:bg-background
                          transition-all duration-300
                        "
                      />
                    </div>
                  </div>

                  {/* 비밀번호 입력 필드 */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      비밀번호
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="비밀번호를 입력하세요"
                        required
                        className="
                          w-full pl-12 pr-12 py-3.5
                          bg-muted rounded-xl
                          border border-border
                          text-foreground placeholder:text-muted-foreground
                          focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary
                          focus:bg-background
                          transition-all duration-300
                        "
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors duration-300"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 에러 메시지 */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl bg-destructive/10 border border-destructive/20"
                    >
                      <p className="text-sm text-destructive font-medium">{error}</p>
                    </motion.div>
                  )}

                  {/* 로그인 버튼 */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-14 text-base font-semibold"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <LogIn className="w-5 h-5 mr-2" />
                        로그인
                      </>
                    )}
                  </Button>
                </form>

                {/* 비밀번호 찾기 링크 */}
                <div className="mt-5 text-center">
                  <Link
                    href="/reset-password"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300"
                  >
                    비밀번호를 잊으셨나요?
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 회원가입 안내 */}
          <motion.div variants={itemVariants} className="mt-8 text-center">
            <p className="text-muted-foreground text-sm mb-4">아직 계정이 없으신가요?</p>
            <Button variant="outline" asChild>
              <Link href="/signup" className="gap-2">
                회원가입
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </motion.div>

          {/* 하단 안내 */}
          <motion.p
            variants={itemVariants}
            className="mt-8 text-center text-xs text-muted-foreground"
          >
            로그인 시 서비스 이용약관 및<br />개인정보 처리방침에 동의하게 됩니다.
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
