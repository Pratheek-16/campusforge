import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus,
  Layers,
  AlertCircle,
  GraduationCap,
  Building,
  ClipboardList,
  Briefcase,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

const ROLES = [
  {
    id: 'student',
    title: 'Student',
    desc: 'Discover events, evaluate skill fit, form teams & apply',
    icon: GraduationCap,
    color: 'indigo'
  },
  {
    id: 'ambassador',
    title: 'Campus Ambassador',
    desc: 'Publish and broadcast college events across campuses',
    icon: Building,
    color: 'emerald'
  },
  {
    id: 'coordinator',
    title: 'Academic Coordinator',
    desc: 'Manage section opportunities and student cohorts',
    icon: ClipboardList,
    color: 'blue'
  },
  {
    id: 'organizer',
    title: 'Organizer / Recruiter',
    desc: 'Post internships and review applicant pipelines',
    icon: Briefcase,
    color: 'purple'
  }
];

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    college: 'GnaN Institute of Technology',
    department: 'CSE',
    year: 3,
    section: 'CSE-A',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.name.trim()) throw new Error('Please enter your full name');
      if (!formData.email.trim()) throw new Error('Please enter a valid email address');
      if (formData.password.length < 6) throw new Error('Password must be at least 6 characters');

      if (formData.role === 'ambassador' && !formData.college.trim()) {
        throw new Error('Please provide the College / University you represent');
      }
      if (formData.role === 'coordinator' && !formData.section.trim()) {
        throw new Error('Please specify your assigned Academic Section (e.g. CSE-A)');
      }

      const user = await register(formData);

      // Intelligent post-registration navigation based on registered role
      if (user.role === 'ambassador' || user.role === 'coordinator') {
        navigate('/staff');
      } else if (user.role === 'organizer') {
        navigate('/organizer');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedRoleObj = ROLES.find((r) => r.id === formData.role) || ROLES[0];

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-gray-200 shadow-xl">
        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-indigo-100">
            <Layers className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Create an Account
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Join CampusForge as a Student, Campus Ambassador, Coordinator, or Organizer
          </p>
        </div>

        {/* Role Selector Grid */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 text-center">
            Select Your Role
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const isSelected = formData.role === r.id;
              return (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => setFormData({ ...formData, role: r.id })}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div
                      className={`p-2 rounded-xl ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 block text-xs">{r.title}</span>
                    <span className="text-[10px] text-gray-500 line-clamp-1">{r.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Role Explanatory Banner */}
        <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-600 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-gray-900 capitalize">{selectedRoleObj.title}: </span>
            {formData.role === 'ambassador' && (
              <span>Publish hackathons, workshops, and college fests from your university so all students can discover them.</span>
            )}
            {formData.role === 'coordinator' && (
              <span>Manage section opportunities, monitor cohort applications, and oversee student projects.</span>
            )}
            {formData.role === 'organizer' && (
              <span>Create verified internships and manage student talent pipelines.</span>
            )}
            {formData.role === 'student' && (
              <span>Discover curated opportunities, evaluate instant skill-fit matches, and form project teams.</span>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={
                formData.role === 'coordinator'
                  ? 'e.g. Dr. Ramesh Gupta'
                  : formData.role === 'ambassador'
                  ? 'e.g. Sneha Reddy'
                  : 'e.g. Asha Sharma'
              }
              className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={
                formData.role === 'ambassador'
                  ? 'ambassador@college.edu'
                  : formData.role === 'coordinator'
                  ? 'coordinator@university.edu'
                  : 'student@college.edu'
              }
              className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Password * (min 6 characters)</label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Contextual College Input */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              {formData.role === 'ambassador'
                ? 'Host College / Institution You Represent *'
                : formData.role === 'organizer'
                ? 'Organization / Company Name'
                : 'College / University *'}
            </label>
            <input
              type="text"
              required={formData.role !== 'organizer'}
              value={formData.college}
              onChange={(e) => setFormData({ ...formData, college: e.target.value })}
              placeholder="e.g. GnaN Institute of Technology, IIT Bombay, etc."
              className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Contextual Department & Year / Section Inputs */}
          {formData.role !== 'organizer' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g. CSE, ECE, IT"
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {formData.role === 'student' && (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Academic Year</label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>
              )}

              {(formData.role === 'coordinator' || formData.role === 'student') && (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    {formData.role === 'coordinator' ? 'Assigned Section *' : 'Section (Optional)'}
                  </label>
                  <input
                    type="text"
                    required={formData.role === 'coordinator'}
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    placeholder="e.g. CSE-A"
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? 'Registering Account...' : `Sign Up as ${selectedRoleObj.title}`}
          </button>
        </form>

        <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
          Already registered?{' '}
          <Link to="/login" className="font-bold text-indigo-600 hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
};
