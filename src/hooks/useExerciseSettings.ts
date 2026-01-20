/**
 * useExerciseSettings.ts
 * 운동 난이도 및 전문가 모드 설정 관리 Hook
 * 
 * ## 기능
 * - 난이도 선택 (쉬움/보통/어려움)
 * - 전문가 모드 (각도 직접 설정)
 * - 설정 저장 (localStorage)
 */

import { useState, useCallback, useEffect } from 'react';

// ============================================================
// 타입 정의
// ============================================================

/** 난이도 레벨 */
export type DifficultyLevel = 'easy' | 'normal' | 'hard' | 'custom';

/** 운동별 각도 설정 */
export interface ExerciseAngleSettings {
  /** 시작 각도 (준비 자세) */
  startAngle: number;
  /** 목표 각도 (최저점) */
  targetAngle: number;
  /** 완료 임계값 (1회 완료 판정) */
  repThreshold: number;
}

/** 난이도별 기본 설정 */
export interface DifficultyPreset {
  label: string;
  labelKo: string;
  description: string;
  settings: ExerciseAngleSettings;
}

/** 운동 타입별 난이도 프리셋 */
export interface ExercisePresets {
  [exerciseId: string]: {
    easy: ExerciseAngleSettings;
    normal: ExerciseAngleSettings;
    hard: ExerciseAngleSettings;
  };
}

// ============================================================
// 운동별 난이도 프리셋 정의
// ============================================================

/**
 * 운동별 난이도 프리셋
 * - easy: 초보자, 재활 환자용 (작은 각도 범위)
 * - normal: 일반 사용자용 (보통 각도 범위)
 * - hard: 숙련자용 (넓은 각도 범위)
 */
export const EXERCISE_PRESETS: ExercisePresets = {
  // 스쿼트 (무릎 각도 기준)
  squat: {
    easy: { startAngle: 160, targetAngle: 130, repThreshold: 145 },
    normal: { startAngle: 170, targetAngle: 110, repThreshold: 140 },
    hard: { startAngle: 175, targetAngle: 90, repThreshold: 130 },
  },
  // 턱 당기기 (목 각도 기준)
  'chin-tuck': {
    easy: { startAngle: 170, targetAngle: 155, repThreshold: 162 },
    normal: { startAngle: 175, targetAngle: 150, repThreshold: 160 },
    hard: { startAngle: 180, targetAngle: 145, repThreshold: 155 },
  },
  // 견갑골 모으기 (어깨 각도 기준)
  'shoulder-blade-squeeze': {
    easy: { startAngle: 160, targetAngle: 140, repThreshold: 150 },
    normal: { startAngle: 170, targetAngle: 130, repThreshold: 145 },
    hard: { startAngle: 175, targetAngle: 120, repThreshold: 140 },
  },
  // 어깨 으쓱하기 (어깨 높이 기준)
  'shoulder-squeeze': {
    easy: { startAngle: 160, targetAngle: 145, repThreshold: 152 },
    normal: { startAngle: 170, targetAngle: 140, repThreshold: 150 },
    hard: { startAngle: 175, targetAngle: 135, repThreshold: 145 },
  },
  // 팔 들어올리기 (어깨 각도 기준)
  'arm-raise': {
    easy: { startAngle: 90, targetAngle: 140, repThreshold: 120 },
    normal: { startAngle: 90, targetAngle: 160, repThreshold: 130 },
    hard: { startAngle: 90, targetAngle: 175, repThreshold: 140 },
  },
  // 목 옆 스트레칭
  'neck-side-stretch': {
    easy: { startAngle: 170, targetAngle: 155, repThreshold: 162 },
    normal: { startAngle: 175, targetAngle: 150, repThreshold: 160 },
    hard: { startAngle: 180, targetAngle: 145, repThreshold: 155 },
  },
};

/** 기본 프리셋 (운동이 목록에 없을 때) */
export const DEFAULT_PRESETS = {
  easy: { startAngle: 160, targetAngle: 130, repThreshold: 145 },
  normal: { startAngle: 170, targetAngle: 110, repThreshold: 140 },
  hard: { startAngle: 175, targetAngle: 90, repThreshold: 130 },
};

/** 난이도 레이블 */
export const DIFFICULTY_LABELS: Record<Exclude<DifficultyLevel, 'custom'>, DifficultyPreset> = {
  easy: {
    label: 'Easy',
    labelKo: '쉬움',
    description: '초보자, 재활 환자를 위한 작은 동작 범위',
    settings: DEFAULT_PRESETS.easy,
  },
  normal: {
    label: 'Normal',
    labelKo: '보통',
    description: '일반적인 운동 강도',
    settings: DEFAULT_PRESETS.normal,
  },
  hard: {
    label: 'Hard',
    labelKo: '어려움',
    description: '숙련자를 위한 넓은 동작 범위',
    settings: DEFAULT_PRESETS.hard,
  },
};

// ============================================================
// Hook
// ============================================================

