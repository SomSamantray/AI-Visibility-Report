'use client';

import { Card } from '@/components/ui/card';
import { Globe } from 'lucide-react';

interface Source {
  id: string;
  domain: string;
  citation_count: number;
}

interface SourcesTabProps {
  sources: Source[];
}

export default function SourcesTab({ sources }: SourcesTabProps) {
  return (
    <div className="space-y-8">
      {/* Single Summary Card - Total Sources */}
      <div className="grid md:grid-cols-1 gap-6 max-w-md">
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
      </div>

      {/* Simplified Sources Table */}
      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">
                  #
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-40">
                  Citations
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sources.map((source, index) => (
                <tr key={source.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500 font-medium">
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-gray-900">{source.domain || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-gray-900">
                      {source.citation_count || 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {sources.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-gray-600">No sources cited in the analysis</p>
          </div>
        )}
      </Card>
    </div>
  );
}
