/**
 * supabase.ts
 * Supabase 클라이언트 설정 및 초기화
 * - Supabase 클라이언트 인스턴스 생성
 * - 환경 변수에서 URL과 API 키 로드
 * - 인증 관련 헬퍼 함수
 * - 데이터베이스 쿼리 유틸리티
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase 환경 변수가 설정되지 않았습니다.');
}

/**
 * 분석 결과 Row 타입
 */
export interface AnalysisResultRow {
  id: string;
  user_id: string;
  overall_score: number;
  head_forward: number;
  shoulder_balance: number;
  pelvic_tilt: number;
  knee_alignment: number;
  primary_issue: string | null;
  recommendations: string[];
  pose_data: Record<string, unknown>;
  created_at: string;
}

/**
 * 분석 결과 Insert 타입
 */
export interface AnalysisResultInsert {
  user_id: string;
  overall_score: number;
  head_forward: number;
  shoulder_balance: number;
  pelvic_tilt: number;
  knee_alignment: number;
  primary_issue: string | null;
  recommendations: string[];
  pose_data: Record<string, unknown>;
}

/**
 * 운동 기록 Row 타입
 */
export interface ExerciseRecordRow {
  id: string;
  user_id: string;
  exercise_id: string;
  program_id: string | null;
  completed_sets: number;
  total_duration: number;
  completed_at: string;
}

/**
 * 운동 기록 Insert 타입
 */
export interface ExerciseRecordInsert {
  user_id: string;
  exercise_id: string;
  program_id?: string | null;
  completed_sets: number;
  total_duration: number;
}

/**
 * 일일 기록 Row 타입
 */
export interface DailyRecordRow {
  id: string;
  user_id: string;
  date: string;
  exercises_completed: number;
  total_duration: number;
  streak_count: number;
}

/**
 * 일일 기록 Insert 타입
 */
export interface DailyRecordInsert {
  user_id: string;
  date: string;
  exercises_completed: number;
  total_duration: number;
  streak_count: number;
}

/**
 * Supabase 클라이언트 (타입 없이 생성하여 유연성 확보)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 분석 결과 저장
 */
export async function saveAnalysisResult(
  userId: string,
  result: Omit<AnalysisResultInsert, 'user_id'>
): Promise<AnalysisResultRow> {
  const { data, error } = await supabase
    .from('analysis_results')
    .insert({ ...result, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data as AnalysisResultRow;
}

/**
 * 사용자의 최근 분석 결과 조회
 */
export async function getLatestAnalysisResult(userId: string): Promise<AnalysisResultRow | null> {
  const { data, error } = await supabase
    .from('analysis_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as AnalysisResultRow | null;
}

/**
 * 운동 기록 저장
 */
export async function saveExerciseRecord(
  record: ExerciseRecordInsert
): Promise<ExerciseRecordRow> {
  const { data, error } = await supabase
    .from('exercise_records')
    .insert(record)
    .select()
    .single();

  if (error) throw error;
  return data as ExerciseRecordRow;
}

/**
 * 일일 기록 업데이트 또는 생성
 */
export async function updateDailyRecord(
  userId: string,
  date: string,
  exercisesCompleted: number,
  duration: number
): Promise<DailyRecordRow> {
  // 기존 기록 확인
  const { data: existing } = await supabase
    .from('daily_records')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .single();

  const existingRecord = existing as DailyRecordRow | null;

  if (existingRecord) {
    // 업데이트
    const { data, error } = await supabase
      .from('daily_records')
      .update({
        exercises_completed: existingRecord.exercises_completed + exercisesCompleted,
        total_duration: existingRecord.total_duration + duration,
      })
      .eq('id', existingRecord.id)
      .select()
      .single();

    if (error) throw error;
    return data as DailyRecordRow;
  } else {
    // 새로 생성 (연속 기록 계산)
    const { data: prevDay } = await supabase
      .from('daily_records')
      .select('streak_count')
      .eq('user_id', userId)
      .eq('date', getPreviousDate(date))
      .single();

    const prevDayRecord = prevDay as { streak_count: number } | null;
    const streakCount = prevDayRecord ? prevDayRecord.streak_count + 1 : 1;

    const { data, error } = await supabase
      .from('daily_records')
      .insert({
        user_id: userId,
        date,
        exercises_completed: exercisesCompleted,
        total_duration: duration,
        streak_count: streakCount,
      })
      .select()
      .single();

    if (error) throw error;
    return data as DailyRecordRow;
  }
}

/**
 * 분석 기록 전체 조회 (최신순)
 */
export async function getAnalysisHistory(userId: string): Promise<AnalysisResultRow[]> {
  const { data, error } = await supabase
    .from('analysis_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []) as AnalysisResultRow[];
}

/**
 * 분석 결과 삭제
 */
export async function deleteAnalysisResult(id: string): Promise<void> {
  const { error } = await supabase
    .from('analysis_results')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * 주간 기록 조회
 */
export async function getWeeklyRecords(userId: string): Promise<DailyRecordRow[]> {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);

  const { data, error } = await supabase
    .from('daily_records')
    .select('*')
    .eq('user_id', userId)
    .gte('date', weekAgo.toISOString().split('T')[0])
    .lte('date', today.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) throw error;
  return (data || []) as DailyRecordRow[];
}

/**
 * 이전 날짜 계산 헬퍼
 */
function getPreviousDate(dateStr: string): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

export default supabase;
