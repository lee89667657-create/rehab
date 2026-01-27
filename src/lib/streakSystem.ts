/**
 * 연속 출석(Streak) 시스템
 *
 * 운동 완료 시 출석 체크 및 연속 일수 카운트를 관리합니다.
 */

// ============================================================
// 타입 정의
// ============================================================

export interface StreakData {
  /** 운동한 날짜 목록 (YYYY-MM-DD 형식) */
  exerciseDates: string[];
  /** 현재 연속 일수 */
  currentStreak: number;
  /** 최장 연속 기록 */
  bestStreak: number;
  /** 마지막 운동 날짜 */
  lastExerciseDate: string | null;
  /** 마지막 업데이트 시간 */
  lastUpdated: string;
}

export interface WeeklyProgress {
  day: string;       // 요일 (월, 화, ...)
  date: string;      // YYYY-MM-DD
  completed: boolean;
  isToday: boolean;
}

// ============================================================
// 상수
// ============================================================

const STORAGE_KEY = 'streak_data';
const KOREAN_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * 두 날짜 사이의 일수 차이 계산
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 어제 날짜를 YYYY-MM-DD 형식으로 반환
 */
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

// ============================================================
// Streak 계산 로직
// ============================================================

/**
 * 날짜 목록에서 연속 일수 계산
 */
export function calculateStreak(dates: string[]): { current: number; best: number } {
  if (dates.length === 0) {
    return { current: 0, best: 0 };
  }

  // 날짜 정렬 (최신순)
  const sortedDates = [...new Set(dates)].sort((a, b) => b.localeCompare(a));

  const today = getTodayDate();
  const yesterday = getYesterdayDate();

  // 오늘 또는 어제 운동했는지 확인
  const hasRecentActivity = sortedDates[0] === today || sortedDates[0] === yesterday;

  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  // 모든 연속 기록 계산
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const diff = daysBetween(sortedDates[i], sortedDates[i - 1]);
      if (diff === 1) {
        tempStreak++;
      } else {
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 1;
      }
    }
  }
  bestStreak = Math.max(bestStreak, tempStreak);

  // 현재 연속 기록 계산 (오늘/어제부터 시작하는 경우만)
  if (hasRecentActivity) {
    currentStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = daysBetween(sortedDates[i], sortedDates[i - 1]);
      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return { current: currentStreak, best: bestStreak };
}

// ============================================================
// 로컬 스토리지 관리
// ============================================================

/**
 * 초기 Streak 데이터
 */
function getInitialStreakData(): StreakData {
  return {
    exerciseDates: [],
    currentStreak: 0,
    bestStreak: 0,
    lastExerciseDate: null,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Streak 데이터 로드
 */
export function loadStreakData(): StreakData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return getInitialStreakData();
    }

    const data: StreakData = JSON.parse(stored);

    // streak 재계산 (날짜가 지났을 수 있으므로)
    const { current, best } = calculateStreak(data.exerciseDates);

    return {
      ...data,
      currentStreak: current,
      bestStreak: Math.max(data.bestStreak, best),
    };
  } catch (error) {
    console.error('Failed to load streak data:', error);
    return getInitialStreakData();
  }
}

/**
 * Streak 데이터 저장
 */
export function saveStreakData(data: StreakData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save streak data:', error);
  }
}

/**
 * 운동 완료 기록 추가
 */
export function recordExercise(date?: string): StreakData {
  const exerciseDate = date || getTodayDate();
  const currentData = loadStreakData();

  // 이미 기록된 날짜면 스킵
  if (currentData.exerciseDates.includes(exerciseDate)) {
    return currentData;
  }

  // 날짜 추가
  const newDates = [...currentData.exerciseDates, exerciseDate];

  // streak 재계산
  const { current, best } = calculateStreak(newDates);

  const newData: StreakData = {
    exerciseDates: newDates,
    currentStreak: current,
    bestStreak: Math.max(currentData.bestStreak, best),
    lastExerciseDate: exerciseDate,
    lastUpdated: new Date().toISOString(),
  };

  saveStreakData(newData);
  return newData;
}

/**
 * 오늘 운동했는지 확인
 */
export function hasExercisedToday(): boolean {
  const data = loadStreakData();
  return data.exerciseDates.includes(getTodayDate());
}

// ============================================================
// 주간 진행 상황
// ============================================================

/**
 * 이번 주 운동 현황 조회
 */
export function getWeeklyProgress(): WeeklyProgress[] {
  const data = loadStreakData();
  const exerciseDatesSet = new Set(data.exerciseDates);

  const today = new Date();
  const todayStr = getTodayDate();

  // 이번 주 월요일 찾기
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const weekProgress: WeeklyProgress[] = [];

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(monday);
    currentDate.setDate(monday.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayIndex = currentDate.getDay();

    weekProgress.push({
      day: KOREAN_DAYS[dayIndex],
      date: dateStr,
      completed: exerciseDatesSet.has(dateStr),
      isToday: dateStr === todayStr,
    });
  }

  return weekProgress;
}

/**
 * 이번 주 운동 완료 일수
 */
export function getWeeklyCompletedCount(): number {
  const weekProgress = getWeeklyProgress();
  return weekProgress.filter(d => d.completed).length;
}

// ============================================================
// Supabase 연동 (선택적)
// ============================================================

/**
 * Supabase에 운동 기록 동기화
 * 로그인 유저인 경우에만 호출
 */
export async function syncToSupabase(userId: string): Promise<void> {
  try {
    const { updateDailyRecord } = await import('@/lib/supabase');
    const data = loadStreakData();
    const today = getTodayDate();

    if (data.exerciseDates.includes(today)) {
      await updateDailyRecord(userId, today, 1, 0);
    }
  } catch (error) {
    console.error('Failed to sync streak to Supabase:', error);
  }
}

/**
 * Supabase에서 운동 기록 불러오기
 */
export async function loadFromSupabase(userId: string): Promise<void> {
  try {
    const { getWeeklyRecords } = await import('@/lib/supabase');
    const records = await getWeeklyRecords(userId);

    if (records && records.length > 0) {
      const currentData = loadStreakData();
      const supabaseDates = records.map(r => r.date);

      // 로컬과 Supabase 데이터 병합
      const mergedDates = [...new Set([...currentData.exerciseDates, ...supabaseDates])];
      const { current, best } = calculateStreak(mergedDates);

      const newData: StreakData = {
        exerciseDates: mergedDates,
        currentStreak: current,
        bestStreak: Math.max(currentData.bestStreak, best),
        lastExerciseDate: mergedDates.sort((a, b) => b.localeCompare(a))[0] || null,
        lastUpdated: new Date().toISOString(),
      };

      saveStreakData(newData);
    }
  } catch (error) {
    console.error('Failed to load streak from Supabase:', error);
  }
}
