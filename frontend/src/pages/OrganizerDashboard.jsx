import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import {
  Briefcase,
  Users,
  CheckCircle,
  Clock,
  Plus,
  Filter,
  AlertTriangle,
  Calendar,
  ExternalLink
} from 'lucide-react';

export const OrganizerDashboard = () => {
  const { user, role } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedOppId, setSelectedOppId] = useState(null);
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [appsLoading, setAppsLoading] = useState(false);

  // Create Listing Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'internship',
    eligibility_text: '',
    allowed_years: [2, 3, 4],
    allowed_depts: ['CSE', 'IT', 'ECE'],
    strict_eligibility: false,
    required_skills: [],
    start_at: '',
    end_at: '',
    deadline_at: '',
    venue: '',
    online_link: '',
    organizer_name: user?.name || 'TechCorp Talent',
    organizer_contact: user?.email || '',
    registration_link: ''
  });
  const [skillInput, setSkillInput] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const data = await api.getOrganizerDashboard();
      setDashboardData(data);
      if (data.listings && data.listings.length > 0 && !selectedOppId) {
        setSelectedOppId(data.listings[0].id);
      }
    } catch (err) {
      console.error('Failed to load organizer dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async (oppId) => {
    if (!oppId) return;
    setAppsLoading(true);
    try {
      const apps = await api.getOrganizerApplications(oppId, statusFilter);
      setApplications(apps);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setAppsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (selectedOppId) {
      fetchApplications(selectedOppId);
    }
  }, [selectedOppId, statusFilter]);

  const handleStatusChange = async (appId, newStatus) => {
    try {
      await api.updateApplicationStatus(appId, newStatus);
      // Immediately update local state
      setApplications(
        applications.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
      );
      fetchDashboard();
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      await api.createOpportunity(createForm);
      setShowCreateModal(false);
      fetchDashboard();
      alert('Internship listing created successfully!');
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const addReqSkill = (e) => {
    e.preventDefault();
    if (skillInput.trim() && !createForm.required_skills.includes(skillInput.trim())) {
      setCreateForm({
        ...createForm,
        required_skills: [...createForm.required_skills, skillInput.trim()]
      });
      setSkillInput('');
    }
  };

  const removeReqSkill = (skill) => {
    setCreateForm({
      ...createForm,
      required_skills: createForm.required_skills.filter((s) => s !== skill)
    });
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto py-12 text-center text-gray-500">Loading organizer dashboard...</div>;
  }

  const metrics = dashboardData?.metrics || {
    total_listings: 0,
    active_listings: 0,
    total_applications: 0,
    status_counts: {}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Organizer Talent Workspace
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage your corporate internship postings, review candidate skill alignments, and track hiring stages.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Publish New Internship
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-400 block mb-1">Total Postings</span>
          <span className="text-2xl font-black text-gray-900">{metrics.total_listings}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-600 block mb-1">Active Listings</span>
          <span className="text-2xl font-black text-emerald-700">{metrics.active_listings}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-indigo-600 block mb-1">Total Applications</span>
          <span className="text-2xl font-black text-indigo-700">{metrics.total_applications}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-amber-600 block mb-1">Shortlisted / Accepted</span>
          <span className="text-2xl font-black text-amber-700">
            {(metrics.status_counts?.shortlisted || 0) + (metrics.status_counts?.accepted || 0)}
          </span>
        </div>
      </div>

      {/* Main Workspace Layout: Listings Sidebar + Applications Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Listings Selector */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs h-fit space-y-2">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">
            My Opportunities ({dashboardData?.listings?.length || 0})
          </h2>
          {dashboardData?.listings?.length === 0 ? (
            <p className="text-xs text-gray-400 p-2">No listings published yet.</p>
          ) : (
            dashboardData.listings.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelectedOppId(l.id)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                  selectedOppId === l.id
                    ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900 shadow-2xs'
                    : 'bg-white border-transparent hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold truncate pr-2">{l.title}</span>
                  <StatusBadge status={l.computed_status} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>{l.applications_count} candidate(s)</span>
                  <span>{l.deadline_at ? new Date(l.deadline_at).toLocaleDateString() : 'Rolling'}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Applications List Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-gray-900">Applicant Submissions</h2>
              <span className="text-xs text-gray-500">
                Single source of truth: changes update candidate status in real time.
              </span>
            </div>

            {/* Filter by status */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {appsLoading ? (
            <div className="py-12 text-center text-xs text-gray-400">Loading applicants...</div>
          ) : applications.length === 0 ? (
            <EmptyState
              title="No applications for this opportunity"
              description="When students discover and apply to this opportunity, their profiles and skill matches will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] tracking-wider font-semibold">
                    <th className="pb-3">Candidate</th>
                    <th className="pb-3">Skills & Match</th>
                    <th className="pb-3">Applied</th>
                    <th className="pb-3">Current Status</th>
                    <th className="pb-3 text-right">Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50/50">
                      <td className="py-3.5 pr-2">
                        <div className="font-bold text-gray-900">{app.student_name}</div>
                        <div className="text-[11px] text-gray-400">{app.student_email}</div>
                        {app.note && (
                          <div className="text-[11px] text-gray-600 mt-1 italic line-clamp-1">
                            "{app.note}"
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 pr-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-1">
                          {app.matched_skill_count} matched skills
                        </span>
                        <div className="text-[10px] text-gray-500 truncate max-w-xs">
                          {app.student_skills?.slice(0, 3).join(', ')}
                        </div>
                      </td>
                      <td className="py-3.5 pr-2 text-gray-500 text-[11px]">
                        {new Date(app.applied_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 pr-2">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="py-3.5 text-right">
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusChange(app.id, e.target.value)}
                          className="text-xs p-1.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="submitted">Submitted</option>
                          <option value="under_review">Under Review</option>
                          <option value="shortlisted">Shortlist ✨</option>
                          <option value="accepted">Accept 🎉</option>
                          <option value="rejected">Reject</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CREATE LISTING MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Publish New Internship Listing</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Position Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Systems Engineering Intern"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Job Description * (min 10 chars)</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe key responsibilities, mentor guidance, and learning outcomes..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Internship Start Date *</label>
                  <input
                    type="datetime-local"
                    required
                    value={createForm.start_at}
                    onChange={(e) => setCreateForm({ ...createForm, start_at: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Application Deadline</label>
                  <input
                    type="datetime-local"
                    value={createForm.deadline_at}
                    onChange={(e) => setCreateForm({ ...createForm, deadline_at: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-lg"
                  />
                  <span className="text-[10px] text-gray-400">Leave blank to test E2 (Null deadline handling)</span>
                </div>
              </div>

              {/* Skills */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Required Skills</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g. Python, Docker, React"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-lg"
                  />
                  <button onClick={addReqSkill} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold">Add</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {createForm.required_skills.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs flex items-center gap-1">
                      {s}
                      <button type="button" onClick={() => removeReqSkill(s)}>✕</button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Strict Eligibility Checkbox (for E12) */}
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <input
                  type="checkbox"
                  id="strictCheck"
                  checked={createForm.strict_eligibility}
                  onChange={(e) => setCreateForm({ ...createForm, strict_eligibility: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="strictCheck" className="font-semibold text-amber-900 cursor-pointer">
                  Enforce Strict Academic Eligibility (Reject applicants with non-matching year/dept)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {creating ? 'Publishing...' : 'Publish Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
