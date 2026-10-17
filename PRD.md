# PRD — Project Nexus: Student Opportunity Intelligence Platform

**Context:** BuildAP@theGnaN Mentorship Final Challenge · **Time budget:** 5 hours · **Deliverable:** deployed, demonstrable MVP

> Guiding principle from the brief: *"Build the most meaningful working solution, not the most features."* No fake buttons. Anything incomplete is labelled "Coming soon / not implemented" in the UI and README.

---

## 1. Product Summary

Opportunities (internships, hackathons, workshops, scholarships, projects) are scattered across WhatsApp, college notices and social media. Students miss deadlines and can't find teammates. Organizers can't reach the right students or track outcomes.

Nexus connects the full journey:

**Discover → Evaluate → Apply → Collaborate → Execute → Track**

### Users

| Role | Purpose | Scope |
|---|---|---|
| **Student** | Discover, evaluate fit, apply, form teams, execute tasks, track progress | Own data only |
| **Organizer** | Publish **internships**, define eligibility, review applications | Own listings only |
| **Campus Ambassador** | One per college. Publishes/manages events & opportunities for their college | Own college's listings |
| **Coordinator** | One per section. Limited: share/update permitted events for their section | Own section, limited fields |

---

## 2. Scope and Prioritization (5-hour reality)

### P0 — Must work end-to-end (the "coherent core")
1. Auth + role-based access (4 roles)
2. Opportunity directory: search, filter, active/expired status
3. Opportunity detail with **fit assessment** ("Why this fits you / what's missing") and **summary button**
4. Student profile: manual entry + resume upload with review-before-save
5. Apply flow with duplicate prevention, deadline enforcement, validation
6. Organizer workspace: create/edit opportunity, applications dashboard, status updates
7. Teams: create/join, required skills, **missing-skill detection**, rule-based candidate matching
8. Tasks: create, assign owner, deadline, status
9. Personal dashboard: saved, applications, teams, my tasks, upcoming deadlines
10. Seed/demo data covering every mandatory edge case

### P1 — If time allows
- Recommendations page with explanations (reuse fit-scoring engine, so cheap)
- Participation history + **LinkedIn post generator** (editable, copy button, never auto-posts)
- Daily activity stream (derived from existing data)
- Coordinator role UI polish

### P2 — Explicitly out of scope (list in README as "not built")
- Email/push notifications, real LinkedIn API posting, payments, chat, admin super-panel, OAuth login.

> If P1 items are not finished, hide them or show a visible "Not implemented in MVP" tag. Never leave dead buttons.

---

## 3. Recommended Tech Stack

Optimized for speed and for a developer already comfortable with Python/React.

| Layer | Choice | Why |
|---|---|---|
| Backend | **FastAPI + SQLModel (SQLAlchemy)** | Fast to build, auto Swagger docs for mentors to test |
| DB | **SQLite** (file) → optionally Postgres on deploy | Zero setup; seeded on startup |
| Auth | JWT (python-jose) + bcrypt/passlib | Simple role claims |
| Frontend | **React + Vite + Tailwind** (React Router) | Responsive utilities, fast |
| AI (optional) | **Gemini API** for resume extraction + LinkedIn draft + summary | Must have **non-AI fallback** (regex/keyword parser, template post) so app works without a key |
| Deploy | **Single service on Render** (FastAPI serves built React `dist/`) or Render (API) + Vercel (UI) | One URL, fewer CORS problems |

Matching, fit score, status and missing-skill logic are **rule-based and deterministic** (required by the brief; AI optional only for text tasks).

---

## 4. Functional Requirements

### 4.1 Authentication & Access Control
- Register/login with email + password; role chosen at signup for Student, or pre-seeded accounts for Organizer/Ambassador/Coordinator (self-signup for staff roles may be allowed with a clear demo note).
- Every API route enforces role via dependency (`require_role(...)`). Frontend hides unavailable nav items **and** backend rejects (403) regardless.
- Ownership checks: organizers edit only their listings; ambassadors only their college's; coordinators only their section's and limited fields; students only their own profile/applications.

