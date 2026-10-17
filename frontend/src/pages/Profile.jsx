import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Upload,
  CheckCircle,
  AlertCircle,
  FileText,
  Plus,
  Trash2,
  Sparkles,
  Save,
  Clock,
  User,
  GraduationCap
} from 'lucide-react';

export const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzingResume, setAnalyzingResume] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    college: '',
    department: '',
    year: 1,
    section: '',
    phone: '',
    skills: [],
    nontech_skills: [],
    interests: [],
    career_goals: '',
    academic: {},
    projects: [],
    certifications: [],
    experience: [],
    availability: 'Available',
    resume_filename: null
  });

  // Skills input helpers
  const [skillInput, setSkillInput] = useState('');
  const [interestInput, setInterestInput] = useState('');

  // Resume analysis review state
  const [resumeReviewData, setResumeReviewData] = useState(null);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await api.getProfile();
      setFormData({
        name: data.user?.name || '',
        college: data.user?.college || '',
        department: data.user?.department || '',
        year: data.user?.year || 1,
        section: data.user?.section || '',
        phone: data.phone || '',
        skills: data.skills || [],
        nontech_skills: data.nontech_skills || [],
        interests: data.interests || [],
        career_goals: data.career_goals || '',
        academic: data.academic || {},
        projects: data.projects || [],
        certifications: data.certifications || [],
        experience: data.experience || [],
        availability: data.availability || 'Available',
        resume_filename: data.resume_filename || null
      });
    } catch (err) {
      setFeedback({ type: 'error', message: `Failed to load profile: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleManualSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: '', message: '' });

    // Client-side validation per PRD §4.4
    if (!formData.name.trim()) {
      setFeedback({ type: 'error', message: 'Full name is required' });
      setSaving(false);
      return;
    }
    if (!formData.college.trim()) {
      setFeedback({ type: 'error', message: 'College name is required' });
      setSaving(false);
      return;
    }
    if (!formData.department.trim()) {
      setFeedback({ type: 'error', message: 'Department is required' });
      setSaving(false);
      return;
    }
    if (!formData.skills || formData.skills.length === 0) {
      setFeedback({ type: 'error', message: 'Please add at least one technical skill' });
      setSaving(false);
      return;
    }

    try {
      await api.updateProfile(formData);
      setFeedback({ type: 'success', message: 'Profile updated successfully!' });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Resume file size exceeds the 5 MB limit' });
      return;
    }

    setAnalyzingResume(true);
    setFeedback({ type: '', message: '' });

    try {
      const extracted = await api.analyzeResume(file);
      // PRD §4.4: Show review state before saving anything!
      setResumeReviewData(extracted);
      setFeedback({
        type: 'success',
        message: 'Resume analyzed! Please review the extracted skills and projects below before confirming.'
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: `Resume analysis failed: ${err.message}. You can still fill out the manual form below.`
      });
    } finally {
      setAnalyzingResume(false);
    }
  };

  const handleConfirmExtractedData = async () => {
    if (!resumeReviewData) return;
    setSaving(true);
    try {
      const updatedSkills = Array.from(new Set([...formData.skills, ...resumeReviewData.suggested_skills]));
      const updatedProjects = [...formData.projects, ...resumeReviewData.suggested_projects];
      const updatedExperience = [...formData.experience, ...resumeReviewData.suggested_experience];

      const mergedData = {
        ...formData,
        skills: updatedSkills,
        projects: updatedProjects,
        experience: updatedExperience,
        academic: { ...formData.academic, ...resumeReviewData.suggested_education }
      };

      await api.confirmResumeProfile(mergedData, resumeReviewData.filename);
      setFormData(mergedData);
      setResumeReviewData(null);
      setFeedback({ type: 'success', message: 'Confirmed and saved resume skills to your active profile!' });
    } catch (err) {
      setFeedback({ type: 'error', message: `Confirmation failed: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const addSkill = (e) => {
    e.preventDefault();
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) });
  };

  const addInterest = (e) => {
    e.preventDefault();
    if (interestInput.trim() && !formData.interests.includes(interestInput.trim())) {
      setFormData({ ...formData, interests: [...formData.interests, interestInput.trim()] });
      setInterestInput('');
    }
  };

  const removeInterest = (interest) => {
    setFormData({ ...formData, interests: formData.interests.filter((i) => i !== interest) });
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto py-12 text-center text-gray-500">Loading student profile...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Student Skills & Profile</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Maintain your skills, projects, and availability to unlock precise opportunity fit scores and team candidate matching.
        </p>
      </div>

      {feedback.message && (
        <div
          className={`mb-6 p-4 rounded-xl text-xs sm:text-sm flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* SECTION 1: Resume Upload & Review Flow (PRD §4.4) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-gray-900">Instant Resume Analysis (AI & Deterministic)</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Upload your resume in PDF or DOCX format (≤5 MB). Our parser extracts your technical skills, education, and projects for you to review and confirm before saving.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 cursor-pointer transition-colors w-full sm:w-auto">
            <Upload className="w-4 h-4" />
            <span>{analyzingResume ? 'Analyzing Document...' : 'Choose Resume (PDF / DOCX)'}</span>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleResumeUpload}
              disabled={analyzingResume}
              className="hidden"
            />
          </label>
          {formData.resume_filename && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              Attached on file: {formData.resume_filename.split('_').slice(2).join('_') || formData.resume_filename}
            </span>
          )}
        </div>

        {/* Review-Before-Save Modal / Card */}
        {resumeReviewData && (
          <div className="mt-6 p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Review Extracted Resume Data (Not saved yet)
              </div>
              <button
                onClick={() => setResumeReviewData(null)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel Review
              </button>
            </div>

            <div>
              <span className="text-xs font-semibold text-gray-700 block mb-1">
                Extracted Skills ({resumeReviewData.suggested_skills.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {resumeReviewData.suggested_skills.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 rounded text-xs bg-white text-gray-800 border border-amber-200">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {resumeReviewData.suggested_projects.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-gray-700 block mb-1">Extracted Projects:</span>
                <div className="space-y-1">
                  {resumeReviewData.suggested_projects.map((p, i) => (
                    <div key={i} className="text-xs bg-white p-2 rounded border border-amber-200">
                      <span className="font-bold">{p.title}</span> — {p.description}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleConfirmExtractedData}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Confirm & Merge to Profile'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: Structured Profile Form */}
      <form onSubmit={handleManualSave} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
        <h2 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100">
          Academic & Contact Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Phone Number</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">College *</label>
            <input
              type="text"
              required
              value={formData.college}
              onChange={(e) => setFormData({ ...formData, college: e.target.value })}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Department *</label>
            <input
              type="text"
              required
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="e.g. CSE, ECE, IT, Mech"
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Academic Year (1 - 5) *</label>
            <select
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={1}>1st Year</option>
              <option value={2}>2nd Year</option>
              <option value={3}>3rd Year</option>
              <option value={4}>4th Year</option>
              <option value={5}>5th Year (Dual Degree)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Section</label>
            <input
              type="text"
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              placeholder="e.g. CSE-A"
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Availability (PRD §4.4) */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Current Availability</label>
          <select
            value={formData.availability}
            onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
            className="w-full sm:w-64 p-2.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="Available">Available (Full capacity)</option>
            <option value="10-15 hrs/week">10-15 hrs/week</option>
            <option value="Busy">Busy (Reduced team match score)</option>
          </select>
          <span className="text-[11px] text-gray-400 block mt-1">
            Setting status to Busy adjusts team candidate matching scores by 0.5x per PRD §5.2.
          </span>
        </div>

        {/* Technical Skills (Pills tag editor) */}
        <div className="pt-4 border-t border-gray-100">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Technical Skills * (At least 1 required)
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              placeholder="e.g. Python, React, Docker, Machine Learning..."
              className="flex-1 text-xs p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={addSkill}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg cursor-pointer"
            >
              Add Skill
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.skills.map((skill, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold border border-indigo-200"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="hover:text-rose-600 ml-1 text-xs font-bold"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Career Goals */}
        <div className="pt-4 border-t border-gray-100">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Career Objective</label>
          <textarea
            rows={2}
            value={formData.career_goals}
            onChange={(e) => setFormData({ ...formData, career_goals: e.target.value })}
            placeholder="e.g. Aspiring Full-Stack Developer interested in distributed systems..."
            className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};
