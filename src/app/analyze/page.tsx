/**
 * 자세 분석 페이지 - Calm 스타일
 *
 * 카메라로 사용자의 자세를 촬영하여 분석하는 페이지입니다.
 *
 * ## 촬영 흐름
 * 1. 정면(front) 촬영 → 2. 측면(side) 촬영 → 완료
 * 2장 모두 촬영 완료 후 /result 페이지로 이동하여 결과 확인
 *
 * ## 디자인 특징
 * - Calm 블루 (#3B82F6) 포인트 컬러
 * - 세로 비율 카메라 (9:16)
 * - 전신 실루엣 가이드라인 (점선, 반투명)
 * - 미니멀한 UI 컴포넌트
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Camera, Check, CheckCircle } from 'lucide-react';
import { analyzePose } from '@/lib/poseAnalysis';
import useStore from '@/store/useStore';
import AppHeader from '@/components/layout/AppHeader';
import { devLog, devWarn, devStateLog } from '@/lib/logger';

// 고급 분석 모듈 (관절각 계산)
import { calculateAllJointAngles } from '@/lib/advancedAnalysis';

// ============================================================
// 타입 정의
// ============================================================

interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

type CaptureMode = 'front' | 'side';

interface CapturedData {
  mode: CaptureMode;
  landmarks: Landmark[];
  image: string | null; // base64 이미지
  timestamp: number;
}

// ============================================================
// PoseCamera 동적 로드 (SSR 비활성화)
// ============================================================

const PoseCamera = dynamic(
  () => import('@/components/pose/PoseCamera'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-sm">카메라 로딩 중...</p>
        </div>
      </div>
    ),
  }
);

// ============================================================
// 촬영 모드 데이터
// ============================================================

const CAPTURE_MODES: {
  mode: CaptureMode;
  label: string;
  guide: string;
  silhouetteType: 'front' | 'side';
}[] = [
  {
    mode: 'front',
    label: '정면',
    guide: '카메라를 정면으로 바라봐 주세요',
    silhouetteType: 'front',
  },
  {
    mode: 'side',
    label: '측면',
    guide: '옆으로 돌아서 측면을 보여주세요',
    silhouetteType: 'side',
  },
];

// ============================================================
// 유틸리티: 전신 감지 확인
// ============================================================

/**
 * 전신이 화면 안에 보이는지 확인
 * @param landmarks MediaPipe 랜드마크 배열
 * @returns 전신이 보이면 true
 */
function checkFullBodyVisible(landmarks: Landmark[] | null): boolean {
  // landmarks가 없거나 비어있으면 전신 감지 안 됨
  if (!landmarks || landmarks.length === 0) return false;

  // 필요한 관절들: nose(0), shoulders(11,12), hips(23,24), ankles(27,28)
  const requiredPoints = [0, 11, 12, 23, 24, 27, 28];

  for (const point of requiredPoints) {
    const landmark = landmarks[point];

    // 관절이 없으면 실패
    if (!landmark) return false;

    // 가시성이 낮으면 감지 안 됨 (임계값 낮춤: 0.5 → 0.3)
    if (landmark.visibility < 0.3) return false;

    // 화면 범위 안에 있는지 (범위 확대: 거의 전체 화면 허용)
    // x, y는 0~1 사이 정규화된 좌표
    if (landmark.x < 0.01 || landmark.x > 0.99 || landmark.y < 0.01 || landmark.y > 0.99) {
      return false;
    }
  }

  // 모든 조건 통과하면 전신 감지됨
  return true;
}

// ============================================================
// 컴포넌트: 전신 실루엣 가이드
// ============================================================

interface SilhouetteGuideProps {
  type: 'front' | 'side';
  isReady: boolean; // 전신 감지 완료 여부
}

