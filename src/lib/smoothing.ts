/**
 * smoothing.ts
 * 각도 스무딩 유틸리티 (3프레임 이동평균)
 */

export interface SmoothingConfig {
  windowSize: number;
  minConfidence: number;
}

export const DEFAULT_SMOOTHING_CONFIG: SmoothingConfig = {
  windowSize: 5,  // 3 → 5로 변경 (더 부드럽게)
  minConfidence: 0.3,
};

export class AngleSmoother {
  private history: Map<string, number[]> = new Map();
  private config: SmoothingConfig;

  constructor(config: Partial<SmoothingConfig> = {}) {
    this.config = { ...DEFAULT_SMOOTHING_CONFIG, ...config };
  }

  smooth(joint: string, angle: number | null): number | null {
    if (angle === null) {
      const hist = this.history.get(joint);
      if (hist && hist.length > 0) {
        return hist.reduce((a, b) => a + b, 0) / hist.length;
      }
      return null;
    }

    let hist = this.history.get(joint);
    if (!hist) {
      hist = [];
      this.history.set(joint, hist);
    }

    hist.push(angle);
    while (hist.length > this.config.windowSize) {
      hist.shift();
    }

    return hist.reduce((a, b) => a + b, 0) / hist.length;
  }

  reset(joint: string): void {
    this.history.delete(joint);
  }

  resetAll(): void {
    this.history.clear();
  }
}
