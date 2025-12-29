/**
 * logger.ts
 * 개발 모드 전용 로깅 유틸리티
 *
 * 배포 환경에서는 로그가 출력되지 않습니다.
 * 개발 환경에서만 디버그 로그를 확인할 수 있습니다.
 */

const isDev = process.env.NODE_ENV === 'development';

/**
 * 개발 모드에서만 일반 로그 출력
 */
export function devLog(...args: unknown[]): void {
  if (isDev) {
    console.log(...args);
  }
}

/**
 * 개발 모드에서만 경고 로그 출력
 */
export function devWarn(...args: unknown[]): void {
  if (isDev) {
    console.warn(...args);
  }
}

/**
 * 개발 모드에서만 그룹 로그 출력
 * 여러 관련 로그를 그룹화할 때 사용
 */
export function devGroup(label: string, ...logs: unknown[]): void {
  if (isDev) {
    console.group(label);
    logs.forEach((log) => console.log(log));
    console.groupEnd();
  }
}

/**
 * 중요 상태 전환 로그 (개발 모드 전용)
 * 운동 시작/완료, 세트 종료 등 중요 이벤트에 사용
 */
export function devStateLog(category: string, message: string, data?: unknown): void {
  if (isDev) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] [${category}] ${message}`, data ?? '');
  }
}

/**
 * 실시간 디버그 로그 (기본적으로 비활성화)
 * 매 프레임 호출되는 로그에 사용
 * ENABLE_REALTIME_LOGS를 true로 변경해야 출력됨
 */
const ENABLE_REALTIME_LOGS = false;

export function devRealtimeLog(...args: unknown[]): void {
  if (isDev && ENABLE_REALTIME_LOGS) {
    console.log(...args);
  }
}

/**
 * 에러 로그 (항상 출력)
 * console.error와 동일하지만 일관성을 위해 제공
 */
export function logError(...args: unknown[]): void {
  console.error(...args);
}

const logger = {
  log: devLog,
  warn: devWarn,
  group: devGroup,
  state: devStateLog,
  realtime: devRealtimeLog,
  error: logError,
};

export default logger;
