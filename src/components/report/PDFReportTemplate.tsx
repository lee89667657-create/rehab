/**
 * PDF 리포트 템플릿 컴포넌트
 *
 * html2canvas로 캡처하여 PDF로 변환할 수 있는 전문적인 의료 리포트 스타일 템플릿입니다.
 * 밝은 배경의 프린트 친화적 디자인을 사용합니다.
 */

'use client';

import { forwardRef } from 'react';
import type { AnalysisItem } from '@/lib/poseAnalysis';
import type { JointAngles } from '@/lib/advancedAnalysis';
import type { ExerciseProgram } from '@/lib/exerciseRecommendation';

// ============================================================
// 타입 정의
// ============================================================

export interface PDFReportData {
  date: Date;
  overallScore: number;
  results: AnalysisItem[];
  jointAngles: JointAngles | null;
  measurements: {
    neckForwardDistance: number;
    shoulderTiltAngle: number;
    hipTiltAngle: number;
    kneeTiltAngle: number;
  };
  postureType: {
    name: string;
    description: string;
    features: string[];
  };
  recommendedPrograms: ExerciseProgram[];
  capturedImages?: {
    front: string | null;
    side: string | null;
  };
}

interface Props {
  data: PDFReportData;
}

// ============================================================
// 유틸리티 함수
// ============================================================

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#10B981'; // emerald-500
  if (score >= 60) return '#F59E0B'; // amber-500
  return '#EF4444'; // red-500
};

const getScoreMessage = (score: number): string => {
  if (score >= 90) return '훌륭한 자세입니다!';
  if (score >= 80) return '좋은 자세입니다';
  if (score >= 70) return '양호한 자세입니다';
  if (score >= 60) return '개선이 필요합니다';
  return '교정이 필요합니다';
};

const getGradeColor = (grade: 'good' | 'warning' | 'danger'): string => {
  switch (grade) {
    case 'good': return '#10B981';
    case 'warning': return '#F59E0B';
    case 'danger': return '#EF4444';
  }
};

const getGradeText = (grade: 'good' | 'warning' | 'danger'): string => {
  switch (grade) {
    case 'good': return '정상';
    case 'warning': return '주의';
    case 'danger': return '위험';
  }
};

const getStatus = (value: number, normalMax: number, warningMax: number): 'good' | 'warning' | 'danger' => {
  if (Math.abs(value) <= normalMax) return 'good';
  if (Math.abs(value) <= warningMax) return 'warning';
  return 'danger';
};

// ============================================================
// PDF 리포트 템플릿 컴포넌트
// ============================================================

const PDFReportTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const scoreColor = getScoreColor(data.overallScore);

  // 측정 데이터
  const measurementItems = [
    {
      name: '어깨 좌우 기울기',
      value: `${Math.abs(data.measurements.shoulderTiltAngle).toFixed(1)}°`,
      normalRange: '0° ~ 2°',
      status: getStatus(data.measurements.shoulderTiltAngle, 2, 5),
    },
    {
      name: '골반 좌우 기울기',
      value: `${Math.abs(data.measurements.hipTiltAngle).toFixed(1)}°`,
      normalRange: '0° ~ 2°',
      status: getStatus(data.measurements.hipTiltAngle, 2, 5),
    },
    {
      name: '무릎 정렬',
      value: `${Math.abs(data.measurements.kneeTiltAngle).toFixed(1)}°`,
      normalRange: '0° ~ 2°',
      status: getStatus(data.measurements.kneeTiltAngle, 2, 5),
    },
    {
      name: '목 앞뒤 편차 (FHP)',
      value: `${data.measurements.neckForwardDistance.toFixed(1)}cm`,
      normalRange: '0 ~ 2.5cm',
      status: getStatus(data.measurements.neckForwardDistance, 2.5, 5),
    },
  ];

  // 레이더 차트 데이터
  const radarData = data.results.map((item) => ({
    label: item.name,
    value: item.score,
  }));

  // 날짜 포맷
  const dateStr = data.date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const generatedAt = new Date().toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      ref={ref}
      style={{
        width: '794px', // A4 at 96 DPI
        minHeight: '1123px',
        backgroundColor: '#FFFFFF',
        fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "Malgun Gothic", "맑은 고딕", sans-serif',
        color: '#1F2937',
        padding: '0',
        boxSizing: 'border-box',
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          backgroundColor: '#0D9488',
          padding: '24px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#FFFFFF', margin: 0 }}>
            PostureAI
          </h1>
          <p style={{ fontSize: '14px', color: '#FFFFFF', margin: '4px 0 0 0', opacity: 0.9 }}>
            자세 분석 리포트
          </p>
        </div>
        <div style={{ textAlign: 'right', color: '#FFFFFF' }}>
          <p style={{ fontSize: '14px', margin: 0 }}>{dateStr}</p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div style={{ padding: '32px' }}>
        {/* 종합 점수 섹션 */}
        <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
          {/* 원형 점수 */}
          <div style={{ position: 'relative', width: '140px', height: '140px' }}>
            <svg width="140" height="140" viewBox="0 0 140 140">
              {/* 배경 원 */}
              <circle
                cx="70"
                cy="70"
                r="60"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="12"
              />
              {/* 점수 원 */}
              <circle
                cx="70"
                cy="70"
                r="60"
                fill="none"
                stroke={scoreColor}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${(data.overallScore / 100) * 377} 377`}
                transform="rotate(-90 70 70)"
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '36px', fontWeight: 'bold', color: scoreColor }}>
                {data.overallScore}
              </span>
              <span style={{ fontSize: '14px', color: '#6B7280', display: 'block' }}>점</span>
            </div>
          </div>

          {/* 점수 정보 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#1F2937' }}>
              종합 자세 점수
            </h2>
            <p style={{ fontSize: '16px', color: scoreColor, margin: '0 0 16px 0', fontWeight: '500' }}>
              {getScoreMessage(data.overallScore)}
            </p>
            <div
              style={{
                display: 'inline-block',
                backgroundColor: '#F0FDFA',
                border: '1px solid #99F6E4',
                borderRadius: '8px',
                padding: '8px 20px',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#0D9488' }}>
                {data.postureType.name}
              </span>
            </div>
          </div>
        </div>

        {/* 촬영 이미지 섹션 */}
        {(data.capturedImages?.front || data.capturedImages?.side) && (
          <div style={{ marginBottom: '32px' }}>
            <div
              style={{
                backgroundColor: '#F9FAFB',
                padding: '8px 12px',
                borderRadius: '4px 4px 0 0',
                borderBottom: '1px solid #E5E7EB',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: '#1F2937' }}>
                📷 촬영 이미지
              </h3>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '16px',
                padding: '16px',
                backgroundColor: '#FAFAFA',
                borderRadius: '0 0 4px 4px',
              }}
            >
              {data.capturedImages?.front && (
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <img
                    src={data.capturedImages.front}
                    alt="정면"
                    style={{
                      width: '100%',
                      maxHeight: '180px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                    }}
                  />
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '8px 0 0 0' }}>정면</p>
                </div>
              )}
              {data.capturedImages?.side && (
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <img
                    src={data.capturedImages.side}
                    alt="측면"
                    style={{
                      width: '100%',
                      maxHeight: '180px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                    }}
                  />
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '8px 0 0 0' }}>측면</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 측정 결과 테이블 */}
        <div style={{ marginBottom: '32px' }}>
          <div
            style={{
              backgroundColor: '#F9FAFB',
              padding: '8px 12px',
              borderRadius: '4px 4px 0 0',
              borderBottom: '1px solid #E5E7EB',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: '#1F2937' }}>
              📊 측정 결과
            </h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F3F4F6' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#6B7280', fontWeight: '600' }}>
                  항목
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#6B7280', fontWeight: '600' }}>
                  측정값
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#6B7280', fontWeight: '600' }}>
                  정상 범위
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px', color: '#6B7280', fontWeight: '600' }}>
                  상태
                </th>
              </tr>
            </thead>
            <tbody>
              {measurementItems.map((item, index) => (
                <tr
                  key={item.name}
                  style={{ backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}
                >
                  <td style={{ padding: '12px', fontSize: '13px', color: '#1F2937', borderBottom: '1px solid #F3F4F6' }}>
                    {item.name}
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600', color: '#1F2937', borderBottom: '1px solid #F3F4F6' }}>
                    {item.value}
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#0D9488', borderBottom: '1px solid #F3F4F6' }}>
                    {item.normalRange}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #F3F4F6' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#FFFFFF',
                        backgroundColor: getGradeColor(item.status),
                      }}
                    >
                      {getGradeText(item.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 항목별 점수 */}
        <div style={{ marginBottom: '32px' }}>
          <div
            style={{
              backgroundColor: '#F9FAFB',
              padding: '8px 12px',
              borderRadius: '4px 4px 0 0',
              borderBottom: '1px solid #E5E7EB',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: '#1F2937' }}>
              📈 항목별 점수
            </h3>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              padding: '16px',
              backgroundColor: '#FAFAFA',
              borderRadius: '0 0 4px 4px',
            }}
          >
            {radarData.map((item) => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                }}
              >
                <span style={{ fontSize: '14px', color: '#1F2937' }}>{item.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '80px',
                      height: '8px',
                      backgroundColor: '#E5E7EB',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${item.value}%`,
                        height: '100%',
                        backgroundColor: getScoreColor(item.value),
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: getScoreColor(item.value),
                      minWidth: '40px',
                      textAlign: 'right',
                    }}
                  >
                    {item.value}점
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 추천 운동 */}
        {data.recommendedPrograms.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div
              style={{
                backgroundColor: '#F9FAFB',
                padding: '8px 12px',
                borderRadius: '4px 4px 0 0',
                borderBottom: '1px solid #E5E7EB',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: '#1F2937' }}>
                💪 맞춤 추천 운동
              </h3>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#FAFAFA', borderRadius: '0 0 4px 4px' }}>
              {data.recommendedPrograms.slice(0, 3).map((program, index) => (
                <div
                  key={program.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    backgroundColor: index === 0 ? '#F0FDFA' : '#FFFFFF',
                    border: `1px solid ${index === 0 ? '#99F6E4' : '#E5E7EB'}`,
                    borderRadius: '8px',
                    marginBottom: index < 2 ? '8px' : '0',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: '#0D9488',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: '600',
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937', margin: 0 }}>
                      {program.name}
                    </p>
                    <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0 0' }}>
                      {program.targetDisease} 대상 · {program.benefits[0]}
                    </p>
                  </div>
                  <span style={{ fontSize: '12px', color: '#0D9488', fontWeight: '500' }}>
                    {program.exercises.length}개 운동
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 푸터 */}
      <div
        style={{
          padding: '16px 32px',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 'auto',
        }}
      >
        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
          생성일시: {generatedAt}
        </span>
        <span style={{ fontSize: '11px', color: '#0D9488', fontWeight: '600' }}>
          PostureAI로 생성됨
        </span>
      </div>
    </div>
  );
});

PDFReportTemplate.displayName = 'PDFReportTemplate';

export default PDFReportTemplate;
