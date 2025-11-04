// Metrics Calculation Logic
// All formulas from 04-METRICS-CALCULATION-LOGIC.md

import type { Query, Competitor, Source } from '@/types';
import { supabaseAdmin } from './supabase';

/**
 * 1. Calculate Overall Visibility Score
 * Formula: (queries_with_mention / total_queries) × 100
 */
export function calculateOverallVisibility(queries: Query[]): number {
  if (queries.length === 0) return 0;
  const queriesWithMention = queries.filter(q => (q.focused_brand_rank ?? 0) > 0).length;
  return (queriesWithMention / queries.length) * 100;
}

/**
 * 2. Calculate Average Rank
 * Formula: AVG(focused_brand_rank) WHERE rank > 0
 */
export function calculateAverageRank(queries: Query[]): number {
  const mentionedQueries = queries.filter(q => (q.focused_brand_rank ?? 0) > 0);
  if (mentionedQueries.length === 0) return 0;

  const totalRank = mentionedQueries.reduce((sum, q) => sum + (q.focused_brand_rank ?? 0), 0);
  return totalRank / mentionedQueries.length;
}

/**
 * 3. Calculate Competitor Statistics
 * Returns sorted list of competitors by mention count
 * INCLUDES the focus brand in the results
 */
export function calculateCompetitorStats(
  queries: Query[],
  focusBrand: string
): Array<{
  brand_name: string;
  mention_count: number;
  mention_percentage: number;
  average_rank: number;
}> {
  const competitorMap = new Map<string, { count: number; ranks: number[] }>();

  queries.forEach(query => {
    query.brands_mentioned?.forEach((brand, index) => {
      // Include ALL brands (including focus brand)
      if (!brand || brand.trim() === '') return; // Skip empty brands

      if (!competitorMap.has(brand)) {
        competitorMap.set(brand, { count: 0, ranks: [] });
      }

      const stats = competitorMap.get(brand)!;
      stats.count++;
      stats.ranks.push(index + 1); // 1-based rank position in brands_mentioned array
    });
  });

  // Convert to array and calculate percentages
  return Array.from(competitorMap.entries())
    .map(([brand, stats]) => ({
      brand_name: brand, // Database column is brand_name
      mention_count: stats.count,
      mention_percentage: (stats.count / queries.length) * 100,
      average_rank: stats.ranks.reduce((a, b) => a + b, 0) / stats.ranks.length
    }))
    .sort((a, b) => b.mention_count - a.mention_count);
}

/**
 * 4. Calculate Top Cited Sources
 * Returns sorted list of sources by citation count
 */
export function calculateTopSources(queries: Query[]): Array<{
  url: string;
  domain: string;
  citation_count: number;
}> {
  const urlMap = new Map<string, number>();

  queries.forEach(query => {
    query.websites_cited?.forEach(url => {
      const domain = extractDomain(url);
      urlMap.set(domain, (urlMap.get(domain) || 0) + 1);
    });
  });

  return Array.from(urlMap.entries())
    .map(([domain, count]) => ({
      url: domain,
      domain,
      citation_count: count
    }))
    .sort((a, b) => b.citation_count - a.citation_count);
}

/**
 * 5. Calculate Topic-Level Visibility
 * Formula: (topic_queries_with_mention / 10) × 100
 */
export function calculateTopicVisibility(topicQueries: Query[]): number {
  if (topicQueries.length === 0) return 0;
  const mentionedInTopic = topicQueries.filter(q => (q.focused_brand_rank ?? 0) > 0).length;
  return (mentionedInTopic / topicQueries.length) * 100;
}

/**
 * 6. Calculate Topic Average Rank
 * Formula: AVG(rank) for queries where mentioned
 */
export function calculateTopicAverageRank(topicQueries: Query[]): number {
  const mentioned = topicQueries.filter(q => (q.focused_brand_rank ?? 0) > 0);
  if (mentioned.length === 0) return 0;

  const totalRank = mentioned.reduce((sum, q) => sum + (q.focused_brand_rank ?? 0), 0);
  return totalRank / mentioned.length;
}

/**
 * 7. Calculate Topic Citations
 * Count unique URLs cited across all queries in topic
 */