### 4.2 Opportunity Directory (Challenge 01)
Fields: title, description, category (internship / hackathon / workshop / scholarship / project / technical event / non-technical event / other), eligibility (text + structured: allowed years, departments, min-year), required skills (list), start datetime, end datetime (optional), **registration/application deadline**, venue or online link, organizer details, registration link, attachments/resources (URL list is fine), posted_by, college/section scope (optional).

Features:
- Search by keyword; filter by category, skill, deadline range, eligibility (e.g., "eligible for me"), status.
- Status computed **at read time** from dates (never trust a stale stored value): `upcoming`, `ongoing`, `completed`, `registration_closed`, `expired`, `invalid_deadline`.
- Expired items visually distinct (grey badge, disabled Apply). Default filter shows active first; toggle to show expired.
- Missing/invalid deadline → shown as "Deadline not specified" (flagged), and **applications blocked** with a clear message; creation form rejects invalid dates (end < start, deadline after end, etc.).
- Duplicate listing minimization: on create, warn/block if same title + organizer + start date already exists.
- Empty states for no results ("No opportunities match. Clear filters").

### 4.3 Detail, Fit Assessment & Summary
- Full description + all fields.
- **Fit panel** (core differentiator): compares student profile to opportunity.
  - Matched skills ✅, missing skills ❌, eligibility check (year/department) ✅/❌, availability note.
  - Fit label: Strong / Partial / Low, with numeric score and plain-English reasons.
  - Logged-out/incomplete-profile state: prompt to complete profile.
- **"View Summary" button**: concise block — purpose, eligibility, benefits, required skills, key deadlines. Generated from fields (template) with optional Gemini polish; must work without AI.
- Save/Unsave. A saved item that later expires stays in the saved list with an "Expired" badge.

### 4.4 Student Profile (Challenge 02 + extra spec)
Fields: name, contact, college, department, year, section, technical skills, non-technical skills, interests, career goals, academic details, projects, certifications, internships/experience, resume file, **availability** (e.g., hrs/week or Available/Busy).

Creation methods:
1. **Resume analysis:** upload PDF/DOCX → extract text → extract skills, education, projects, certifications, experience → **prefill form → user reviews/edits → saves.** Nothing saved without confirmation. Re-upload refreshes extraction (with review again).
2. **Manual entry:** structured form with required-field validation (name, college, department, year, ≥1 skill).

Rules: file type/size validation (PDF/DOCX, ≤5 MB); extraction failure shows a friendly error and falls back to manual; resumes stored securely (not publicly listable, access limited to owner and, for applications, the relevant organizer).

### 4.5 Applications (Challenge 05 + consistency edge cases)
- Apply button → short form (note/cover message; resume auto-attached from profile). Required-field validation with inline errors.
- **Blocks:** after deadline, missing/invalid deadline, duplicate application (unique constraint `(student_id, opportunity_id)` **and** UI state "Applied"), ineligible year/department (warn; hard-block if opportunity marks eligibility as strict).
- Application statuses: `submitted → under_review → shortlisted / rejected / accepted`. Student sees status on dashboard.
- Non-internship events: "Register" opens the external registration link and student can mark **"I registered"**; ambassadors/organizers may mark attended → feeds participation history (P1).

### 4.6 Organizer Workspace (Challenge 05)
- Create/edit/close internship listings with validation.
- Dashboard: count cards (total listings, active, applications, by status), table of applications per listing with student name, matched-skill count, status dropdown to update, filter by status. Empty states handled.
- Status changes reflect immediately on the student's dashboard (single source of truth in DB).

### 4.7 Ambassador & Coordinator
- **Ambassador:** CRUD for events/opportunities scoped to their college; edit descriptions, dates, links.
- **Coordinator:** create/share and edit limited fields (e.g., description, dates, link) of events scoped to their section; no access to organizer or user management. Keep UI minimal (one list + one form).

