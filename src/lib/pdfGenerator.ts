/**
 * PDF 리포트 생성 유틸리티
 *
 * html2canvas를 사용하여 React 컴포넌트를 이미지로 캡처하고
 * jsPDF로 PDF를 생성합니다.
 * 이 방식은 한글 폰트 문제를 완전히 해결합니다.
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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

// ============================================================
// HTML Element to PDF 변환
// ============================================================

/**
 * HTML 요소를 PDF로 변환
 * @param element - 캡처할 HTML 요소
 * @param filename - 저장할 파일명
 */
export async function generatePDFFromElement(
  element: HTMLElement,
  filename: string = 'report.pdf'
): Promise<void> {
  try {
    // html2canvas로 캡처
    const canvas = await html2canvas(element, {
      scale: 2, // 고해상도
      useCORS: true, // 외부 이미지 허용
      allowTaint: true,
      backgroundColor: '#FFFFFF',
      logging: false,
    });

    // 이미지 데이터
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // A4 사이즈 (mm)
    const pdfWidth = 210;
    const pdfHeight = 297;

    // 이미지 비율 계산
    const ratio = imgWidth / imgHeight;
    let finalWidth = pdfWidth;
    let finalHeight = pdfWidth / ratio;

    // 페이지 높이 초과 시 조정
    if (finalHeight > pdfHeight) {
      finalHeight = pdfHeight;
      finalWidth = pdfHeight * ratio;
    }

    // PDF 생성
    const pdf = new jsPDF({
      orientation: finalHeight > finalWidth ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // 이미지가 여러 페이지인 경우
    const pageHeight = pdfHeight;
    const totalPages = Math.ceil(finalHeight / pageHeight);

    if (totalPages === 1) {
      // 단일 페이지
      const xOffset = (pdfWidth - finalWidth) / 2;
      pdf.addImage(imgData, 'PNG', xOffset, 0, finalWidth, finalHeight);
    } else {
      // 여러 페이지 (긴 콘텐츠)
      let remainingHeight = finalHeight;
      let yPosition = 0;
      let pageNum = 0;

      while (remainingHeight > 0) {
        if (pageNum > 0) {
          pdf.addPage();
        }

        const xOffset = (pdfWidth - finalWidth) / 2;
        pdf.addImage(imgData, 'PNG', xOffset, -yPosition, finalWidth, finalHeight);

        remainingHeight -= pageHeight;
        yPosition += pageHeight;
        pageNum++;
      }
    }

    // 다운로드
    pdf.save(filename);
  } catch (error) {
    console.error('PDF 생성 실패:', error);
    throw new Error('PDF 리포트 생성에 실패했습니다.');
  }
}

// ============================================================
// 인라인 HTML 생성 및 PDF 변환 (컴포넌트 없이 직접 생성)
// ============================================================

/**
 * 데이터로부터 직접 PDF 생성
 * DOM에 임시 요소를 생성하여 캡처 후 PDF로 변환
 */
export async function downloadPDFReport(data: PDFReportData): Promise<void> {
  // 임시 컨테이너 생성
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  document.body.appendChild(container);

  try {
    // HTML 콘텐츠 생성
    container.innerHTML = generateReportHTML(data);

    // 잠시 대기 (렌더링 완료)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // PDF 생성
    const reportElement = container.firstElementChild as HTMLElement;
    const dateStr = data.date.toISOString().split('T')[0];
    const filename = `PostureAI_리포트_${dateStr}.pdf`;

    await generatePDFFromElement(reportElement, filename);
  } finally {
    // 임시 컨테이너 제거
    document.body.removeChild(container);
  }
}

// ============================================================
// HTML 템플릿 생성
// ============================================================

function generateReportHTML(data: PDFReportData): string {
  const scoreColor = getScoreColor(data.overallScore);
  const scoreMessage = getScoreMessage(data.overallScore);
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

  // 측정 항목
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

  // 측정 테이블 행
  const measurementRows = measurementItems
    .map(
      (item, index) => `
    <tr style="background-color: ${index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'}">
      <td style="padding: 12px; font-size: 13px; color: #1F2937; border-bottom: 1px solid #F3F4F6">${item.name}</td>
      <td style="padding: 12px; font-size: 13px; font-weight: 600; color: #1F2937; border-bottom: 1px solid #F3F4F6">${item.value}</td>
      <td style="padding: 12px; font-size: 13px; color: #0D9488; border-bottom: 1px solid #F3F4F6">${item.normalRange}</td>
      <td style="padding: 12px; text-align: center; border-bottom: 1px solid #F3F4F6">
        <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; color: #FFFFFF; background-color: ${getGradeColor(item.status)}">${getGradeText(item.status)}</span>
      </td>
    </tr>
  `
    )
    .join('');

  // 항목별 점수 - 6개 고정 항목 (레이더 차트와 동일)
  const radarDataForScores = getRadarChartData(data);
  const scoreItems = radarDataForScores
    .map(
      (item) => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E5E7EB; margin-bottom: 6px">
      <span style="font-size: 13px; color: #1F2937">${item.shortName}</span>
      <div style="display: flex; align-items: center; gap: 8px">
        <div style="width: 60px; height: 6px; background-color: #E5E7EB; border-radius: 3px; overflow: hidden">
          <div style="width: ${item.value}%; height: 100%; background-color: ${getScoreColor(item.value)}; border-radius: 3px"></div>
        </div>
        <span style="font-size: 13px; font-weight: 600; color: ${getScoreColor(item.value)}; min-width: 36px; text-align: right">${item.value}점</span>
      </div>
    </div>
  `
    )
    .join('');

  // 추천 운동
  const exerciseItems = data.recommendedPrograms
    .slice(0, 3)
    .map(
      (program, index) => `
    <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background-color: ${index === 0 ? '#F0FDFA' : '#FFFFFF'}; border: 1px solid ${index === 0 ? '#99F6E4' : '#E5E7EB'}; border-radius: 8px; margin-bottom: ${index < 2 ? '8px' : '0'}">
      <div style="width: 28px; height: 28px; border-radius: 50%; background-color: #0D9488; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; flex-shrink: 0">${index + 1}</div>
      <div style="flex: 1">
        <p style="font-size: 14px; font-weight: 600; color: #1F2937; margin: 0">${program.name}</p>
        <p style="font-size: 12px; color: #6B7280; margin: 4px 0 0 0">${program.targetDisease} 대상 · ${program.benefits[0] || ''}</p>
      </div>
      <span style="font-size: 12px; color: #0D9488; font-weight: 500">${program.exercises.length}개 운동</span>
    </div>
  `
    )
    .join('');

  // 이미지 섹션
  const imageSection =
    data.capturedImages?.front || data.capturedImages?.side
      ? `
    <div style="margin-bottom: 32px">
      <div style="background-color: #F9FAFB; padding: 8px 12px; border-radius: 4px 4px 0 0; border-bottom: 1px solid #E5E7EB">
        <h3 style="font-size: 14px; font-weight: 600; margin: 0; color: #1F2937">📷 촬영 이미지</h3>
      </div>
      <div style="display: flex; gap: 16px; padding: 16px; background-color: #FAFAFA; border-radius: 0 0 4px 4px">
        ${
          data.capturedImages?.front
            ? `
          <div style="flex: 1; text-align: center">
            <img src="${data.capturedImages.front}" alt="정면" style="width: 100%; max-height: 180px; object-fit: contain; border-radius: 8px; border: 1px solid #E5E7EB" />
            <p style="font-size: 12px; color: #6B7280; margin: 8px 0 0 0">정면</p>
          </div>
        `
            : ''
        }
        ${
          data.capturedImages?.side
            ? `
          <div style="flex: 1; text-align: center">
            <img src="${data.capturedImages.side}" alt="측면" style="width: 100%; max-height: 180px; object-fit: contain; border-radius: 8px; border: 1px solid #E5E7EB" />
            <p style="font-size: 12px; color: #6B7280; margin: 8px 0 0 0">측면</p>
          </div>
        `
            : ''
        }
      </div>
    </div>
  `
      : '';

  // 추천 운동 섹션
  const exerciseSection =
    data.recommendedPrograms.length > 0
      ? `
    <div style="margin-bottom: 32px">
      <div style="background-color: #F9FAFB; padding: 8px 12px; border-radius: 4px 4px 0 0; border-bottom: 1px solid #E5E7EB">
        <h3 style="font-size: 14px; font-weight: 600; margin: 0; color: #1F2937">💪 맞춤 추천 운동</h3>
      </div>
      <div style="padding: 16px; background-color: #FAFAFA; border-radius: 0 0 4px 4px">
        ${exerciseItems}
      </div>
    </div>
  `
      : '';

  // 레이더 차트 데이터 준비 - 6개 고정 항목으로 정육각형 차트 생성
  const radarData: RadarDataItem[] = getRadarChartData(data);

  // 레이더 차트 SVG 생성
  const radarChartSVG = generateRadarChartSVG(radarData, 280);

  return `
    <div style="width: 794px; min-height: 1123px; background-color: #FFFFFF; font-family: Pretendard, -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', sans-serif; color: #1F2937; box-sizing: border-box">
      <!-- 헤더 -->
      <div style="background-color: #0D9488; padding: 24px 32px; display: flex; justify-content: space-between; align-items: center">
        <div>
          <h1 style="font-size: 28px; font-weight: bold; color: #FFFFFF; margin: 0">PostureAI</h1>
          <p style="font-size: 14px; color: #FFFFFF; margin: 4px 0 0 0; opacity: 0.9">자세 분석 리포트</p>
        </div>
        <div style="text-align: right; color: #FFFFFF">
          <p style="font-size: 14px; margin: 0">${dateStr}</p>
        </div>
      </div>

      <!-- 메인 콘텐츠 -->
      <div style="padding: 32px">
        <!-- 종합 점수 -->
        <div style="display: flex; gap: 24px; margin-bottom: 32px">
          <div style="position: relative; width: 140px; height: 140px">
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="60" fill="none" stroke="#E5E7EB" stroke-width="12" />
              <circle cx="70" cy="70" r="60" fill="none" stroke="${scoreColor}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(data.overallScore / 100) * 377} 377" transform="rotate(-90 70 70)" />
            </svg>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center">
              <span style="font-size: 36px; font-weight: bold; color: ${scoreColor}">${data.overallScore}</span>
              <span style="font-size: 14px; color: #6B7280; display: block">점</span>
            </div>
          </div>
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: center">
            <h2 style="font-size: 20px; font-weight: bold; margin: 0 0 8px 0; color: #1F2937">종합 자세 점수</h2>
            <p style="font-size: 16px; color: ${scoreColor}; margin: 0 0 16px 0; font-weight: 500">${scoreMessage}</p>
            <div style="display: inline-block; background-color: #F0FDFA; border: 1px solid #99F6E4; border-radius: 8px; padding: 8px 20px; width: fit-content">
              <span style="font-size: 14px; font-weight: 600; color: #0D9488">${data.postureType.name}</span>
            </div>
          </div>
        </div>

        ${imageSection}

        <!-- 측정 결과 -->
        <div style="margin-bottom: 32px">
          <div style="background-color: #F9FAFB; padding: 8px 12px; border-radius: 4px 4px 0 0; border-bottom: 1px solid #E5E7EB">
            <h3 style="font-size: 14px; font-weight: 600; margin: 0; color: #1F2937">📊 측정 결과</h3>
          </div>
          <table style="width: 100%; border-collapse: collapse">
            <thead>
              <tr style="background-color: #F3F4F6">
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6B7280; font-weight: 600">항목</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6B7280; font-weight: 600">측정값</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6B7280; font-weight: 600">정상 범위</th>
                <th style="padding: 10px 12px; text-align: center; font-size: 12px; color: #6B7280; font-weight: 600">상태</th>
              </tr>
            </thead>
            <tbody>
              ${measurementRows}
            </tbody>
          </table>
        </div>

        <!-- 항목별 점수 (레이더 차트 포함) -->
        <div style="margin-bottom: 32px">
          <div style="background-color: #F9FAFB; padding: 8px 12px; border-radius: 4px 4px 0 0; border-bottom: 1px solid #E5E7EB">
            <h3 style="font-size: 14px; font-weight: 600; margin: 0; color: #1F2937">📈 항목별 점수</h3>
          </div>
          <div style="padding: 16px; background-color: #FAFAFA; border-radius: 0 0 4px 4px">
            <div style="display: flex; gap: 24px; align-items: flex-start">
              <!-- 레이더 차트 -->
              <div style="flex-shrink: 0; display: flex; flex-direction: column; align-items: center">
                ${radarChartSVG}
                <p style="font-size: 11px; color: #6B7280; margin: 8px 0 0 0; text-align: center">자세 균형 차트</p>
              </div>
              <!-- 점수 리스트 -->
              <div style="flex: 1">
                ${scoreItems}
              </div>
            </div>
          </div>
        </div>

        ${exerciseSection}
      </div>

      <!-- 푸터 -->
      <div style="padding: 16px 32px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center">
        <span style="font-size: 11px; color: #9CA3AF">생성일시: ${generatedAt}</span>
        <span style="font-size: 11px; color: #0D9488; font-weight: 600">PostureAI로 생성됨</span>
      </div>
    </div>
  `;
}

// ============================================================
// 유틸리티 함수
// ============================================================

function getScoreColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#F59E0B';
  return '#EF4444';
}

function getScoreMessage(score: number): string {
  if (score >= 90) return '훌륭한 자세입니다!';
  if (score >= 80) return '좋은 자세입니다';
  if (score >= 70) return '양호한 자세입니다';
  if (score >= 60) return '개선이 필요합니다';
  return '교정이 필요합니다';
}

function getGradeColor(grade: 'good' | 'warning' | 'danger'): string {
  switch (grade) {
    case 'good':
      return '#10B981';
    case 'warning':
      return '#F59E0B';
    case 'danger':
      return '#EF4444';
  }
}

function getGradeText(grade: 'good' | 'warning' | 'danger'): string {
  switch (grade) {
    case 'good':
      return '정상';
    case 'warning':
      return '주의';
    case 'danger':
      return '위험';
  }
}

function getStatus(value: number, normalMax: number, warningMax: number): 'good' | 'warning' | 'danger' {
  if (Math.abs(value) <= normalMax) return 'good';
  if (Math.abs(value) <= warningMax) return 'warning';
  return 'danger';
}

/**
 * 레이더 차트용 6개 고정 항목 데이터 생성
 * - 거북목
 * - 라운드숄더
 * - 어깨 균형
 * - 골반 균형
 * - 허리 전만
 * - 무릎 정렬
 */
function getRadarChartData(data: PDFReportData): RadarDataItem[] {
  // 결과에서 항목 점수 찾기 (없으면 null 반환)
  const findScore = (keywords: string[]): number | null => {
    for (const keyword of keywords) {
      const found = data.results.find(
        (r) => r.name.includes(keyword) || r.id?.includes(keyword.toLowerCase())
      );
      if (found) return found.score;
    }
    return null;
  };

  // 측정값을 점수로 변환 (값이 낮을수록 좋음)
  const measurementToScore = (value: number, normalMax: number, maxBad: number): number => {
    const absValue = Math.abs(value);
    if (absValue <= normalMax) return 100 - (absValue / normalMax) * 10;
    if (absValue <= maxBad) return 90 - ((absValue - normalMax) / (maxBad - normalMax)) * 40;
    return Math.max(30, 50 - ((absValue - maxBad) / maxBad) * 20);
  };

  // 6개 고정 항목
  const radarItems: RadarDataItem[] = [
    {
      name: '거북목',
      shortName: '거북목',
      value: Math.round(
        findScore(['거북목', 'forward_head', 'FHP']) ??
          measurementToScore(data.measurements.neckForwardDistance, 2.5, 5)
      ),
    },
    {
      name: '라운드숄더',
      shortName: '라운드숄더',
      value: Math.round(
        findScore(['라운드숄더', 'round_shoulder', '둥근어깨']) ?? 70
      ),
    },
    {
      name: '어깨 균형',
      shortName: '어깨균형',
      value: Math.round(measurementToScore(data.measurements.shoulderTiltAngle, 2, 5)),
    },
    {
      name: '골반 균형',
      shortName: '골반균형',
      value: Math.round(measurementToScore(data.measurements.hipTiltAngle, 2, 5)),
    },
    {
      name: '허리 전만',
      shortName: '허리전만',
      value: Math.round(
        findScore(['허리', 'lumbar', '전만', '요추']) ?? 70
      ),
    },
    {
      name: '무릎 정렬',
      shortName: '무릎정렬',
      value: Math.round(measurementToScore(data.measurements.kneeTiltAngle, 2, 5)),
    },
  ];

  return radarItems;
}

// ============================================================
// 레이더 차트 SVG 생성
// ============================================================

interface RadarDataItem {
  name: string;
  shortName: string;
  value: number;
}

function generateRadarChartSVG(data: RadarDataItem[], size: number = 280): string {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;
  const levels = [20, 40, 60, 80, 100];
  const angleStep = (2 * Math.PI) / data.length;

  // 각 데이터 포인트의 좌표 계산
  const getPoint = (index: number, value: number): { x: number; y: number } => {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
    };
  };

  // 그리드 다각형 생성
  const gridPolygons = levels
    .map((level) => {
      const points = data
        .map((_, i) => {
          const point = getPoint(i, level);
          return `${point.x},${point.y}`;
        })
        .join(' ');
      return `<polygon points="${points}" fill="none" stroke="#E5E7EB" stroke-width="1" />`;
    })
    .join('\n');

  // 축 선 생성
  const axisLines = data
    .map((_, i) => {
      const endPoint = getPoint(i, 100);
      return `<line x1="${centerX}" y1="${centerY}" x2="${endPoint.x}" y2="${endPoint.y}" stroke="#E5E7EB" stroke-width="1" />`;
    })
    .join('\n');

  // 데이터 영역 다각형
  const dataPoints = data
    .map((item, i) => {
      const point = getPoint(i, item.value);
      return `${point.x},${point.y}`;
    })
    .join(' ');

  // 레이블 생성
  const labels = data
    .map((item, i) => {
      const labelRadius = radius + 28;
      const angle = angleStep * i - Math.PI / 2;
      const x = centerX + labelRadius * Math.cos(angle);
      const y = centerY + labelRadius * Math.sin(angle);

      // 위치에 따른 텍스트 정렬
      let textAnchor = 'middle';
      let dx = 0;
      if (angle > -Math.PI / 4 && angle < Math.PI / 4) {
        // 오른쪽
        textAnchor = 'start';
        dx = -5;
      } else if (angle > (3 * Math.PI) / 4 || angle < (-3 * Math.PI) / 4) {
        // 왼쪽
        textAnchor = 'end';
        dx = 5;
      }

      return `
        <text x="${x}" y="${y}" text-anchor="${textAnchor}" dx="${dx}" dy="4" fill="#374151" font-size="11" font-weight="500" font-family="Pretendard, -apple-system, sans-serif">${item.shortName}</text>
        <text x="${x}" y="${y + 14}" text-anchor="${textAnchor}" dx="${dx}" fill="#0D9488" font-size="10" font-weight="600" font-family="Pretendard, -apple-system, sans-serif">${item.value}점</text>
      `;
    })
    .join('\n');

  // 데이터 점 생성
  const dataPointCircles = data
    .map((item, i) => {
      const point = getPoint(i, item.value);
      return `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#0D9488" stroke="#FFFFFF" stroke-width="2" />`;
    })
    .join('\n');

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- 배경 원 -->
      <circle cx="${centerX}" cy="${centerY}" r="${radius + 5}" fill="#FAFAFA" stroke="none" />

      <!-- 그리드 다각형 -->
      ${gridPolygons}

      <!-- 축 선 -->
      ${axisLines}

      <!-- 데이터 영역 -->
      <defs>
        <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0D9488;stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#14B8A6;stop-opacity:0.5" />
        </linearGradient>
      </defs>
      <polygon points="${dataPoints}" fill="url(#radarGradient)" stroke="#0D9488" stroke-width="2" />

      <!-- 데이터 점 -->
      ${dataPointCircles}

      <!-- 레이블 -->
      ${labels}
    </svg>
  `;
}
