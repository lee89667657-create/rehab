/**
 * useStore.ts
 * Zustand 전역 상태 관리 스토어
 *
 * 앱 전체에서 공유되는 상태를 관리합니다.
 *
 * ## Zustand란?
 * Zustand는 React용 경량 상태 관리 라이브러리입니다.
 * Redux보다 간단하고, Context API보다 성능이 좋습니다.
 *
 * ## 주요 상태
 * 1. 사용자 정보 (userName)
 * 2. 분석 결과 (analysisResult)
 * 3. 촬영 이미지 (capturedImages)
 * 4. 운동 진행 상태 (exercise progress)
 *
 * ## 사용법
 * ```tsx
 * import useStore from '@/store/useStore';
 *
 * function Component() {
 *   const userName = useStore((state) => state.userName);
 *   const setUserName = useStore((state) => state.setUserName);
 *   // ...
 * }
 * ```
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AnalysisResult } from '@/lib/poseAnalysis';
import type { JointAngles } from '@/lib/advancedAnalysis';

/**
 * 촬영 이미지 타입
 * 정면/측면/후면 각각의 base64 이미지 문자열
 */
interface CapturedImages {
  /** 정면 촬영 이미지 (base64) */
  front: string | null;
  /** 측면 촬영 이미지 (base64) */
  side: string | null;
  /** 후면 촬영 이미지 (base64) - 하위호환용 */
  back?: string | null;
}

/**
 * 3D 랜드마크 포인트 타입
 * MediaPipe world_landmarks 형식
 */
interface Landmark3D {
  x: number;          // X 좌표 (미터 단위)
  y: number;          // Y 좌표 (미터 단위)
  z: number;          // Z 좌표 (미터 단위)
  visibility: number; // 가시성 점수 (0~1)
}

/**
 * 뷰별 랜드마크 데이터 타입
 * 정면/측면 각각의 33개 랜드마크 배열
 */
interface LandmarksByView {
  /** 정면 촬영 시 랜드마크 (33개) */
  front: Landmark3D[] | null;
  /** 측면 촬영 시 랜드마크 (33개) */
  side: Landmark3D[] | null;
  /** 후면 촬영 시 랜드마크 (33개) - 하위호환용 */
  back?: Landmark3D[] | null;
}

/**
 * 앱 전역 상태 인터페이스
 */
interface AppState {
  // ========================================
  // 사용자 정보
  // ========================================

  /**
   * 사용자 이름
   * 앱 내에서 표시되는 닉네임입니다.
   */
  userName: string;

  /**
   * 사용자 이름 설정
   * @param name - 새로운 사용자 이름
   */
  setUserName: (name: string) => void;

  // ========================================
  // 분석 결과
  // ========================================

  /**
   * 자세 분석 결과
   * 분석 완료 후 결과 페이지에서 사용됩니다.
   */
  analysisResult: AnalysisResult | null;

  /**
   * 분석 결과 저장
   * @param result - 분석 결과 객체
   */
  setAnalysisResult: (result: AnalysisResult) => void;

  /**
   * 분석 결과 초기화
   * 새로운 분석을 시작할 때 호출합니다.
   */
  clearAnalysisResult: () => void;

  // ========================================
  // 관절각 데이터 (고급 분석용)
  // ========================================

  /**
   * 관절각 데이터 (ROM, 비대칭 분석용)
   * MediaPipe world_landmarks에서 계산된 3D 관절각입니다.
   */
  jointAngles: JointAngles | null;

  /**
   * 관절각 데이터 저장
   * @param angles - 계산된 관절각 객체
   */
  setJointAngles: (angles: JointAngles) => void;

  /**
   * 관절각 데이터 초기화
   */
  clearJointAngles: () => void;

  // ========================================
  // 3D 랜드마크 데이터 (스켈레톤 시각화용)
  // ========================================

  /**
   * 뷰별 3D 랜드마크 데이터
   * MediaPipe world_landmarks 기반, 정면/측면/후면 각각 저장
   */
  landmarks: LandmarksByView;

  /**
   * 랜드마크 데이터 저장
   * @param data - 뷰별 랜드마크 객체
   */
  setLandmarks: (data: LandmarksByView) => void;

  /**
   * 랜드마크 데이터 초기화
   */
  clearLandmarks: () => void;

