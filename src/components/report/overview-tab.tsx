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

  return (
    <div className="space-y-8">
      {/* Hero Congratulations Card - FIXED: Shows actual ranks #1, #2, etc. */}
      <Card className="relative overflow-hidden border-gray-200 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 shadow-sm">
        <div className="relative p-10">
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="text-7xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                #{focusBrandRank || '?'}
              </div>
              <div className="text-gray-700 text-lg font-medium max-w-sm">
                {focusBrandRank === 1
                  ? 'Most mentioned brand in AI responses'
                  : `Ranked #${focusBrandRank} among all mentioned brands`}
                {focusBrandRank === 1 && <br />}
                {focusBrandRank === 1 && 'Ahead of major competitors'}
              </div>
            </div>
          </div>

          <div className="text-5xl font-bold text-gray-900 mb-8">
            {focusBrandRank === 1 ? 'Congratulations 🎉' : 'AI Visibility Report 📊'}
          </div>

          {/* Top 5 Brands with ACTUAL RANKS */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 mb-6 border border-gray-200 shadow-sm">
            <div className="grid grid-cols-3 gap-4 text-sm mb-6">
              <div className="font-semibold text-gray-600">Rank & Brand</div>
              <div className="font-semibold text-gray-600 text-right">Mentions</div>
              <div className="font-semibold text-gray-600 text-right">Relative %</div>
            </div>

            {/* Top 5 Brands */}
            {top5Brands.map((brand, index) => {
              const rank = index + 1;
              const isFocusBrand = brand.brand_name?.toLowerCase() === analysis.institution_name?.toLowerCase();
              const percentage = ((brand.mention_count / maxMentions) * 100).toFixed(0);

              return (
                <div key={index} className="mb-5">
                  <div className="grid grid-cols-3 gap-4 items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' :
                        rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800' :
                        rank === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {rank === 1 ? '🏆' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                      </div>
                      <span className={`font-semibold truncate ${isFocusBrand ? 'text-blue-600' : 'text-gray-900'}`}>
                        {brand.brand_name || 'Unknown'}
                        {isFocusBrand && ' (You)'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-gray-900">{brand.mention_count}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-semibold text-gray-700">{percentage}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isFocusBrand ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                        rank === 1 ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                        'bg-gray-400'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Show focus brand separately if NOT in top 5 */}
            {!focusBrandInTop5 && focusBrandData && focusBrandRank && (
              <>
                <div className="border-t border-gray-300 my-5 pt-5">
                  <div className="text-gray-600 text-xs mb-3 font-semibold uppercase tracking-wide">Your Institution:</div>
                  <div className="mb-4">
                    <div className="grid grid-cols-3 gap-4 items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          #{focusBrandRank}
                        </div>
                        <span className="font-semibold text-blue-600 truncate">
                          {analysis.institution_name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-gray-900">{focusBrandData.mention_count}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-semibold text-gray-700">
                          {((focusBrandData.mention_count / maxMentions) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all"
                        style={{ width: `${((focusBrandData.mention_count / maxMentions) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Share Button */}
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 rounded-xl text-lg shadow-sm"
          >
            <Share2 className="mr-2 h-5 w-5" />
            Share Your Report
          </Button>
        </div>
      </Card>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left Column - Top Topics */}
        <Card className="p-8 bg-white border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top 5 Topics by Visibility</h3>
          </div>
          <div className="space-y-5">
            {topTopics.map((topic, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-gray-900 font-medium text-sm mb-1">
                      {topic.name}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {topic.mentions} mentions in {topic.totalQueries} responses
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${topic.visibility}%` }}
                        />
                      </div>
                      <span className="text-gray-900 font-semibold text-sm min-w-[3rem] text-right">
                        {topic.visibility}%
                      </span>
                    </div>
                  </div>
                </div>
                {index < topTopics.length - 1 && (
                  <div className="border-b border-gray-200 mt-4" />
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Right Column - Top 10 Cited Sources (FIXED) */}
        <Card className="p-8 bg-white border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top 10 Cited Sources</h3>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {topSources.map((source, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-gray-900 font-medium text-sm truncate">
                      {source.domain || 'Unknown'}
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  <div className="text-gray-900 font-semibold">{source.citation_count || 0}</div>
                  <div className="text-gray-500 text-xs">cites</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
