import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import {
  Search,
  Filter,
  Bookmark,
  Calendar,
  Building,
  GraduationCap,
  Sparkles,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Opportunities' },
  { id: 'internship', label: 'Internships' },
  { id: 'hackathon', label: 'Hackathons' },
  { id: 'workshop', label: 'Workshops' },
  { id: 'scholarship', label: 'Scholarships' },
  { id: 'project', label: 'Projects' },
  { id: 'technical_event', label: 'Tech Events' },
  { id: 'non_technical_event', label: 'Non-Tech' },
];

export const OpportunitiesDirectory = () => {
  const { user, role } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active'); // active, expired, all
  const [skillFilter, setSkillFilter] = useState('');

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const data = await api.getOpportunities({
        q: searchQuery,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        status_filter: statusFilter,
        skill: skillFilter || undefined,
      });
      setOpportunities(data);
    } catch (err) {
      console.error('Failed to load opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, [selectedCategory, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOpportunities();
  };

  const handleToggleSave = async (e, opp) => {
    e.preventDefault();
    e.stopPropagation();
    if (role !== 'student') {
      alert('Only students can save opportunities to their personal dashboard');
      return;
    }
    try {
      if (opp.is_saved) {
        await api.unsaveOpportunity(opp.id);
      } else {
        await api.saveOpportunity(opp.id);
      }
      setOpportunities(
        opportunities.map((item) =>
          item.id === opp.id ? { ...item, is_saved: !opp.is_saved } : item
        )
      );
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setStatusFilter('active');
    setSkillFilter('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero / Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Explore Student Opportunities
        </h1>
        <p className="text-gray-600 mt-1 max-w-2xl text-sm sm:text-base">
          Discover verified internships, hackathons, scholarships, and academic projects with transparent, explainable skill matching.
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 mb-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by role, keyword, or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="active">Active Opportunities</option>
              <option value="expired">Expired Only (E1 Edge Case)</option>
              <option value="all">All (Active & Expired)</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Search
            </button>
          </div>
        </form>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-3 border-t border-gray-100 mt-3 pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Listings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-64 bg-gray-200 animate-pulse rounded-xl"></div>
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <EmptyState
          title="No opportunities match your filter"
          description="Try switching categories, clearing search keywords, or toggling between active and expired opportunities."
          actionLabel="Clear Filters"
          onAction={clearFilters}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {opportunities.map((opp) => {
            const isExpired = opp.computed_status === 'expired' || opp.computed_status === 'closed';
            const isNullDeadline = opp.computed_status === 'invalid_deadline';

            return (
              <div
                key={opp.id}
                className={`flex flex-col bg-white rounded-xl border transition-all duration-200 hover:shadow-md ${
                  isExpired ? 'border-gray-200 bg-gray-50/60 opacity-90' : 'border-gray-200 hover:border-indigo-200'
                }`}
              >
                {/* Card Header */}
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <StatusBadge status={opp.computed_status} />
                    {role === 'student' && (
                      <button
                        onClick={(e) => handleToggleSave(e, opp)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          opp.is_saved
                            ? 'bg-amber-50 border-amber-300 text-amber-600'
                            : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        }`}
                        title={opp.is_saved ? 'Remove from saved' : 'Save opportunity'}
                      >
                        <Bookmark className="w-4 h-4 fill-current" />
                      </button>
                    )}
                  </div>

                  <Link to={`/opportunities/${opp.id}`} className="group block">
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {opp.title}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1.5">
                    <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{opp.organizer_name}</span>
                    <span className="text-gray-300">•</span>
                    <span className="capitalize">{opp.category.replace('_', ' ')}</span>
                  </div>

                  <p className="text-xs text-gray-600 mt-3 line-clamp-3 leading-relaxed">
                    {opp.description}
                  </p>

                  {/* Skills tags */}
                  {opp.required_skills && opp.required_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {opp.required_skills.slice(0, 3).map((skill, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700"
                        >
                          {skill}
                        </span>
                      ))}
                      {opp.required_skills.length > 3 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] text-gray-400 font-medium">
                          +{opp.required_skills.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Strict Eligibility Badge if set */}
                  {opp.strict_eligibility && (
                    <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      <AlertCircle className="w-3 h-3" />
                      Strict Eligibility (Year & Dept enforced)
                    </div>
                  )}
                </div>

                {/* Card Footer: Deadline & Action */}
                <div className="px-5 py-3.5 bg-gray-50/70 border-t border-gray-100 rounded-b-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {isNullDeadline ? (
                      <span className="text-amber-700 font-medium">Deadline not specified</span>
                    ) : opp.deadline_at ? (
                      <span>Deadline: {new Date(opp.deadline_at).toLocaleDateString()}</span>
                    ) : (
                      <span>Rolling</span>
                    )}
                  </div>

                  <Link
                    to={`/opportunities/${opp.id}`}
                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Details
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
