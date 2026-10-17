# CampusForge — Student Opportunity & Collaboration Platform

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-teal.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com)
[![Test Suite](https://img.shields.io/badge/Tests-14%2F14%20Passing-brightgreen.svg)]()

> **BuildAP@theGnaN Mentorship Final Challenge · MVP**  
> *"Build the most meaningful working solution, not the most features."*

---

## 1. Overview & Mission

Opportunities for college students (internships, hackathons, workshops, scholarships, and projects) are fragmented across WhatsApp groups, bulletin boards, and external websites. Students miss critical deadlines and struggle to find teammates with complementary skills, while event organizers lack tools to reach qualified candidates and track outcomes.

**CampusForge** delivers one coherent, end-to-end journey:

$$\text{Discover} \longrightarrow \text{Evaluate (Fit)} \longrightarrow \text{Apply} \longrightarrow \text{Collaborate (Teams)} \longrightarrow \text{Execute (Tasks)} \longrightarrow \text{Track (Dashboard)}$$

Serving four distinct user roles:
* **Student:** Discover listings, check deterministic fit scores, apply, assemble project teams, detect missing skills, execute deliverables, and track deadlines.
* **Organizer:** Publish verified corporate internships, define eligibility rules, and manage applicant hiring stages.
* **Campus Ambassador:** Manage college-wide technical events, workshops, and hackathons.
* **Academic Coordinator:** Oversee section-scoped project listings and academic schedules.

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Backend** | Python 3.11+ / FastAPI / SQLModel (SQLAlchemy) | High throughput, type safety, automatic OpenAPI documentation |
| **Database** | SQLite (with Postgres compatibility) | Zero-friction setup, local file persistence, ACID transactions |
| **Authentication** | JWT (`python-jose`) + Native `bcrypt` | Secure stateless auth with server-side role enforcement |
| **Frontend** | React 18 + Vite + Tailwind CSS + React Router | Responsive mobile-first UI, instantaneous client-side navigation |
| **Matching Engine** | Pure Rule-Based Python | Deterministic 0–100 fit scoring, verified candidate matching, unit tested |
| **AI Integration** | Google Gemini API (Optional) with **Deterministic Fallback** | 100% operational without API key using regex/taxonomy parsers & templates |
| **Deployment** | Single Service on Render | Unified origin serving FastAPI API and pre-compiled React SPA |

---

## 3. Demo Credentials

All seeded demo accounts share the password: **`Demo@123`**

| Role | Account Email | Key Characteristics & Testing Purpose |
|---|---|---|
| **Student (Leader)** | `asha@demo.com` | 3rd Year CSE; strong ML/Python; applied to internship; owner of Rover team |
| **Student** | `ravi@demo.com` | 2nd Year ECE; React/Node; tests Year 2 eligibility blocks (E12) |
| **Student (Candidate)** | `meena@demo.com` | 3rd Year CSE; Flutter/UI-UX; Busy status; recruited for missing Flutter skill (E6) |
| **Student (Incomplete)** | `kiran@demo.com` | 1st Year IT; empty profile; tests incomplete profile prompts |
| **Organizer** | `organizer@demo.com` | TechCorp Talent Lead; manages listings and applicant review pipeline |
| **Campus Ambassador** | `ambassador@demo.com` | Campus Ambassador for GnaN Institute of Technology |
| **Academic Coordinator**| `coordinator@demo.com` | Section Coordinator for Section CSE-A |

> **Pro-Tip for Mentors:** The application includes a top-bar **Demo Switcher** dropdown allowing you to switch between any persona with a single click.

---

## 4. Local Setup & Quickstart

### Prerequisites
* Python 3.10+
* Node.js 18+ and npm

### Step 1: Clone & Configure Backend
```bash
git clone https://github.com/Pratheek-16/campusforge.git
cd campusforge

# Optional: Create virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt
```

### Step 2: Seed Demo Database
```bash
# Seeds all 7 demo accounts, 14 diverse opportunities, teams, and edge cases
python backend/seed.py
```

### Step 3: Setup & Compile Frontend
```bash
cd frontend
npm install
npm run build
cd ..
```

### Step 4: Launch Application
```bash
# Launches full-stack application on http://localhost:8000
python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## 5. Automated Test Suite

Project Nexus includes 14 unit and integration tests covering read-time status derivation, fit scoring, skill normalization, candidate matching, edge cases, and the full end-to-end journey.

```bash
# Run full pytest suite from repository root
python -m pytest
```

Output:
```
backend/tests/test_applications.py .                                     [  7%]
backend/tests/test_auth_roles.py .                                       [ 14%]
backend/tests/test_end_to_end_journey.py .                               [ 21%]
backend/tests/test_fit_engine.py ....                                    [ 50%]
backend/tests/test_profile.py ..                                         [ 64%]
backend/tests/test_status_engine.py ....                                 [ 92%]
backend/tests/test_teams_and_tasks.py .                                  [100%]

======================== 14 passed in 5.8s ========================
```

---

## 6. Feature Implementation Status

| Module | Feature | Status |
|---|---|:---:|
| **Authentication** | Email/password JWT auth with server-side role guards (4 roles) | ✅ Done |
| **Opportunities** | Search, category filtering, active vs expired toggle | ✅ Done |
| **Opportunities** | Read-time dynamic status derivation (never stale) | ✅ Done |
| **Opportunities** | Executive Summary generator with deterministic fallback | ✅ Done |
| **Fit Intelligence**| 0–100 Explainable fit scoring (matched, missing, eligibility) | ✅ Done |
| **Profile** | Structured manual form with strict validation (name, college, year, skills) | ✅ Done |
| **Profile** | Resume analyzer (PDF/DOCX) with review-before-save workflow | ✅ Done |
| **Applications** | Duplicate prevention (`UNIQUE(user_id, opp_id)` + 409 handling) | ✅ Done |
| **Applications** | Deadline enforcement & strict academic eligibility verification | ✅ Done |
| **Organizer** | Corporate dashboard metrics, listing management, and applicant review | ✅ Done |
| **Organizer** | Single-source-of-truth status updates reflecting immediately | ✅ Done |
| **Teams** | Team creation, member rosters, and real-time skill coverage | ✅ Done |
| **Teams** | Missing-skill detection & rule-based verified candidate matching | ✅ Done |
| **Teams** | Honest "No match currently available" empty state (E5) | ✅ Done |
| **Tasks** | Mandatory task owner validation (must be active team member) | ✅ Done |
| **Tasks** | Departed member task handling ("Unassigned — needs owner" E7) | ✅ Done |
| **Dashboard** | Consolidated student dashboard (saved, applied, teams, tasks, deadlines) | ✅ Done |
| **Staff Portal** | Scoped Ambassador (college) and Coordinator (section) access | ✅ Done |
| **P1** | AI recommendations with plain-English *"Recommended because..."* reasons | ✅ Done |
| **P1** | Editable LinkedIn post draft generator with copy button | ✅ Done |
| **P1** | Prioritized daily activity stream feed | ✅ Done |

---

## 7. Known Limitations / Out of Scope (Honesty Checklist)

In adherence to the challenge guidelines, Project Nexus prioritizes a working, coherent core. Features outside the 5-hour scope are explicitly listed here and not faked in the UI:

* 🚧 **Real LinkedIn API Publishing:** The platform generates an editable draft with a one-click copy button; it does **not** auto-post to user social accounts.
* 🚧 **Real-time WebSockets / Chat:** Team communication relies on team invitations and task assignments; live chat is out of scope.
* 🚧 **Email / Push Notifications:** Deadlines and updates are surfaced via the consolidated personal dashboard and activity feed; external SMS/email triggers are omitted.
* 🚧 **Payment Gateways:** All hackathon and workshop registrations are free or direct to external organizer portals.
* 🚧 **OAuth2 Social Sign-In (Google / GitHub):** Authentication uses email/password JWT tokens.

---

## 8. Deployment Specification (Render Single-Service)

Project Nexus is designed to deploy as a unified service on Render via `render.yaml`:

```yaml
services:
  - type: web
    name: project-nexus
    env: python
    buildCommand: "pip install -r backend/requirements.txt && cd frontend && npm install && npm run build && cd .. && python backend/seed.py"
    startCommand: "uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port $PORT"
    envVars:
      - key: DATABASE_URL
        value: sqlite:///./nexus.db
      - key: SECRET_KEY
        generateValue: true
```

*Alternative Deployment:* The FastAPI backend can be deployed independently on Render/Fly.io while the React frontend is deployed on Vercel by setting `VITE_API_URL` to the backend URL.