interface UseExerciseSettingsOptions {
  /** 운동 ID */
  exerciseId: string;
  /** 초기 난이도 */
  initialDifficulty?: DifficultyLevel;
}

interface UseExerciseSettingsReturn {
  /** 현재 난이도 */
  difficulty: DifficultyLevel;
  /** 난이도 변경 */
  setDifficulty: (level: DifficultyLevel) => void;
  /** 전문가 모드 여부 */
  isExpertMode: boolean;
  /** 전문가 모드 토글 */
  toggleExpertMode: () => void;
  /** 현재 각도 설정 */
  settings: ExerciseAngleSettings;
  /** 각도 설정 변경 (전문가 모드) */
  updateSettings: (newSettings: Partial<ExerciseAngleSettings>) => void;
  /** 설정 초기화 */
  resetSettings: () => void;
  /** 난이도 프리셋 목록 */
  presets: typeof DIFFICULTY_LABELS;
}

const STORAGE_KEY = 'posture-ai-exercise-settings';

export function useExerciseSettings(
  options: UseExerciseSettingsOptions
): UseExerciseSettingsReturn {
  const { exerciseId, initialDifficulty = 'normal' } = options;

  // 난이도 상태
  const [difficulty, setDifficultyState] = useState<DifficultyLevel>(initialDifficulty);
  
  // 전문가 모드 상태
  const [isExpertMode, setIsExpertMode] = useState(false);
  
  // 커스텀 각도 설정 (전문가 모드용)
  const [customSettings, setCustomSettings] = useState<ExerciseAngleSettings>(
    getPresetForExercise(exerciseId, 'normal')
  );

  // 운동별 프리셋 가져오기
  function getPresetForExercise(
    exId: string,
    level: Exclude<DifficultyLevel, 'custom'>
  ): ExerciseAngleSettings {
    const exercisePresets = EXERCISE_PRESETS[exId];
    if (exercisePresets) {
      return exercisePresets[level];
    }
    return DEFAULT_PRESETS[level];
  }

  // localStorage에서 설정 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[exerciseId]) {
          const { difficulty: savedDiff, isExpertMode: savedExpert, customSettings: savedCustom } = parsed[exerciseId];
          if (savedDiff) setDifficultyState(savedDiff);
          if (savedExpert !== undefined) setIsExpertMode(savedExpert);
          if (savedCustom) setCustomSettings(savedCustom);
        }
      }
    } catch (e) {
      console.error('Failed to load exercise settings:', e);
    }
  }, [exerciseId]);

  // 설정 저장
  const saveSettings = useCallback((
    diff: DifficultyLevel,
    expert: boolean,
    custom: ExerciseAngleSettings
  ) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      parsed[exerciseId] = {
        difficulty: diff,
        isExpertMode: expert,
        customSettings: custom,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch (e) {
      console.error('Failed to save exercise settings:', e);
    }
  }, [exerciseId]);

  // 난이도 변경
  const setDifficulty = useCallback((level: DifficultyLevel) => {
    setDifficultyState(level);
    if (level !== 'custom') {
      const newSettings = getPresetForExercise(exerciseId, level);
      setCustomSettings(newSettings);
      saveSettings(level, isExpertMode, newSettings);
    }
  }, [exerciseId, isExpertMode, saveSettings]);

  // 전문가 모드 토글
  const toggleExpertMode = useCallback(() => {
    const newExpertMode = !isExpertMode;
    setIsExpertMode(newExpertMode);
    if (newExpertMode) {
      setDifficultyState('custom');
    }
    saveSettings(newExpertMode ? 'custom' : difficulty, newExpertMode, customSettings);
  }, [isExpertMode, difficulty, customSettings, saveSettings]);

  // 각도 설정 업데이트 (전문가 모드)
  const updateSettings = useCallback((newSettings: Partial<ExerciseAngleSettings>) => {
    setCustomSettings(prev => {
      const updated = { ...prev, ...newSettings };
      saveSettings('custom', true, updated);
      return updated;
    });
    setDifficultyState('custom');
    setIsExpertMode(true);
  }, [saveSettings]);

  // 설정 초기화
  const resetSettings = useCallback(() => {
    const defaultSettings = getPresetForExercise(exerciseId, 'normal');
    setDifficultyState('normal');
    setIsExpertMode(false);
    setCustomSettings(defaultSettings);
    saveSettings('normal', false, defaultSettings);
  }, [exerciseId, saveSettings]);

  // 현재 적용할 설정 계산
  const currentSettings: ExerciseAngleSettings = 
    difficulty === 'custom' || isExpertMode
      ? customSettings
      : getPresetForExercise(exerciseId, difficulty as Exclude<DifficultyLevel, 'custom'>);

  return {
    difficulty,
    setDifficulty,
    isExpertMode,
    toggleExpertMode,
    settings: currentSettings,
    updateSettings,
    resetSettings,
    presets: DIFFICULTY_LABELS,
  };
}
