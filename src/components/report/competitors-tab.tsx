'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Trophy, TrendingUp, Award } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
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

  // Prepare data for pie chart - top 5 + others
  const top5 = competitors.slice(0, 5);
  const othersCount = competitors.slice(5).reduce((sum, c) => sum + (c.mention_count || 0), 0);

  const pieChartData = [
    ...top5.map(comp => ({
      name: comp.brand_name || 'Unknown',
      value: comp.mention_count || 0,
      fullName: comp.brand_name || 'Unknown'
    })),
    ...(othersCount > 0 ? [{ name: 'Others', value: othersCount, fullName: 'Other Competitors' }] : [])
  ];

  // Blue color palette
  const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#e0e7ff'];

  return (
    <div className="space-y-8">
      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Leaderboard Card - Top 10 */}
        <Card className="p-8 bg-white border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-200">
              <Trophy className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Top 10 Leaderboard
            </h3>
          </div>

          <div className="space-y-2">
            {topCompetitors.map((competitor, index) => {
              const isFocusBrand = competitor.brand_name?.toLowerCase() === institutionName.toLowerCase();
              const percentage = ((competitor.mention_count / totalMentions) * 100).toFixed(1);
              const rank = index + 1;

              return (
                <div
                  key={competitor.id}
                  className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                    isFocusBrand
                      ? 'bg-blue-50 border-2 border-blue-200'
                      : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {/* Rank Badge */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                    rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white' :
                    rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                    rank === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' :
                    isFocusBrand ? 'bg-blue-500 text-white' :
                    'bg-white border-2 border-gray-300 text-gray-700'
                  }`}>
                    {rank <= 3 ? <Award className="w-5 h-5" /> : `#${rank}`}
                  </div>

                  {/* Institution Name */}
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold truncate ${isFocusBrand ? 'text-blue-900' : 'text-gray-900'}`}>
                      {competitor.brand_name || 'Unknown'}
                    </div>
                    <div className={`text-xs ${isFocusBrand ? 'text-blue-600' : 'text-gray-500'}`}>
                      {competitor.mention_count || 0} mentions
                    </div>
                  </div>

                  {/* Percentage Badge */}
                  <div className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-bold ${
                    isFocusBrand ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {percentage}%
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Pie Chart - Market Share */}
        <Card className="p-8 bg-white border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-200">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Market Share Distribution
            </h3>
          </div>

          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percent }: { name: string; percent: number }) => `${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#111827'
                }}
                formatter={(value: number) => [`${value} mentions`, 'Count']}
                labelFormatter={(value, payload) => {
                  const item = payload[0]?.payload;
                  return item?.fullName || value;
                }}
              />
              <Legend
                wrapperStyle={{ color: '#6b7280' }}
                formatter={(value, entry: any) => {
                  const name = entry.payload.fullName || value;
                  return name.length > 30 ? name.substring(0, 30) + '...' : name;
                }}
              />
            </PieChart>
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
