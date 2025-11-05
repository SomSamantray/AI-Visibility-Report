'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Brain, TrendingUp, Lightbulb, Network, ArrowRight, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [institutionName, setInstitutionName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionName })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start analysis');
      }

      const data = await response.json();
      setAnalysisId(data.analysisId);
      setIsLoading(false);

      pollProgress(data.analysisId);

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const pollProgress = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/progress?analysisId=${id}`);
        const data = await response.json();

        setProgress(data.progress);

        if (data.progress === 0) {
          setCurrentStep(0);
        } else if (data.progress > 0 && data.progress <= 24) {
          setCurrentStep(1);
        } else if (data.progress === 25) {
          setCurrentStep(2);
        } else if (data.progress > 25 && data.progress < 100) {
          setCurrentStep(3);
        } else if (data.progress === 100 && !data.isComplete) {
          setCurrentStep(4);
        }

        // Only redirect when both status is 'completed' AND progress is 100%
        if (data.isComplete && data.progress === 100) {
          clearInterval(interval);
          setCurrentStep(4);
          setTimeout(() => {
            router.push(`/report/${id}`);
          }, 1500);
        }

        // Handle edge case: completed without reaching 100%
        if (data.isComplete && data.progress < 100) {
          clearInterval(interval);
          setError(`Analysis completed but only ${data.progress}% of queries succeeded. Please try again.`);
          setIsProcessing(false);
        }

        if (data.isFailed) {
          clearInterval(interval);
          setError('Analysis failed. Please try again.');
          setIsProcessing(false);
        }
      } catch (err) {
        console.error('Failed to check progress:', err);
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                AI Visibility Genie
              </h1>
              <p className="text-xs text-slate-400">by Meritto AI Labs</p>
            </div>
          </div>
          <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10">
            <span className="text-sm font-medium text-gray-300">Powered by Mio</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 pt-24 pb-16 max-w-5xl">
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
              Discover Your
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              AI Search Visibility
            </span>
          </h1>

          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            See how your institution appears in AI-powered searches and understand your competitive position
          </p>

          {/* Simple Input Form */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-2xl p-2 border border-white/10 shadow-2xl hover:border-white/20 transition-all">
              <Input
                type="text"
                placeholder="Type the full institution name..."
                className="flex-1 h-14 text-lg bg-transparent border-0 text-white placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                required
                disabled={isLoading || isProcessing}
              />
              <Button
                type="submit"
                size="lg"
                className="h-14 px-8 bg-white hover:bg-gray-100 text-slate-900 font-semibold rounded-xl shadow-lg transition-all"
                disabled={isLoading || isProcessing || !institutionName.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Analyze Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="mt-4 text-sm text-red-400 bg-red-900/20 border border-red-800/50 p-3 rounded-xl">
                {error}
              </div>
            )}
          </form>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 container mx-auto px-6 py-20 max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            How It Works
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Intelligent analysis powered by advanced AI technology
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all"></div>
            <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                AI-Powered Analysis
              </h3>
              <p className="text-slate-400 leading-relaxed">
                We analyze how AI systems perceive and represent your institution across various contexts
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all"></div>
            <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
                <Network className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Competitive Insights
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Understand where you stand compared to competitors in AI-powered search results
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-orange-500/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all"></div>
            <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-pink-500/20">
                <Lightbulb className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Actionable Intelligence
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Get clear, data-driven insights to improve your visibility in AI search results
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 container mx-auto px-6 py-20 max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Why AI Visibility Matters
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Stay ahead in the age of AI-powered search and discovery
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Benefit 1 */}
          <div className="bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Track Your AI Presence</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Monitor how AI systems recognize and rank your brand across different queries and contexts
                </p>
              </div>
            </div>
          </div>

          {/* Benefit 2 */}
          <div className="bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-purple-500/20">
                <Network className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Beat the Competition</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  See where you stand against key competitors and identify opportunities to improve your ranking
                </p>
              </div>
            </div>
          </div>

          {/* Benefit 3 */}
          <div className="bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-pink-500/20">
                <Brain className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Optimize for AI Search</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Understand what drives visibility in AI responses and optimize your digital presence accordingly
                </p>
              </div>
            </div>
          </div>

          {/* Benefit 4 */}
          <div className="bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-orange-500/20">
                <Lightbulb className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Make Data-Driven Decisions</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Get actionable insights from comprehensive analysis to guide your AI visibility strategy
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-black/20 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-6 py-12 max-w-7xl">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold">AI Visibility Genie</p>
                </div>
              </div>
              <p className="text-sm text-slate-500">A product of Meritto AI Labs</p>
            </div>

            {/* Platform */}
            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-400 text-sm hover:text-white transition-colors">Product Analytics</a></li>
                <li><a href="#" className="text-slate-400 text-sm hover:text-white transition-colors">Feature Experimentation</a></li>
                <li><a href="#" className="text-slate-400 text-sm hover:text-white transition-colors">AI Agents</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-400 text-sm hover:text-white transition-colors">Resource Library</a></li>
                <li><a href="#" className="text-slate-400 text-sm hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-slate-400 text-sm hover:text-white transition-colors">Product Updates</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-400 text-sm hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="text-slate-400 text-sm hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="text-slate-400 text-sm hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-xs">
              © 2025 Meritto AI Labs. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-slate-400 text-xs hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="text-slate-400 text-xs hover:text-white transition-colors">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Progress Modal - Simple & Opaque */}
      <Dialog open={isProcessing} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-2xl bg-white border-gray-300">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Analyzing AI Visibility
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Institution Name */}
            <div className="text-center">
              <p className="text-lg text-gray-700">
                Analyzing <span className="font-bold text-blue-600">{institutionName}</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                This typically takes 3-5 minutes
              </p>
            </div>

            {/* Progress Bar with Percentage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-2xl font-bold text-blue-600">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Milestones */}
            <div className="space-y-3">
              {/* Step 1: Researching */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  currentStep >= 1 ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {currentStep >= 1 ? (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-white text-sm font-bold">1</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className={`font-semibold ${currentStep >= 1 ? 'text-gray-900' : 'text-gray-500'}`}>
                    Researching Institution
                  </div>
                  <div className="text-sm text-gray-500">
                    Gathering information and building analysis framework
                  </div>
                </div>
                {currentStep === 0 && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
              </div>

              {/* Step 2: Running AI Prompts */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  currentStep >= 2 ? 'bg-green-500' : currentStep === 1 ? 'bg-blue-600' : 'bg-gray-300'
                }`}>
                  {currentStep >= 2 ? (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-white text-sm font-bold">2</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className={`font-semibold ${currentStep >= 2 ? 'text-gray-900' : currentStep === 1 ? 'text-gray-900' : 'text-gray-500'}`}>
                    Running AI Prompts
                  </div>
                  <div className="text-sm text-gray-500">
                    Querying AI systems with 110 strategic prompts
                  </div>
                </div>
                {currentStep === 1 && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
              </div>

              {/* Step 3: Fetching Results */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  currentStep >= 3 ? 'bg-green-500' : currentStep === 2 ? 'bg-blue-600' : 'bg-gray-300'
                }`}>
                  {currentStep >= 3 ? (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-white text-sm font-bold">3</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className={`font-semibold ${currentStep >= 3 ? 'text-gray-900' : currentStep === 2 ? 'text-gray-900' : 'text-gray-500'}`}>
                    Fetching AI Responses
                  </div>
                  <div className="text-sm text-gray-500">
                    Collecting and processing AI-generated answers
                  </div>
                </div>
                {currentStep === 2 && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
              </div>

              {/* Step 4: Analyzing Results */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  currentStep >= 4 ? 'bg-green-500' : currentStep === 3 ? 'bg-blue-600' : 'bg-gray-300'
                }`}>
                  {currentStep >= 4 ? (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-white text-sm font-bold">4</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className={`font-semibold ${currentStep >= 4 ? 'text-gray-900' : currentStep === 3 ? 'text-gray-900' : 'text-gray-500'}`}>
                    Analyzing Results
                  </div>
                  <div className="text-sm text-gray-500">
                    Calculating visibility scores and competitive rankings
                  </div>
                </div>
                {currentStep === 3 && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
