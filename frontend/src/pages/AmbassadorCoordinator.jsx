import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { Building, Calendar, Edit3, Plus, MapPin, ExternalLink } from 'lucide-react';

export const AmbassadorCoordinator = () => {
  const { user, role } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStaffOpportunities = async () => {
    setLoading(true);
    try {
      const data = await api.getStaffOpportunities();
      setOpportunities(data);
    } catch (err) {
      console.error('Failed to load staff opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffOpportunities();
  }, [role]);

  if (loading) {
    return <div className="max-w-6xl mx-auto py-12 text-center text-gray-500">Loading staff console...</div>;
  }

  const isAmbassador = role === 'ambassador';
  const scopeDescription = isAmbassador
    ? `Campus Ambassador Scope: Managing opportunities for ${user?.college || 'Assigned College'}`
    : `Section Coordinator Scope: Permitted events for Section ${user?.section || 'Assigned Section'}`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
          <Building className="w-4 h-4" />
          {isAmbassador ? 'Campus Ambassador Portal' : 'Academic Coordinator Portal'}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Scoped Event & Opportunity Management
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          {scopeDescription}
        </p>
      </div>

      {opportunities.length === 0 ? (
        <EmptyState
          icon={Building}
          title="No events currently scoped to your purview"
          description="Opportunities posted specifically for your college or section will appear here."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-400 uppercase text-[10px] tracking-wider font-semibold">
                <th className="p-4">Event Title</th>
                <th className="p-4">Category</th>
                <th className="p-4">Scope</th>
                <th className="p-4">Event Dates</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {opportunities.map((opp) => (
                <tr key={opp.id} className="hover:bg-gray-50/50">
                  <td className="p-4">
                    <span className="font-bold text-gray-900 block">{opp.title}</span>
                    <span className="text-[11px] text-gray-500 line-clamp-1">{opp.description}</span>
                  </td>
                  <td className="p-4 capitalize text-gray-700 font-medium">
                    {opp.category.replace('_', ' ')}
                  </td>
                  <td className="p-4 text-gray-600">
                    {opp.college && <div>College: {opp.college}</div>}
                    {opp.section && <div>Section: {opp.section}</div>}
                  </td>
                  <td className="p-4 text-gray-500">
                    <div>Start: {new Date(opp.start_at).toLocaleDateString()}</div>
                    {opp.deadline_at && <div>Deadline: {new Date(opp.deadline_at).toLocaleDateString()}</div>}
                  </td>
                  <td className="p-4">
                    <StatusBadge status={opp.computed_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
