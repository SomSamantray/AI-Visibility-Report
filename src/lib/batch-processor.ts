// Batch Processor - Concurrent Query Processing
import { supabaseAdmin } from './supabase';
import { processBatchQueries, createErrorResult, OpenRouterError } from './openrouter';
import { calculateAllMetrics, updateAnalysisProgress } from './metrics';
import type { Query, BatchQueryResult, BATCH_CONFIG as BatchConfig } from '@/types';

// Configuration
const BATCH_CONFIG = {
  QUERIES_PER_BATCH: 5,
  CONCURRENT_BATCHES: 10,
  MAX_RETRIES: 3,
  TIMEOUT_MS: 300000, // 5 minutes - increased from 60s to match individual query timeout
  PROGRESS_UPDATE_INTERVAL: 5
};

interface QueryBatch {
  batchId: number;
  queries: Query[];
}

/**
 * Timeout helper
 */
function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), ms)
  );
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create batches from queries array
 */
function createBatches(queries: Query[], batchSize: number): QueryBatch[] {
  const batches: QueryBatch[] = [];

  for (let i = 0; i < queries.length; i += batchSize) {
    batches.push({
      batchId: Math.floor(i / batchSize) + 1,
      queries: queries.slice(i, i + batchSize)
    });
  }

  return batches;
}

/**
 * Process a single batch with retry logic
 * Note: Results are saved to DB in real-time by processBatchQueries() function
 */
async function processSingleBatch(
  analysisId: string,
  focusBrand: string,
  batch: QueryBatch
): Promise<void> {
  const { MAX_RETRIES, TIMEOUT_MS } = BATCH_CONFIG;
  let lastError: Error | null = null;

  console.log(`[Batch ${batch.batchId}] Starting with ${batch.queries.length} queries`);

  // Mark all queries in batch as processing
  await Promise.all(
    batch.queries.map(q =>
      supabaseAdmin
        .from('queries')
        .update({ status: 'processing' })
        .eq('id', q.id)
    )
  );

  // Retry logic
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Call OpenRouter - pass full query objects for real-time DB updates
      // No batch-level timeout needed since individual queries have 5-min timeouts
      const results = await processBatchQueries(focusBrand, batch.queries);

      // No need to save results - they're already saved individually in processBatchQueries()

      console.log(`[Batch ${batch.batchId}] ✅ Completed successfully`);
      return;

    } catch (error) {
      lastError = error as Error;
      console.error(`[Batch ${batch.batchId}] ❌ Attempt ${attempt} failed:`, error);

      if (attempt < MAX_RETRIES) {
        // Exponential backoff
        const waitTime = 2000 * attempt;
        console.log(`[Batch ${batch.batchId}] Retrying in ${waitTime}ms...`);
        await sleep(waitTime);
      }
    }
  }

  // All retries failed - mark queries as failed
  console.error(`[Batch ${batch.batchId}] ❌ All retries failed`);

  await Promise.all(
    batch.queries.map(q =>
      supabaseAdmin
        .from('queries')
        .update({
          status: 'failed',
          error_message: lastError?.message || 'Unknown error',
          processed_at: new Date().toISOString()
        })
        .eq('id', q.id)
    )
  );

  throw lastError;
}

/**
 * Process batches concurrently (main concurrent processing logic)
 */
async function processBatchesConcurrently(
  analysisId: string,
  focusBrand: string,
  batches: QueryBatch[]
): Promise<void> {
  const { CONCURRENT_BATCHES } = BATCH_CONFIG;
  const totalBatches = batches.length;

  console.log(`\n🚀 Starting concurrent processing:`);
  console.log(`   Total batches: ${totalBatches}`);
  console.log(`   Concurrent: ${CONCURRENT_BATCHES}`);
  console.log(`   Queries per batch: ${batches[0]?.queries.length || 5}\n`);

  // Process in rounds
  for (let i = 0; i < totalBatches; i += CONCURRENT_BATCHES) {
    const roundBatches = batches.slice(i, i + CONCURRENT_BATCHES);
    const roundNumber = Math.floor(i / CONCURRENT_BATCHES) + 1;
    const totalRounds = Math.ceil(totalBatches / CONCURRENT_BATCHES);

    console.log(`\n📦 Round ${roundNumber}/${totalRounds}: Processing batches ${i + 1}-${i + roundBatches.length}`);

    // Process this round's batches in parallel
    const batchPromises = roundBatches.map(batch =>
      processSingleBatch(analysisId, focusBrand, batch)
    );

    // Wait for all batches in this round to complete
    const results = await Promise.allSettled(batchPromises);

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`[Batch ${roundBatches[index].batchId}] Failed:`, result.reason);
      }
    });

    // Update progress after each round
    const progress = await updateAnalysisProgress(analysisId);
    console.log(`📊 Progress: ${progress}%`);
  }

  console.log(`\n✅ All batches processed!\n`);
}

/**
 * Main function - Process entire analysis
 * This is called after analysis and queries are created in DB
 */
export async function processAnalysis(analysisId: string): Promise<void> {
  console.log(`\n🎯 Starting analysis processing: ${analysisId}\n`);

  try {
    // 1. Fetch analysis to get institution name
    const { data: analysis, error: analysisError } = await supabaseAdmin
      .from('analyses')
      .select('institution_name, status')
      .eq('id', analysisId)
      .single();

    if (analysisError) throw analysisError;
    if (!analysis) throw new Error('Analysis not found');

    if (analysis.status !== 'pending') {
      console.log(`⚠️  Analysis ${analysisId} is already ${analysis.status}`);
      return;
    }

    // 2. Mark analysis as processing
    await supabaseAdmin
      .from('analyses')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId);

    // 3. Fetch all queries
    const { data: queries, error: queriesError } = await supabaseAdmin
      .from('queries')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('created_at', { ascending: true });

    if (queriesError) throw queriesError;
    if (!queries || queries.length === 0) {
      throw new Error('No queries found for analysis');
    }

    console.log(`📝 Found ${queries.length} queries to process`);

    // 4. Create batches
    const batches = createBatches(queries, BATCH_CONFIG.QUERIES_PER_BATCH);
    console.log(`📦 Created ${batches.length} batches`);

    // 5. Process batches concurrently
    await processBatchesConcurrently(analysisId, analysis.institution_name, batches);

    // 6. Calculate all metrics
    console.log(`\n🧮 Calculating metrics...`);
    await calculateAllMetrics(analysisId);

    console.log(`\n✅ Analysis ${analysisId} completed successfully!\n`);

  } catch (error) {
    console.error(`\n❌ Analysis ${analysisId} failed:`, error);

    // Mark analysis as failed
    await supabaseAdmin
      .from('analyses')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId);

    throw error;
  }
}

/**
 * Get analysis status and progress
 */
export async function getAnalysisStatus(analysisId: string) {
  const { data: analysis } = await supabaseAdmin
    .from('analyses')
    .select('id, status, progress, completed_at')
    .eq('id', analysisId)
    .single();

  return analysis;
}
