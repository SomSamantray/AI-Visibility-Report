// API Route: GET /api/progress?analysisId=xxx
// Returns the current status and progress of an analysis

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const analysisId = searchParams.get('analysisId');

    if (!analysisId) {
      return NextResponse.json(
        { error: 'analysisId parameter is required' },
        { status: 400 }
      );
    }

    // Fetch analysis status and progress
    const { data: analysis, error } = await supabase
      .from('analyses')
      .select('id, status, progress, completed_at')
      .eq('id', analysisId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Analysis not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    const isComplete = analysis.status === 'completed';
    const isFailed = analysis.status === 'failed';

    return NextResponse.json({
      id: analysis.id,
      status: analysis.status,
      progress: analysis.progress,
      isComplete,
      isFailed,
      completedAt: analysis.completed_at
    });

  } catch (error: any) {
    console.error('❌ Progress check failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to check progress',
        details: error.message
      },
      { status: 500 }
    );
  }
}
