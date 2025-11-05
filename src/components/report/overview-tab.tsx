'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';

interface OverviewTabProps {
  reportData: {
    analysis: {
      institution_name: string;
      overall_visibility: number;
      avg_rank: number;
      top_rank_count: number;
    };
    topics: Array<{
      id: string;
      topic_name: string;
      queries: Array<{
        visibility: number;
        focused_brand_rank: number | null;
      }>;
    }>;
    competitors: Array<{
      brand_name: string; // FIXED: Database uses brand_name
      mention_count: number;
    }>;
    sources: Array<{
      domain: string;
      citation_count: number;
    }>;
    summary: {
      totalQueries: number;
    };
  };
}

export default function OverviewTab({ reportData }: OverviewTabProps) {
  const { analysis, topics, competitors, sources, summary } = reportData;

  // Calculate TOP 5 BRANDS by mention count (global ranking)
  const allBrandsSorted = [...competitors]
    .filter(c => c.brand_name && c.mention_count > 0)
    .sort((a, b) => (b.mention_count || 0) - (a.mention_count || 0));

  const top5Brands = allBrandsSorted.slice(0, 5);
  const maxMentions = allBrandsSorted[0]?.mention_count || 1;

  // Find focus brand's actual rank
  const focusBrandIndex = allBrandsSorted.findIndex(
    c => c.brand_name?.toLowerCase() === analysis.institution_name?.toLowerCase()
  );
  const focusBrandRank = focusBrandIndex === -1 ? null : focusBrandIndex + 1;
  const focusBrandData = focusBrandIndex === -1 ? null : allBrandsSorted[focusBrandIndex];
  const focusBrandInTop5 = focusBrandRank && focusBrandRank <= 5;

  // Calculate topic-level visibility (FIXED: correct calculation)
  const topTopics = topics
    .map(topic => {
      const queriesWithMention = topic.queries.filter(
        q => (q.focused_brand_rank ?? 0) > 0
      ).length;
      const visibilityPercent = (queriesWithMention / topic.queries.length) * 100;

      return {
        name: topic.topic_name,
        mentions: queriesWithMention,
        totalQueries: topic.queries.length,
        visibility: Math.round(visibilityPercent)
      };
    })
    .sort((a, b) => b.visibility - a.visibility)
    .slice(0, 5);

  // Top 10 cited sources (FIXED: show 10 instead of 2)
  const topSources = sources.slice(0, 10);

  // Top 2 brands for relative ranking card
  const top2Brands = allBrandsSorted.slice(0, 2);

  // Top 10 for competitor mentions card
  const top10Brands = allBrandsSorted.slice(0, 10);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-gray-900 mb-3">
          {analysis.institution_name}
        </h2>
        <p className="text-gray-600 text-lg">AI Visibility Report</p>
      </div>

      {/* 2x2 Grid Layout */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Card 1: Relative Ranking (Top Left) */}
        <Card className="p-8 bg-white border-gray-200 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Relative Ranking</h3>
          <div className="space-y-4">
            {/* Top 2 brands */}
            {top2Brands.map((brand, index) => {
              const rank = index + 1;
              const percentage = ((brand.mention_count / summary.totalQueries) * 100).toFixed(1);

              return (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center text-sm font-bold text-gray-700">
                      #{rank}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{brand.brand_name}</div>
                      <div className="text-sm text-gray-500">{brand.mention_count} mentions</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{percentage}%</div>
                </div>
              );
            })}

            {/* Focus institution (as 3rd entry) */}
            {focusBrandData && (
              <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-200 rounded-lg flex items-center justify-center text-sm font-bold text-indigo-700">
                    #{focusBrandRank || '?'}
                  </div>
                  <div>
                    <div className="font-semibold text-indigo-900">{analysis.institution_name}</div>
                    <div className="text-sm text-indigo-600">{focusBrandData.mention_count} mentions</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-indigo-900">
                  {((focusBrandData.mention_count / summary.totalQueries) * 100).toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Card 2: Top 10 Competitor Mentions (Top Right) */}
        <Card className="p-8 bg-white border-gray-200 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Top 10 Competitor Mentions</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {top10Brands.map((brand, index) => {
              const isFocusBrand = brand.brand_name?.toLowerCase() === analysis.institution_name?.toLowerCase();
              const percentage = ((brand.mention_count / summary.totalQueries) * 100).toFixed(1);

              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${isFocusBrand ? 'text-indigo-700' : 'text-gray-700'}`}>
                      {brand.brand_name}
                    </span>
                    <span className={`text-sm font-bold ${isFocusBrand ? 'text-indigo-900' : 'text-gray-900'}`}>
                      {percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-full rounded-full ${isFocusBrand ? 'bg-indigo-400' : 'bg-gray-300'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Card 3: Top Topics by Visibility (Bottom Left) */}
        <Card className="p-8 bg-white border-gray-200 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Top Topics by Visibility</h3>
          <div className="space-y-4">
            {topTopics.map((topic, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-gray-900 font-medium text-sm mb-1">
                      {topic.name}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {topic.mentions} of {topic.totalQueries} responses
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className="text-gray-900 font-bold text-lg">
                      {topic.visibility}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${topic.visibility}%` }}
                  />
                </div>
                {index < topTopics.length - 1 && (
                  <div className="border-b border-gray-200 mt-4" />
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Card 4: Top Cited Sources (Bottom Right) */}
        <Card className="p-8 bg-white border-gray-200 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Top Cited Sources</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {topSources.map((source, index) => (
              <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-7 h-7 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-700">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-gray-900 font-medium text-sm truncate">
                      {source.domain || 'Unknown'}
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  <div className="text-gray-900 font-bold text-lg">{source.citation_count || 0}</div>
                  <div className="text-gray-500 text-xs">citations</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Share Button */}
      <div className="flex justify-center">
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg"
        >
          <Share2 className="mr-2 h-4 w-4" />
          Share Report
        </Button>
      </div>
    </div>
  );
}
