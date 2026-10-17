import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Search,
  UserPlus,
  Plus,
  Clock,
  User,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Send,
  Sparkles
} from 'lucide-react';

export const TeamDetail = () => {
  const { id } = useParams();
  const { user, role } = useAuth();

  const [team, setTeam] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Missing Skill Candidate Search State
  const [selectedMissingSkill, setSelectedMissingSkill] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);

  // Add Task Modal State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    owner_id: '',
    deadline: '',
    status: 'todo'
  });
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskError, setTaskError] = useState('');

  const loadTeamData = async () => {
    setLoading(true);
    try {
      const teamData = await api.getTeam(id);
      setTeam(teamData);

      // If current user is a team member, load tasks
      const isMember = teamData.members?.some((m) => m.user_id === user?.id);
      if (isMember) {
        const taskData = await api.getTeamTasks(id);
        setTasks(taskData);
      }
    } catch (err) {
      console.error('Failed to load team:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, [id, user]);

  const handleFindCandidates = async (skill) => {
    setSelectedMissingSkill(skill);
    setShowCandidateModal(true);
    setCandidatesLoading(true);
    try {
      const data = await api.getTeamCandidates(id, skill);
      setCandidates(data);
    } catch (err) {
      alert(`Candidate search failed: ${err.message}`);
    } finally {
      setCandidatesLoading(false);
    }
  };

  const handleInviteCandidate = async (candidateId) => {
    try {
      await api.sendInvite(id, candidateId);
      alert('Invitation sent successfully! The student will see it on their personal dashboard.');
    } catch (err) {
      alert(`Invitation failed: ${err.message}`);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member? Any open tasks assigned to them will become Unassigned.')) {
      return;
    }
    try {
      const res = await api.removeTeamMember(id, memberId);
      alert(res.message);
      loadTeamData();
    } catch (err) {
      alert(`Removal failed: ${err.message}`);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setTaskSubmitting(true);
    setTaskError('');

    if (!taskForm.owner_id) {
      setTaskError('Task owner is required. Please assign an active team member.');
      setTaskSubmitting(false);
      return;
    }

    try {
      await api.createTask(id, {
        title: taskForm.title,
        description: taskForm.description,
        owner_id: parseInt(taskForm.owner_id),
        deadline: taskForm.deadline,
        status: taskForm.status
      });
      setShowTaskModal(false);
      setTaskForm({ title: '', description: '', owner_id: '', deadline: '', status: 'todo' });
      const taskData = await api.getTeamTasks(id);
      setTasks(taskData);
    } catch (err) {
      setTaskError(err.message);
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await api.updateTask(taskId, { status: newStatus });
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    } catch (err) {
      alert(`Failed to update task: ${err.message}`);
    }
  };

  const handleAssignTask = async (taskId, newOwnerId) => {
    try {
      const updated = await api.updateTask(taskId, { owner_id: parseInt(newOwnerId) });
      setTasks(tasks.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      alert(`Failed to assign task: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="max-w-6xl mx-auto py-12 text-center text-gray-500">Loading project team...</div>;
  }

  if (!team) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Team Not Found</h2>
        <Link to="/teams" className="text-indigo-600 font-semibold text-xs">← Back to Teams</Link>
      </div>
    );
  }

  const isOwner = team.owner_id === user?.id;
  const isMember = team.members?.some((m) => m.user_id === user?.id);

  // Task groupings
  const tasksByStatus = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    blocked: tasks.filter((t) => t.status === 'blocked'),
    done: tasks.filter((t) => t.status === 'done')
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <Link to="/teams" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-indigo-600 transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to Teams Directory
      </Link>

      {/* Team Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">
              Project Team Workspace
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {team.name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">
              {team.members?.length || 0} / {team.max_size} Members
            </span>
            {isOwner && (
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-bold">
                👑 Team Leader
              </span>
            )}
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-600 max-w-3xl leading-relaxed">
          {team.description || 'No project description provided.'}
        </p>

        {team.opportunity_title && (
          <div className="mt-3 text-xs text-indigo-700 flex items-center gap-1.5 bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100 w-fit">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Formed for: <strong>{team.opportunity_title}</strong></span>
          </div>
        )}
      </div>

      {/* SKILL COVERAGE & BOTTLENECK PANEL (PRD §4.8) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs mb-8">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Required Skill Coverage & Missing Skill Detection
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Computed in real time by comparing requirements against actual member skill profiles.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Covered Skills */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <span className="text-xs font-bold text-emerald-900 block mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Covered by Current Members ({team.covered_skills?.length || 0})
            </span>
            <div className="flex flex-wrap gap-2">
              {team.covered_skills && team.covered_skills.length > 0 ? (
                team.covered_skills.map((s, i) => (
                  <span key={i} className="px-2.5 py-1 bg-white text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 shadow-2xs">
                    ✓ {s}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500 italic">No required skills covered yet</span>
              )}
            </div>
          </div>

          {/* Missing Skills (E5 Bottlenecks) */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
            <span className="text-xs font-bold text-amber-900 block mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Missing Skills Bottleneck ({team.missing_skills?.length || 0})
            </span>
            <div className="flex flex-wrap gap-2">
              {team.missing_skills && team.missing_skills.length > 0 ? (
                team.missing_skills.map((s, i) => (
                  <div key={i} className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs text-xs font-bold text-amber-900">
                    <span>{s}</span>
                    <button
                      onClick={() => handleFindCandidates(s)}
                      className="ml-1 text-[11px] text-indigo-600 hover:text-indigo-800 underline font-semibold cursor-pointer"
                      title="Find verified candidates with this skill"
                    >
                      Find Candidates →
                    </button>
                  </div>
                ))
              ) : (
                <span className="text-xs text-emerald-700 font-semibold">
                  🎉 Full skill coverage! Your team has every required competency.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TEAM MEMBERS GRID */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs mb-8">
        <h2 className="text-base font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600" />
          Active Team Members ({team.members?.length || 0})
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {team.members?.map((m) => (
            <div key={m.user_id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-gray-900">{m.name}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                    {m.role}
                  </span>
                </div>
                <span className="text-[11px] text-gray-500 block mb-2">{m.email}</span>

                <div className="flex flex-wrap gap-1 mt-2">
                  {m.skills?.map((sk, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded text-[10px] bg-white border border-gray-200 text-gray-700">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              {/* Remove member button (tests E7 task unassignment) */}
              {isOwner && m.role !== 'leader' && (
                <div className="mt-4 pt-2 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={() => handleRemoveMember(m.user_id)}
                    className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove (Reassigns Open Tasks)
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* PROJECT EXECUTION & TASK BOARD (PRD §4.9) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Project Task Board</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Clear task ownership & status tracking. Unassigned tasks are highlighted when members leave.
            </p>
          </div>
          {isMember && (
            <button
              onClick={() => setShowTaskModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Task
            </button>
          )}
        </div>

        {!isMember ? (
          <div className="text-center py-8 text-xs text-gray-400">
            Only active team members can view and update task execution boards.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['todo', 'in_progress', 'blocked', 'done'].map((col) => {
              const colTasks = tasksByStatus[col] || [];
              const colTitles = {
                todo: 'To Do',
                in_progress: 'In Progress',
                blocked: 'Blocked',
                done: 'Completed'
              };

              return (
                <div key={col} className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 flex flex-col">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      {colTitles[col]}
                    </span>
                    <span className="text-xs font-bold text-gray-400">{colTasks.length}</span>
                  </div>

                  <div className="space-y-3 flex-1">
                    {colTasks.length === 0 ? (
                      <div className="text-[11px] text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-lg">
                        No tasks
                      </div>
                    ) : (
                      colTasks.map((t) => (
                        <div
                          key={t.id}
                          className={`bg-white p-3 rounded-xl border shadow-2xs space-y-2 ${
                            t.is_unassigned
                              ? 'border-amber-300 ring-2 ring-amber-100 bg-amber-50/30'
                              : 'border-gray-200'
                          }`}
                        >
                          {/* Title */}
                          <div className="text-xs font-bold text-gray-900 leading-snug">
                            {t.title}
                          </div>

                          {t.description && (
                            <p className="text-[11px] text-gray-500 line-clamp-2">
                              {t.description}
                            </p>
                          )}

                          {/* Owner prominently shown (PRD §4.9) */}
                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                            {t.is_unassigned ? (
                              <span className="text-amber-800 font-bold flex items-center gap-1 bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                Unassigned — needs owner
                              </span>
                            ) : (
                              <span className="text-gray-700 font-semibold flex items-center gap-1">
                                <User className="w-3 h-3 text-indigo-500" />
                                {t.owner_name}
                              </span>
                            )}
                          </div>

                          {/* Deadline & Status Action */}
                          <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(t.deadline).toLocaleDateString()}
                            </span>

                            <select
                              value={t.status}
                              onChange={(e) => handleUpdateTaskStatus(t.id, e.target.value)}
                              className="text-[10px] p-1 border border-gray-200 rounded bg-gray-50 font-medium text-gray-700 cursor-pointer"
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="blocked">Blocked</option>
                              <option value="done">Done</option>
                            </select>
                          </div>

                          {/* Reassign if unassigned */}
                          {t.is_unassigned && (
                            <div className="pt-1">
                              <select
                                onChange={(e) => handleAssignTask(t.id, e.target.value)}
                                defaultValue=""
                                className="w-full text-[10px] p-1 border border-amber-300 rounded bg-white text-amber-900 font-bold"
                              >
                                <option value="" disabled>Assign to member...</option>
                                {team.members?.map((mem) => (
                                  <option key={mem.user_id} value={mem.user_id}>
                                    {mem.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Missing Skill Candidate Finder (PRD §4.8 & §5.2) */}
      {showCandidateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Qualified Candidates for <span className="text-indigo-600">{selectedMissingSkill}</span>
                </h3>
                <span className="text-xs text-gray-500">
                  Rule-based matching: only verified skill owners are displayed.
                </span>
              </div>
              <button onClick={() => setShowCandidateModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {candidatesLoading ? (
              <div className="py-8 text-center text-xs text-gray-400">Scanning eligible candidate pool...</div>
            ) : candidates.length === 0 ? (
              /* PRD §4.8 & E5: "No match currently available" */
              <div className="py-8 px-4 text-center">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-gray-900 mb-1">No match currently available</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                  No registered student currently possesses verified competence in "{selectedMissingSkill}".
                  Your team requirement will remain open.
                </p>
                <button
                  onClick={() => setShowCandidateModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg"
                >
                  Keep Requirement Open
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {candidates.map((cand) => (
                  <div key={cand.user_id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <span className="font-bold text-xs text-gray-900">{cand.name}</span>
                          <span className="text-[11px] text-gray-500 block">{cand.email}</span>
                        </div>
                        <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {cand.score} pts
                        </span>
                      </div>

                      {/* Explanation */}
                      <p className="text-xs text-gray-600 my-2 bg-white p-2 rounded border border-gray-100 leading-relaxed">
                        {cand.explanation}
                      </p>

                      <div className="flex flex-wrap gap-1">
                        {cand.matched_skills.map((s, i) => (
                          <span key={i} className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {isOwner && (
                      <div className="mt-3 pt-2 border-t border-gray-100 flex justify-end">
                        <button
                          onClick={() => handleInviteCandidate(cand.user_id)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          Invite to Team
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Add Task Modal (PRD §4.9) */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-base font-bold text-gray-900">Add Project Task</h3>
              <button onClick={() => setShowTaskModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {taskError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {taskError}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design BLE beacon signal filter"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Specific deliverables and acceptance criteria..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Owner required and must be current team member (E7) */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Assigned Owner * (Must be team member)</label>
                <select
                  required
                  value={taskForm.owner_id}
                  onChange={(e) => setTaskForm({ ...taskForm, owner_id: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="" disabled>Select active team member...</option>
                  {team.members?.map((mem) => (
                    <option key={mem.user_id} value={mem.user_id}>
                      {mem.name} ({mem.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Task Deadline *</label>
                <input
                  type="datetime-local"
                  required
                  value={taskForm.deadline}
                  onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Initial Status</label>
                <select
                  value={taskForm.status}
                  onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={taskSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {taskSubmitting ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
