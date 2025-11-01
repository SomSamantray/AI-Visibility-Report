// API Route: GET /api/report/[id]
// Fetches complete analysis data including topics, queries, competitors, and sources

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: analysisId } = await params;

    if (!analysisId) {
      return NextResponse.json(
        { error: 'Analysis ID is required' },
        { status: 400 }
      );
    }

    // 1. Fetch analysis
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (analysisError) {
      if (analysisError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Analysis not found' },
          { status: 404 }
        );
      }
      throw analysisError;
    }

    // 2. Fetch topics with their queries
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('topic_order', { ascending: true });

    if (topicsError) throw topicsError;

    // 3. Fetch all queries
    const { data: queries, error: queriesError } = await supabase
      .from('queries')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('created_at', { ascending: true });

    if (queriesError) throw queriesError;

    // 4. Fetch competitors
    const { data: competitors, error: competitorsError } = await supabase
      .from('competitors')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('mention_count', { ascending: false });

    if (competitorsError) throw competitorsError;

    // 5. Fetch sources
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('citation_count', { ascending: false });

    if (sourcesError) throw sourcesError;

    // 6. Organize queries by topic
    const topicsWithQueries = topics?.map(topic => ({
      ...topic,
      queries: queries?.filter(q => q.topic_id === topic.id) || []
    })) || [];

    // 7. Return complete report data
    return NextResponse.json({
      analysis,
      topics: topicsWithQueries,
      competitors: competitors || [],
      sources: sources || [],
      summary: {
        totalTopics: topics?.length || 0,
        totalQueries: queries?.length || 0,
        totalCompetitors: competitors?.length || 0,
        totalSources: sources?.length || 0
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to fetch report:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch report',
        details: error.message
      },
      { status: 500 }
    );
  }
}
