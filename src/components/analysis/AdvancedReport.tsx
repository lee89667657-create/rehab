/**
 * 고급 분석 리포트 컴포넌트
 *
 * 재활 운동 분석의 상세 결과를 시각적으로 표시합니다.
 * ROM(관절가동범위) 분석과 좌우 비대칭 분석 결과를 카드 형태로 보여줍니다.
 *
 * 주요 기능:
 * - 관절각 측정값 표시 (몸통, 고관절, 무릎, 어깨)
 * - ROM 분석 결과 표시 (정상/제한/과도 상태)
 * - 좌우 비대칭 시각화 (비대칭 바 그래프)
 *
 * 사용 방법:
 * ```tsx
 * <AdvancedReport
 *   jointAngles={jointAngles}
 *   romResults={romResults}
 *   asymmetryResults={asymmetryResults}
 * />
 * ```
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Scale, TrendingUp } from 'lucide-react';
import {
  JointAngles,
  ROMResult,
  AsymmetryResult,
} from '@/lib/advancedAnalysis';

// ============================================================
// Props 타입 정의
// ============================================================

/**
 * AdvancedReport 컴포넌트 Props
 */
interface Props {
  /** 관절각 데이터 (null이면 컴포넌트 미표시) */
  jointAngles: JointAngles | null;

  /** ROM 분석 결과 배열 */
  romResults: ROMResult[];

  /** 좌우 비대칭 분석 결과 배열 */
  asymmetryResults: AsymmetryResult[];
}

// ============================================================
// 메인 컴포넌트
// ============================================================

/**
 * 고급 분석 리포트 컴포넌트
 *
 * 관절각, ROM 분석, 좌우 비대칭 분석 결과를 카드 형태로 표시합니다.
 *
 * @param props - 컴포넌트 props
 * @returns JSX.Element 또는 null (데이터 없을 때)
 */
