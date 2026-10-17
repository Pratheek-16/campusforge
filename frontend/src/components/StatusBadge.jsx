import React from 'react';

export const StatusBadge = ({ status }) => {
  const norm = (status || '').toLowerCase();

  switch (norm) {
    case 'upcoming':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
          Upcoming
        </span>
      );
    case 'ongoing':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
          Ongoing
        </span>
      );
    case 'expired':
    case 'registration_closed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700 border border-gray-300">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
          Expired
        </span>
      );
    case 'invalid_deadline':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
          Deadline Not Specified
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
          Completed
        </span>
      );
    case 'closed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
          Closed
        </span>
      );
    // Application statuses
    case 'submitted':
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">Submitted</span>;
    case 'under_review':
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Under Review</span>;
    case 'shortlisted':
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">Shortlisted ✨</span>;
    case 'accepted':
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300">Accepted 🎉</span>;
    case 'rejected':
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">Not Selected</span>;
    default:
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
  }
};
