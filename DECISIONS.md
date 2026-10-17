# Project Nexus — Architectural & Product Decisions Log (DECISIONS.md)

This document records the architectural trade-offs, engineering decisions, and product prioritization rationale for the Project Nexus MVP.

---

### 1. Read-Time Opportunity Status Computation
* **Decision:** Derive opportunity status (`upcoming`, `ongoing`, `completed`, `expired`, `invalid_deadline`, `closed`) dynamically at query time from datetime boundaries rather than storing and periodically updating a static status field.
* **Rationale:** Cron-based or cached status fields lead to race conditions where students can apply to deadlines that expired minutes prior. Read-time derivation guarantees single-source-of-truth accuracy and immediate consistency across all directories and saved lists.
* **Edge Cases Covered:** E1 (expired apply blocked), E2 (missing deadline handled as "Deadline not specified").

---

### 2. Native `bcrypt` over `passlib` Wrapper
* **Decision:** Implement password hashing directly with native `bcrypt` rather than `passlib.context.CryptContext`.
* **Rationale:** In modern Python environments with `bcrypt >= 4.0`, passlib's legacy detection routine triggers internal deprecation errors and crashes on 72-byte string tests. Direct `bcrypt.hashpw` and `bcrypt.checkpw` provide rock-solid security, sub-millisecond execution, and zero runtime warnings.

---

### 3. Deterministic AI Fallback for Zero-Dependency Operation
* **Decision:** Build deterministic algorithmic engines for resume parsing (regex + 50+ technology taxonomy), executive summaries (structured template synthesizer), and LinkedIn post drafting (parameterized reflection template). Use Google Gemini API strictly as an optional enhancement layer.
* **Rationale:** Hackathon evaluators and mentors may run the application in offline, restricted, or keyless environments. The entire user journey functions with 100% fidelity without an external API key.

---

### 4. Hard Gate on Team Candidate Matching
* **Decision:** Disallow displaying any candidate in the "Find Candidates" modal unless their profile contains direct evidence of possessing the target skill.
* **Rationale:** PRD §5.2 and Challenge 03 mandate that the platform must *never* present a candidate as qualified without verified skill evidence. When no student possesses the skill, the system honestly states *"No match currently available"* (E5) and keeps the requirement open.

---

### 5. Task Ownership & Member Removal Consistency
* **Decision:** Require an explicit owner for every task at creation time and enforce that the owner must be an active team member. When a member leaves or is removed, automatically reassign their open tasks to `owner_id = None` and label them *"Unassigned — needs owner"*.
* **Rationale:** Eliminates orphaned tasks pointing to non-existent users and ensures team members immediately see which execution deliverables require reassignment.

---

### 6. Single-Service Full-Stack Deployment
* **Decision:** Build the React Vite frontend into `frontend/dist` and serve static assets directly from FastAPI's root SPA router.
* **Rationale:** Running API and UI on the same origin eliminates CORS latency and deployment synchronization bugs. A single Render web service runs the entire system under one URL.
