'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, ExternalLink, Search, Database, FileText, Link2 } from 'lucide-react';

interface Source {
  id: string;
  domain: string;
  citation_count: number;
}

interface SourcesTabProps {
  sources: Source[];
}

export default function SourcesTab({ sources }: SourcesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const totalCitations = sources.reduce((sum, s) => sum + (s.citation_count || 0), 0);

  // Filter sources based on search
  const filteredSources = sources.filter(source =>
    source.domain?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredSources.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSources = filteredSources.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center border border-green-200">
              <Globe className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{sources.length}</div>
              <div className="text-sm text-gray-500">Total Sources</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-200">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">{totalCitations}</div>
              <div className="text-sm text-gray-500">Total Citations</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center border border-orange-200">
              <Link2 className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {sources.length > 0 ? (totalCitations / sources.length).toFixed(1) : '0'}
              </div>
              <div className="text-sm text-gray-500">Avg Citations</div>
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
            placeholder="Search sources by domain..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 outline-none text-gray-900 placeholder-gray-400"
          />
        </div>
      </Card>

      {/* Sources Table */}
      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">
                  Rank
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-40">
                  Citations
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-40">
                  % of Total
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                  Link
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedSources.map((source, index) => {
                const globalIndex = startIndex + index;
                const citationPercent = ((source.citation_count / totalCitations) * 100).toFixed(1);
                const isTopSource = globalIndex < 3;

                return (
                  <tr key={source.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isTopSource
                            ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {globalIndex + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900">{source.domain || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
                        {source.citation_count || 0} citation{(source.citation_count || 0) !== 1 ? 's' : ''}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${citationPercent}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 min-w-[3rem]">
                          {citationPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {source.domain && (
                        <a
                          href={`https://${source.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Visit
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredSources.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-gray-600">
              {searchTerm ? 'No sources found matching your search' : 'No sources cited in the analysis'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredSources.length)} of {filteredSources.length} sources
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Previous
              </Button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={
                        currentPage === pageNum
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-100"
                      }
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