### 4.8 Smart Team Formation (Challenge 03)
- Student creates a team: name, project description, goal/opportunity link (optional), required skills, max size, open/closed.
- Others can browse open teams and **request to join** (owner accepts/declines) or join directly (pick one and document it; request-based is more realistic).
- **Team skill panel:** required skills vs. skills covered by current members → **Covered / Missing** lists.
- **Missing skill handling:**
  - Button "Find candidates" for each missing skill.
  - **Rule-based matching** over students *not already in the team*, scored by: exact skill match (highest weight), shared interests, availability. Show **why** (matched skills, shared interests) and **score**.
  - Only list a candidate if their profile **actually contains** the skill. Never label "qualified" without evidence.
  - If none: show "No match currently available" with option to keep the requirement open / adjust requirements.
- Team can edit required skills and view member list with each member's skills.
- Invite candidate from results (creates an invite the student sees on dashboard; accept/decline).

### 4.9 Project Execution (Challenge 04)
- Tasks inside a team: title, description (optional), **owner (required, must be a team member)**, deadline, status (`todo / in_progress / blocked / done`).
- Board or list grouped by status; each card shows **owner avatar/name prominently**.
- Validation: owner required and must be a current member; deadline format; title required.
- **Consistency:** if a member leaves/is removed, their open tasks become **"Unassigned — needs owner"** (highlighted) rather than silently pointing at a non-member. Progress bar = done/total.
- Only team members can create/update tasks.

### 4.10 Personal Dashboard (Challenge 06 + extra spec)
One page showing: saved opportunities (with live status badges), applications + statuses, active teams, tasks assigned to me (sorted by deadline), upcoming deadlines (merged list of saved/applied opportunities + my task deadlines, next 14 days), pending team invites/requests.
Empty-state for each section with a call to action.

### 4.11 P1 Features
**Recommendations:** reuse fit engine → ranked list; each card has "Recommended because: matches Python, FastAPI; open to 2nd years; deadline in 6 days." Skills dominate score; secondary signals: year, interests, career goals, past participation. Exclude expired.

**Participation history + LinkedIn generator:** list of attended/participated events; "Generate LinkedIn post" → draft mentioning event, purpose, student's learning, skills gained; editable textarea; **Copy** button; explicit note "Not posted automatically." Student enters 1–2 lines of their experience as input for personalization; Gemini if key present, template fallback otherwise.

**Daily activity stream:** derived feed (new events matching my skills, deadlines in ≤3 days, status changes on my applications, changes to saved items). Capped and prioritized, not everything.

---

## 5. Fit & Matching Algorithms (deterministic, explainable)

### 5.1 Opportunity fit score (0–100)
```
skill_score      = matched_required / total_required          (weight 60)
eligibility      = year & department allowed                  (weight 20)  (fail ⇒ flagged ineligible)
interest_bonus   = overlap(student.interests, opp.category/tags) (weight 10)
history_bonus    = prior participation in same category       (weight 10)
```
If an opportunity lists no required skills, skill_score is neutral (50%) and the UI says "No skills specified". Output includes `matched[]`, `missing[]`, `reasons[]`, label: ≥70 Strong, 40–69 Partial, <40 Low.

### 5.2 Team candidate score
```
score = 70 * (candidate has skill ? 1 : 0)   # hard gate: no skill ⇒ not listed
      + 20 * (overlap of other team-required skills / count)
      + 10 * interest overlap, adjusted by availability (Busy ⇒ ×0.5)
```
Normalize skill strings (lowercase, trim, alias map: "js"→"javascript", "ml"→"machine learning", "reactjs"→"react").

---

## 6. Data Model (SQLModel)