function SilhouetteGuide({ type, isReady }: SilhouetteGuideProps) {
  // 전신 감지 시 초록색, 아니면 흰색
  const strokeColor = isReady ? '#10B981' : 'white';
  const opacity = isReady ? 'opacity-60' : 'opacity-40';

  if (type === 'side') {
    return (
      <svg
        className={`w-[50%] h-[80%] ${opacity} transition-opacity duration-300`}
        viewBox="0 0 80 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse
          cx="40" cy="22" rx="14" ry="16"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeDasharray="6 3"
          fill="none"
        />
        <line
          x1="40" y1="38" x2="40" y2="50"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeDasharray="6 3"
        />
        <path
          d="M 40 50 Q 55 70 50 100 Q 45 130 40 100"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeDasharray="6 3"
          fill="none"
        />
        <path
          d="M 45 55 Q 60 75 55 110"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeDasharray="6 3"
          fill="none"
        />
        <path
          d="M 42 100 Q 45 140 40 190"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeDasharray="6 3"
          fill="none"
        />
        <path
          d="M 38 100 Q 35 140 40 190"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeDasharray="6 3"
          fill="none"
        />
      </svg>
    );
  }

  return (
    <svg
      className={`w-[55%] h-[80%] ${opacity} transition-opacity duration-300`}
      viewBox="0 0 100 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse
        cx="50" cy="18" rx="14" ry="16"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeDasharray="6 3"
        fill="none"
      />
      <line
        x1="50" y1="34" x2="50" y2="44"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeDasharray="6 3"
      />
      <line
        x1="22" y1="48" x2="78" y2="48"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeDasharray="6 3"
      />
      <path
        d="M 28 48 L 32 95"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeDasharray="6 3"
        fill="none"
      />
      <path
        d="M 72 48 L 68 95"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeDasharray="6 3"
        fill="none"
      />
      <path
        d="M 32 95 Q 50 100 68 95"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeDasharray="6 3"
        fill="none"
      />
      <path
        d="M 22 48 L 12 78 L 8 108"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeDasharray="6 3"
        fill="none"
      />
      <path
        d="M 78 48 L 88 78 L 92 108"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeDasharray="6 3"
        fill="none"
      />
      <path
        d="M 38 95 L 35 140 L 32 190"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeDasharray="6 3"
        fill="none"
      />
      <path
        d="M 62 95 L 65 140 L 68 190"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeDasharray="6 3"
        fill="none"
      />
    </svg>
  );
}

// ============================================================
// 메인 컴포넌트: AnalyzePage
// ============================================================

// CaptureFrameFunction 타입 import
import type { CaptureFrameFunction } from '@/components/pose/PoseCamera';

