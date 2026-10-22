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
      const r = resumeReviewData;

      // Merge skills (tech + nontech), projects, experience, certifications
      const updatedSkills = Array.from(new Set([...formData.skills, ...(r.suggested_skills || [])]));
      const updatedNontechSkills = Array.from(new Set([...formData.nontech_skills || [], ...(r.suggested_nontech_skills || [])]));
      const updatedProjects = [...formData.projects, ...(r.suggested_projects || [])];
      const updatedExperience = [...formData.experience, ...(r.suggested_experience || [])];
      const updatedCerts = Array.from(new Set([...formData.certifications || [], ...(r.suggested_certifications || [])]));

      const mergedData = {
        ...formData,
        // Auto-fill personal info only if currently empty
        name: formData.name || r.suggested_name || formData.name,
        college: formData.college || r.suggested_college || formData.college,
        department: formData.department || r.suggested_department || formData.department,
        year: formData.year || r.suggested_year || formData.year,
        career_goals: formData.career_goals || r.suggested_career_goals || formData.career_goals,
        // Skills
        skills: updatedSkills,
        nontech_skills: updatedNontechSkills,
        // Structured data
        projects: updatedProjects,
        experience: updatedExperience,
        certifications: updatedCerts,
        // Education (CGPA, graduation year, degree)
        academic: { ...formData.academic, ...r.suggested_education },
      };

      await api.confirmResumeProfile(mergedData, r.filename);
      setFormData(mergedData);
      setResumeReviewData(null);
      setFeedback({ type: 'success', message: `Profile updated from resume! ${updatedSkills.length} skills, ${updatedProjects.length} projects extracted.` });
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

        {/* Review-Before-Save Card */}
        {resumeReviewData && (
          <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50/40 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-indigo-600 text-white">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle className="w-4 h-4" />
                Resume Parsed — Review &amp; Confirm
              </div>
              <button onClick={() => setResumeReviewData(null)} className="text-indigo-200 hover:text-white text-xs">
                Dismiss
              </button>
            </div>

            <div className="p-5 space-y-5">

              {/* Personal Info Row */}
              <div>
                <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest mb-2">Personal Info Extracted</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    { label: 'Name', val: resumeReviewData.suggested_name },
                    { label: 'Email', val: resumeReviewData.suggested_email },
                    { label: 'Phone', val: resumeReviewData.suggested_phone },
                    { label: 'College', val: resumeReviewData.suggested_college },
                    { label: 'Department', val: resumeReviewData.suggested_department },
                    { label: 'Year', val: resumeReviewData.suggested_year ? `${resumeReviewData.suggested_year}${['','st','nd','rd','th'][resumeReviewData.suggested_year]} Year` : null },
                    { label: 'Graduation', val: resumeReviewData.suggested_education?.graduation_year },
                    { label: 'CGPA', val: resumeReviewData.suggested_education?.gpa },
                  ].filter(f => f.val).map((f, i) => (
                    <div key={i} className="bg-white rounded-lg border border-indigo-100 px-3 py-2">
                      <div className="text-[10px] text-gray-400 font-semibold uppercase">{f.label}</div>
                      <div className="font-semibold text-gray-800 truncate mt-0.5">{f.val}</div>
                    </div>
                  ))}
                </div>
                {!resumeReviewData.suggested_name && !resumeReviewData.suggested_college && (
                  <p className="text-[11px] text-amber-600 mt-1">⚠ Couldn't extract personal info — check the form below and fill manually.</p>
                )}
              </div>

              {/* Tech Skills */}
              {resumeReviewData.suggested_skills?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest mb-2">
                    Technical Skills ({resumeReviewData.suggested_skills.length} found)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {resumeReviewData.suggested_skills.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Non-tech Skills */}
              {resumeReviewData.suggested_nontech_skills?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest mb-2">
                    Soft Skills ({resumeReviewData.suggested_nontech_skills.length} found)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {resumeReviewData.suggested_nontech_skills.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {resumeReviewData.suggested_projects?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest mb-2">
                    Projects ({resumeReviewData.suggested_projects.length} found)
                  </p>
                  <div className="space-y-2">
                    {resumeReviewData.suggested_projects.map((p, i) => (
                      <div key={i} className="bg-white rounded-xl border border-indigo-100 p-3 text-xs">
                        <div className="font-bold text-gray-900">{p.title}</div>
                        {p.description && <div className="text-gray-500 mt-0.5 line-clamp-2">{p.description}</div>}
                        {p.technologies?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {p.technologies.map((t, j) => (
                              <span key={j} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px]">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {resumeReviewData.suggested_experience?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest mb-2">
                    Experience ({resumeReviewData.suggested_experience.length} found)
                  </p>
                  <div className="space-y-2">
                    {resumeReviewData.suggested_experience.map((e, i) => (
                      <div key={i} className="bg-white rounded-xl border border-indigo-100 p-3 text-xs">
                        <div className="font-bold text-gray-900">{e.title}</div>
                        {e.company && <div className="text-gray-600">{e.company} {e.duration ? `· ${e.duration}` : ''}</div>}
                        {e.description && <div className="text-gray-500 mt-0.5 line-clamp-2">{e.description}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {resumeReviewData.suggested_certifications?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest mb-2">Certifications</p>
                  <div className="flex flex-wrap gap-1.5">
                    {resumeReviewData.suggested_certifications.map((c, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              {(resumeReviewData.suggested_links?.linkedin || resumeReviewData.suggested_links?.github) && (
                <div>
                  <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest mb-2">Links Found</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {resumeReviewData.suggested_links.linkedin && (
                      <a href={resumeReviewData.suggested_links.linkedin} target="_blank" rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
                        LinkedIn ↗
                      </a>
                    )}
                    {resumeReviewData.suggested_links.github && (
                      <a href={resumeReviewData.suggested_links.github} target="_blank" rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200">
                        GitHub ↗
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Confirm Button */}
              <div className="flex items-center justify-between pt-2 border-t border-indigo-100">
                <p className="text-[11px] text-gray-500">All data will be merged with your existing profile. You can edit anything after.</p>
                <button
                  onClick={handleConfirmExtractedData}
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Confirm & Fill Profile'}
                </button>
              </div>

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