export default function AdvancedReport({
  jointAngles,
  romResults,
  asymmetryResults,
}: Props) {
  // 관절각 데이터가 없으면 아무것도 렌더링하지 않음
  if (!jointAngles) {
    return null;
  }

  // ============================================================
  // 상태별 색상 반환 함수
  // ============================================================

  /**
   * ROM 상태에 따른 Tailwind CSS 클래스를 반환합니다.
   *
   * @param status - ROM 상태 ('normal' | 'limited' | 'excessive')
   * @returns 텍스트 색상과 배경 색상 클래스
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        // 정상: 녹색 계열
        return 'text-green-600 bg-green-100';
      case 'limited':
        // 제한: 주황색 계열 (경고)
        return 'text-orange-600 bg-orange-100';
      case 'excessive':
        // 과도: 빨간색 계열 (위험)
        return 'text-red-600 bg-red-100';
      default:
        // 기본: 회색 계열
        return 'text-gray-600 bg-gray-100';
    }
  };

  // ============================================================
  // 심각도별 색상 반환 함수
  // ============================================================

  /**
   * 비대칭 심각도에 따른 Tailwind CSS 텍스트 색상 클래스를 반환합니다.
   *
   * @param severity - 심각도 ('minimal' | 'mild' | 'moderate' | 'severe')
   * @returns 텍스트 색상 클래스
   */
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'minimal':
        // 정상: 녹색
        return 'text-green-600';
      case 'mild':
        // 경미: 노란색
        return 'text-yellow-600';
      case 'moderate':
        // 중등도: 주황색
        return 'text-orange-600';
      case 'severe':
        // 심각: 빨간색
        return 'text-red-600';
      default:
        // 기본: 회색
        return 'text-gray-600';
    }
  };

  // ============================================================
  // 렌더링
  // ============================================================

  return (
    <div className="space-y-4">
      {/* ========================================
          관절각 측정 카드
          ======================================== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {/* 아이콘: 활동/움직임을 나타내는 Activity 아이콘 */}
            <Activity className="w-4 h-4" />
            관절각 측정
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 2열 그리드 레이아웃 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 몸통 기울기 */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">몸통 기울기</p>
              <p className="text-xl font-bold">{jointAngles.trunk}도</p>
            </div>

            {/* 고관절 좌/우 */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">고관절 (좌/우)</p>
              <p className="text-xl font-bold">
                {jointAngles.hipLeft}도 / {jointAngles.hipRight}도
              </p>
            </div>

            {/* 무릎 좌/우 */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">무릎 (좌/우)</p>
              <p className="text-xl font-bold">
                {jointAngles.kneeLeft}도 / {jointAngles.kneeRight}도
              </p>
            </div>

            {/* 어깨 좌/우 */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">어깨 (좌/우)</p>
              <p className="text-xl font-bold">
                {jointAngles.shoulderLeft}도 / {jointAngles.shoulderRight}도
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================
          ROM 분석 카드
          ======================================== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {/* 아이콘: 추세/범위를 나타내는 TrendingUp 아이콘 */}
            <TrendingUp className="w-4 h-4" />
            ROM 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* ROM 결과 목록 */}
          <div className="space-y-2">
            {romResults.map((rom, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                {/* 좌측: 관절명 및 정상 범위 */}
                <div>
                  <p className="text-sm font-medium">
                    {/* 좌/우 표시 (center가 아닌 경우만) */}
                    {rom.side !== 'center' &&
                      (rom.side === 'left' ? '좌 ' : '우 ')}
                    {/* 관절명을 한글로 변환하여 표시 */}
                    {rom.joint === 'trunk'
                      ? '몸통'
                      : rom.joint === 'hip'
                        ? '고관절'
                        : rom.joint === 'knee'
                          ? '무릎'
                          : '어깨'}
                  </p>
                  {/* 정상 범위 표시 */}
                  <p className="text-xs text-muted-foreground">
                    정상: {rom.normalMin}도 - {rom.normalMax}도
                  </p>
                </div>

                {/* 우측: 측정값 및 상태 배지 */}
                <div className="text-right">
                  {/* 측정된 각도 */}
                  <p className="text-lg font-bold">{rom.measured}도</p>
                  {/* 상태 배지 (정상/제한/과도) */}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(rom.status)}`}
                  >
                    {rom.status === 'normal'
                      ? '정상'
                      : rom.status === 'limited'
                        ? '제한'
                        : '과도'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ========================================
          좌우 비대칭 카드
          ======================================== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {/* 아이콘: 균형/저울을 나타내는 Scale 아이콘 */}
            <Scale className="w-4 h-4" />
            좌우 비대칭
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 비대칭 결과 목록 */}
          <div className="space-y-3">
            {asymmetryResults.map((asym, idx) => (
              <div key={idx}>
                {/* 상단: 관절명 및 백분율 차이 */}
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">{asym.joint}</span>
                  {/* 백분율 차이 (심각도에 따른 색상) */}
                  <span
                    className={`text-sm font-bold ${getSeverityColor(asym.severity)}`}
                  >
                    {asym.percentDiff}% 차이
                  </span>
                </div>

                {/* 비대칭 시각화 바 */}
                <div className="flex items-center gap-2">
                  {/* 좌측 레이블 */}
                  <span className="text-xs w-6">L</span>

                  {/* 비대칭 바 컨테이너 */}
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden relative">
                    {/* 중앙 구분선 (균형 기준점) */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-300"></div>

                    {/* 비대칭 표시 바 (균형 상태가 아닐 때만 표시) */}
                    {asym.dominantSide !== 'balanced' && (
                      <div
                        className={`absolute top-0 bottom-0 ${
                          // 좌측이 우세하면 중앙에서 왼쪽으로, 우측이 우세하면 중앙에서 오른쪽으로
                          asym.dominantSide === 'left'
                            ? 'right-1/2 bg-blue-500'
                            : 'left-1/2 bg-blue-500'
                        }`}
                        // 백분율 차이만큼 너비 설정 (최대 50%)
                        style={{ width: `${Math.min(asym.percentDiff, 50)}%` }}
                      />
                    )}
                  </div>

                  {/* 우측 레이블 */}
                  <span className="text-xs w-6">R</span>
                </div>

                {/* 하단: 결과 메시지 */}
                <p className="text-xs text-muted-foreground mt-1">
                  {asym.message}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
