-- ============================================
-- 재활 운동 앱 데이터베이스 스키마
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- UUID 확장 활성화
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. 사용자 테이블
-- ============================================
create table if not exists public.users (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  name text not null,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 사용자 테이블 RLS 활성화
alter table public.users enable row level security;

-- 사용자는 자신의 데이터만 조회/수정 가능
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

-- ============================================
-- 2. 자세 분석 결과 테이블
-- ============================================
create table if not exists public.analysis_results (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  overall_score integer not null check (overall_score >= 0 and overall_score <= 100),
  head_forward integer not null check (head_forward >= 0 and head_forward <= 100),
  shoulder_balance integer not null check (shoulder_balance >= 0 and shoulder_balance <= 100),
  pelvic_tilt integer not null check (pelvic_tilt >= 0 and pelvic_tilt <= 100),
  knee_alignment integer not null check (knee_alignment >= 0 and knee_alignment <= 100),
  primary_issue text,
  recommendations text[] default '{}',
  pose_data jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 분석 결과 RLS 활성화
alter table public.analysis_results enable row level security;

-- 사용자는 자신의 분석 결과만 조회/생성 가능
create policy "Users can view own analysis results" on public.analysis_results
  for select using (auth.uid() = user_id);

create policy "Users can insert own analysis results" on public.analysis_results
  for insert with check (auth.uid() = user_id);

-- 인덱스 생성
create index if not exists idx_analysis_results_user_id on public.analysis_results(user_id);
create index if not exists idx_analysis_results_created_at on public.analysis_results(created_at desc);

-- ============================================
-- 3. 운동 기록 테이블
-- ============================================
create table if not exists public.exercise_records (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  exercise_id text not null,
  program_id text,
  completed_sets integer not null default 0,
  total_duration integer not null default 0, -- 초 단위
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 운동 기록 RLS 활성화
alter table public.exercise_records enable row level security;

-- 사용자는 자신의 운동 기록만 조회/생성 가능
create policy "Users can view own exercise records" on public.exercise_records
  for select using (auth.uid() = user_id);

create policy "Users can insert own exercise records" on public.exercise_records
  for insert with check (auth.uid() = user_id);

-- 인덱스 생성
create index if not exists idx_exercise_records_user_id on public.exercise_records(user_id);
create index if not exists idx_exercise_records_completed_at on public.exercise_records(completed_at desc);

-- ============================================
-- 4. 일일 기록 테이블 (통계용)
-- ============================================
create table if not exists public.daily_records (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null,
  exercises_completed integer not null default 0,
  total_duration integer not null default 0, -- 초 단위
  streak_count integer not null default 0,
  unique(user_id, date)
);

-- 일일 기록 RLS 활성화
alter table public.daily_records enable row level security;

-- 사용자는 자신의 일일 기록만 조회/생성/수정 가능
create policy "Users can view own daily records" on public.daily_records
  for select using (auth.uid() = user_id);

create policy "Users can insert own daily records" on public.daily_records
  for insert with check (auth.uid() = user_id);

create policy "Users can update own daily records" on public.daily_records
  for update using (auth.uid() = user_id);

-- 인덱스 생성
create index if not exists idx_daily_records_user_id on public.daily_records(user_id);
create index if not exists idx_daily_records_date on public.daily_records(date desc);

-- ============================================
-- 5. 업데이트 트리거 함수
-- ============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- users 테이블에 트리거 적용
drop trigger if exists on_users_updated on public.users;
create trigger on_users_updated
  before update on public.users
  for each row execute procedure public.handle_updated_at();

-- ============================================
-- 6. 신규 사용자 자동 생성 함수 (Auth 연동)
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Auth 사용자 생성 시 자동으로 users 테이블에 추가
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
