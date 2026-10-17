import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import {
  Sparkles,
  Share2,
  Copy,
  Check,
  Activity,
  Calendar,
  Building,
  Award,
  ChevronRight,
  Clock,
  Send
} from 'lucide-react';

export const Recommendations = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // LinkedIn Generator State
  const [selectedOppId, setSelectedOppId] = useState('');
  const [studentReflection, setStudentReflection] = useState('');
  const [generatedDraft, setGeneratedDraft] = useState('');
  const [draftSource, setDraftSource] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recs, acts] = await Promise.all([
        api.getRecommendations(),
        api.getActivityStream()
      ]);
      setRecommendations(recs);
      setActivities(acts);
      if (recs.length > 0) {
        setSelectedOppId(recs[0].opportunity_id);
      }
    } catch (err) {
      console.error('Failed to load recommendations feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerateLinkedIn = async (e) => {
    e.preventDefault();
    if (!selectedOppId) return;
    setDraftLoading(true);
    setCopied(false);
    try {
      const res = await api.generateLinkedInDraft(selectedOppId, studentReflection);
      setGeneratedDraft(res.draft);
      setDraftSource(res.source);
    } catch (err) {
      alert(`Draft generation failed: ${err.message}`);
    } finally {
      setDraftLoading(false);
    }
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(generatedDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto py-12 text-center text-gray-500">Loading AI recommendations & feed...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Opportunity Intelligence Engine (P1)
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Recommendations & LinkedIn Generator
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Personalized opportunity recommendations ranked with deterministic fit rules, daily activity signals, and LinkedIn post drafting.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Ranked Recommendations Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
            <h2 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Ranked Recommendations for You
              </span>
              <span className="text-xs text-gray-400 font-normal">Ranked by rule-based fit</span>
            </h2>

            {recommendations.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No active recommendations"
                description="Make sure your student profile has skills and academic year configured to receive matches."
              />
            ) : (
              <div className="space-y-4">
                {recommendations.map((rec) => (
                  <div
                    key={rec.opportunity_id}
                    className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:border-indigo-200 transition-all text-xs"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <Link to={`/opportunities/${rec.opportunity_id}`} className="font-bold text-sm text-gray-900 hover:text-indigo-600">
                        {rec.title}
                      </Link>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                          {rec.fit_score} pts
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {rec.fit_label}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-500 mb-2">
                      {rec.organizer_name} • <span className="capitalize">{rec.category}</span>
                    </div>

                    {/* PRD §4.11: Plain-English explanation */}
                    <div className="p-2.5 bg-white rounded-lg border border-indigo-100 text-indigo-950 font-medium mb-3">
                      💡 {rec.explanation}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex flex-wrap gap-1">
                        {rec.matched_skills.map((s, i) => (
                          <span key={i} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✓ {s}
                          </span>
                        ))}
                      </div>

                      <Link
                        to={`/opportunities/${rec.opportunity_id}`}
                        className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
                      >
                        Explore →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: LinkedIn Post Generator & Daily Activity Stream */}
        <div className="space-y-6">
          {/* LINKEDIN POST GENERATOR (PRD §4.11) */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <Share2 className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-gray-900">LinkedIn Post Drafter</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Generate a celebration draft for an opportunity you participated in. Includes an editable text area and one-click copy.
            </p>

            <form onSubmit={handleGenerateLinkedIn} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Select Event / Opportunity</label>
                <select
                  value={selectedOppId}
                  onChange={(e) => setSelectedOppId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                >
                  {recommendations.map((r) => (
                    <option key={r.opportunity_id} value={r.opportunity_id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Personal Takeaway / Reflection (1–2 lines)
                </label>
                <textarea
                  rows={2}
                  value={studentReflection}
                  onChange={(e) => setStudentReflection(e.target.value)}
                  placeholder="e.g. Learned how to optimize latency across asynchronous endpoints..."
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={draftLoading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {draftLoading ? 'Generating Draft...' : 'Generate LinkedIn Draft'}
              </button>
            </form>

            {/* Generated Draft Output */}
            {generatedDraft && (
              <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Generated Draft ({draftSource})
                  </span>
                  <button
                    onClick={handleCopyDraft}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied to Clipboard!' : 'Copy Post'}
                  </button>
                </div>

                <textarea
                  rows={7}
                  value={generatedDraft}
                  onChange={(e) => setGeneratedDraft(e.target.value)}
                  className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />

                {/* PRD Non-negotiable honesty banner */}
                <div className="text-[11px] text-gray-500 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-start gap-1.5">
                  <span className="font-bold text-amber-800">Note:</span>
                  <span>This draft is generated for you to edit and paste into LinkedIn. CampusForge <strong>never</strong> auto-posts to your social accounts.</span>
                </div>
              </div>
            )}
          </div>

          {/* DAILY ACTIVITY STREAM */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
            <h3 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              Daily Activity Stream
            </h3>

            {activities.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">No recent alerts.</p>
            ) : (
              <div className="space-y-3">
                {activities.map((act, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                    <span className="font-bold text-gray-900 block">{act.title}</span>
                    <p className="text-[11px] text-gray-600 mt-0.5">{act.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
