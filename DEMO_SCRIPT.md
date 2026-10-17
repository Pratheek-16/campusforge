# Project Nexus — 4-Minute Mentor Demonstration Script (DEMO_SCRIPT.md)

This concise script guides the team through a crisp, high-impact 4-minute demonstration covering the complete user journey and edge-case resilience.

---

### Phase 1: The Student Journey — Discover & Evaluate (0:00 – 1:00)
1. **Landing & Persona Switcher:**
   * Open the app. Point out the top-bar **Demo Switcher**.
   * Select **Asha Sharma** (3rd Year CSE, ML & Python).
2. **Opportunity Directory:**
   * Navigate to Opportunities. Filter by *"Internships"* and search *"Full-Stack"*.
   * Point out the live computed badges: `Upcoming`, `Active`, and `Expired`.
3. **Fit Breakdown (Core Differentiator):**
   * Click into *"Full-Stack Engineering Internship 2026"*.
   * Explain the **Fit Panel**: 80/100 Strong Match. Show the green matched skills (Python, FastAPI, SQL) and the plain-English reasoning.
   * Click **View Executive Summary**: Show the instant structured synthesis (Purpose, Eligibility, Benefits, Deadlines).
4. **Apply:**
   * Click **Apply for Internship**. Show that Asha's profile resume is auto-attached. Submit application.

---

### Phase 2: Organizer Review & Real-Time Sync (1:00 – 1:50)
1. **Switch to Organizer:**
   * In Demo Switcher, click **Organizer (TechCorp Talent)**.
   * Land on `/organizer` (Workspace & Metrics).
2. **Review Applicants:**
   * Point out the count cards (Total listings, Active, Total applications).
   * In the applicants table for *"Full-Stack Engineering Internship"*, locate Asha Sharma.
   * Highlight her matched skill count (3 matched skills) and cover note.
3. **Update Status:**
   * In the dropdown, change status to **Shortlisted ✨**.
4. **Immediate Consistency (Single Source of Truth):**
   * Switch back to **Asha** in the Demo Switcher and click **My Dashboard**.
   * Show that her application status immediately reflects **Shortlisted ✨**.

---

### Phase 3: Smart Team Formation & Missing Skills (1:50 – 2:45)
1. **Team Skill Coverage:**
   * Go to **Teams** and open *"SmartCampus Navigator"*.
   * Show the **Skill Coverage Panel**: Python and React are *Covered* by Asha, while **Flutter** is flagged as a *Missing Skill Bottleneck*.
2. **Candidate Matching (PRD §5.2):**
   * Click **Find Candidates →** next to **Flutter**.
   * Show that **Meena Iyer** is returned with 80 pts and plain-English explanation.
   * Point out that Ravi is NOT listed because he doesn't have Flutter (**E6: Zero false positives**).
   * Click **Invite to Team**.
3. **Honest "No Match Available" (E5):**
   * Switch to team *"Autonomous Rover Club"* needing **Rust**.
   * Click **Find Candidates →** for **Rust**.
   * Show the honest empty state: *"No match currently available"*. The requirement stays open without hallucinating qualified peers.

---

### Phase 4: Project Execution & Personal Dashboard (2:45 – 3:30)
1. **Task Execution Board:**
   * In *"SmartCampus Navigator"*, scroll to the **Project Task Board**.
   * Show columns: To Do, In Progress, Blocked, Done.
   * Highlight the task *"Implement BLE Beacon Proximity Estimator"*: it displays **Unassigned — needs owner** (E7) after a prior member left.
   * Reassign it directly to Asha.
2. **Personal Dashboard:**
   * Go to **My Dashboard**.
   * Point out:
     * Saved items (including the expired item badged *Expired* for E1).
     * Applications with live statuses.
     * Active teams & assigned tasks.
     * The merged **14-Day Upcoming Deadlines** ticker.

---

### Phase 5: Edge-Case Highlights & Wrap-up (3:30 – 4:00)
1. **Edge Case E12 (Strict Eligibility Block):**
   * Switch to **Ravi** (Year 2 ECE). Open *"Deep Systems Kernel Internship"* (Year 3 CSE only).
   * Show that clicking Apply is programmatically rejected with human-readable eligibility reasons.
2. **P1 Feature: LinkedIn Post Generator:**
   * Go to **AI Fit & Feed** (`/recommendations`).
   * Show ranked recommendations with *"Recommended because..."* rationale.
   * Type a 1-sentence reflection into the LinkedIn Drafter, click **Generate**, and demonstrate the editable draft with the **Copy** button and explicit non-auto-post notice.
3. **Conclusion:**
   * All PRD requirements and edge cases (E1–E12) verified; responsive on mobile and desktop; zero fake buttons.
