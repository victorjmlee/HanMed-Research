-- =============================================
-- 醫案 (의안) - Supabase DB Schema
-- Supabase 대시보드 → SQL Editor에서 실행
-- =============================================

-- 1. 프로필 (Supabase Auth 확장)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('형', '아버지')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auth 유저 생성 시 자동으로 프로필 생성
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', '형')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. 임상 사례
CREATE TABLE clinical_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- 사례 번호 (자동 생성)
  case_number TEXT,

  -- 비식별 인구통계
  age_group TEXT CHECK (age_group IN (
    '10대', '20대', '30대', '40대', '50대', '60대', '70대 이상'
  )) NOT NULL,
  gender TEXT CHECK (gender IN ('남', '여')) NOT NULL,

  -- 임상 정보
  chief_complaint TEXT NOT NULL,
  symptoms JSONB,
  tongue_diagnosis TEXT,
  pulse_diagnosis TEXT,
  pattern_identification TEXT,

  -- 처방
  prescription TEXT NOT NULL,
  herb_details JSONB,
  treatment_duration TEXT,

  -- 결과
  outcome TEXT CHECK (outcome IN (
    '완치', '호전', '변화없음', '악화', '추적불가'
  )),
  outcome_notes TEXT,

  -- 연구 메모
  clinical_notes TEXT,
  learning_points TEXT,

  -- 태그
  tags TEXT[],

  -- 기존 데이터 업로드 시 원본 보존
  original_data JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사례 번호 자동 생성 트리거
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
DECLARE
  daily_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO daily_count
  FROM clinical_cases
  WHERE DATE(created_at) = DATE(NEW.created_at);

  NEW.case_number := 'CASE-' || TO_CHAR(NEW.created_at, 'YYYYMMDD') || '-' || LPAD(daily_count::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_case_number
  BEFORE INSERT ON clinical_cases
  FOR EACH ROW EXECUTE FUNCTION generate_case_number();

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON clinical_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. AI 대화 기록
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES clinical_cases(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  referenced_cases TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- Row Level Security (RLS)
-- 조회: 로그인 사용자 전체 가능
-- 생성/수정/삭제: 본인 데이터만
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- profiles: 로그인한 사용자는 모든 프로필 조회 가능 (작성자 이름 표시용)
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- clinical_cases: 로그인한 사용자는 모든 사례 조회 가능, 수정/삭제는 본인만
CREATE POLICY "Authenticated users can view all cases"
  ON clinical_cases FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own cases"
  ON clinical_cases FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Users can update own cases"
  ON clinical_cases FOR UPDATE
  USING (auth.uid() = doctor_id);

CREATE POLICY "Users can delete own cases"
  ON clinical_cases FOR DELETE
  USING (auth.uid() = doctor_id);

-- ai_conversations
CREATE POLICY "Users can view own conversations"
  ON ai_conversations FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Users can insert own conversations"
  ON ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

-- =============================================
-- 인덱스
-- =============================================

CREATE INDEX idx_cases_doctor ON clinical_cases(doctor_id);
CREATE INDEX idx_cases_created ON clinical_cases(created_at DESC);
CREATE INDEX idx_cases_tags ON clinical_cases USING GIN(tags);
CREATE INDEX idx_cases_symptoms ON clinical_cases USING GIN(symptoms);
CREATE INDEX idx_ai_conv_doctor ON ai_conversations(doctor_id);
CREATE INDEX idx_ai_conv_case ON ai_conversations(case_id);

-- =============================================
-- pgvector: 벡터 검색 (의미적 유사도)
-- =============================================

-- pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 임베딩 컬럼 추가
ALTER TABLE clinical_cases ADD COLUMN embedding vector(1536);

-- 유사도 검색 함수
CREATE OR REPLACE FUNCTION match_cases(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  case_number text,
  age_group text,
  gender text,
  chief_complaint text,
  tongue_diagnosis text,
  pulse_diagnosis text,
  pattern_identification text,
  prescription text,
  herb_details jsonb,
  outcome text,
  outcome_notes text,
  clinical_notes text,
  learning_points text,
  similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.case_number, c.age_group, c.gender,
    c.chief_complaint, c.tongue_diagnosis, c.pulse_diagnosis,
    c.pattern_identification, c.prescription, c.herb_details,
    c.outcome, c.outcome_notes, c.clinical_notes, c.learning_points,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM clinical_cases c
  WHERE c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- HNSW 인덱스 (코사인 유사도)
CREATE INDEX idx_cases_embedding ON clinical_cases
  USING hnsw (embedding vector_cosine_ops);
