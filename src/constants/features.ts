/**
 * features.ts
 * 기능 플래그 설정 파일
 *
 * 서비스 기능 활성화/비활성화를 관리합니다.
 * 나중에 기능을 확장할 때 이 파일의 플래그만 변경하면 됩니다.
 */

/**
 * 분석 항목 활성화 설정
 *
 * - forward_head: 거북목 분석
 * - round_shoulder: 라운드숄더 분석
 * - pelvis_tilt: 골반 틀어짐 분석 (현재 비활성화)
 * - knee_alignment: 무릎 정렬 분석 (현재 비활성화)
 */
export const ANALYSIS_FEATURES = {
  // 상체 분석 (현재 활성화)
  forward_head: true,      // 거북목
  round_shoulder: true,    // 라운드숄더

  // 하체 분석 (추후 확장 예정 - 현재 비활성화)
  pelvis_tilt: false,      // 골반 틀어짐
  knee_alignment: false,   // 무릎 정렬
} as const;

/**
 * 활성화된 분석 항목 ID 목록
 */
export const ENABLED_ANALYSIS_IDS = Object.entries(ANALYSIS_FEATURES)
  .filter(([, enabled]) => enabled)
  .map(([id]) => id);

/**
 * 특정 분석 항목이 활성화되어 있는지 확인
 */
export function isAnalysisEnabled(id: string): boolean {
  return ANALYSIS_FEATURES[id as keyof typeof ANALYSIS_FEATURES] ?? false;
}

/**
 * 하체 분석 기능 활성화 여부
 * pelvis_tilt 또는 knee_alignment 중 하나라도 활성화되면 true
 */
export const LOWER_BODY_ANALYSIS_ENABLED =
  ANALYSIS_FEATURES.pelvis_tilt || ANALYSIS_FEATURES.knee_alignment;

/**
 * 분석 항목 매핑 (ID -> 한글 이름)
 */
export const ANALYSIS_LABELS: Record<string, string> = {
  forward_head: '거북목',
  shoulder_tilt: '라운드숄더',
  pelvis_tilt: '골반 틀어짐',
  knee_angle: '무릎 정렬',
};

/**
 * 활성화된 분석 항목만 필터링하는 헬퍼 함수
 */
export function filterEnabledItems<T extends { id: string }>(items: T[]): T[] {
  return items.filter((item) => {
    // ID 매핑 (일부 컴포넌트에서 다른 ID 사용)
    const mappedId = item.id === 'shoulder_tilt' ? 'round_shoulder' : item.id;
    const mappedId2 = mappedId === 'knee_angle' ? 'knee_alignment' : mappedId;
    return isAnalysisEnabled(mappedId2);
  });
}
