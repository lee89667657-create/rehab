/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * React Strict Mode 설정
   * - 개발 중에는 false로 설정하여 이중 렌더링 방지
   * - 프로덕션 배포 전에 true로 변경 권장
   */
  reactStrictMode: false,

  /**
   * SWC 컴파일러로 코드 압축
   * - 빌드 속도 향상
   * - 더 작은 번들 크기 생성
   */
  swcMinify: true,

  /**
   * Webpack 설정
   * MediaPipe WASM 파일 처리를 위한 설정
   */
  webpack: (config, { isServer }) => {
    // 클라이언트 사이드에서만 적용
    if (!isServer) {
      // Node.js 전용 모듈을 브라우저에서 무시
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // WASM 파일을 asset으로 처리
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    return config;
  },

  /**
   * 실험적 기능
   * - optimizePackageImports: 패키지 임포트 최적화로 번들 크기 감소
   */
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;
