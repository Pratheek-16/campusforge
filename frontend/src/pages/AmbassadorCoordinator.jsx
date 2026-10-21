import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import {
  Building,
  Calendar,
  Plus,
  MapPin,
  ExternalLink,
  Trash2,
  Globe,
  Radio,
  CheckCircle2,
  AlertCircle,
  X,
  Tag,
  Sparkles,
  Users,
  IndianRupee
} from 'lucide-react';

export const AmbassadorCoordinator = () => {
  const { user, role } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  // Attendee Modal State
  const [attendeeModal, setAttendeeModal] = useState({ open: false, oppTitle: '', attendees: [], loading: false });
  
  const [form, setForm] = useState({
    title: '',
    category: 'hackathon',
    college: user?.college || 'GnaN Institute of Technology',
    section: user?.section || '',
    description: '',
    venue: '',
    online_link: '',
    start_at: '',
    end_at: '',
    deadline_at: '',
    required_skills: [],
    organizer_name: user?.name ? `${user.name} (${role === 'ambassador' ? 'Ambassador' : 'Coordinator'})` : 'Campus Ambassador',
    organizer_contact: user?.email || '',
    allowed_years: [1, 2, 3, 4],
    allowed_depts: ['CSE', 'IT', 'ECE', 'MECH', 'CIVIL'],
    strict_eligibility: false,
    is_paid: false,
    fee_amount: 0,
    host_upi_id: '',
    registration_type: 'both',
    registration_link: '',
  });

  const isAmbassador = role === 'ambassador';

  const resetForm = () => {
    setForm({
      title: '',
      category: 'hackathon',
      college: user?.college || 'GnaN Institute of Technology',
      section: user?.section || '',
      description: '',
      venue: '',
      online_link: '',
      registration_link: '',
      start_at: '',
      end_at: '',
      deadline_at: '',
      required_skills: [],
      organizer_name: user?.name ? `${user.name} (${role === 'ambassador' ? 'Ambassador' : 'Coordinator'})` : 'Campus Ambassador',
      organizer_contact: user?.email || '',
      allowed_years: [1, 2, 3, 4],
      allowed_depts: ['CSE', 'IT', 'ECE', 'MECH', 'CIVIL'],
      strict_eligibility: false,
      is_paid: false,
      fee_amount: 0,
      host_upi_id: '',
      registration_type: 'both',
    });
    setSkillInput('');
    setErrorMessage('');
  };

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
    resetForm();
  }, [role, user]);

  const handleAddSkill = (e) => {
    e.preventDefault();
    const trimmed = skillInput.trim();
    if (trimmed && !form.required_skills.includes(trimmed)) {
      setForm({
        ...form,
        required_skills: [...form.required_skills, trimmed]
      });
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setForm({
      ...form,
      required_skills: form.required_skills.filter((s) => s !== skillToRemove)
    });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (!form.title.trim()) throw new Error('Please enter an event title');
      if (!form.description.trim()) throw new Error('Please enter a description for the event');
      if (!form.start_at) throw new Error('Please specify the event start date');

      // Prepare payload with formatted ISO dates
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        college: form.college.trim() || undefined,
        section: !isAmbassador && form.section ? form.section.trim() : undefined,
        venue: form.venue.trim() || undefined,
        online_link: form.online_link.trim() || undefined,
        registration_link: form.registration_link.trim() || undefined,
        start_at: new Date(form.start_at).toISOString(),
        end_at: form.end_at ? new Date(form.end_at).toISOString() : undefined,
        deadline_at: form.deadline_at ? new Date(form.deadline_at).toISOString() : undefined,
        required_skills: form.required_skills,
        organizer_name: form.organizer_name.trim(),
        organizer_contact: form.organizer_contact.trim() || undefined,
        allowed_years: form.allowed_years,
        allowed_depts: form.allowed_depts,
        strict_eligibility: form.strict_eligibility,
        is_paid: form.is_paid,
        fee_amount: form.is_paid ? (parseFloat(form.fee_amount) || 0) : 0,
        host_upi_id: form.is_paid && form.host_upi_id.trim() ? form.host_upi_id.trim() : undefined,
        registration_type: form.registration_type || 'both',
        resources: []
      };

      await api.createOpportunity(payload);
      setShowModal(false);
      resetForm();
      setSuccessMessage('Event published successfully! It is now live in the central directory for students across all colleges.');
      fetchStaffOpportunities();
      setTimeout(() => setSuccessMessage(''), 6000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create event. Please check required fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (oppId, oppTitle) => {
    if (!window.confirm(`Are you sure you want to withdraw and remove "${oppTitle}"?`)) {
      return;
    }
    try {
      await api.deleteOpportunity(oppId);
      setOpportunities(opportunities.filter((o) => o.id !== oppId));
      setSuccessMessage('Event successfully removed from listings.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const openAttendees = async (opp) => {
    setAttendeeModal({ open: true, oppTitle: opp.title, attendees: [], loading: true });
    try {
      const data = await api.getEventAttendees(opp.id);
      setAttendeeModal({ open: true, oppTitle: opp.title, attendees: data, loading: false });
    } catch (err) {
      setAttendeeModal({ open: true, oppTitle: opp.title, attendees: [], loading: false });
    }
  };

  if (loading) {
    return <div className="max-w-6xl mx-auto py-12 text-center text-gray-500">Loading staff console...</div>;
  }

  const scopeDescription = isAmbassador
    ? `Managing and publishing opportunities for ${user?.college || 'Assigned College'}`
    : `Managing events and opportunities scoped for Section ${user?.section || 'Assigned Section'}`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Success Notification */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-sm shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Vision Callout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <Building className="w-4 h-4" />
            {isAmbassador ? 'Campus Ambassador Portal' : 'Academic Coordinator Portal'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Campus Event & Opportunity Hub
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {scopeDescription}
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-semibold text-sm rounded-xl shadow-xs hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          {isAmbassador ? 'Add College Event' : 'Add Section Opportunity'}
        </button>
      </div>

      {/* Cross-Campus Broadcast Banner */}
      <div className="mb-8 p-5 bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-purple-50/60 rounded-2xl border border-indigo-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5 md:mt-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <span>Cross-College Opportunity Network</span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-700 rounded-full">
                Live Broadcast
              </span>
            </h3>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Events, hackathons, and workshops added here by Campus Ambassadors are broadcasted platform-wide. Students from all colleges receive updates, evaluate their skill fit, and register!
            </p>
          </div>
        </div>
        <Link
          to="/opportunities"
          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 shadow-2xs transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-500" />
          View Central Directory
        </Link>
      </div>

      {/* Events Table */}
      {opportunities.length === 0 ? (
        <EmptyState
          icon={Building}
          title="No events currently published for your college"
          description="Click 'Add College Event' above to publish hackathons, workshops, or competitions for your campus."
          actionText="Add First Event"
          onAction={() => setShowModal(true)}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Published Events ({opportunities.length})
            </div>
            <div className="text-xs text-gray-500">
              Visible to all students in directory
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-400 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="p-4">Event Details</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Host Campus</th>
                  <th className="p-4">Event Timeline</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {opportunities.map((opp) => (
                  <tr key={opp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 max-w-xs">
                      <Link
                        to={`/opportunities/${opp.id}`}
                        className="font-bold text-gray-900 hover:text-indigo-600 transition-colors block text-sm"
                      >
                        {opp.title}
                      </Link>
                      <span className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                        {opp.description}
                      </span>
                      {opp.venue && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 mt-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {opp.venue}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700 capitalize">
                        {opp.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">
                      {opp.college ? (
                        <span className="inline-flex items-center gap-1 font-medium text-gray-800">
                          <Building className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          {opp.college}
                        </span>
                      ) : (
                        <span className="text-gray-400">Inter-College</span>
                      )}
                      {opp.section && (
                        <div className="text-[10px] text-gray-400 mt-0.5">Section: {opp.section}</div>
                      )}
                    </td>
                    <td className="p-4 text-gray-500">
                      <div className="font-medium text-gray-700">
                        Start: {new Date(opp.start_at).toLocaleDateString()}
                      </div>
                      {opp.deadline_at && (
                        <div className="text-[11px] text-amber-700 mt-0.5">
                          Deadline: {new Date(opp.deadline_at).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={opp.computed_status} />
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openAttendees(opp)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Attendees"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/opportunities/${opp.id}`}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View in Directory"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(opp.id, opp.title)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Withdraw Event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add College Event Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative animate-fadeIn max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {isAmbassador ? 'Publish College Event' : 'Publish Section Opportunity'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Will be broadcasted to students across all colleges
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Event Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Inter-College Hackathon 2026"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Category & College */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Event Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="hackathon">Hackathon</option>
                    <option value="workshop">Workshop</option>
                    <option value="technical_event">Technical Event</option>
                    <option value="non_technical_event">Non-Technical / Cultural / Leadership</option>
                    <option value="project">Academic / Research Project</option>
                    <option value="scholarship">Scholarship</option>
                    <option value="other">Other Campus Initiative</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Host College / Institution <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GnaN Institute of Technology"
                    value={form.college}
                    onChange={(e) => setForm({ ...form, college: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Event Description & Agenda <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide details about the event, rules, eligibility, and what participants will gain..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Start Date & Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.start_at}
                    onChange={(e) => setForm({ ...form, start_at: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={form.end_at}
                    onChange={(e) => setForm({ ...form, end_at: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Registration Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={form.deadline_at}
                    onChange={(e) => setForm({ ...form, deadline_at: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Venue & Links */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Venue / Campus Hall
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Main Auditorium"
                    value={form.venue}
                    onChange={(e) => setForm({ ...form, venue: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Online Stream Link (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={form.online_link}
                    onChange={(e) => setForm({ ...form, online_link: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Registration / External URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://forms.gle/... or website"
                    value={form.registration_link}
                    onChange={(e) => setForm({ ...form, registration_link: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Required / Recommended Skills */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Required / Relevant Skills (used for student fit matching)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add skill (e.g. Python, AI, React, Public Speaking) and click Add"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill(e);
                      }
                    }}
                    className="flex-1 px-3.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
                  >
                    Add
                  </button>
                </div>
                {form.required_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.required_skills.map((skill, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                      >
                        <Tag className="w-3 h-3" />
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="hover:text-rose-500 ml-0.5"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Organizer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Organizer / Host Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.organizer_name}
                    onChange={(e) => setForm({ ...form, organizer_name: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Organizer Contact Email
                  </label>
                  <input
                    type="email"
                    value={form.organizer_contact}
                    onChange={(e) => setForm({ ...form, organizer_contact: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Payment & Registration Settings */}
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Registration Settings</h3>

                {/* Is Paid Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Paid Event</p>
                    <p className="text-xs text-gray-500 mt-0.5">Collect registration fee via UPI</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, is_paid: !form.is_paid })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.is_paid ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.is_paid ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {/* Paid-only fields */}
                {form.is_paid && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Registration Fee (₹) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 150"
                        value={form.fee_amount}
                        onChange={(e) => setForm({ ...form, fee_amount: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Host UPI ID <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. yourname@upi"
                        value={form.host_upi_id}
                        onChange={(e) => setForm({ ...form, host_upi_id: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {/* Registration Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Registration Mode</label>
                  <select
                    value={form.registration_type}
                    onChange={(e) => setForm({ ...form, registration_type: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="both">Both — In-App + Google Form</option>
                    <option value="native">In-App Registration Only</option>
                    <option value="external_link">Google Form Only</option>
                  </select>
                </div>

                {/* Google Form URL */}
                {(form.registration_type === 'both' || form.registration_type === 'external_link') && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Google Form URL {form.registration_type === 'external_link' && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="url"
                      placeholder="https://forms.gle/..."
                      value={form.registration_link}
                      onChange={(e) => setForm({ ...form, registration_link: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {submitting ? 'Publishing Event...' : 'Publish Event Live'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendee List Modal */}
      {attendeeModal.open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative animate-fadeIn max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Attendees</h2>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{attendeeModal.oppTitle}</p>
              </div>
              <button
                onClick={() => setAttendeeModal({ open: false, oppTitle: '', attendees: [], loading: false })}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {attendeeModal.loading ? (
              <div className="py-8 text-center text-gray-400 text-sm">Loading attendees...</div>
            ) : attendeeModal.attendees.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No registrations yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-3">{attendeeModal.attendees.length} registered</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-gray-400 uppercase text-[10px] tracking-wider">
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-left">Email</th>
                        <th className="p-3 text-left">College</th>
                        <th className="p-3 text-left">Payment</th>
                        <th className="p-3 text-left">Ticket</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {attendeeModal.attendees.map((a) => (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-800">{a.attendee_name}</td>
                          <td className="p-3 text-gray-600">{a.attendee_email}</td>
                          <td className="p-3 text-gray-500">{a.attendee_college || '—'}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              a.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                              a.payment_status === 'free' ? 'bg-blue-50 text-blue-700' :
                              a.payment_status === 'external_form' ? 'bg-purple-50 text-purple-700' :
                              'bg-amber-50 text-amber-700'
                            }`}>
                              {a.payment_status === 'paid' && <IndianRupee className="w-3 h-3" />}
                              {a.payment_status?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[10px] text-gray-500">{a.ticket_code?.slice(0, 12)}…</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