```
User(id, email, password_hash, role, name, created_at)
StudentProfile(user_id FK, college, department, year, section, phone, skills_json, nontech_skills_json,
               interests_json, career_goals, academic_json, projects_json, certifications_json,
               experience_json, availability, resume_path)
Opportunity(id, title, description, category, eligibility_text, allowed_years_json, allowed_depts_json,
            strict_eligibility bool, required_skills_json, start_at, end_at, deadline_at nullable,
            venue, online_link, organizer_name, organizer_contact, registration_link, resources_json,
            college, section, posted_by FK User, created_at, updated_at, is_closed bool)
SavedOpportunity(id, user_id, opportunity_id, UNIQUE(user_id, opportunity_id))
Application(id, user_id, opportunity_id, note, status, applied_at, UNIQUE(user_id, opportunity_id))
Participation(id, user_id, opportunity_id, status[registered/attended], reflection_text)
Team(id, name, description, owner_id, opportunity_id nullable, required_skills_json, max_size, is_open)
TeamMember(id, team_id, user_id, role, joined_at, UNIQUE(team_id, user_id))
TeamRequest(id, team_id, user_id, type[join_request/invite], status[pending/accepted/declined])
Task(id, team_id, title, description, owner_id nullable FK, deadline, status, created_by, created_at)
```
Derived (not stored): opportunity `status`, team skill coverage, fit scores.

---

