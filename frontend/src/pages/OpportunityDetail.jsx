import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { EventCheckoutModal } from '../components/EventCheckoutModal';
import {
  Calendar,
  Building,
  GraduationCap,
  MapPin,
  ExternalLink,
  Bookmark,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  FileText,
  Clock,
  ArrowLeft,
  Send,
  HelpCircle,
  TicketIcon,
  CreditCard
} from 'lucide-react';

export const OpportunityDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [opp, setOpp] = useState(null);
  const [fit, setFit] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fitLoading, setFitLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Modals
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [myTicket, setMyTicket] = useState(null);
  const [applyNote, setApplyNote] = useState('');
  const [submittingApply, setSubmittingApply] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  const isEventCategory = (cat) => cat && cat !== 'internship';

  const fetchOpportunity = async () => {
    setLoading(true);
    try {
      const data = await api.getOpportunity(id);
      setOpp(data);

      if (role === 'student') {
        fetchFit();
        // Check if already registered for event
        if (isEventCategory(data.category)) {
          try {
            const ticket = await api.getMyTicket(data.id);
            setMyTicket(ticket);
          } catch (_) {}
        }
      }
    } catch (err) {
      console.error('Failed to load opportunity:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFit = async () => {
    setFitLoading(true);
    try {
      const fitData = await api.getOpportunityFit(id);
      setFit(fitData);
    } catch (err) {
      console.log('Fit assessment error (profile may be incomplete):', err);
    } finally {
      setFitLoading(false);
    }
  };

  const handleOpenSummary = async () => {
    setShowSummaryModal(true);
    if (!summary) {
      setSummaryLoading(true);
      try {
        const sumData = await api.getOpportunitySummary(id);
        setSummary(sumData);
      } catch (err) {
        console.error('Failed to generate summary:', err);
      } finally {
        setSummaryLoading(false);
      }
    }
  };

  const handleToggleSave = async () => {
    if (role !== 'student') return;
    try {
      if (opp.is_saved) {
        await api.unsaveOpportunity(opp.id);
        setOpp({ ...opp, is_saved: false });
      } else {
        await api.saveOpportunity(opp.id);
        setOpp({ ...opp, is_saved: true });
      }
    } catch (err) {
      alert(`Save toggle failed: ${err.message}`);
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setSubmittingApply(true);
    setApplyError('');
    try {
      const res = await api.applyToOpportunity(opp.id, { note: applyNote });
      setShowApplyModal(false);
      setOpp({ ...opp, application_status: res.status });
      alert('Application submitted successfully!');
    } catch (err) {
      setApplyError(err.message);
    } finally {
      setSubmittingApply(false);
    }
  };

  const handleCheckoutSuccess = (ticket) => {
    setMyTicket(ticket);
    setShowCheckoutModal(false);
  };

  useEffect(() => {
    fetchOpportunity();
  }, [id, role]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-500">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Loading opportunity details...
      </div>
    );
  }

  if (!opp) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Opportunity Not Found</h2>
        <p className="text-sm text-gray-500 mb-4">This listing may have been removed or does not exist.</p>
        <Link to="/opportunities" className="text-indigo-600 font-semibold text-sm hover:underline">
          ← Back to Directory
        </Link>
      </div>
    );
  }

  const isExpired = opp.computed_status === 'expired' || opp.computed_status === 'closed' || opp.computed_status === 'completed';
  const isNullDeadline = opp.computed_status === 'invalid_deadline';
  const canApply = !isExpired && !isNullDeadline;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <Link
        to="/opportunities"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-indigo-600 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Directory
      </Link>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Full Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xs">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <StatusBadge status={opp.computed_status} />
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 capitalize">
                  {opp.category.replace('_', ' ')}
                </span>
              </div>
              {role === 'student' && (
                <button
                  onClick={handleToggleSave}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    opp.is_saved
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Bookmark className="w-4 h-4 fill-current" />
                  {opp.is_saved ? 'Saved' : 'Save Opportunity'}
                </button>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {opp.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-2 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-gray-400" />
                <span className="font-semibold text-gray-700">{opp.organizer_name}</span>
              </div>
              {opp.venue && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{opp.venue}</span>
                </div>
              )}
              {opp.online_link && (
                <a
                  href={opp.online_link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-indigo-600 hover:underline"
                >
                  <span>Online Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Quick Actions (View Summary) */}
            <div className="flex items-center gap-3 my-5">
              <button
                onClick={handleOpenSummary}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200 cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                View Executive Summary
              </button>
            </div>

            {/* Description */}
            <div className="mt-6">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
                About the Opportunity
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {opp.description}
              </p>
            </div>

            {/* Eligibility */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
                Eligibility Criteria
              </h2>
              <div className="bg-gray-50 rounded-xl p-4 text-xs space-y-2 border border-gray-200">
                {opp.eligibility_text && (
                  <p className="text-gray-800 font-medium">{opp.eligibility_text}</p>
                )}
                <div className="flex flex-wrap gap-4 text-gray-600 pt-1">
                  <div>
                    <span className="font-semibold text-gray-700">Eligible Academic Years: </span>
                    {opp.allowed_years && opp.allowed_years.length > 0
                      ? opp.allowed_years.join(', ')
                      : 'All undergraduate & graduate years'}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Eligible Departments: </span>
                    {opp.allowed_depts && opp.allowed_depts.length > 0
                      ? opp.allowed_depts.join(', ')
                      : 'All engineering & science branches'}
                  </div>
                </div>

                {opp.strict_eligibility && (
                  <div className="flex items-center gap-1.5 text-rose-700 font-semibold pt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Strict Verification: Applications will be programmatically blocked if year or department does not match.
                  </div>
                )}
              </div>
            </div>

            {/* Required Skills */}
            {opp.required_skills && opp.required_skills.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
                  Required Competencies
                </h2>
                <div className="flex flex-wrap gap-2">
                  {opp.required_skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Fit Engine & Apply Actions */}
        <div className="space-y-6">
          {/* Fit Assessment Panel (Core differentiator) */}
          {role === 'student' ? (
            <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-50 to-transparent rounded-bl-full pointer-events-none"></div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-gray-900">Your Fit Breakdown</h3>
                </div>
                {fit && (
                  <div className="text-right">
                    <span className="text-2xl font-black text-indigo-600">{fit.score}</span>
                    <span className="text-xs text-gray-400 font-bold">/100</span>
                  </div>
                )}
              </div>

              {fitLoading ? (
                <div className="py-6 text-center text-xs text-gray-400">Computing profile match...</div>
              ) : fit ? (
                <div className="space-y-4">
                  {/* Fit Level Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                        fit.label === 'Strong'
                          ? 'bg-emerald-100 text-emerald-800'
                          : fit.label === 'Partial'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {fit.label} Match
                    </span>
                    <span className="text-xs text-gray-500">
                      {fit.is_eligible ? 'Eligible to apply' : 'Eligibility mismatch'}
                    </span>
                  </div>

                  {/* Matched vs Missing Skills */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div className="text-xs font-semibold text-gray-700">Matched Skills ({fit.matched_skills.length})</div>
                    <div className="flex flex-wrap gap-1.5">
                      {fit.matched_skills.length > 0 ? (
                        fit.matched_skills.map((s, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 italic">None of the required skills matched yet</span>
                      )}
                    </div>
                  </div>

                  {fit.missing_skills.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-gray-700">Missing Skills ({fit.missing_skills.length})</div>
                      <div className="flex flex-wrap gap-1.5">
                        {fit.missing_skills.map((s, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200"
                          >
                            <XCircle className="w-3 h-3 text-rose-500" />
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reasons list */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="text-xs font-semibold text-gray-700 mb-1.5">Match Explanation</div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {fit.reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-indigo-500 mt-0.5">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Availability Note */}
                  <div className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                    {fit.availability_note}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 py-3 text-center">
                  <p className="mb-2">Complete your student skills profile to see your personalized match analysis.</p>
                  <Link to="/profile" className="text-indigo-600 font-bold hover:underline">
                    Edit Profile →
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 text-center text-xs text-gray-500">
              <p className="font-semibold text-gray-700 mb-1">Fit Intelligence</p>
              <p>Log in as a student to evaluate your automated fit score, skill matches, and eligibility analysis.</p>
            </div>
          )}

          {/* Application Action Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-gray-900">Application Status</h3>

            {/* Key Deadlines */}
            <div className="text-xs space-y-1.5 text-gray-600">
              <div className="flex justify-between">
                <span className="text-gray-500">Deadline:</span>
                <span className="font-semibold text-gray-900">
                  {isNullDeadline
                    ? 'Deadline not specified'
                    : opp.deadline_at
                    ? new Date(opp.deadline_at).toLocaleString()
                    : 'Open'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Event Start:</span>
                <span className="font-semibold text-gray-900">
                  {new Date(opp.start_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Application State / Action Buttons */}
            {/* ── INTERNSHIP: standard apply flow ── */}
            {opp.category === 'internship' ? (
              opp.application_status ? (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
                  <span className="text-xs font-medium text-gray-600 block mb-1">You have applied:</span>
                  <StatusBadge status={opp.application_status} />
                </div>
              ) : isNullDeadline ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Applications are blocked because no deadline was specified by the organizer.</span>
                </div>
              ) : isExpired ? (
                <div className="p-3 bg-gray-100 border border-gray-300 rounded-xl text-xs text-gray-700 text-center font-medium">
                  Applications closed (Deadline passed or opportunity closed).
                </div>
              ) : role === 'student' ? (
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="w-full py-2.5 px-4 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Apply for Internship
                </button>
              ) : (
                <div className="text-xs text-gray-500 text-center">
                  Sign in with a Student account to apply directly.
                </div>
              )
            ) : (
              /* ── EVENTS: Hybrid checkout (in-app + external link) ── */
              <>
                {/* Already registered — show ticket */}
                {myTicket ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      You're Registered!
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Ticket Code</span>
                      <span className="font-mono font-black text-gray-900 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg">
                        {myTicket.ticket_code}
                      </span>
                    </div>
                    {myTicket.payment_status === 'paid_upi' && (
                      <div className="text-xs text-emerald-700 bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5">
                        ₹{myTicket.amount_paid} paid · Ref: {myTicket.payment_reference}
                      </div>
                    )}
                  </div>
                ) : isNullDeadline ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>Registration blocked — no deadline was specified by the organizer.</span>
                  </div>
                ) : isExpired ? (
                  <div className="p-3 bg-gray-100 border border-gray-300 rounded-xl text-xs text-gray-700 text-center font-medium">
                    Registrations closed (Event ended or deadline passed).
                  </div>
                ) : role === 'student' ? (
                  <div className="space-y-2">
                    {/* Registration fee badge if paid event */}
                    {opp.is_paid && opp.fee_amount > 0 && (
                      <div className="flex items-center justify-between text-xs bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                        <span className="text-amber-800 font-semibold flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5" />
                          Registration Fee
                        </span>
                        <span className="font-black text-amber-900">₹{opp.fee_amount}</span>
                      </div>
                    )}

                    {/* Primary CTA — opens hybrid checkout modal */}
                    <button
                      onClick={() => setShowCheckoutModal(true)}
                      className="w-full py-2.5 px-4 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <TicketIcon className="w-4 h-4" />
                      {opp.is_paid ? `Register & Pay ₹${opp.fee_amount}` : 'Register for Event'}
                    </button>

                    {/* External link quick access */}
                    {opp.registration_link && (
                      <a
                        href={opp.registration_link}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 px-4 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                      >
                        Also available: External Google Form
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 text-center">
                    Sign in with a Student account to register.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Executive Summary */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-gray-900">Executive Summary</h3>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            {summaryLoading ? (
              <div className="py-8 text-center text-xs text-gray-500">Generating structured summary...</div>
            ) : summary ? (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">🎯 Purpose</h4>
                  <p className="text-gray-700 leading-relaxed bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    {summary.purpose}
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">🎓 Eligibility Requirements</h4>
                  <p className="text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    {summary.eligibility}
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">💡 Key Benefits & Mentorship</h4>
                  <p className="text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    {summary.benefits}
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">⚡ Required Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.required_skills.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">🗓️ Key Deadlines</h4>
                  <p className="text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    {summary.key_deadlines}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="mt-6 pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-base font-bold text-gray-900">Apply to {opp.title}</h3>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            {applyError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {applyError}
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900">
                <span className="font-bold block mb-1">Profile Resume Auto-Attached</span>
                Your skills, projects, and contact info will be shared directly with {opp.organizer_name}.
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Cover Note / Pitch (Optional)
                </label>
                <textarea
                  rows={4}
                  value={applyNote}
                  onChange={(e) => setApplyNote(e.target.value)}
                  placeholder="Explain why you are excited for this opportunity and what relevant work you bring..."
                  className="w-full text-xs p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApply}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingApply ? 'Submitting...' : 'Confirm & Apply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Event Checkout (Hybrid: in-app pay + external link) */}
      {showCheckoutModal && opp && (
        <EventCheckoutModal
          opp={opp}
          currentUser={user}
          onClose={() => setShowCheckoutModal(false)}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
};
