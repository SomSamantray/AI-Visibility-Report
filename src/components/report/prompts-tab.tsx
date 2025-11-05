'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Search, FileText, MessageSquare, Target, Globe } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Query {
  id: string;
  query_text: string;
  answer: string | null;
  brands_mentioned: string[] | null;
  focused_brand: string;
  focused_brand_rank: number | null;
  visibility: number;
  websites_cited: string[] | null;
  status: string;
}

interface Topic {
  id: string;
  topic_name: string;
  topic_order: number;
  queries: Query[];
}

interface PromptsTabProps {
  topics: Topic[];
  institutionName: string;
}

export default function PromptsTab({ topics, institutionName }: PromptsTabProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [expandedQueries, setExpandedQueries] = useState<Set<string>>(new Set());

  // Convert answer text to bullet points
  const convertToBulletPoints = (text: string): string[] => {
    if (!text) return [];

    // Split by periods, exclamation marks, or question marks followed by space
    const sentences = text
      .split(/[.!?]+\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    return sentences;
  };

  const toggleTopic = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  const toggleQuery = (queryId: string) => {
    const newExpanded = new Set(expandedQueries);
    if (newExpanded.has(queryId)) {
      newExpanded.delete(queryId);
    } else {
      newExpanded.add(queryId);
    }
    setExpandedQueries(newExpanded);
  };

  const getVisibilityBadge = (query: Query) => {
    const rank = query.focused_brand_rank;
    if (!rank || rank === 0) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-300">Not Mentioned</Badge>;
    } else if (rank === 1) {
      return <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100">Rank #1</Badge>;
    } else {
      return <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">Rank #{rank}</Badge>;
    }
  };

  // Calculate summary stats
  const totalQueries = topics.reduce((sum, t) => sum + t.queries.length, 0);
  const totalTopics = topics.length;
  const mentionedQueries = topics.reduce((sum, t) =>
    sum + t.queries.filter(q => (q.focused_brand_rank ?? 0) > 0).length, 0
  );

  return (
    <div className="space-y-8">
      {/* Summary Cards - Only 3 cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{totalTopics}</div>
              <div className="text-sm text-gray-500">Topics</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{totalQueries}</div>
              <div className="text-sm text-gray-500">Total Prompts</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{mentionedQueries}</div>
              <div className="text-sm text-gray-500">Responses</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Topics Table */}
      <div className="space-y-4">
        {topics
          .sort((a, b) => a.topic_order - b.topic_order)
          .map((topic) => {
            const mentioned = topic.queries.filter(q => (q.focused_brand_rank ?? 0) > 0).length;
            const visibilityPercent = Math.round((mentioned / topic.queries.length) * 100);
            const relevancyPercent = visibilityPercent; // Same as visibility per topic

            // Calculate average rank (only for queries where brand was mentioned)
            const rankedQueries = topic.queries.filter(q => (q.focused_brand_rank ?? 0) > 0);
            const avgRank = rankedQueries.length > 0
              ? (rankedQueries.reduce((sum, q) => sum + (q.focused_brand_rank || 0), 0) / rankedQueries.length).toFixed(1)
              : '-';


            const isExpanded = expandedTopics.has(topic.id);

            return (
              <Card key={topic.id} className="bg-white border-gray-200 shadow-sm overflow-hidden">
                {/* Topic Header */}
                <button
                  onClick={() => toggleTopic(topic.id)}
                  className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                      <h3 className="text-lg font-semibold text-gray-900 text-left">{topic.topic_name}</h3>
                    </div>
                    <Badge variant="outline" className="border-gray-300 text-gray-600">
                      {topic.queries.length} queries
                    </Badge>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-center min-w-[80px]">
                      <div className="text-xs text-gray-500 uppercase mb-1">Visibility</div>
                      <div className="text-lg font-bold text-gray-900">{visibilityPercent}%</div>
                    </div>
                    <div className="text-center min-w-[80px]">
                      <div className="text-xs text-gray-500 uppercase mb-1">Relevancy</div>
                      <div className="text-lg font-bold text-gray-900">{relevancyPercent}%</div>
                    </div>
                    <div className="text-center min-w-[80px]">
                      <div className="text-xs text-gray-500 uppercase mb-1">Avg Rank</div>
                      <div className="text-lg font-bold text-gray-900">{avgRank}</div>
                    </div>
                  </div>
                </button>

                {/* Queries Table */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">
                              #
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Query
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                              Visibility
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                              Relevancy
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                              Rank
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {topic.queries.map((query, index) => {
                            const isQueryExpanded = expandedQueries.has(query.id);

                            // Calculate query-level metrics
                            const queryVisibility = query.visibility || 0;
                            const queryRelevancy = queryVisibility; // Same as visibility
                            const queryRank = query.focused_brand_rank || 0;

                            return (
                              <React.Fragment key={query.id}>
                                <tr
                                  onClick={() => toggleQuery(query.id)}
                                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      {isQueryExpanded ? (
                                        <ChevronUp className="w-4 h-4 text-gray-400" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                      )}
                                      <span className="text-sm text-gray-500">{index + 1}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <p className="text-sm text-gray-900 font-medium">{query.query_text}</p>
                                  </td>
                                  <td className="px-4 py-4 text-center">
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                                      queryVisibility === 100 ? 'bg-green-100 text-green-700' :
                                      queryVisibility === 50 ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>
                                      {queryVisibility}%
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-center">
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                                      queryRelevancy === 100 ? 'bg-green-100 text-green-700' :
                                      queryRelevancy === 50 ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>
                                      {queryRelevancy}%
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-center">
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                                      queryRank === 1 ? 'bg-green-100 text-green-700' :
                                      queryRank > 1 ? 'bg-blue-100 text-blue-700' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>
                                      {queryRank > 0 ? `#${queryRank}` : '-'}
                                    </span>
                                  </td>
                                </tr>

                                {/* Expanded Query Answer Section */}
                                {isQueryExpanded && (
                                  <tr>
                                    <td colSpan={5} className="bg-gray-50">
                                      <div className="px-8 py-6 space-y-6">
                                        {/* Brands Mentioned Section - TOP */}
                                        <div>
                                          <div className="flex items-center gap-2 mb-3">
                                            <h4 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">
                                              Brands Mentioned
                                            </h4>
                                            <Badge variant="outline" className="text-xs border-gray-300 text-gray-500">
                                              {query.brands_mentioned?.length || 0}
                                            </Badge>
                                          </div>
                                          <div className="flex flex-wrap gap-2">
                                            {query.brands_mentioned && query.brands_mentioned.length > 0 ? (
                                              query.brands_mentioned.map((brand, brandIndex) => {
                                                const isFocusBrand = brand.toLowerCase() === institutionName.toLowerCase();

                                                return (
                                                  <div
                                                    key={brandIndex}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                                                      isFocusBrand
                                                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                                                    }`}
                                                  >
                                                    {brand}
                                                  </div>
                                                );
                                              })
                                            ) : (
                                              <div className="text-gray-500 text-sm flex items-center gap-2 py-2">
                                                <XCircle className="w-4 h-4" />
                                                No brands mentioned
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* AI Response Section - MIDDLE (Forced Bullet Points) */}
                                        <div>
                                          <h4 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-3">
                                            AI Response
                                          </h4>
                                          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                                            {query.answer ? (
                                              <ul className="list-disc list-inside space-y-2 text-gray-800">
                                                {convertToBulletPoints(query.answer).map((sentence, idx) => (
                                                  <li key={idx} className="leading-relaxed">
                                                    {sentence}
                                                  </li>
                                                ))}
                                              </ul>
                                            ) : (
                                              <p className="text-gray-500 italic">No response available</p>
                                            )}
                                          </div>
                                        </div>

                                        {/* Citations Section - BOTTOM */}
                                        <div>
                                          <div className="flex items-center gap-2 mb-3">
                                            <Globe className="w-4 h-4 text-gray-500" />
                                            <h4 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">
                                              Citations
                                            </h4>
                                            <Badge variant="outline" className="text-xs border-gray-300 text-gray-500">
                                              {query.websites_cited?.length || 0}
                                            </Badge>
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {query.websites_cited && query.websites_cited.length > 0 ? (
                                              query.websites_cited.map((source, sourceIndex) => (
                                                <div
                                                  key={sourceIndex}
                                                  className="px-4 py-3 bg-white rounded-lg border border-gray-200 text-sm text-gray-700 font-medium flex items-center gap-2"
                                                >
                                                  <div className="w-6 h-6 bg-gray-200 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-700">
                                                    {sourceIndex + 1}
                                                  </div>
                                                  <span className="truncate">{source}</span>
                                                </div>
                                              ))
                                            ) : (
                                              <div className="text-gray-500 text-sm flex items-center gap-2 py-2">
                                                <XCircle className="w-4 h-4" />
                                                No sources cited
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
      </div>
    </div>
  );
}