  // ========================================
  // 촬영 이미지
  // ========================================

  /**
   * 촬영된 이미지 (base64 문자열)
   * 정면, 측면, 후면 각각 저장됩니다.
   */
  capturedImages: CapturedImages;

  /**
   * 촬영 이미지 저장
   * @param type - 촬영 타입 (front/side/back)
   * @param image - base64 인코딩된 이미지 문자열
   */
  setCapturedImage: (type: keyof CapturedImages, image: string) => void;

  /**
   * 모든 촬영 이미지 초기화
   * 새로운 촬영을 시작할 때 호출합니다.
   */
  clearCapturedImages: () => void;

  // ========================================
  // 운동 진행 상태
  // ========================================

  /**
   * 현재 진행 중인 운동의 인덱스 (0부터 시작)
   * 프로그램 내 몇 번째 운동인지 나타냅니다.
   */
  currentExerciseIndex: number;

  /**
   * 현재 세트 번호 (1부터 시작)
   */
  currentSet: number;

  /**
   * 운동 재생 상태
   * true: 재생 중 / false: 일시정지
   */
  isPlaying: boolean;

  /**
   * 현재 운동 인덱스 설정
   * @param index - 운동 인덱스 (0부터 시작)
   */
  setCurrentExerciseIndex: (index: number) => void;

  /**
   * 현재 세트 번호 설정
   * @param set - 세트 번호 (1부터 시작)
   */
  setCurrentSet: (set: number) => void;

  /**
   * 재생 상태 설정
   * @param playing - true: 재생 / false: 일시정지
   */
  setIsPlaying: (playing: boolean) => void;

  /**
   * 운동 진행 상태 초기화
   * 새로운 운동 프로그램을 시작할 때 호출합니다.
   */
  resetExerciseProgress: () => void;

  // ========================================
  // 추가 유틸리티
  // ========================================

  /**
   * 다음 운동으로 이동
   * 인덱스를 1 증가시킵니다.
   */
  nextExercise: () => void;

  /**
   * 다음 세트로 이동
   * 세트 번호를 1 증가시킵니다.
   */
  nextSet: () => void;

  /**
   * 모든 상태 초기화
   * 앱을 처음 상태로 되돌립니다.
   */
  resetAll: () => void;
}

/**
 * 초기 촬영 이미지 상태
 */
const initialCapturedImages: CapturedImages = {
  front: null,
  side: null,
  back: null,
};

/**
 * 초기 랜드마크 상태
 */
const initialLandmarks: LandmarksByView = {
  front: null,
  side: null,
  back: null,
};

/**
 * Zustand 스토어 생성
 *
 * persist 미들웨어를 사용하여 일부 상태를 localStorage에 저장합니다.
 * - userName: 사용자가 앱을 다시 열어도 이름이 유지됩니다.
 * - analysisResult: 분석 결과도 임시 저장됩니다.
 */