export function calculateTopicCitations(topicQueries: Query[]): number {
  const allCitations = topicQueries.flatMap(q => q.websites_cited || []);
  const uniqueCitations = new Set(allCitations);
  return uniqueCitations.size;
}

/**
 * 8. Extract Domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * 9. Get Query Visibility String
 * Maps rank to visibility percentage
 */
export function getQueryVisibility(rank: number): string {
  if (rank === 0) return '0%';
  if (rank === 1) return '100%';
  return '50%';
}

/**
 * 10. Main Function - Calculate All Metrics for Analysis
 * This is called after all queries are completed
 */
export async function calculateAllMetrics(analysisId: string): Promise<void> {
  try {
    // 1. Fetch all queries for this analysis
    const { data: queries, error: queriesError } = await supabaseAdmin
      .from('queries')
      .select('*')
      .eq('analysis_id', analysisId);

    if (queriesError) throw queriesError;
    if (!queries || queries.length === 0) {
      throw new Error('No queries found for analysis');
    }

    // 2. Calculate overall metrics
    const overallVisibility = calculateOverallVisibility(queries);
    const averageRank = calculateAverageRank(queries);
    const queriesWithMention = queries.filter(q => (q.focused_brand_rank ?? 0) > 0).length;

    // 3. Update analysis record with overall metrics
    const { error: analysisUpdateError } = await supabaseAdmin
      .from('analyses')
      .update({
        overall_visibility_score: overallVisibility,
        average_rank: averageRank,
        total_queries: queries.length,
        queries_mentioned: queriesWithMention,
        progress: 100, // Set to 100% when metrics calculation completes
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId);

    if (analysisUpdateError) throw analysisUpdateError;

    // 4. Calculate and insert competitor stats
    const focusBrand = queries[0]?.focused_brand || '';
    const competitors = calculateCompetitorStats(queries, focusBrand);

    if (competitors.length > 0) {
      const competitorsToInsert = competitors.map(c => ({
        ...c,
        analysis_id: analysisId
      }));

      const { error: competitorsError } = await supabaseAdmin
        .from('competitors')
        .upsert(competitorsToInsert, {
          onConflict: 'analysis_id,brand_name'
        });

      if (competitorsError) throw competitorsError;
    }

    // 5. Calculate and insert source stats
    const sources = calculateTopSources(queries);

    if (sources.length > 0) {
      const sourcesToInsert = sources.map(s => ({
        ...s,
        analysis_id: analysisId
      }));

      const { error: sourcesError } = await supabaseAdmin
        .from('sources')
        .upsert(sourcesToInsert, {
          onConflict: 'analysis_id,url'
        });

      if (sourcesError) throw sourcesError;
    }

    // 6. Calculate topic-level metrics
    const { data: topics, error: topicsError } = await supabaseAdmin
      .from('topics')
      .select('id')
      .eq('analysis_id', analysisId);

    if (topicsError) throw topicsError;

    if (topics) {
      for (const topic of topics) {
        const topicQueries = queries.filter(q => q.topic_id === topic.id);

        const { error: topicUpdateError } = await supabaseAdmin
          .from('topics')
          .update({
            visibility_percentage: calculateTopicVisibility(topicQueries),
            average_rank: calculateTopicAverageRank(topicQueries),
            total_citations: calculateTopicCitations(topicQueries),
            queries_with_mention: topicQueries.filter(q => (q.focused_brand_rank ?? 0) > 0).length
          })
          .eq('id', topic.id);

        if (topicUpdateError) throw topicUpdateError;
      }
    }

    console.log(`✅ Metrics calculated successfully for analysis ${analysisId}`);
  } catch (error) {
    console.error(`❌ Failed to calculate metrics for analysis ${analysisId}:`, error);
    throw error;
  }
}

/**
 * 11. Update Analysis Progress
 * Calculate and update progress percentage
 */
export async function updateAnalysisProgress(analysisId: string): Promise<number> {
  try {
    const { data: queries } = await supabaseAdmin
      .from('queries')
      .select('status')
      .eq('analysis_id', analysisId);

    if (!queries) return 0;

    const completed = queries.filter(q => q.status === 'completed').length;
    const total = queries.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    await supabaseAdmin
      .from('analyses')
      .update({
        progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId);

    return progress;
  } catch (error) {
    console.error(`Failed to update progress for analysis ${analysisId}:`, error);
    return 0;
  }
}
