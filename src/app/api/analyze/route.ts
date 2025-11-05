// API Route: POST /api/analyze
// Starts a new analysis for an institution

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateTopicsAndQueriesWithPerplexity } from '@/lib/perplexity';
import { processAnalysis } from '@/lib/batch-processor';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body = await request.json();
    const { institutionName } = body;

    if (!institutionName || typeof institutionName !== 'string') {
      return NextResponse.json(
        { error: 'Institution name is required' },
        { status: 400 }
      );
    }

    console.log(`\n🎓 Starting analysis for: ${institutionName}\n`);

    // 2. Generate topics and queries via Prompt #1 (using Perplexity)
    console.log('📝 Step 1: Generating topics and queries with Perplexity...');
    const topicsData = await generateTopicsAndQueriesWithPerplexity(institutionName);
    console.log(`✅ Generated ${topicsData.topics.length} topics`);

    // Use corrected institution name and location from Prompt 1 (not user input)
    const correctedInstitutionName = topicsData.institution_name;
    const location = topicsData.location;
    console.log(`✅ Institution name corrected: "${institutionName}" → "${correctedInstitutionName}"`);
    console.log(`✅ Location identified: ${location}`);

    // 3. Create analysis record
    console.log('💾 Step 2: Creating analysis record...');
    const { data: analysis, error: analysisError } = await supabaseAdmin
      .from('analyses')
      .insert({
        institution_name: correctedInstitutionName, // Use corrected name
        institution_type: topicsData.institution_type,
        location: location, // Save location for regional web search
        topics: topicsData.topics,
        status: 'pending',
        total_queries: topicsData.topics.length * 11,
        progress: 0
      })
      .select()
      .single();

    if (analysisError) {
      console.error('❌ Failed to create analysis:', analysisError);
      throw analysisError;
    }

    console.log(`✅ Analysis created: ${analysis.id}`);

    // 4. Create topic and query records
    console.log('💾 Step 3: Creating topics and queries...');
    let totalQueries = 0;

    for (const [topicIndex, topic] of topicsData.topics.entries()) {
      // Create topic record
      const { data: topicRecord, error: topicError } = await supabaseAdmin
        .from('topics')
        .insert({
          analysis_id: analysis.id,
          topic_name: topic.topic,
          topic_order: topicIndex + 1,
          total_queries: topic.prompts.length
        })
        .select()
        .single();

      if (topicError) {
        console.error(`❌ Failed to create topic ${topicIndex + 1}:`, topicError);
        throw topicError;
      }

      // Create query records for this topic (pure, unbiased queries)
      const queryInserts = topic.prompts.map((prompt: string, promptIndex: number) => {
        totalQueries++;

        return {
          analysis_id: analysis.id,
          topic_id: topicRecord.id,
          query_text: prompt,
          query_order: promptIndex + 1,
          focused_brand: correctedInstitutionName, // Use corrected name for brand detection
          status: 'pending'
        };
      });

      const { error: queriesError } = await supabaseAdmin
        .from('queries')
        .insert(queryInserts);

      if (queriesError) {
        console.error(`❌ Failed to create queries for topic ${topicIndex + 1}:`, queriesError);
        throw queriesError;
      }
    }

    console.log(`✅ Created ${topicsData.topics.length} topics with ${totalQueries} queries`);

    // Update progress to 25% after topics and queries are created
    // Note: Don't set status='processing' here - processAnalysis() will do it
    await supabaseAdmin
      .from('analyses')
      .update({
        progress: 25
      })
      .eq('id', analysis.id);

    console.log('✅ Progress updated to 25%');

    // 5. Start background processing (non-blocking)
    console.log('🚀 Step 4: Starting background processing...\n');
    // Don't await - let it run in background
    processAnalysis(analysis.id).catch(error => {
      console.error(`❌ Background processing failed for ${analysis.id}:`, error);
    });

    // 6. Return analysis ID immediately
    return NextResponse.json({
      analysisId: analysis.id,
      message: 'Analysis started',
      totalQueries: topicsData.topics.length * 11
    });

  } catch (error: any) {
    console.error('❌ Analysis creation failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to start analysis',
        details: error.message
      },
      { status: 500 }
    );
  }
}
