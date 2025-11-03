// Core Types for AI Visibility Tracker

export interface Analysis {
  id: string;
  institution_name: string;
  institution_type: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  research_notes?: ResearchNotes;
  topics?: TopicData[];
  overall_visibility_score?: number;
  total_queries: number;
  queries_mentioned: number;
  average_rank?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface ResearchNotes {
  summary: string;
  region: string;
  program_levels: string[];
  key_specializations: string[];
  affiliations_accreditations: string[];
  distinctives: string[];
}

export interface TopicData {
  topic: string;
  prompts: string[];
}

export interface Topic {
  id: string;
  analysis_id: string;
  topic_name: string;
  topic_order: number;
  visibility_percentage?: number;
  average_rank?: number;
  total_citations: number;
  queries_with_mention: number;
  total_queries: number;
  created_at: string;
}

export interface Query {
  id: string;
  topic_id: string;
  analysis_id: string;
  query_text: string;
  query_order: number;
  answer?: string;
  brands_mentioned?: string[];
  focused_brand?: string;
  focused_brand_rank?: number;
  visibility?: number;
  websites_cited?: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed_at?: string;
  error_message?: string;
  created_at: string;
}

export interface Competitor {
  id: string;
  analysis_id: string;
  brand_name: string;
  mention_count: number;
  mention_percentage?: number;
  average_rank?: number;
  created_at: string;
}

export interface Source {
  id: string;
  analysis_id: string;
  url: string;
  domain?: string;
  citation_count: number;
  created_at: string;
}

// OpenRouter API Types
export interface TopicsAndQueriesResponse {
  institution_name: string;
  location: string;
  institution_type: string;
  research_notes?: ResearchNotes; // Optional - not returned by new universal prompt
  topics: TopicData[];
}

export interface BatchQueryResult {
  query: string;
  answer: string;
  brands_mentioned: string[];
  focused_brand: string;
  focused_brand_rank: number;
  visibility: string;
  websites_cited: string[];
}

export interface BatchQueryResponse {
  results: BatchQueryResult[];
}

// Configuration
export const BATCH_CONFIG = {
  QUERIES_PER_BATCH: 5,
  CONCURRENT_BATCHES: 10,
  MAX_RETRIES: 3,
  TIMEOUT_MS: 60000,
  PROGRESS_UPDATE_INTERVAL: 5
} as const;
