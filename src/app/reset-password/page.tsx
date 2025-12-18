/**
 * 비밀번호 재설정 페이지 - shadcn/ui 스타일 (다크모드 지원)
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Send, CheckCircle, KeyRound, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
// 메인 컴포넌트: ResetPasswordPage
// ============================================================

export default function ResetPasswordPage() {
  // 폼 상태
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // 비밀번호 재설정 이메일 발송
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password/confirm`,
      });

      if (error) throw error;
      setIsSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '이메일 발송에 실패했습니다. 다시 시도해주세요.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // 이메일 발송 성공 화면
  // ============================================================
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* 성공 콘텐츠 */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          {/* 체크 아이콘 */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="
              w-24 h-24 rounded-2xl
              bg-primary
              flex items-center justify-center
              mb-8 shadow-lg
            "
          >
            <CheckCircle className="w-12 h-12 text-primary-foreground" strokeWidth={2} />
          </motion.div>

          {/* 메시지 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center max-w-sm"
          >
            <h1 className="text-2xl font-bold text-foreground mb-3">
              이메일을 확인해주세요
            </h1>
            <p className="text-muted-foreground mb-2 leading-relaxed">
              <span className="font-medium text-foreground">{email}</span>
              <br />
              위 주소로 비밀번호 재설정 링크를 보냈습니다.
            </p>
            <p className="text-muted-foreground text-sm mb-8">
              이메일이 보이지 않으면 스팸함을 확인해주세요.
            </p>

            {/* 로그인 페이지로 버튼 */}
            <Button asChild className="h-14 px-8 text-base font-semibold">
              <Link href="/login">
                로그인 페이지로
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ============================================================
  // 이메일 입력 폼 화면
  // ============================================================
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-5 py-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="w-full max-w-sm">
          {/* 뒤로가기 링크 */}
          <motion.div variants={itemVariants}>
            <Link
              href="/login"
              className="
                inline-flex items-center gap-2
                text-muted-foreground hover:text-primary
                mb-8 transition-colors duration-300
              "
            >
              <ArrowLeft className="w-5 h-5" />
              로그인으로 돌아가기
            </Link>
          </motion.div>

          {/* 헤더 영역 */}
          <motion.div variants={itemVariants} className="mb-8">
            {/* 아이콘 */}
            <div className="
              inline-flex items-center justify-center
              w-16 h-16 rounded-2xl
              bg-primary
              mb-4
              shadow-lg
            ">
              <KeyRound className="w-8 h-8 text-primary-foreground" />
            </div>

            {/* 타이틀 */}
            <h1 className="text-2xl font-bold text-foreground mb-2">
              비밀번호 재설정
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              가입할 때 사용한 이메일을 입력하세요.
              <br />
              비밀번호 재설정 링크를 보내드립니다.
            </p>
          </motion.div>

          {/* 이메일 입력 카드 */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle>이메일 입력</CardTitle>
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

                  {/* 전송 버튼 */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-14 text-base font-semibold"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        재설정 링크 보내기
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* 하단 안내 */}
          <motion.p
            variants={itemVariants}
            className="mt-8 text-center text-xs text-muted-foreground"
          >
            이메일이 기억나지 않으시면 고객센터로 문의해주세요.
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
