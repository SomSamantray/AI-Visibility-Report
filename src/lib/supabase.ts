// Supabase Client Setup
import { createClient } from '@supabase/supabase-js';

// Client-side Supabase client (uses anon key)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-side Supabase client (uses service role key)
// Use this for API routes and server actions that need elevated permissions
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Database types (we'll expand these as needed)
export type Database = {
  public: {
    Tables: {
      analyses: {
        Row: {
          id: string;
          institution_name: string;
          institution_type: string | null;
          status: string;
          progress: number;
          research_notes: any;
          topics: any;
          overall_visibility_score: number | null;
          total_queries: number;
          queries_mentioned: number;
          average_rank: number | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          institution_name: string;
          institution_type?: string | null;
          status?: string;
          progress?: number;
          research_notes?: any;
          topics?: any;
          overall_visibility_score?: number | null;
          total_queries?: number;
          queries_mentioned?: number;
          average_rank?: number | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          institution_name?: string;
          institution_type?: string | null;
          status?: string;
          progress?: number;
          research_notes?: any;
          topics?: any;
          overall_visibility_score?: number | null;
          total_queries?: number;
          queries_mentioned?: number;
          average_rank?: number | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
      };
      topics: {
        Row: {
          id: string;
          analysis_id: string;
          topic_name: string;
          topic_order: number;
          visibility_percentage: number | null;
          average_rank: number | null;
          total_citations: number;
          queries_with_mention: number;
          total_queries: number;
          created_at: string;
        };
      };
      queries: {
        Row: {
          id: string;
          topic_id: string;
          analysis_id: string;
          query_text: string;
          query_order: number;
          answer: string | null;
          brands_mentioned: string[] | null;
          focused_brand: string | null;
          focused_brand_rank: number | null;
          visibility: number | null;
          websites_cited: string[] | null;
          status: string;
          processed_at: string | null;
          error_message: string | null;
          created_at: string;
        };
      };
      competitors: {
        Row: {
          id: string;
          analysis_id: string;
          brand_name: string;
          mention_count: number;
          mention_percentage: number | null;
          average_rank: number | null;
          created_at: string;
        };
      };
      sources: {
        Row: {
          id: string;
          analysis_id: string;
          url: string;
          domain: string | null;
          citation_count: number;
          created_at: string;
        };
      };
    };
  };
};
