/**
 * ROMBar.tsx
 * 실시간 각도 시각화 컴포넌트 (교수님 스타일)
 */

interface ROMBarProps {
  currentAngle: number | null;
  startAngle: number;
  targetAngle: number;
  label?: string;
}

export default function ROMBar({ currentAngle, startAngle, targetAngle, label = '실시간 측정' }: ROMBarProps) {
  const isAscending = targetAngle > startAngle;
  const minAngle = Math.min(startAngle, targetAngle);
  const maxAngle = Math.max(startAngle, targetAngle);
  const range = maxAngle - minAngle;

  // 현재 위치 계산 (0-100%)
  const getPosition = (angle: number) => {
    const pos = ((angle - minAngle) / range) * 100;
    return Math.max(0, Math.min(100, pos));
  };

  const position = currentAngle !== null ? getPosition(currentAngle) : 0;

  // ROM 달성률 계산
  const getROMPercent = () => {
    if (currentAngle === null) return 0;
    if (isAscending) {
      return Math.max(0, Math.min(100, ((currentAngle - startAngle) / (targetAngle - startAngle)) * 100));
    } else {
      return Math.max(0, Math.min(100, ((startAngle - currentAngle) / (startAngle - targetAngle)) * 100));
    }
  };

  const romPercent = getROMPercent();
  const isAtTarget = romPercent >= 90;

  return (
    <div className="bg-gray-800 rounded-2xl p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-gray-400">{label}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">
            {isAscending ? '각도 증가 운동' : '각도 감소 운동'}
          </span>
          {isAtTarget && (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">유지</span>
          )}
        </div>
      </div>

      {/* 현재 각도 → 목표 각도 */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="text-center">
          <p className={`text-4xl font-bold ${isAtTarget ? 'text-green-400' : 'text-white'}`}>
            {currentAngle !== null ? Math.round(currentAngle) : '--'}°
          </p>
          <p className="text-xs text-gray-500">현재 각도</p>
        </div>
        <span className="text-2xl text-gray-500">→</span>
        <div className="text-center">
          <p className="text-4xl font-bold text-green-400">{targetAngle}°</p>
          <p className="text-xs text-gray-500">목표 각도</p>
        </div>
      </div>

      {/* ROM 바 */}
      <div className="relative h-10 bg-gray-700 rounded-lg overflow-hidden mb-2">
        {/* 시작 구간 (파란색) */}
        <div className="absolute top-0 bottom-0 left-0 w-1/4 bg-blue-500/40" />
        {/* 중간 구간 (회색) */}
        <div className="absolute top-0 bottom-0 left-1/4 w-1/2 bg-gray-600/40" />
        {/* 목표 구간 (초록색) */}
        <div className="absolute top-0 bottom-0 right-0 w-1/4 bg-green-500/40" />

        {/* 현재 위치 마커 */}
        {currentAngle !== null && (
          <div
            className="absolute top-1 bottom-1 w-4 bg-white rounded transition-all duration-300 ease-out shadow-lg"
            style={{ left: `calc(${position}% - 8px)` }}
          />
        )}
      </div>

      {/* 각도 라벨 */}
      <div className="flex justify-between text-xs text-gray-500 mb-6">
        <span>{minAngle}°</span>
        <span>{maxAngle}°</span>
      </div>

      {/* ROM 달성률 */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">ROM 달성률</span>
          <span className={`font-bold ${isAtTarget ? 'text-green-400' : 'text-white'}`}>
            {Math.round(romPercent)}%
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isAtTarget ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${romPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
