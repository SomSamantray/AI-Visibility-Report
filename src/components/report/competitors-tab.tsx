'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

interface Competitor {
  id: string;
  brand_name: string; // FIXED: Database uses brand_name
  mention_count: number;
  avg_rank: number | null; // Can be null
}

interface CompetitorsTabProps {
  competitors: Competitor[];
  institutionName: string;
}

export default function CompetitorsTab({ competitors, institutionName }: CompetitorsTabProps) {
  const topCompetitors = competitors.slice(0, 10);
  const totalMentions = competitors.reduce((sum, c) => sum + (c.mention_count || 0), 0);

  // Chart data for mentions
  const mentionsChartData = topCompetitors.map(comp => {
    const name = comp.brand_name || 'Unknown';
    return {
      name: name.length > 25 ? name.substring(0, 25) + '...' : name,
      fullName: name,
      mentions: comp.mention_count || 0
    };
  });

  // Radar chart data comparing top 5
  const radarData = topCompetitors.slice(0, 5).map(comp => {
    const name = comp.brand_name || 'Unknown';
    return {
      competitor: name.length > 20 ? name.substring(0, 20) + '...' : name,
      mentions: comp.mention_count || 0,
      avgRank: comp.avg_rank ? (5 - comp.avg_rank) : 0 // Inverted for better visualization
    };
  });

  return (
    <div className="space-y-8">
      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Mentions Bar Chart */}
        <Card className="p-8 bg-white border-gray-200 shadow-sm">
          <h3 className="text-xl font-bold mb-6 text-gray-900">
            Top Competitor by Mentions
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={mentionsChartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fill: '#6b7280' }} />
              <YAxis
                dataKey="name"
                type="category"
                width={90}
                tick={{ fill: '#6b7280', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }}
                labelFormatter={(value, payload) => {
                  const item = payload[0]?.payload;
                  return item?.fullName || value;
                }}
              />
              <Bar dataKey="mentions" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Average Rank Comparison */}
        <Card className="p-8 bg-white border-gray-200 shadow-sm">
          <h3 className="text-xl font-bold mb-6 text-gray-900">
            Top 5 Competitors Rank Performance
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="competitor" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 'auto']} tick={{ fill: '#6b7280' }} />
              <Radar
                name="Mention Count"
                dataKey="mentions"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.6}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' }}
              />
              <Legend wrapperStyle={{ color: '#6b7280' }} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* All Competitors List - Top 30 */}
      <Card className="p-8 bg-white border-gray-200 shadow-sm">
        <h3 className="text-xl font-bold mb-6 text-gray-900">All Competitors</h3>
        <div className="space-y-3">
          {competitors.slice(0, 30).map((competitor, index) => {
            const mentionPercent = ((competitor.mention_count / totalMentions) * 100).toFixed(1);

            return (
              <div
                key={competitor.id}
                className="flex items-center justify-between p-5 rounded-lg border bg-gray-50 border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold bg-white text-gray-700 border-2 border-gray-300">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mb-1">
                      <span className="font-semibold text-gray-900">{competitor.brand_name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs bg-white text-gray-700 border-gray-300">
                        {competitor.mention_count || 0} mention{(competitor.mention_count || 0) !== 1 ? 's' : ''}
                      </Badge>
                      <span className="text-xs text-gray-600">
                        {mentionPercent}% of competitor mentions
                      </span>
                      {competitor.avg_rank && (
                        <span className="text-xs text-gray-600">
                          Avg rank: #{competitor.avg_rank.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {competitors.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-gray-600">No competitors found in the analysis</p>
            <p className="text-sm mt-2 text-gray-500">{institutionName} appeared alone in most responses.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
