# Rehab - AI 기반 자세 분석 및 재활 운동 앱

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/Three.js-3D-green?style=for-the-badge&logo=three.js" />
  <img src="https://img.shields.io/badge/MediaPipe-AI-orange?style=for-the-badge&logo=google" />
</p>

## 소개

**Rehab**은 AI 기반 자세 분석과 맞춤형 재활 운동 프로그램을 제공하는 웹 애플리케이션입니다. MediaPipe Pose를 활용하여 실시간으로 사용자의 자세를 분석하고, Three.js 기반 3D 휴머노이드 모델로 분석 결과를 직관적으로 시각화합니다.

## 주요 기능

### 1. AI 자세 분석
- **MediaPipe Pose** 기반 33개 랜드마크 실시간 감지
- 정면/측면 자세 분석 지원
- 자동 자세 이상 감지 및 피드백

### 2. 3D 휴머노이드 시각화
- **Three.js** 프로시저럴 휴머노이드 모델
- 계층적 본(Bone) 구조로 자연스러운 관절 회전
- Front/Side/Back 뷰 전환 (애니메이션)
- 마우스 회전/줌 인터랙션 지원

### 3. 분석 지표
| 지표 | 설명 |
|------|------|
| **Forward Head** | 전방 머리 자세 (거북목) 측정 |
| **Shoulder Tilt** | 어깨 기울기 비대칭 측정 |
| **Trunk Tilt** | 몸통 기울기 측정 |
| **Pelvis Tilt** | 골반 기울기 측정 |
| **Knee Angle** | 무릎 각도 측정 |

### 4. 맞춤형 재활 운동
- 분석 결과 기반 운동 프로그램 자동 추천
- 카테고리별 운동 (스트레칭, 근력 강화, 가동성)
- 실시간 운동 가이드 모드

### 5. 실시간 운동 모드
- 카메라 기반 실시간 자세 피드백
- 운동별 목표 각도 가이드
- 세트/반복 자동 카운팅

### 6. 통계 및 히스토리
- 분석 결과 저장 및 추적
- 시간별 변화 그래프
- 개선 추이 분석

## 기술 스택

### Frontend
- **Next.js 14** - App Router, Server Components
- **TypeScript** - 타입 안전성
- **Tailwind CSS** - 스타일링
- **shadcn/ui** - UI 컴포넌트
- **Framer Motion** - 애니메이션

### 3D & AI
- **Three.js** - 3D 렌더링
- **MediaPipe Pose** - AI 자세 감지
- **OrbitControls** - 3D 카메라 컨트롤

### Backend & Database
- **Supabase** - 인증 및 데이터베이스
- **PostgreSQL** - 분석 결과 저장

### State Management
- **Zustand** - 클라이언트 상태 관리

## 설치 및 실행

### 사전 요구사항
- Node.js 18.0 이상
- npm 또는 yarn

### 설치

```bash
# 저장소 클론
git clone https://github.com/lee89667657-create/rehab.git
cd rehab

# 의존성 설치
npm install
```

### 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수를 설정하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속합니다.

### 프로덕션 빌드

```bash
npm run build
npm start
```

## 프로젝트 구조

```
rehab/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── analyze/            # 자세 분석 페이지
│   │   ├── result/             # 분석 결과 페이지
│   │   ├── exercise/           # 운동 프로그램
│   │   │   ├── [id]/           # 개별 운동 상세
│   │   │   └── realtime/       # 실시간 운동 모드
│   │   ├── history/            # 분석 히스토리
│   │   ├── stats/              # 통계 페이지
│   │   ├── dashboard/          # 대시보드
│   │   └── login/              # 로그인
│   │
│   ├── components/
│   │   ├── analysis/           # 분석 관련 컴포넌트
│   │   │   ├── Skeleton3D.tsx      # 3D 스켈레톤 (스틱)
│   │   │   └── Skeleton3DModel.tsx # 3D 휴머노이드 모델
│   │   ├── exercise/           # 운동 컴포넌트
│   │   ├── home/               # 홈 컴포넌트
│   │   ├── layout/             # 레이아웃 컴포넌트
│   │   ├── providers/          # Context Providers
│   │   └── ui/                 # shadcn/ui 컴포넌트
│   │
│   ├── constants/              # 상수 정의
│   │   └── exercises.ts        # 운동 프로그램 데이터
│   │
│   ├── lib/                    # 유틸리티
│   │   ├── supabase.ts         # Supabase 클라이언트
│   │   ├── exerciseData.ts     # 운동 데이터 헬퍼
│   │   └── utils.ts            # 공통 유틸
│   │
│   └── store/                  # 상태 관리
│       └── useStore.ts         # Zustand 스토어
│
├── public/                     # 정적 파일
├── package.json
└── tailwind.config.ts
```

## 주요 페이지

| 경로 | 설명 |
|------|------|
| `/` | 홈 (대시보드) |
| `/analyze` | 자세 분석 시작 |
| `/result` | 분석 결과 및 3D 시각화 |
| `/exercise` | 운동 프로그램 목록 |
| `/exercise/[id]` | 개별 운동 상세 |
| `/exercise/realtime/[id]` | 실시간 운동 모드 |
| `/history` | 분석 히스토리 |
| `/stats` | 통계 및 추이 |

## 3D 휴머노이드 모델

### 특징
- CORS 문제 없는 프로시저럴 생성
- 계층적 본 구조 (어깨→팔꿈치→손목)
- MediaPipe 랜드마크 실시간 매핑
- 기준선 시각화 (수직, 어깨, 골반)

### 컨트롤
- **마우스 드래그**: 회전
- **마우스 휠**: 줌 인/아웃
- **뷰 버튼**: Front/Side/Back 전환

### 포즈 매핑
```
MediaPipe 랜드마크 → 계층적 피벗 회전 → 3D 휴머노이드
```

## 스크린샷

### 메인 대시보드
<p align="center">
  <img src="./public/screenshots/dashboard.png" alt="Dashboard" width="800" />
</p>

- 오늘의 자세 점수
- 최근 분석 요약
- 추천 운동 프로그램

### 자세 분석
<p align="center">
  <img src="./public/screenshots/analyze.png" alt="Posture Analysis" width="800" />
</p>

- 정면/측면 카메라 분석
- 실시간 랜드마크 오버레이
- 자세 이상 하이라이트

### 3D 결과 시각화
<p align="center">
  <img src="./public/screenshots/result-3d.png" alt="3D Visualization" width="800" />
</p>

- 휴머노이드 모델 포즈 재현
- 기준선 대비 자세 확인
- Front/Side/Back 다각도 뷰

### 분석 결과 상세
<p align="center">
  <img src="./public/screenshots/result-detail.png" alt="Analysis Result" width="800" />
</p>

- 각 지표별 상세 분석
- 정상/주의/경고 상태 표시
- 개선 권장사항

### 운동 프로그램
<p align="center">
  <img src="./public/screenshots/exercise.png" alt="Exercise Program" width="800" />
</p>

- 맞춤형 운동 추천
- 카테고리별 분류
- 난이도 및 소요시간 표시

### 실시간 운동 모드
<p align="center">
  <img src="./public/screenshots/realtime-exercise.png" alt="Realtime Exercise" width="800" />
</p>

- 카메라 기반 실시간 피드백
- 목표 각도 가이드
- 세트/반복 카운팅

## 라이선스

MIT License

## 기여

이슈 및 PR 환영합니다!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해주세요.

---

<p align="center">
  Made with ❤️ for better posture and health
</p>
