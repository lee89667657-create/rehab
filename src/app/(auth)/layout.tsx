/**
 * 인증 페이지 레이아웃
 *
 * 로그인/회원가입 페이지에는 BottomNav가 표시되지 않습니다.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
