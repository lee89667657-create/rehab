/**
 * PoseCamera.tsx
 * 실시간 자세 인식 카메라 컴포넌트 (CDN 방식)
 *
 * MediaPipe Pose를 CDN에서 로드하여 WebAssembly 호환성 문제를 해결합니다.
 *
 * ## 변경 사항 (WASM 에러 해결)
 * - npm 패키지 대신 CDN에서 MediaPipe 로드
 * - Script 태그를 통한 동적 로딩
 * - SSR 비활성화 필수 (dynamic import with ssr: false)
 *
 * ## MediaPipe Pose 랜드마크 (33개)
 * 0: 코, 1-10: 얼굴, 11-12: 어깨, 13-14: 팔꿈치,
 * 15-16: 손목, 17-22: 손가락, 23-24: 엉덩이,
 * 25-26: 무릎, 27-28: 발목, 29-32: 발
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Script from 'next/script';
import { devStateLog } from '@/lib/logger';

/**
 * 랜드마크(관절 포인트) 타입 정의
 */
export interface Landmark {
  x: number;       // 정규화된 x 좌표 (0~1)
  y: number;       // 정규화된 y 좌표 (0~1)
  z: number;       // 깊이 값
  visibility: number; // 가시성 (0~1)
}

/**
 * 프레임 캡처 함수 타입
 * 현재 비디오 프레임을 base64 이미지로 반환합니다.
 */
export type CaptureFrameFunction = () => string | null;

/**
 * PoseCamera Props 타입
 */
interface PoseCameraProps {
  /** 자세 감지 콜백 - 프레임마다 호출됨 */
  onPoseDetected?: (landmarks: Landmark[]) => void;
  /** 카메라 활성화 여부 */
  isActive?: boolean;
  /** 캡처 함수를 부모에게 전달하는 콜백 (ref 대신 사용) */
  onCaptureReady?: (captureFrame: CaptureFrameFunction) => void;
}

/**
 * PoseCamera에서 외부로 노출하는 메서드들 (레거시 지원용)
 */
export interface PoseCameraHandle {
  /** 현재 비디오 프레임을 캡처하여 base64 이미지로 반환 */
  captureFrame: () => string | null;
}

/**
 * MediaPipe Pose 연결선 정의
 * 관절 포인트들을 시각적으로 연결하기 위한 인덱스 쌍
 */
const POSE_CONNECTIONS: [number, number][] = [
  // 얼굴
  [0, 1], [1, 2], [2, 3], [3, 7],   // 왼쪽 눈
  [0, 4], [4, 5], [5, 6], [6, 8],   // 오른쪽 눈
  [9, 10],                          // 입

  // 몸통
  [11, 12],                         // 어깨 연결
  [11, 23], [12, 24],               // 어깨-엉덩이
  [23, 24],                         // 엉덩이 연결

  // 왼팔
  [11, 13], [13, 15],               // 어깨-팔꿈치-손목
  [15, 17], [15, 19], [15, 21],     // 손목-손가락
  [17, 19],                         // 손 연결

  // 오른팔
  [12, 14], [14, 16],               // 어깨-팔꿈치-손목
  [16, 18], [16, 20], [16, 22],     // 손목-손가락
  [18, 20],                         // 손 연결

  // 왼쪽 다리
  [23, 25], [25, 27],               // 엉덩이-무릎-발목
  [27, 29], [27, 31], [29, 31],     // 발목-발

  // 오른쪽 다리
  [24, 26], [26, 28],               // 엉덩이-무릎-발목
  [28, 30], [28, 32], [30, 32],     // 발목-발
];

/**
 * PoseCamera 컴포넌트
 *
 * CDN에서 MediaPipe를 로드하여 웹캠 영상에서 실시간으로 자세를 인식합니다.
 *
 * ## ref 대신 콜백 패턴 사용
 * Next.js dynamic import와 호환성을 위해 onCaptureReady 콜백을 통해
 * 캡처 함수를 부모 컴포넌트에 전달합니다.
 */
