'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Home } from 'lucide-react';
import Link from 'next/link';
import NavigationBar from '@/components/report/navigation-bar';
import OverviewTab from '@/components/report/overview-tab';
import PromptsTab from '@/components/report/prompts-tab';
import SourcesTab from '@/components/report/sources-tab';
import CompetitorsTab from '@/components/report/competitors-tab';

interface Topic {
  id: string;
  topic_name: string;
  topic_order: number;
  queries: Query[];
}

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

interface Competitor {
  id: string;
  brand_name: string;
  mention_count: number;
  avg_rank: number | null;
}

interface Source {
  id: string;
  domain: string;
  citation_count: number;
}

interface ReportData {
  analysis: {
    id: string;
    institution_name: string;
    status: string;
    progress: number;
    created_at: string;
    overall_visibility: number;
    avg_rank: number;
    top_rank_count: number;
  };
  topics: Topic[];
  competitors: Competitor[];
  sources: Source[];
  summary: {
    totalTopics: number;
    totalQueries: number;
    totalCompetitors: number;
    totalSources: number;
  };
}

export default function ReportPage() {
  const params = useParams();
  const analysisId = params.id as string;

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    async function fetchReport() {
      try {
        const response = await fetch(`/api/report/${analysisId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch report');
        }

        const data = await response.json();
        setReportData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (analysisId) {
      fetchReport();
    }
  }, [analysisId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading your report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Error Loading Report</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">Report not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  AI Visibility
                </h1>
                <span className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-600 border border-blue-200">
                  Beta
                </span>
              </div>
            </div>
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                <Home className="mr-2 h-4 w-4" />
                Generate New Report
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-8 py-10">
        <div className="max-w-7xl mx-auto">
          {/* Institution Header Card */}
          <div className="bg-white rounded-2xl p-10 mb-8 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-5xl font-bold text-gray-900">
                {reportData.analysis.institution_name}
              </h1>
            </div>
            <p className="text-gray-500 text-sm">
              Analysis completed on {new Date(reportData.analysis.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>

          {/* Horizontal Navigation */}
          <NavigationBar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />

          {/* Content Sections */}
          <div className="mt-8">
            {activeSection === 'overview' && <OverviewTab reportData={reportData} />}
            {activeSection === 'prompts' && <PromptsTab topics={reportData.topics} institutionName={reportData.analysis.institution_name} />}
            {activeSection === 'sources' && <SourcesTab sources={reportData.sources} />}
            {activeSection === 'competitors' && <CompetitorsTab competitors={reportData.competitors} institutionName={reportData.analysis.institution_name} />}
          </div>
        </div>
      </main>
    </div>
  );
}
