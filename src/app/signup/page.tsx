/**
 * 회원가입 페이지 - shadcn/ui 스타일 (다크모드 지원)
 */

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Mail,
  Lock,
  User,
  UserPlus,
  Activity,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
} from 'lucide-react';
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
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
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
  score: number; // 0-4
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

  if (score <= 1) return { score, label: '약함', color: 'bg-destructive' };
  if (score === 2) return { score, label: '보통', color: 'bg-amber-500' };
  if (score === 3) return { score, label: '강함', color: 'bg-primary' };
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
      {/* 강도 바 */}
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`
              h-1 flex-1 rounded-full transition-colors duration-300
              ${level <= strength.score ? strength.color : 'bg-muted'}
            `}
          />
        ))}
      </div>
      {/* 강도 레이블 */}
      <p className={`text-xs ${strength.score <= 1 ? 'text-destructive' : 'text-muted-foreground'}`}>
        비밀번호 강도: {strength.label}
      </p>
    </div>
  );
}

// ============================================================
// 메인 컴포넌트: SignUpPage
// ============================================================

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  // 폼 상태
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // 비밀번호 일치 여부
  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return true;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  // 회원가입 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 비밀번호 길이 확인
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);

    try {
      await signUp(email, password, name);
      setIsSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '회원가입에 실패했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // 가입 성공 화면
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
            <Check className="w-12 h-12 text-primary-foreground" strokeWidth={3} />
          </motion.div>

          {/* 메시지 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <h1 className="text-2xl font-bold text-foreground mb-3">
              가입이 완료되었습니다!
            </h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              이메일 인증 후 로그인하실 수 있습니다.
              <br />
              메일함을 확인해주세요.
            </p>

            {/* 로그인 버튼 */}
            <Button
              onClick={() => router.push('/login')}
              className="h-14 px-8 text-base font-semibold"
            >
              로그인 페이지로
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ============================================================
  // 회원가입 폼 화면
  // ============================================================
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-5 py-8"
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
                mb-6 transition-colors duration-300
              "
            >
              <ArrowLeft className="w-5 h-5" />
              로그인으로 돌아가기
            </Link>
          </motion.div>

          {/* 헤더 영역 */}
          <motion.div variants={itemVariants} className="mb-6">
            {/* 앱 아이콘 */}
            <div className="
              inline-flex items-center justify-center
              w-16 h-16 rounded-2xl
              bg-primary
              mb-4
              shadow-lg
            ">
              <Activity className="w-8 h-8 text-primary-foreground" />
            </div>

            {/* 타이틀 */}
            <h1 className="text-2xl font-bold text-foreground mb-2">
              회원가입
            </h1>
            <p className="text-muted-foreground text-sm">
              계정을 만들고 맞춤 재활 운동을 시작하세요
            </p>
          </motion.div>

          {/* 회원가입 카드 */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle>계정 정보 입력</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* 이름 입력 필드 */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      이름
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="홍길동"
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
                        placeholder="6자 이상 입력하세요"
                        required
                        minLength={6}
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
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {/* 비밀번호 강도 표시 */}
                    <PasswordStrengthIndicator password={password} />
                  </div>

                  {/* 비밀번호 확인 필드 */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      비밀번호 확인
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="비밀번호를 다시 입력하세요"
                        required
                        className={`
                          w-full pl-12 pr-12 py-3.5
                          bg-muted rounded-xl
                          border
                          text-foreground placeholder:text-muted-foreground
                          focus:outline-none focus:ring-2 focus:border-transparent
                          focus:bg-background
                          transition-all duration-300
                          ${!passwordsMatch
                            ? 'border-destructive focus:ring-destructive/20'
                            : 'border-border focus:ring-ring focus:border-primary'
                          }
                        `}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors duration-300"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {/* 비밀번호 불일치 경고 */}
                    {!passwordsMatch && (
                      <p className="mt-2 text-sm text-destructive flex items-center gap-1">
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
                      className="p-4 rounded-xl bg-destructive/10 border border-destructive/20"
                    >
                      <p className="text-sm text-destructive font-medium">{error}</p>
                    </motion.div>
                  )}

                  {/* 가입 버튼 */}
                  <Button
                    type="submit"
                    disabled={isLoading || !passwordsMatch}
                    className="w-full h-14 text-base font-semibold"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5 mr-2" />
                        가입하기
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* 이용약관 안내 */}
          <motion.p
            variants={itemVariants}
            className="mt-6 text-center text-xs text-muted-foreground leading-relaxed"
          >
            가입 시 서비스 이용약관 및<br />개인정보 처리방침에 동의하게 됩니다.
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
