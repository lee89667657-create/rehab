interface TimerBarProps {
  currentTime: number;
  totalTime: number;
  label?: string;
}

export default function TimerBar({ currentTime, totalTime, label = '운동 시간' }: TimerBarProps) {
  const progress = ((totalTime - currentTime) / totalTime) * 100;
  const isAlmostDone = currentTime <= 5;
  const isComplete = currentTime <= 0;

  return (
    <div className="bg-gray-800 rounded-2xl p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-gray-400">{label}</h3>
        <div className="flex items-center gap-2">
          {isComplete ? (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">완료</span>
          ) : isAlmostDone ? (
            <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded">거의 완료</span>
          ) : (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">진행 중</span>
          )}
        </div>
      </div>

      {/* 현재 시간 → 목표 시간 */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="text-center">
          <p className={`text-4xl font-bold ${isComplete ? 'text-green-400' : isAlmostDone ? 'text-orange-400' : 'text-white'}`}>
            {currentTime}초
          </p>
          <p className="text-xs text-gray-500">남은 시간</p>
        </div>
        <span className="text-2xl text-gray-500">/</span>
        <div className="text-center">
          <p className="text-4xl font-bold text-gray-400">{totalTime}초</p>
          <p className="text-xs text-gray-500">목표 시간</p>
        </div>
      </div>

      {/* 타이머 바 */}
      <div className="relative h-10 bg-gray-700 rounded-lg overflow-hidden mb-2">
        {/* 진행 바 */}
        <div
          className={`absolute top-0 bottom-0 left-0 transition-all duration-1000 ease-linear ${
            isComplete ? 'bg-green-500' : isAlmostDone ? 'bg-orange-500' : 'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />

        {/* 마커 */}
        <div
          className="absolute top-1 bottom-1 w-4 bg-white rounded transition-all duration-1000 ease-linear shadow-lg"
          style={{ left: `calc(${progress}% - 8px)` }}
        />
      </div>

      {/* 라벨 */}
      <div className="flex justify-between text-xs text-gray-500 mb-6">
        <span>0초</span>
        <span>{totalTime}초</span>
      </div>

      {/* 진행률 */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">진행률</span>
          <span className={`font-bold ${isComplete ? 'text-green-400' : 'text-white'}`}>
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isComplete ? 'bg-green-500' : isAlmostDone ? 'bg-orange-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
