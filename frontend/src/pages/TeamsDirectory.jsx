import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/EmptyState';
import {
  Users,
  Plus,
  Shield,
  Layers,
  ChevronRight,
  UserPlus,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const TeamsDirectory = () => {
  const { user, role } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [teamForm, setTeamForm] = useState({
    name: '',
    description: '',
    required_skills: [],
    max_size: 4
  });
  const [skillInput, setSkillInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const data = await api.getTeams();
      setTeams(data);
    } catch (err) {
      console.error('Failed to load teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      await api.createTeam(teamForm);
      setShowCreateModal(false);
      setTeamForm({ name: '', description: '', required_skills: [], max_size: 4 });
      fetchTeams();
      alert('Team created successfully! You are the team leader.');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const addSkill = (e) => {
    e.preventDefault();
    if (skillInput.trim() && !teamForm.required_skills.includes(skillInput.trim())) {
      setTeamForm({
        ...teamForm,
        required_skills: [...teamForm.required_skills, skillInput.trim()]
      });
      setSkillInput('');
    }
  };

  const removeSkill = (s) => {
    setTeamForm({
      ...teamForm,
      required_skills: teamForm.required_skills.filter((item) => item !== s)
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Smart Project Teams
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Collaborate with peers, detect missing skill bottlenecks, and recruit qualified candidates with rule-based verification.
          </p>
        </div>
        {role === 'student' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Create Team
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-56 bg-gray-200 animate-pulse rounded-2xl"></div>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teams active yet"
          description="Create a team to assemble members, detect missing skills, and build collaborative projects."
          actionLabel="Create the First Team"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-2xl border border-gray-200 hover:border-indigo-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700">
                    {t.members?.length || 0} / {t.max_size} Members
                  </span>
                  <span className="text-[11px] font-semibold text-gray-500">
                    Leader: {t.owner_name}
                  </span>
                </div>

                <Link to={`/teams/${t.id}`}>
                  <h3 className="text-base font-bold text-gray-900 hover:text-indigo-600 transition-colors">
                    {t.name}
                  </h3>
                </Link>

                <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                  {t.description || 'No description provided.'}
                </p>

                {/* Skill Coverage Summary */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {t.covered_skills?.length || 0} Covered
                    </span>
                    <span className="text-amber-700 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-500" />
                      {t.missing_skills?.length || 0} Missing
                    </span>
                  </div>

                  {t.missing_skills && t.missing_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {t.missing_skills.map((m, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                        >
                          Needs {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                <Link
                  to={`/teams/${t.id}`}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  View Workspace & Tasks
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE TEAM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-base font-bold text-gray-900">Create Project Team</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Team Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SmartCampus Navigator"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Project Purpose / Goal</label>
                <textarea
                  rows={2}
                  placeholder="What is your team building or competing for?"
                  value={teamForm.description}
                  onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Target Team Size (2 - 10)</label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={teamForm.max_size}
                  onChange={(e) => setTeamForm({ ...teamForm, max_size: parseInt(e.target.value) || 4 })}
                  className="w-32 p-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Required Skills */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Required Skills for Project</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g. Flutter, Rust, Python, UI/UX"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-lg"
                  />
                  <button onClick={addSkill} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold">Add</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {teamForm.required_skills.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs flex items-center gap-1 font-semibold">
                      {s}
                      <button type="button" onClick={() => removeSkill(s)}>✕</button>
                    </span>
                  ))}
                </div>
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
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