const useStore = create<AppState>()(
  persist(
    (set) => ({
      // ========================================
      // 사용자 정보
      // ========================================

      /** 기본 사용자 이름 */
      userName: '사용자',

      /** 사용자 이름 변경 */
      setUserName: (name) =>
        set({
          userName: name,
        }),

      // ========================================
      // 분석 결과
      // ========================================

      /** 초기 분석 결과: null (분석 전) */
      analysisResult: null,

      /** 분석 결과 저장 */
      setAnalysisResult: (result) =>
        set({
          analysisResult: result,
        }),

      /** 분석 결과 초기화 */
      clearAnalysisResult: () =>
        set({
          analysisResult: null,
        }),

      // ========================================
      // 관절각 데이터 (고급 분석용)
      // ========================================

      /** 초기 관절각 데이터: null (분석 전) */
      jointAngles: null,

      /** 관절각 데이터 저장 */
      setJointAngles: (angles) =>
        set({
          jointAngles: angles,
        }),

      /** 관절각 데이터 초기화 */
      clearJointAngles: () =>
        set({
          jointAngles: null,
        }),

      // ========================================
      // 3D 랜드마크 데이터 (스켈레톤 시각화용)
      // ========================================

      /** 초기 랜드마크 데이터: 모두 null */
      landmarks: initialLandmarks,

      /** 랜드마크 데이터 저장 */
      setLandmarks: (data) =>
        set({
          landmarks: data,
        }),

      /** 랜드마크 데이터 초기화 */
      clearLandmarks: () =>
        set({
          landmarks: initialLandmarks,
        }),

      // ========================================
      // 촬영 이미지
      // ========================================

      /** 초기 촬영 이미지: 모두 null */
      capturedImages: initialCapturedImages,

      /**
       * 특정 타입의 촬영 이미지 저장
       * 기존 이미지를 유지하면서 특정 타입만 업데이트합니다.
       */
      setCapturedImage: (type, image) =>
        set((state) => ({
          capturedImages: {
            ...state.capturedImages,
            [type]: image,
          },
        })),

      /** 모든 촬영 이미지 초기화 */
      clearCapturedImages: () =>
        set({
          capturedImages: initialCapturedImages,
        }),

      // ========================================
      // 운동 진행 상태
      // ========================================

      /** 현재 운동 인덱스 (0부터 시작) */
      currentExerciseIndex: 0,

      /** 현재 세트 (1부터 시작) */
      currentSet: 1,

      /** 재생 상태 (기본: 정지) */
      isPlaying: false,

      /** 운동 인덱스 설정 */
      setCurrentExerciseIndex: (index) =>
        set({
          currentExerciseIndex: index,
        }),

      /** 세트 번호 설정 */
      setCurrentSet: (setNum) =>
        set({
          currentSet: setNum,
        }),

      /** 재생 상태 설정 */
      setIsPlaying: (playing) =>
        set({
          isPlaying: playing,
        }),

      /** 운동 진행 상태 초기화 */
      resetExerciseProgress: () =>
        set({
          currentExerciseIndex: 0,
          currentSet: 1,
          isPlaying: false,
        }),

      // ========================================
      // 추가 유틸리티
      // ========================================

      /** 다음 운동으로 이동 */
      nextExercise: () =>
        set((state) => ({
          currentExerciseIndex: state.currentExerciseIndex + 1,
          currentSet: 1, // 새 운동은 1세트부터
        })),

      /** 다음 세트로 이동 */
      nextSet: () =>
        set((state) => ({
          currentSet: state.currentSet + 1,
        })),

      /** 모든 상태 초기화 */
      resetAll: () =>
        set({
          userName: '사용자',
          analysisResult: null,
          jointAngles: null,
          landmarks: initialLandmarks,
          capturedImages: initialCapturedImages,
          currentExerciseIndex: 0,
          currentSet: 1,
          isPlaying: false,
        }),
    }),
    {
      /**
       * persist 설정
       * name: localStorage 키 이름
       * partialize: 저장할 상태 선택 (모든 상태를 저장하면 용량 문제 발생 가능)
       */
      name: 'rehab-app-storage',

      /**
       * 저장할 상태 선택
       * - 촬영 이미지는 용량이 크므로 저장하지 않음
       * - 운동 진행 상태는 세션 단위이므로 저장하지 않음
       */
      partialize: (state) => ({
        userName: state.userName,
        // analysisResult는 필요시 저장 (용량 주의)
      }),
    }
  )
);

/**
 * 선택적 셀렉터 훅
 *
 * 특정 상태만 구독하여 불필요한 리렌더링을 방지합니다.
 *
 * @example
 * // 전체 스토어 대신 필요한 상태만 구독
 * const userName = useStore((state) => state.userName);
 */

/** 사용자 이름 셀렉터 */
export const useUserName = () => useStore((state) => state.userName);

/** 분석 결과 셀렉터 */
export const useAnalysisResult = () => useStore((state) => state.analysisResult);

/** 관절각 데이터 셀렉터 */
export const useJointAngles = () => useStore((state) => state.jointAngles);

/** 3D 랜드마크 셀렉터 */
export const useLandmarks = () => useStore((state) => state.landmarks);

/** 촬영 이미지 셀렉터 */
export const useCapturedImages = () => useStore((state) => state.capturedImages);

/** 운동 진행 상태 셀렉터 */
export const useExerciseProgress = () =>
  useStore((state) => ({
    currentExerciseIndex: state.currentExerciseIndex,
    currentSet: state.currentSet,
    isPlaying: state.isPlaying,
  }));

export default useStore;
