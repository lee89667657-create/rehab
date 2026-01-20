/**
 * DifficultySelector.tsx
 * 운동 난이도 선택 컴포넌트
 * 
 * ## 기능
 * - 난이도 버튼 선택 (쉬움/보통/어려움)
 * - 전문가 모드 토글 (각도 슬라이더)
 * - 실시간 각도 미리보기
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  type DifficultyLevel,
  type ExerciseAngleSettings,
  DIFFICULTY_LABELS,
} from '@/hooks/useExerciseSettings';

// ============================================================
// 타입 정의
// ============================================================

interface DifficultySelectorProps {
  /** 현재 난이도 */
  difficulty: DifficultyLevel;
  /** 난이도 변경 핸들러 */
  onDifficultyChange: (level: DifficultyLevel) => void;
  /** 전문가 모드 여부 */
  isExpertMode: boolean;
  /** 전문가 모드 토글 핸들러 */
  onExpertModeToggle: () => void;
  /** 현재 각도 설정 */
  settings: ExerciseAngleSettings;
  /** 각도 설정 변경 핸들러 */
  onSettingsChange: (settings: Partial<ExerciseAngleSettings>) => void;
  /** 설정 초기화 핸들러 */
  onReset: () => void;
}

// ============================================================
// 슬라이더 컴포넌트
// ============================================================

interface AngleSliderProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  color: string;
  onChange: (value: number) => void;
}

function AngleSlider({
  label,
  description,
  value,
  min,
  max,
  color,
  onChange,
}: AngleSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-sm font-medium">{label}</span>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span className={`text-lg font-bold ${color}`}>{value}°</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-primary
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-primary
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:shadow-lg
            [&::-moz-range-thumb]:cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{min}°</span>
          <span>{max}°</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 각도 시각화 컴포넌트
// ============================================================

interface AngleVisualizerProps {
  startAngle: number;
  targetAngle: number;
  repThreshold: number;
}

function AngleVisualizer({ startAngle, targetAngle, repThreshold }: AngleVisualizerProps) {
  // 각도를 0-180 범위로 정규화하여 바 위치 계산
  const normalize = (angle: number) => ((angle - 20) / 160) * 100;
  
  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <p className="text-xs text-muted-foreground mb-3">각도 범위 시각화</p>
      <div className="relative h-4 bg-background rounded-full overflow-hidden">
        {/* 전체 범위 바 */}
        <div 
          className="absolute h-full bg-gradient-to-r from-blue-500 via-green-500 to-amber-500 opacity-30"
          style={{ left: '0%', right: '0%' }}
        />
        {/* 시작 각도 마커 */}
        <div
          className="absolute top-0 w-1 h-full bg-blue-500 rounded-full"
          style={{ left: `${normalize(startAngle)}%` }}
        />
        {/* 목표 각도 마커 */}
        <div
          className="absolute top-0 w-1 h-full bg-green-500 rounded-full"
          style={{ left: `${normalize(targetAngle)}%` }}
        />
        {/* 완료 임계값 마커 */}
        <div
          className="absolute top-0 w-1 h-full bg-amber-500 rounded-full"
          style={{ left: `${normalize(repThreshold)}%` }}
        />
      </div>
      <div className="flex justify-between mt-2 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span>시작 {startAngle}°</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>목표 {targetAngle}°</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span>완료 {repThreshold}°</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 메인 컴포넌트
// ============================================================

export default function DifficultySelector({
  difficulty,
  onDifficultyChange,
  isExpertMode,
  onExpertModeToggle,
  settings,
  onSettingsChange,
  onReset,
}: DifficultySelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const difficultyOptions: Array<{ key: Exclude<DifficultyLevel, 'custom'>; icon: string }> = [
    { key: 'easy', icon: '1' },
    { key: 'normal', icon: '2' },
    { key: 'hard', icon: '3' },
  ];

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            난이도 설정
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>접기 <ChevronUp className="w-3 h-3 ml-1" /></>
            ) : (
              <>펼치기 <ChevronDown className="w-3 h-3 ml-1" /></>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 난이도 버튼 그룹 */}
        <div className="grid grid-cols-3 gap-2">
          {difficultyOptions.map(({ key }) => {
            const preset = DIFFICULTY_LABELS[key];
            const isSelected = difficulty === key && !isExpertMode;
            
            return (
              <button
                key={key}
                onClick={() => onDifficultyChange(key)}
                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-200
                  ${isSelected 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }
                `}
              >
                <div className={`text-sm font-semibold ${isSelected ? 'text-primary' : ''}`}>
                  {preset.labelKo}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {preset.label}
                </div>
                {isSelected && (
                  <motion.div
                    layoutId="difficulty-indicator"
                    className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center"
                    initial={false}
                  >
                    <span className="text-[10px] text-primary-foreground">✓</span>
                  </motion.div>
                )}
              </button>
            );
          })}
        </div>

        {/* 현재 선택된 난이도 설명 */}
        {!isExpertMode && difficulty !== 'custom' && (
          <p className="text-xs text-muted-foreground text-center">
            {DIFFICULTY_LABELS[difficulty as Exclude<DifficultyLevel, 'custom'>].description}
          </p>
        )}

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {/* 전문가 모드 토글 */}
              <div className="pt-3 border-t border-border">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-sm font-medium">전문가 모드</span>
                    <p className="text-xs text-muted-foreground">각도를 직접 조절합니다</p>
                  </div>
                  <button
                    onClick={onExpertModeToggle}
                    className={`
                      relative w-12 h-6 rounded-full transition-colors duration-200
                      ${isExpertMode ? 'bg-primary' : 'bg-muted'}
                    `}
                  >
                    <motion.div
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
                      animate={{ left: isExpertMode ? '28px' : '4px' }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </label>
              </div>

              {/* 전문가 모드 슬라이더 */}
              <AnimatePresence>
                {isExpertMode && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-4 pt-4"
                  >
                    <AngleSlider
                      label="시작 각도"
                      description="준비 자세의 관절 각도"
                      value={settings.startAngle}
                      min={90}
                      max={180}
                      color="text-blue-500"
                      onChange={(v) => onSettingsChange({ startAngle: v })}
                    />
                    
                    <AngleSlider
                      label="목표 각도"
                      description="최저점의 관절 각도"
                      value={settings.targetAngle}
                      min={60}
                      max={170}
                      color="text-green-500"
                      onChange={(v) => onSettingsChange({ targetAngle: v })}
                    />
                    
                    <AngleSlider
                      label="완료 임계값"
                      description="1회 완료 판정 각도"
                      value={settings.repThreshold}
                      min={80}
                      max={175}
                      color="text-amber-500"
                      onChange={(v) => onSettingsChange({ repThreshold: v })}
                    />

                    {/* 각도 시각화 */}
                    <AngleVisualizer
                      startAngle={settings.startAngle}
                      targetAngle={settings.targetAngle}
                      repThreshold={settings.repThreshold}
                    />

                    {/* 초기화 버튼 */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={onReset}
                    >
                      <RotateCcw className="w-3 h-3 mr-2" />
                      기본값으로 초기화
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
