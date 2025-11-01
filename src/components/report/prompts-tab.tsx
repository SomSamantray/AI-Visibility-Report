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
  const [searchTerm, setSearchTerm] = useState('');

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
  const overallVisibility = totalQueries > 0 ? Math.round((mentionedQueries / totalQueries) * 100) : 0;

  // Filter topics based on search
  const filteredTopics = topics.filter(topic =>
    topic.topic_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    topic.queries.some(q => q.query_text.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="p-6 bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-200">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{totalTopics}</div>
              <div className="text-sm text-gray-500">Topics</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-200">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{totalQueries}</div>
              <div className="text-sm text-gray-500">Total Prompts</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center border border-green-200">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{mentionedQueries}</div>
              <div className="text-sm text-gray-500">Responses</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center border border-orange-200">
              <Target className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{overallVisibility}%</div>
              <div className="text-sm text-gray-500">Visibility</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="p-6 bg-white border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search topics or queries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-gray-900 placeholder-gray-400"
          />
        </div>
      </Card>

      {/* Topics Table */}
      <div className="space-y-4">
        {filteredTopics
          .sort((a, b) => a.topic_order - b.topic_order)
          .map((topic) => {
            const mentioned = topic.queries.filter(q => (q.focused_brand_rank ?? 0) > 0).length;
            const visibilityPercent = Math.round((mentioned / topic.queries.length) * 100);
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
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${visibilityPercent}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 min-w-[3rem] text-right">
                        {visibilityPercent}%
                      </span>
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
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-40">
                              Rank
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                              Brands
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {topic.queries.map((query, index) => {
                            const isQueryExpanded = expandedQueries.has(query.id);

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
                                  <td className="px-6 py-4">
                                    {getVisibilityBadge(query)}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-sm text-gray-600">
                                      {query.brands_mentioned?.length || 0} brands
                                    </span>
                                  </td>
                                </tr>

                                {/* Expanded Query Answer Section */}
                                {isQueryExpanded && (
                                  <tr>
                                    <td colSpan={4} className="bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/20">
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
                                                const rankPosition = brandIndex + 1;

                                                return (
                                                  <div
                                                    key={brandIndex}
                                                    className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm ${
                                                      isFocusBrand
                                                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-500/30'
                                                        : rankPosition === 1
                                                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-blue-500/20'
                                                        : rankPosition === 2
                                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-purple-500/20'
                                                        : 'bg-white text-gray-700 border-2 border-gray-300'
                                                    }`}
                                                  >
                                                    {isFocusBrand && <CheckCircle2 className="w-4 h-4" />}
                                                    <span>{brand}</span>
                                                    {!isFocusBrand && (
                                                      <Badge className="bg-white/20 text-white border-0 text-xs px-2 py-0">
                                                        #{rankPosition}
                                                      </Badge>
                                                    )}
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

                                        {/* AI Response Section - MIDDLE */}
                                        <div>
                                          <h4 className="font-semibold text-sm text-gray-600 uppercase tracking-wide mb-3">
                                            AI Response
                                          </h4>
                                          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                                            {query.answer ? (
                                              <div className="prose prose-sm max-w-none text-gray-800">
                                                <ReactMarkdown
                                                  remarkPlugins={[remarkGfm]}
                                                  components={{
                                                    p: ({ children }) => <p className="mb-4 leading-relaxed last:mb-0">{children}</p>,
                                                    strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
                                                    em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                                                    ul: ({ children }) => <ul className="list-disc list-inside space-y-2 mb-4">{children}</ul>,
                                                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-2 mb-4">{children}</ol>,
                                                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                                    h1: ({ children }) => <h1 className="text-xl font-bold text-gray-900 mb-3 mt-4">{children}</h1>,
                                                    h2: ({ children }) => <h2 className="text-lg font-bold text-gray-900 mb-2 mt-3">{children}</h2>,
                                                    h3: ({ children }) => <h3 className="text-base font-semibold text-gray-900 mb-2 mt-3">{children}</h3>,
                                                    code: ({ children }) => <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">{children}</code>,
                                                    blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700 my-4">{children}</blockquote>,
                                                  }}
                                                >
                                                  {query.answer}
                                                </ReactMarkdown>
                                              </div>
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
                                                  className="px-4 py-3 bg-white rounded-lg border border-gray-200 text-sm text-gray-700 font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
                                                >
                                                  <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
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