export default function PoseCamera({
  onPoseDetected,
  isActive = true,
  onCaptureReady,
}: PoseCameraProps) {
  // === Refs ===
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const poseRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);

  /**
   * 현재 비디오 프레임을 캡처하여 base64 이미지로 반환
   * onCaptureReady 콜백을 통해 부모 컴포넌트에 전달됨
   */
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended) return null;

    // 캡처용 캔버스 사용 (없으면 생성)
    let captureCanvas = captureCanvasRef.current;
    if (!captureCanvas) {
      captureCanvas = document.createElement('canvas');
      captureCanvasRef.current = captureCanvas;
    }

    captureCanvas.width = video.videoWidth || 640;
    captureCanvas.height = video.videoHeight || 480;

    const ctx = captureCanvas.getContext('2d');
    if (!ctx) return null;

    // 비디오 프레임을 캔버스에 그리기 (미러링 적용)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -captureCanvas.width, 0, captureCanvas.width, captureCanvas.height);
    ctx.restore();

    // base64 이미지로 변환
    return captureCanvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // 캡처 함수를 부모 컴포넌트에 전달
  useEffect(() => {
    if (onCaptureReady) {
      onCaptureReady(captureFrame);
    }
  }, [onCaptureReady, captureFrame]);

  // === State ===
  const [isLoading, setIsLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState({
    pose: false,
    camera: false,
    drawing: false,
  });

  /**
   * 모든 CDN 스크립트 로드 완료 여부
   */
  const allScriptsLoaded = scriptsLoaded.pose && scriptsLoaded.camera && scriptsLoaded.drawing;

  /**
   * 캔버스에 포즈 랜드마크와 연결선 그리기
   */
  const drawPose = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (landmarks: any[], ctx: CanvasRenderingContext2D, width: number, height: number) => {
      // 캔버스 초기화
      ctx.clearRect(0, 0, width, height);

      // 연결선 그리기 (초록색)
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;

      POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];

        // visibility가 0.5 이상인 포인트만 연결
        if (start?.visibility > 0.5 && end?.visibility > 0.5) {
          ctx.beginPath();
          ctx.moveTo(start.x * width, start.y * height);
          ctx.lineTo(end.x * width, end.y * height);
          ctx.stroke();
        }
      });

      // 관절 포인트 그리기 (빨간 점)
      landmarks.forEach((landmark) => {
        if (landmark?.visibility > 0.5) {
          ctx.beginPath();
          ctx.fillStyle = '#FF0000';
          ctx.arc(landmark.x * width, landmark.y * height, 5, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    },
    []
  );

  /**
   * MediaPipe Pose 초기화
   * 모든 CDN 스크립트가 로드된 후 실행됨
   */
  useEffect(() => {
    if (!allScriptsLoaded || !isActive) return;

    const initPose = async () => {
      try {
        // window에서 MediaPipe Pose 클래스 가져오기
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Pose = (window as any).Pose;
        if (!Pose) {
          console.error('MediaPipe Pose가 로드되지 않았습니다.');
          return;
        }

        // Pose 인스턴스 생성
        const pose = new Pose({
          locateFile: (file: string) => {
            // CDN에서 WASM 파일 로드
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
          },
        });

        // Pose 옵션 설정
        pose.setOptions({
          modelComplexity: 1,        // 모델 복잡도 (0, 1, 2)
          smoothLandmarks: true,     // 랜드마크 스무딩
          enableSegmentation: false, // 배경 분리 비활성화 (성능 향상)
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        // 결과 콜백 등록
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pose.onResults((results: any) => {
          const canvas = canvasRef.current;
          if (!canvas) return;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          if (results.poseLandmarks) {
            // 캔버스에 포즈 그리기
            drawPose(results.poseLandmarks, ctx, canvas.width, canvas.height);

            // 부모 컴포넌트에 랜드마크 전달
            if (onPoseDetected) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const landmarks: Landmark[] = results.poseLandmarks.map((lm: any) => ({
                x: lm.x,
                y: lm.y,
                z: lm.z,
                visibility: lm.visibility ?? 0,
              }));
              onPoseDetected(landmarks);
            }
          } else {
            // 포즈 미감지 시 캔버스 클리어
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        });

        // 초기화 완료 대기
        await pose.initialize();
        poseRef.current = pose;
        setIsLoading(false);

        devStateLog('MediaPipe', 'Pose 초기화 완료');
      } catch (error) {
        console.error('MediaPipe Pose 초기화 실패:', error);
        setCameraError('AI 모델 초기화에 실패했습니다.');
      }
    };

    initPose();

    // 클린업
    return () => {
      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }
    };
  }, [allScriptsLoaded, isActive, drawPose, onPoseDetected]);

  /**
   * 웹캠 초기화 및 프레임 처리
   */
  useEffect(() => {
    if (!allScriptsLoaded || !isActive || isLoading) return;

    const video = videoRef.current;
    if (!video) return;

    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        // 웹캠 스트림 요청 (세로 비율 9:16)
        // 전신이 보이도록 세로 해상도를 높게 설정
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 720 },      // 세로 비율에서의 가로
            height: { ideal: 1280 },    // 세로 비율에서의 세로
            facingMode: 'user',         // 전면 카메라
            aspectRatio: { ideal: 9 / 16 }, // 세로 비율 강제
          },
          audio: false,
        });

        video.srcObject = stream;
        await video.play();

        // 캔버스 크기 동기화
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }

        // 프레임 처리 루프
        const processFrame = async () => {
          if (!poseRef.current || !video || video.paused || video.ended) {
            animationRef.current = requestAnimationFrame(processFrame);
            return;
          }

          try {
            // MediaPipe에 현재 프레임 전송
            await poseRef.current.send({ image: video });
          } catch {
            // 간헐적 에러 무시
          }

          animationRef.current = requestAnimationFrame(processFrame);
        };

        processFrame();
      } catch (error) {
        console.error('카메라 에러:', error);

        // 에러 유형별 메시지
        const errorWithName = error as { name?: string };
        if (errorWithName.name === 'NotAllowedError') {
          setCameraError('카메라 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.');
        } else if (errorWithName.name === 'NotFoundError') {
          setCameraError('카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.');
        } else if (errorWithName.name === 'NotReadableError') {
          setCameraError('카메라를 사용할 수 없습니다. 다른 앱에서 사용 중인지 확인해주세요.');
        } else {
          setCameraError('카메라 연결 중 오류가 발생했습니다.');
        }
      }
    };

    startCamera();

    // 클린업: 카메라 스트림 및 애니메이션 정리
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [allScriptsLoaded, isActive, isLoading]);

  // === 에러 화면 ===
  if (cameraError) {
    return (
      <div className="relative w-full h-full bg-zinc-900 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/100/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-white text-lg font-medium mb-2">카메라 오류</p>
          <p className="text-zinc-400 text-sm">{cameraError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-zinc-900">
      {/* === MediaPipe CDN 스크립트 로드 === */}
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js"
        strategy="afterInteractive"
        onLoad={() => {
          devStateLog('MediaPipe', 'Pose 스크립트 로드됨');
          setScriptsLoaded((prev) => ({ ...prev, pose: true }));
        }}
        onError={() => setCameraError('MediaPipe 스크립트 로드 실패')}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
        strategy="afterInteractive"
        onLoad={() => {
          devStateLog('MediaPipe', 'Camera Utils 로드됨');
          setScriptsLoaded((prev) => ({ ...prev, camera: true }));
        }}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"
        strategy="afterInteractive"
        onLoad={() => {
          devStateLog('MediaPipe', 'Drawing Utils 로드됨');
          setScriptsLoaded((prev) => ({ ...prev, drawing: true }));
        }}
      />

      {/* === 로딩 인디케이터 === */}
      {(isLoading || !allScriptsLoaded) && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-sm">
              {!allScriptsLoaded ? 'AI 모델 로딩 중...' : '카메라 연결 중...'}
            </p>
          </div>
        </div>
      )}

      {/* === 웹캠 비디오 === */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}  // 거울 모드
        playsInline
        muted
      />

      {/* === 포즈 오버레이 캔버스 === */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}  // 비디오와 동일하게 미러링
      />
    </div>
  );
}