## 7. API Outline (REST, `/api`)

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Profile | `GET/PUT /profile`, `POST /profile/resume/analyze` (returns draft, doesn't save), `POST /profile/resume/confirm` |
| Opportunities | `GET /opportunities` (q, category, skill, status, deadline_before, eligible_only), `GET /opportunities/{id}`, `POST`, `PUT /{id}`, `DELETE/close /{id}`, `GET /{id}/summary`, `GET /{id}/fit` |
| Saved | `POST/DELETE /opportunities/{id}/save`, `GET /saved` |
| Applications | `POST /opportunities/{id}/apply`, `GET /applications/mine`, `GET /organizer/opportunities/{id}/applications`, `PATCH /applications/{id}/status` |
| Organizer | `GET /organizer/dashboard` |
| Teams | `POST /teams`, `GET /teams`, `GET /teams/{id}`, `PUT /teams/{id}`, `POST /teams/{id}/join-request`, `PATCH /team-requests/{id}`, `GET /teams/{id}/skills`, `GET /teams/{id}/candidates?skill=` , `POST /teams/{id}/invite`, `DELETE /teams/{id}/members/{uid}` |
| Tasks | `POST /teams/{id}/tasks`, `GET /teams/{id}/tasks`, `PATCH /tasks/{id}`, `DELETE /tasks/{id}` |
| Dashboard | `GET /dashboard` |
| P1 | `GET /recommendations`, `GET /feed`, `GET /participation`, `POST /participation/{id}/linkedin-draft` |

All errors return `{ "detail": "human-readable message", "field": "optional" }` with correct HTTP codes (400/401/403/404/409/422).

---

## 8. Mandatory Edge Cases — Acceptance Criteria

| # | Scenario | Expected behavior |
|---|---|---|
| E1 | Opportunity expires after being saved | Still in Saved list, badge "Expired", Apply disabled, API returns 400 "Deadline passed" on apply |
| E2 | Deadline missing/invalid | Create form blocks invalid; legacy/seeded null deadline shows "Deadline not specified", flagged, apply blocked with explanation |
| E3 | Applying twice | Second attempt returns 409 + UI shows "Already applied (status: X)"; DB unique constraint |
| E4 | Required fields empty | Inline errors; submit blocked; API 422 with field names |
| E5 | Team needs skill nobody has | Panel shows Missing: *e.g., Flutter*; "Find candidates" runs; if none, "No match currently available" and requirement stays open |
| E6 | Candidate lacks the skill | Never listed as qualified |
| E7 | Task without owner / non-member owner | Rejected with message; removed member's tasks flagged "Unassigned" |
| E8 | Empty lists / no search results | Friendly empty state with next action on every list |
| E9 | Unauthorized role action (student hits organizer API) | 403 + frontend never shows the control |
| E10 | Resume parse fails / wrong file type | Clear error, manual form still available |
| E11 | Duplicate event listing | Warning/block on creation |
| E12 | Ineligible student applies to strict-eligibility opening | Blocked with reason (year/department mismatch) |

---

## 9. UX / Non-Functional Requirements

- **Responsive:** mobile-first Tailwind; bottom or hamburger nav on mobile; tables collapse to cards. Test at 375px and 1280px.
- **Role-distinct UI:** different nav and landing page per role; role badge in header.
- **Accessibility:** semantic HTML, labels on inputs, color + text (not color alone) for status, focus states, adequate contrast.
- **Feedback:** toast/inline messages for every action success and failure; loading and error states.
- **Security:** hashed passwords, JWT expiry, role checks server-side, file validation, resumes not served from a public path, input length limits, CORS restricted in production, secrets via environment variables.
- **Honesty:** features not built are labelled; README has "Known limitations".
- **Time handling:** store UTC, display local (IST); one helper for status derivation.

---

## 10. Demo Data (seed script — idempotent)

**Accounts** (document in README, password e.g. `Demo@123`):
- Students: `asha@demo.com` (strong ML/Python, 3rd yr), `ravi@demo.com` (React/Node, 2nd yr), `meena@demo.com` (UI/UX + Flutter, 3rd yr, Busy), `kiran@demo.com` (empty-ish profile — shows incomplete state)
- Organizer: `organizer@demo.com` · Ambassador: `ambassador@demo.com` (College A) · Coordinator: `coordinator@demo.com` (Section CSE-A)

**Opportunities (~15):** mix of categories incl. at least:
- 2 active internships (organizer-owned), 1 closing in <48h
- 1 **already expired** (and saved by Asha, to demo E1)
- 1 with **null deadline** (E2)
- 2 hackathons, 2 workshops, 1 scholarship, 1 project opportunity
- 1 with strict eligibility (3rd year only) vs. 2nd-year student (E12)
- 1 near-duplicate title to demo E11 warning

**Applications:** Asha applied to internship A (status shortlisted); Ravi applied (submitted); organizer dashboard has varied statuses.
**Teams:** "SmartCampus Navigator" needing Python, React, **Flutter** — Meena has Flutter; and one team needing **Rust** (no one has it → E5 "no match"). Tasks with different owners/statuses, one deliberately unassigned after a member left.

---

## 11. Suggested 5-Hour Plan

| Time | Focus |
|---|---|
| 0:00–0:20 | Lock scope, repo, folder structure, models, seed skeleton |
| 0:20–1:10 | Auth + roles, Opportunity CRUD, status derivation, directory with search/filter |
| 1:10–2:00 | Profile (manual + resume analysis w/ review), fit engine + detail page + summary |
| 2:00–2:50 | Apply flow, saved, organizer dashboard, edge cases E1–E4 |
| 2:50–3:40 | Teams, skill coverage, candidate matching, tasks |
| 3:40–4:10 | Personal dashboard, ambassador/coordinator screens |
| 4:10–4:40 | **Deploy** (do not leave to last minute), seed on live, smoke test |
| 4:40–5:00 | P1 only if stable (recommendations/LinkedIn), README, demo recording |

---

## 12. Deliverables Checklist

- [ ] Live URL (works on mobile + desktop)
- [ ] Working MVP with end-to-end journey
- [ ] Seed/demo data and demo credentials documented
- [ ] Source repo with README (setup, stack, features, **known limitations**, role credentials)
- [ ] 3–5 min demo walkthrough covering: student journey → organizer review → team + tasks → each edge case
- [ ] Each member can explain their own module

## 13. Definition of Done

A mentor can open the URL, log in as each role, and complete: *discover → check fit → apply → organizer updates status → student sees it → create team → detect missing skill → assign task → see everything on dashboard*, while E1–E12 behave as specified and no button is non-functional.
