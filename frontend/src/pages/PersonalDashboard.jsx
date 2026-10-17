import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import {
  Bookmark,
  Send,
  Users,
  CheckSquare,
  Clock,
  Calendar,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Inbox
} from 'lucide-react';

export const PersonalDashboard = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboard();
      setDashboard(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleRequestAction = async (requestId, choice) => {
    try {
      await api.updateTeamRequest(requestId, choice);
      alert(`Request has been ${choice}!`);
      fetchDashboard();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto py-12 text-center text-gray-500">Loading personal dashboard...</div>;
  }

  const {
    saved_opportunities = [],
    applications = [],
    teams = [],
    my_tasks = [],
    upcoming_deadlines = [],
    pending_actions = []
  } = dashboard || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Welcome back, {user?.name || 'Student'}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Your centralized progress console: track saved deadlines, review organizer decisions, and manage project tasks.
        </p>
      </div>

      {/* PENDING ACTIONS (Team Invites / Join Requests) */}
      {pending_actions.length > 0 && (
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 shadow-xs">
          <h2 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Inbox className="w-4 h-4 text-indigo-600" />
            Pending Team Invitations & Requests ({pending_actions.length})
          </h2>
          <div className="space-y-2">
            {pending_actions.map((act) => (
              <div
                key={act.request_id}
                className="bg-white p-3 rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-bold text-gray-900">
                    {act.type === 'invite' ? 'Invitation to join' : 'Join request for'} {act.team_name}
                  </span>
                  <span className="text-gray-500 block text-[11px]">
                    Candidate: {act.user_name} • Requested {new Date(act.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRequestAction(act.request_id, 'declined')}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg cursor-pointer"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleRequestAction(act.request_id, 'accepted')}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-2xs cursor-pointer"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UPCOMING DEADLINES TICKER (Next 14 Days) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
        <h2 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          Critical Deadlines (Next 14 Days)
        </h2>

        {upcoming_deadlines.length === 0 ? (
          <p className="text-xs text-gray-400 py-3 text-center">No upcoming deadlines in the next 14 days.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming_deadlines.map((item, idx) => (
              <div key={idx} className="p-3 bg-gray-50/80 rounded-xl border border-gray-200 flex flex-col justify-between text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {item.type}
                    </span>
                    <span className="text-[11px] font-bold text-amber-700">
                      {new Date(item.deadline).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900 line-clamp-1">{item.title}</h4>
                </div>
                <div className="mt-2 text-[11px] text-gray-500 flex justify-between items-center">
                  <span>{item.category}</span>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2-COLUMN GRID: Applications & Saved Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applications */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-600" />
              My Applications ({applications.length})
            </h2>
            <Link to="/opportunities" className="text-xs text-indigo-600 font-semibold hover:underline">
              Find More →
            </Link>
          </div>

          {applications.length === 0 ? (
            <EmptyState
              icon={Send}
              title="No applications submitted yet"
              description="Discover an internship that matches your skills and submit your application."
              actionLabel="Browse Opportunities"
              onAction={() => window.location.href = '/opportunities'}
            />
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div key={app.id} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col justify-between text-xs">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-bold text-gray-900">{app.opportunity_title}</span>
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2">
                    <span>Applied: {new Date(app.applied_at).toLocaleDateString()}</span>
                    <span className="text-emerald-700 font-semibold">
                      {app.matched_skill_count} matched skills
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saved Opportunities (E1 Demo) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-amber-500" />
              Saved Opportunities ({saved_opportunities.length})
            </h2>
            <span className="text-[11px] text-gray-400">Live Computed Status</span>
          </div>

          {saved_opportunities.length === 0 ? (
            <EmptyState
              icon={Bookmark}
              title="No saved opportunities"
              description="Bookmark opportunities to track deadlines and review details anytime."
            />
          ) : (
            <div className="space-y-3">
              {saved_opportunities.map((opp) => (
                <div key={opp.id} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col justify-between text-xs">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Link to={`/opportunities/${opp.id}`} className="font-bold text-gray-900 hover:text-indigo-600">
                      {opp.title}
                    </Link>
                    <StatusBadge status={opp.computed_status} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2">
                    <span>{opp.organizer_name}</span>
                    <Link to={`/opportunities/${opp.id}`} className="text-indigo-600 font-semibold hover:underline">
                      View Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2-COLUMN GRID: My Teams & My Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Teams */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              My Project Teams ({teams.length})
            </h2>
            <Link to="/teams" className="text-xs text-indigo-600 font-semibold hover:underline">
              All Teams →
            </Link>
          </div>

          {teams.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No active teams"
              description="Join an existing team or create your own project team."
              actionLabel="Explore Teams"
              onAction={() => window.location.href = '/teams'}
            />
          ) : (
            <div className="space-y-3">
              {teams.map((t) => (
                <div key={t.id} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col justify-between text-xs">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Link to={`/teams/${t.id}`} className="font-bold text-gray-900 hover:text-indigo-600">
                      {t.name}
                    </Link>
                    <span className="text-[11px] font-semibold text-gray-500">
                      {t.members?.length} / {t.max_size} members
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2">
                    <span className="text-amber-700 font-medium">
                      {t.missing_skills?.length || 0} missing skill(s)
                    </span>
                    <Link to={`/teams/${t.id}`} className="text-indigo-600 font-semibold hover:underline">
                      Open Board →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Tasks */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-600" />
              Tasks Assigned to Me ({my_tasks.length})
            </h2>
          </div>

          {my_tasks.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No pending tasks assigned"
              description="When tasks are assigned to you in project teams, they will appear here sorted by deadline."
            />
          ) : (
            <div className="space-y-3">
              {my_tasks.map((task) => (
                <div key={task.id} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-0.5">{task.title}</h4>
                    <span className="text-[11px] text-gray-500">
                      Due: {new Date(task.deadline).toLocaleDateString()}
                    </span>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