export default function AnalyzePage() {
  const router = useRouter();
  const setAnalysisResult = useStore((state) => state.setAnalysisResult);
  const setCapturedImage = useStore((state) => state.setCapturedImage);
  const setJointAngles = useStore((state) => state.setJointAngles);
  const setLandmarks = useStore((state) => state.setLandmarks);

  const [currentModeIndex, setCurrentModeIndex] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentLandmarks, setCurrentLandmarks] = useState<Landmark[] | null>(null);
  const [capturedData, setCapturedData] = useState<CapturedData[]>([]);
  const [isCameraActive] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false); // 모드 전환 중

  // 자동 촬영 모드
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [poseReadyTime, setPoseReadyTime] = useState(0);
  const poseReadyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoTriggerRef = useRef(false); // 자동 촬영 트리거 방지

  // 타이머 ref (클린업용)
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const landmarksRef = useRef<Landmark[] | null>(null);
  // 캡처 함수를 저장할 ref (콜백 패턴으로 PoseCamera에서 전달받음)
  const captureFrameRef = useRef<CaptureFrameFunction | null>(null);

  const currentMode = CAPTURE_MODES[currentModeIndex];

  // 전신 감지 상태
  const isFullBodyVisible = checkFullBodyVisible(currentLandmarks);

  const handleBack = () => {
    // 타이머 정리
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (poseReadyTimerRef.current) {
      clearTimeout(poseReadyTimerRef.current);
      poseReadyTimerRef.current = null;
    }
    router.back();
  };

  // 음성 피드백 함수
  const speak = useCallback((text: string) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;
    speechSynthesis.speak(utterance);
  }, []);

  // 자동 촬영 트리거 함수
  const triggerAutoCapture = useCallback(() => {
    if (autoTriggerRef.current || isCapturing || countdown !== null) return;
    autoTriggerRef.current = true;

    speak('자세가 맞습니다. 3초 후 촬영합니다.');

    // 1초 대기 후 촬영 시작
    setTimeout(() => {
      if (!isCapturing && countdown === null) {
        setIsCapturing(true);
        setCountdown(3);

        // 기존 타이머 정리
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }

        // 1초마다 카운트다운
        timerRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev === null || prev <= 1) {
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              if (prev === 1) {
                setTimeout(() => performCapture(), 100);
              }
              return prev === 1 ? 0 : prev;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }, 1000);
  }, [isCapturing, countdown, speak]);

  const handlePoseDetected = useCallback((landmarks: Landmark[]) => {
    setCurrentLandmarks(landmarks);
    landmarksRef.current = landmarks;

    // 자동 모드일 때 전신 감지 시간 추적 (전환 중에는 비활성화)
    if (isAutoMode && !isCapturing && countdown === null && !autoTriggerRef.current && !isTransitioning) {
      const isReady = checkFullBodyVisible(landmarks);

      if (isReady) {
        setPoseReadyTime((prev) => {
          const newTime = prev + 1;
          // 약 2초(60프레임 정도) 유지되면 자동 촬영
          if (newTime >= 60) {
            triggerAutoCapture();
            return 0;
          }
          return newTime;
        });
      } else {
        setPoseReadyTime(0);
      }
    }
  }, [isAutoMode, isCapturing, countdown, triggerAutoCapture, isTransitioning]);

  // 촬영 실행
  const performCapture = useCallback(() => {
    const landmarks = landmarksRef.current;
    if (!landmarks) {
      setCountdown(null);
      setIsCapturing(false);
      return;
    }

    // 현재 프레임 이미지 캡처 (콜백으로 전달받은 함수 사용)
    const capturedImage = captureFrameRef.current?.() ?? null;

    const newCapture: CapturedData = {
      mode: currentMode.mode,
      landmarks: landmarks,
      image: capturedImage,
      timestamp: Date.now(),
    };

    // Zustand store에 캡처된 이미지 저장
    if (capturedImage) {
      setCapturedImage(currentMode.mode, capturedImage);
    }

    const updatedData = [...capturedData, newCapture];
    setCapturedData(updatedData);
    setCountdown(null);
    setIsCapturing(false);

    if (currentModeIndex < CAPTURE_MODES.length - 1) {
      // 정면 → 측면 전환 시: 자동 촬영 리셋 + 딜레이
      autoTriggerRef.current = false;
      setPoseReadyTime(0);
      setIsTransitioning(true);

      // 측면 촬영 안내 음성
      speak('정면 촬영 완료. 측면으로 돌아서 주세요.');

      // 3초 딜레이 후 모드 전환 (사용자가 돌아설 시간)
      setTimeout(() => {
        setCurrentModeIndex(currentModeIndex + 1);
        setIsTransitioning(false);
      }, 3000);
    } else {
      setIsAnalyzing(true);

      const frontData = updatedData.find(d => d.mode === 'front');
      if (frontData) {
        const poseLandmarks = frontData.landmarks.map(lm => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
          visibility: lm.visibility,
        }));

        const result = analyzePose(poseLandmarks);
        setAnalysisResult(result);

        // ============================================================
        // 관절각 계산 및 저장 (고급 분석용)
        // ============================================================
        // MediaPipe landmarks를 Point3D 형식으로 변환하여 관절각 계산
        // 참고: world_landmarks가 있으면 더 정확하지만, 현재는 normalized landmarks 사용
        try {
          const point3DLandmarks = frontData.landmarks.map(lm => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility,
          }));
          const calculatedAngles = calculateAllJointAngles(point3DLandmarks);
          setJointAngles(calculatedAngles);
        } catch (error) {
          console.error('관절각 계산 실패:', error);
        }

        // 이미지 데이터도 함께 저장 (정면, 측면만)
        const capturedImagesData = {
          front: updatedData.find(d => d.mode === 'front')?.image || null,
          side: updatedData.find(d => d.mode === 'side')?.image || null,
        };

        // ============================================================
        // 분석 기록 저장 (히스토리용)
        // ============================================================
        // 자세 유형 계산
        const headItem = result.items.find(i => i.id === 'forward_head');
        const shoulderItem = result.items.find(i => i.id === 'shoulder_tilt');
        const kneeItem = result.items.find(i => i.id === 'knee_angle');
        let postureType = '정상 자세';
        if (headItem && headItem.value > 3) postureType = '거북목 자세';
        else if (shoulderItem && shoulderItem.value > 2) postureType = '불균형 자세';
        else if (kneeItem && kneeItem.value < 170) postureType = 'O다리 경향';

        // ============================================================
        // 각 촬영 뷰별 랜드마크 추출 (스켈레톤 렌더링용)
        // ============================================================
        // 정면, 측면 촬영 시 저장된 랜드마크를 뷰별로 분리

        /**
         * 랜드마크 정규화 함수
         * - 반드시 { x, y, z, visibility } 형태로 변환
         * - 누락된 필드는 기본값으로 채움
         * - 33개 포인트 검증
         */
        const normalizeLandmarks = (
          rawLandmarks: Landmark[] | null | undefined
        ): Landmark[] | null => {
          if (!rawLandmarks || rawLandmarks.length === 0) {
            return null;
          }

          // 33개 포인트 검증 (MediaPipe Pose는 33개 랜드마크)
          if (rawLandmarks.length !== 33) {
            devWarn(
              `[Analyze] 랜드마크 개수 이상: ${rawLandmarks.length}개 (expected: 33)`
            );
          }

          // 정규화: 각 랜드마크를 { x, y, z, visibility } 형태로 보장
          return rawLandmarks.map((lm) => ({
            x: typeof lm.x === 'number' ? lm.x : 0,
            y: typeof lm.y === 'number' ? lm.y : 0,
            z: typeof lm.z === 'number' ? lm.z : 0,
            visibility: typeof lm.visibility === 'number' ? lm.visibility : 0,
          }));
        };

        // 뷰별 랜드마크 추출 및 정규화 (정면, 측면만)
        const rawFront = updatedData.find(d => d.mode === 'front')?.landmarks;
        const rawSide = updatedData.find(d => d.mode === 'side')?.landmarks;

        const landmarksByView = {
          front: normalizeLandmarks(rawFront),
          side: normalizeLandmarks(rawSide),
        };

        // ============================================================
        // 랜드마크 저장 로그 (개발 모드 전용)
        // ============================================================
        devLog('========================================');
        devStateLog('Analyze', '랜드마크 저장 시작');
        devLog('========================================');

        if (landmarksByView.front) {
          devLog('[Analyze] Front landmarks:', landmarksByView.front.length, '개');
          devLog('[Analyze] Front 샘플 (index 0):', landmarksByView.front[0]);
          devLog('[Analyze] Front 샘플 (index 11, 좌측어깨):', landmarksByView.front[11]);
          devLog('[Analyze] Front 샘플 (index 23, 좌측골반):', landmarksByView.front[23]);

          // 좌표 범위 확인 (normalized: 0~1, world: 미터 단위)
          const sampleX = landmarksByView.front[11]?.x || 0;
          if (sampleX >= 0 && sampleX <= 1) {
            devLog('[Analyze] 좌표 타입: NORMALIZED (0~1 범위)');
          } else {
            devLog('[Analyze] 좌표 타입: WORLD (미터 단위)');
          }
        } else {
          devLog('[Analyze] Front landmarks: 없음');
        }

        if (landmarksByView.side) {
          devLog('[Analyze] Side landmarks:', landmarksByView.side.length, '개');
        } else {
          devLog('[Analyze] Side landmarks: 없음');
        }

        devLog('========================================');

        // 랜드마크 데이터를 store에 저장 (3D 스켈레톤 시각화용)
        setLandmarks(landmarksByView);
        devStateLog('Analyze', 'Store에 랜드마크 저장 완료');

        const analysisRecord = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          score: result.overallScore,
          postureType: postureType,

          // 촬영 이미지 저장 (base64)
          capturedImages: capturedImagesData,

          // 관절 좌표 저장 (스켈레톤용) - 뷰별로 분리
          landmarks: landmarksByView,

          // 기존 호환성을 위한 정면 랜드마크 (단일 배열)
          poseLandmarks: poseLandmarks,

          // 분석 항목 결과
          items: result.items,
        };

        // 히스토리에 저장 (최대 30개)
        try {
          const history = JSON.parse(localStorage.getItem('analysisHistory') || '[]');
          history.unshift(analysisRecord);
          if (history.length > 30) history.pop();
          localStorage.setItem('analysisHistory', JSON.stringify(history));
        } catch (e) {
          console.error('히스토리 저장 실패:', e);
        }

        // 현재 결과 저장
        localStorage.setItem('poseData', JSON.stringify(updatedData));
        localStorage.setItem('analysisResult', JSON.stringify(result));
        localStorage.setItem('capturedImages', JSON.stringify(capturedImagesData));
        localStorage.setItem('currentRecord', JSON.stringify(analysisRecord));
      }

      setTimeout(() => {
        router.push('/result');
      }, 500);
    }
  }, [currentMode.mode, capturedData, currentModeIndex, setAnalysisResult, setJointAngles, setLandmarks, setCapturedImage, router]);

  // 촬영 시작 (3초 카운트다운) - 수동 모드용
  const handleCaptureStart = () => {
    if (isCapturing || countdown !== null) return;

    if (!isFullBodyVisible) {
      alert('전신이 보이도록 가이드라인 안에 서주세요.');
      return;
    }

    speak('촬영을 시작합니다.');
    setIsCapturing(true);
    setCountdown(3);

    // 기존 타이머 정리
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // 1초마다 카운트다운
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          // 타이머 종료
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          // 0이 되면 촬영 실행
          if (prev === 1) {
            setTimeout(() => performCapture(), 100);
          }
          return prev === 1 ? 0 : prev;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (poseReadyTimerRef.current) {
        clearTimeout(poseReadyTimerRef.current);
      }
      speechSynthesis.cancel();
    };
  }, []);

  // 촬영 완료 후 자동 트리거 리셋
  useEffect(() => {
    if (!isCapturing && countdown === null) {
      // 촬영이 완료되면 1초 후 자동 트리거 리셋
      const resetTimer = setTimeout(() => {
        autoTriggerRef.current = false;
        setPoseReadyTime(0);
      }, 1000);
      return () => clearTimeout(resetTimer);
    }
  }, [isCapturing, countdown]);

  const handleModeSelect = (index: number) => {
    if (countdown !== null || isCapturing) return;
    setCurrentModeIndex(index);
  };

  return (
    <>
      {/* 앱 공통 헤더 - 로고 + 앱 이름 */}
      <AppHeader />

      <div className="fixed inset-0 pt-14 bg-card flex items-center justify-center">
        {/* 세로 카메라 컨테이너 */}
        <div className="
          relative
          w-full h-full
          md:w-auto md:h-[calc(95vh-56px)]
          md:aspect-[9/16]
          md:max-w-[420px]
          md:rounded-2xl
          md:overflow-hidden
          md:shadow-2xl
          md:border md:border-border/10
          bg-card
        ">
        {/* ============================================================
            상단 헤더
            ============================================================ */}
        <div className="absolute top-0 left-0 right-0 z-20">
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-transparent h-36" />

          <div className="relative flex items-center justify-between px-4 py-4 pt-safe">
            {/* 뒤로가기 버튼 */}
            <motion.button
              onClick={handleBack}
              whileTap={{ scale: 0.95 }}
              className="
                w-10 h-10
                flex items-center justify-center
                rounded-xl
                bg-card/10
                backdrop-blur-md
                border border-white/10
                transition-all duration-300
              "
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </motion.button>

            {/* 현재 모드 뱃지 - 삼성 스타일 */}
            <motion.div
              key={currentMode.mode}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="
                px-4 py-2
                rounded-xl
                bg-blue-500/100
                shadow-lg shadow-blue-500/30
              "
            >
              <span className="text-white font-semibold text-sm">
                {currentMode.label} 촬영
              </span>
            </motion.div>

            {/* 진행률 */}
            <div className="
              w-10 h-10
              flex items-center justify-center
              rounded-xl
              bg-card/10
              backdrop-blur-md
              border border-white/10
            ">
              <span className="text-white font-bold text-xs">
                {currentModeIndex + 1}/2
              </span>
            </div>
          </div>

          {/* 안내 메시지 */}
          <motion.div
            key={currentMode.guide + isAutoMode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center px-6 pb-4 relative"
          >
            <p className="text-white/90 text-base font-semibold">
              {isAutoMode ? '가이드라인에 맞춰 서세요' : '실루엣에 맞춰 서주세요'}
            </p>
            <p className="text-white/60 text-sm mt-1">
              {isAutoMode
                ? '자세가 맞으면 자동으로 촬영됩니다'
                : currentMode.guide}
            </p>
            {/* 자동 모드: 자세 준비 진행률 */}
            {isAutoMode && isFullBodyVisible && poseReadyTime > 0 && !isCapturing && (
              <div className="mt-2">
                <div className="w-32 h-1.5 bg-white/20 rounded-full mx-auto overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (poseReadyTime / 60) * 100)}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
                <p className="text-emerald-400 text-xs mt-1">
                  자세 유지 중... {Math.round((poseReadyTime / 60) * 100)}%
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* ============================================================
            카메라 영역
            ============================================================ */}
        <div className="absolute inset-0">
          <PoseCamera
            isActive={isCameraActive}
            onPoseDetected={handlePoseDetected}
            onCaptureReady={(captureFrame) => {
              // PoseCamera에서 캡처 함수를 전달받아 ref에 저장
              captureFrameRef.current = captureFrame;
            }}
          />

          {/* 전신 실루엣 가이드 */}
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
            <SilhouetteGuide type={currentMode.silhouetteType} isReady={isFullBodyVisible} />
          </div>

          {/* 코너 프레임 장식 - 전신 감지시 초록색 */}
          <div className="absolute inset-6 z-10 pointer-events-none">
            <div className={`absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 rounded-tl-lg transition-colors duration-300 ${isFullBodyVisible ? 'border-emerald-500' : 'border-blue-500/70'}`} />
            <div className={`absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 rounded-tr-lg transition-colors duration-300 ${isFullBodyVisible ? 'border-emerald-500' : 'border-blue-500/70'}`} />
            <div className={`absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 rounded-bl-lg transition-colors duration-300 ${isFullBodyVisible ? 'border-emerald-500' : 'border-blue-500/70'}`} />
            <div className={`absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 rounded-br-lg transition-colors duration-300 ${isFullBodyVisible ? 'border-emerald-500' : 'border-blue-500/70'}`} />
          </div>

          {/* 전신 감지 피드백 메시지 */}
          <AnimatePresence>
            {isFullBodyVisible && !isCapturing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-1/4 left-1/2 -translate-x-1/2 z-20"
              >
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/100 text-white font-semibold text-sm shadow-lg">
                  <CheckCircle className="w-5 h-5" />
                  좋아요! 촬영 준비 완료
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ============================================================
            카운트다운 오버레이
            ============================================================ */}
        <AnimatePresence>
          {countdown !== null && countdown > 0 && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

              <motion.div
                key={countdown}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="relative"
              >
                <div className="w-28 h-28 rounded-2xl bg-blue-500/100 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <span className="text-6xl font-bold text-white">
                    {countdown}
                  </span>
                </div>

                <motion.div
                  className="absolute inset-0 rounded-2xl border-2 border-blue-500"
                  initial={{ scale: 1, opacity: 1 }}
                  animate={{ scale: 1.4, opacity: 0 }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================================
            캡처 플래시 효과
            ============================================================ */}
        <AnimatePresence>
          {countdown === 0 && (
            <motion.div
              className="absolute inset-0 bg-card z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            />
          )}
        </AnimatePresence>

        {/* ============================================================
            모드 전환 오버레이 (정면 → 측면)
            ============================================================ */}
        <AnimatePresence>
          {isTransitioning && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-center">
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 90 }}
                  transition={{ duration: 1, ease: 'easeInOut' }}
                  className="w-20 h-20 mx-auto mb-6"
                >
                  <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
                    <circle cx="50" cy="30" r="12" stroke="white" strokeWidth="3" />
                    <line x1="50" y1="42" x2="50" y2="70" stroke="white" strokeWidth="3" />
                    <line x1="50" y1="50" x2="30" y2="65" stroke="white" strokeWidth="3" />
                    <line x1="50" y1="50" x2="70" y2="65" stroke="white" strokeWidth="3" />
                    <line x1="50" y1="70" x2="35" y2="95" stroke="white" strokeWidth="3" />
                    <line x1="50" y1="70" x2="65" y2="95" stroke="white" strokeWidth="3" />
                  </svg>
                </motion.div>
                <p className="text-white text-xl font-bold mb-2">측면으로 돌아주세요</p>
                <p className="text-white/60 text-sm">옆으로 돌아서 측면을 보여주세요</p>
                <motion.div
                  className="mt-4 flex justify-center gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-blue-500 rounded-full"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
                    />
                  ))}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================================
            분석 중 오버레이 - 삼성 스타일
            ============================================================ */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-card/90 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-center">
                <motion.div
                  className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <p className="text-white text-lg font-bold">분석 중...</p>
                <p className="text-white/60 text-sm mt-1">AI가 자세를 분석하고 있어요</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================================
            하단 컨트롤 패널
            ============================================================ */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent h-56" />

          <div className="relative pb-safe px-4 pt-4">
            {/* 자동/수동 모드 토글 */}
            <div className="flex justify-center mb-4">
              <motion.button
                onClick={() => {
                  setIsAutoMode(!isAutoMode);
                  setPoseReadyTime(0);
                  autoTriggerRef.current = false;
                }}
                whileTap={{ scale: 0.95 }}
                className={`
                  px-4 py-2 rounded-xl text-sm font-semibold
                  transition-all duration-300
                  ${isAutoMode
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-gray-600 text-white/70 border border-white/10'
                  }
                `}
              >
                {isAutoMode ? '🤖 자동 촬영 ON' : '✋ 수동 촬영'}
              </motion.button>
            </div>

            {/* 모드 선택 탭 - 삼성 스타일 */}
            <div className="flex justify-center gap-2 mb-6">
              {CAPTURE_MODES.map((mode, index) => {
                const isCaptured = capturedData.some((d) => d.mode === mode.mode);
                const isActive = index === currentModeIndex;

                return (
                  <motion.button
                    key={mode.mode}
                    onClick={() => handleModeSelect(index)}
                    disabled={countdown !== null}
                    whileTap={{ scale: countdown === null ? 0.95 : 1 }}
                    className={`
                      relative px-5 py-2.5 rounded-xl text-sm font-semibold
                      transition-all duration-300
                      ${isActive
                        ? 'bg-blue-500/100 text-white shadow-lg shadow-blue-500/30'
                        : isCaptured
                          ? 'bg-emerald-500/100/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-card/10 text-white/70 border border-white/10'
                      }
                      ${countdown !== null ? 'opacity-50' : ''}
                    `}
                  >
                    <span className="flex items-center gap-1.5">
                      {isCaptured && !isActive && <Check className="w-4 h-4" />}
                      {mode.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* 촬영 버튼 - 삼성 스타일 */}
            <div className="flex justify-center mb-4">
              <motion.button
                onClick={handleCaptureStart}
                disabled={isCapturing || !isFullBodyVisible}
                whileTap={{ scale: isFullBodyVisible && !isCapturing ? 0.92 : 1 }}
                className={`
                  relative w-20 h-20 rounded-2xl
                  transition-all duration-300
                  ${isCapturing ? 'opacity-50' : ''}
                  ${!isFullBodyVisible ? 'opacity-40' : ''}
                `}
              >
                {/* 외곽 링 - 전신 감지시 초록색 */}
                <div className={`absolute inset-0 rounded-2xl border-4 transition-colors duration-300 ${isFullBodyVisible ? 'border-emerald-500' : 'border-white/50'}`} />

                {/* 내부 원 (촬영 버튼) - 전신 감지시 초록색 배경 */}
                <div className={`
                  absolute inset-2 rounded-xl
                  flex items-center justify-center
                  shadow-lg transition-colors duration-300
                  ${isFullBodyVisible ? 'bg-emerald-500/100' : 'bg-card/50'}
                `}>
                  <Camera className={`w-7 h-7 transition-colors duration-300 ${isFullBodyVisible ? 'text-white' : 'text-white/70'}`} />
                </div>

                {/* 활성 펄스 - 전신 감지시에만 표시 */}
                {!isCapturing && isFullBodyVisible && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-emerald-500/50"
                    animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                )}
              </motion.button>
            </div>

            {/* 진행 인디케이터 - 삼성 스타일 */}
            <div className="flex justify-center items-center gap-2 mb-4">
              {CAPTURE_MODES.map((mode, index) => {
                const isCaptured = capturedData.some((d) => d.mode === mode.mode);
                const isActive = index === currentModeIndex;

                return (
                  <motion.div
                    key={mode.mode}
                    animate={{ scale: isActive ? 1.3 : 1 }}
                    className={`
                      w-2 h-2 rounded-full
                      transition-colors duration-300
                      ${isCaptured
                        ? 'bg-emerald-400'
                        : isActive
                          ? 'bg-blue-500/100'
                          : 'bg-card/30'
                      }
                    `}
                  />
                );
              })}
            </div>

            {/* 포즈 감지 상태 - 삼성 스타일 */}
            <div className="flex justify-center pb-4">
              <div className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold
                border transition-all duration-300
                ${isFullBodyVisible
                  ? 'bg-emerald-500/100/10 text-emerald-400 border-emerald-500/20'
                  : currentLandmarks
                    ? 'bg-amber-500/100/10 text-amber-400 border-amber-500/20'
                    : 'bg-red-500/100/10 text-red-400 border-red-500/20'
                }
              `}>
                <div className={`
                  w-1.5 h-1.5 rounded-full animate-pulse
                  ${isFullBodyVisible ? 'bg-emerald-400' : currentLandmarks ? 'bg-amber-400' : 'bg-red-400'}
                `} />
                {isFullBodyVisible
                  ? '촬영 준비 완료'
                  : currentLandmarks
                    ? '전신이 보이도록 서주세요'
                    : '자세를 감지하는 중...'
                }
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
