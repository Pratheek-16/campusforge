const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers,
  };

  // If not FormData, default to application/json
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    let errorDetail = 'An error occurred';
    try {
      const errorData = await response.json();
      errorDetail = errorData.detail || errorData.message || JSON.stringify(errorData);
    } catch {
      errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    }
    const err = new Error(errorDetail);
    err.status = response.status;
    throw err;
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Backend returned non-JSON response. Please verify that VITE_API_URL is configured to point to your Render backend.');
  }

  return await response.json();
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),

  // Profile
  getProfile: () => request('/profile'),
  updateProfile: (data) => request('/profile', { method: 'PUT', body: JSON.stringify(data) }),
  analyzeResume: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/profile/resume/analyze', { method: 'POST', body: formData });
  },
  confirmResumeProfile: (data, filename) => {
    const query = filename ? `?filename=${encodeURIComponent(filename)}` : '';
    return request(`/profile/resume/confirm${query}`, { method: 'POST', body: JSON.stringify(data) });
  },

  // Opportunities
  getOpportunities: (params = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.category) query.append('category', params.category);
    if (params.college) query.append('college', params.college);
    if (params.skill) query.append('skill', params.skill);
    if (params.status_filter) query.append('status_filter', params.status_filter);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request(`/opportunities${queryString}`);
  },
  getOpportunity: (id) => request(`/opportunities/${id}`),
  createOpportunity: (data) => request('/opportunities', { method: 'POST', body: JSON.stringify(data) }),
  updateOpportunity: (id, data) => request(`/opportunities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOpportunity: (id) => request(`/opportunities/${id}`, { method: 'DELETE' }),
  saveOpportunity: (id) => request(`/opportunities/${id}/save`, { method: 'POST' }),
  unsaveOpportunity: (id) => request(`/opportunities/${id}/save`, { method: 'DELETE' }),
  getSavedOpportunities: () => request('/saved'),
  getOpportunityFit: (id) => request(`/opportunities/${id}/fit`),
  getOpportunitySummary: (id) => request(`/opportunities/${id}/summary`),

  // Event Registration (Hybrid: native in-app + external link tracking)
  registerForEvent: (oppId, data) => request(`/events/${oppId}/register`, { method: 'POST', body: JSON.stringify(data) }),
  getMyTicket: (oppId) => request(`/events/${oppId}/my-ticket`),
  getMyTickets: () => request('/events/my-tickets'),
  getEventAttendees: (oppId) => request(`/events/${oppId}/attendees`),
  cancelRegistration: (oppId) => request(`/events/${oppId}/cancel`, { method: 'DELETE' }),

  // Applications
  applyToOpportunity: (id, data) => request(`/opportunities/${id}/apply`, { method: 'POST', body: JSON.stringify(data) }),
  getMyApplications: () => request('/applications/mine'),
  updateApplicationStatus: (id, status) => request(`/applications/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Organizer
  getOrganizerDashboard: () => request('/organizer/dashboard'),
  getOrganizerApplications: (id, statusFilter) => {
    const q = statusFilter ? `?status_filter=${encodeURIComponent(statusFilter)}` : '';
    return request(`/organizer/opportunities/${id}/applications${q}`);
  },

  // Teams
  getTeams: (isOpen) => {
    const q = isOpen !== undefined ? `?is_open=${isOpen}` : '';
    return request(`/teams${q}`);
  },
  getTeam: (id) => request(`/teams/${id}`),
  createTeam: (data) => request('/teams', { method: 'POST', body: JSON.stringify(data) }),
  updateTeam: (id, data) => request(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getTeamSkills: (id) => request(`/teams/${id}/skills`),
  getTeamCandidates: (id, skill) => request(`/teams/${id}/candidates?skill=${encodeURIComponent(skill)}`),
  sendJoinRequest: (id) => request(`/teams/${id}/join-request`, { method: 'POST' }),
  sendInvite: (id, userId) => request(`/teams/${id}/invite?user_id=${userId}`, { method: 'POST' }),
  updateTeamRequest: (requestId, status) => request(`/teams/requests/${requestId}?status_choice=${status}`, { method: 'PATCH' }),
  removeTeamMember: (teamId, userId) => request(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' }),

  // Tasks
  getTeamTasks: (teamId) => request(`/teams/${teamId}/tasks`),
  createTask: (teamId, data) => request(`/teams/${teamId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (taskId, data) => request(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTask: (taskId) => request(`/tasks/${taskId}`, { method: 'DELETE' }),

  // Personal Dashboard
  getDashboard: () => request('/dashboard'),

  // Staff (Ambassador / Coordinator)
  getStaffOpportunities: () => request('/staff/opportunities'),

  // P1
  getRecommendations: () => request('/p1/recommendations'),
  generateLinkedInDraft: (oppId, reflection) => request(`/p1/linkedin-draft/${oppId}`, { method: 'POST', body: JSON.stringify({ reflection }) }),
  getActivityStream: () => request('/p1/activity-stream'),
};
