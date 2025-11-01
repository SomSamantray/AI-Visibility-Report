-- AI Visibility Tracker - Complete Database Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. CREATE TABLES
-- ============================================

-- Table 1: analyses
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_name TEXT NOT NULL,
  institution_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  research_notes JSONB,
  topics JSONB,

  overall_visibility_score DECIMAL(5,2),
  total_queries INTEGER DEFAULT 0,
  queries_mentioned INTEGER DEFAULT 0,
  average_rank DECIMAL(5,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Table 2: topics
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  topic_order INTEGER NOT NULL,

  visibility_percentage DECIMAL(5,2),
  average_rank DECIMAL(5,2),
  total_citations INTEGER DEFAULT 0,
  queries_with_mention INTEGER DEFAULT 0,
  total_queries INTEGER DEFAULT 10,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 3: queries
CREATE TABLE queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,

  query_text TEXT NOT NULL,
  query_order INTEGER NOT NULL,

  answer TEXT,
  brands_mentioned TEXT[],
  focused_brand TEXT,
  focused_brand_rank INTEGER,
  visibility INTEGER,
  websites_cited TEXT[],

  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 4: competitors
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,

  brand_name TEXT NOT NULL,
  mention_count INTEGER DEFAULT 0,
  mention_percentage DECIMAL(5,2),
  average_rank DECIMAL(5,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(analysis_id, brand_name)
);

-- Table 5: sources
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,

  url TEXT NOT NULL,
  domain TEXT,
  citation_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(analysis_id, url)
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX idx_analyses_status ON analyses(status);
CREATE INDEX idx_analyses_created_at ON analyses(created_at DESC);

CREATE INDEX idx_topics_analysis_id ON topics(analysis_id);
CREATE INDEX idx_topics_order ON topics(analysis_id, topic_order);

CREATE INDEX idx_queries_topic_id ON queries(topic_id);
CREATE INDEX idx_queries_analysis_id ON queries(analysis_id);
CREATE INDEX idx_queries_status ON queries(status);
CREATE INDEX idx_queries_visibility ON queries(analysis_id, visibility);

CREATE INDEX idx_competitors_analysis_id ON competitors(analysis_id);
CREATE INDEX idx_competitors_mention_count ON competitors(analysis_id, mention_count DESC);

CREATE INDEX idx_sources_analysis_id ON sources(analysis_id);
CREATE INDEX idx_sources_citation_count ON sources(analysis_id, citation_count DESC);

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

-- Public read access (for now)
CREATE POLICY "Allow public read on analyses" ON analyses FOR SELECT USING (true);
CREATE POLICY "Allow public read on topics" ON topics FOR SELECT USING (true);
CREATE POLICY "Allow public read on queries" ON queries FOR SELECT USING (true);
CREATE POLICY "Allow public read on competitors" ON competitors FOR SELECT USING (true);
CREATE POLICY "Allow public read on sources" ON sources FOR SELECT USING (true);

-- Service role can do everything
CREATE POLICY "Service role all on analyses" ON analyses FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role all on topics" ON topics FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role all on queries" ON queries FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role all on competitors" ON competitors FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role all on sources" ON sources FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- 4. DATABASE FUNCTIONS
-- ============================================

-- Function to update analysis progress
CREATE OR REPLACE FUNCTION update_analysis_progress(analysis_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE analyses
  SET
    progress = (
      SELECT CAST(COUNT(*) FILTER (WHERE status = 'completed') AS FLOAT) / COUNT(*) * 100
      FROM queries
      WHERE analysis_id = analysis_uuid
    ),
    updated_at = NOW()
  WHERE id = analysis_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate topic metrics
CREATE OR REPLACE FUNCTION calculate_topic_metrics(topic_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE topics
  SET
    queries_with_mention = (
      SELECT COUNT(*) FROM queries
      WHERE topic_id = topic_uuid AND focused_brand_rank > 0
    ),
    visibility_percentage = (
      SELECT CAST(COUNT(*) FILTER (WHERE focused_brand_rank > 0) AS FLOAT) / NULLIF(COUNT(*), 0) * 100
      FROM queries WHERE topic_id = topic_uuid
    ),
    average_rank = (
      SELECT AVG(focused_brand_rank)
      FROM queries
      WHERE topic_id = topic_uuid AND focused_brand_rank > 0
    ),
    total_citations = (
      SELECT SUM(array_length(websites_cited, 1))
      FROM queries
      WHERE topic_id = topic_uuid
    )
  WHERE id = topic_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database schema created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Go to Database > Replication in Supabase dashboard';
  RAISE NOTICE '2. Enable Realtime for: analyses, queries';
  RAISE NOTICE '3. You''re ready to build!';
END $$;
