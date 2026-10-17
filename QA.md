# Project Nexus — QA & Edge-Case Verification Script (QA.md)

This test script guides mentors and evaluators through reproducing all mandatory edge cases (E1–E12) specified in PRD §8 using the pre-seeded accounts.

**Default Credentials:** All demo accounts use the password `Demo@123`.

---

### E1: Opportunity Expires After Being Saved
* **Account:** Log in as `asha@demo.com` (or use the top-bar Demo Switcher).
* **Steps:**
  1. Navigate to **My Dashboard** (`/dashboard`).
  2. Inspect the **Saved Opportunities** section. Notice the seeded item *"Summer Cloud DevOps Fellowship"*.
  3. Notice it displays an **Expired** badge (read-time derived from its past deadline).
  4. Click on the listing to view details (`/opportunities/3`).
  5. The application button is disabled with the message: *"Applications closed (Deadline passed or opportunity closed)"*.
  6. Attempting a direct API POST to `/api/opportunities/3/apply` returns `HTTP 400 Bad Request` with detail *"Applications blocked: Registration/application deadline has passed."*
* **Outcome:** Passes ✅. Saved item stays visible with updated status; applications blocked.

---

### E2: Deadline Missing / Unspecified
* **Account:** Log in as `asha@demo.com` or `ravi@demo.com`.
* **Steps:**
  1. Open the Opportunities Directory (`/opportunities`).
  2. Locate the listing *"Open Source Systems Architecture Study Group"*.
  3. Notice the card displays a badge: **Deadline Not Specified**.
  4. Click the listing to view details (`/opportunities/4`).
  5. Notice the application card displays an alert: *"Applications are blocked because no deadline was specified by the organizer."*
  6. Attempting an API POST to apply returns `HTTP 400 Bad Request` with detail *"Applications blocked: Deadline not specified for this opportunity."*
* **Outcome:** Passes ✅. Missing deadline shows clear warning and blocks apply with human-readable feedback.

---

### E3: Applying Twice (Duplicate Prevention)
* **Account:** Log in as `asha@demo.com`.
* **Steps:**
  1. Navigate to Opportunities (`/opportunities`) and click *"Full-Stack Engineering Internship 2026"*.
  2. Notice the application card displays: **You have applied: Shortlisted ✨**.
  3. The apply button is hidden to prevent re-submission.
  4. Submit an API POST to `/api/opportunities/1/apply`. The server responds with `HTTP 409 Conflict`: *"You have already submitted an application for this opportunity (Status: shortlisted)"*.
* **Outcome:** Passes ✅. DB Unique constraint + friendly 409 and UI reflection.

---

### E4: Required Fields Empty
* **Account:** Log in as `asha@demo.com` and go to **Profile** (`/profile`).
* **Steps:**
  1. Delete all skills or clear the Full Name input.
  2. Click **Save Profile**.
  3. Inline validation halts submission and highlights the missing field.
  4. Direct API PUT with empty skills returns `HTTP 422 Unprocessable Entity` with *"At least one technical skill is required"*.
* **Outcome:** Passes ✅. Required field validation both client and server side.

---

### E5: Team Needs Skill Nobody Has ("No Match Available")
* **Account:** Log in as `ravi@demo.com` and go to **Teams** (`/teams`).
* **Steps:**
  1. Click into team *"Autonomous Rover Club"*.
  2. Notice the Missing Skills box highlights **Rust** and **Kubernetes**.
  3. Click **Find Candidates →** next to **Rust**.
  4. The candidate modal opens and scans the candidate pool.
  5. Notice it displays: *"No match currently available: No registered student currently possesses verified competence in Rust. Your team requirement will remain open."*
* **Outcome:** Passes ✅. System does not invent candidates and keeps requirement open.

---

### E6: Candidate Lacks the Skill (Never Listed as Qualified)
* **Account:** Log in as `asha@demo.com` and open team *"SmartCampus Navigator"* (`/teams/1`).
* **Steps:**
  1. Notice the missing skill is **Flutter**.
  2. Click **Find Candidates →** next to **Flutter**.
  3. Notice only **Meena Iyer** is returned (because her profile contains Flutter).
  4. Notice **Ravi Kumar** does NOT appear, because his profile has Node/React and lacks Flutter.
* **Outcome:** Passes ✅. Only verified skill owners are displayed; zero false positives.

---

### E7: Task Owner Validation & Removed Member Task Unassignment
* **Account:** Log in as `asha@demo.com` and open team *"SmartCampus Navigator"* (`/teams/1`).
* **Steps:**
  1. Inspect the Project Task Board.
  2. Notice the task *"Implement BLE Beacon Proximity Estimator"* has a highlighted amber border with owner: **Unassigned — needs owner**.
  3. Click **Add Task**. Try submitting without selecting a team member -> blocked.
  4. Remove a member -> their active tasks automatically become *"Unassigned — needs owner"*.
* **Outcome:** Passes ✅. Tasks always validate active membership; departed members trigger explicit unassigned state.

---

### E8: Empty Lists & Search Results
* **Account:** Any user.
* **Steps:**
  1. In Opportunities, type `xyznonexistentkeyword` in the search bar.
  2. Notice the styled empty state: *"No opportunities match your filter"*, complete with a **Clear Filters** button.
  3. Click **Clear Filters** to restore the listing.
* **Outcome:** Passes ✅. No blank screens or broken lists.

---

### E9: Unauthorized Role Access (403 Forbidden)
* **Account:** Log in as Student `asha@demo.com`.
* **Steps:**
  1. Try navigating to `/organizer`. ProtectedRoute immediately redirects away because Asha lacks the `organizer` role.
  2. Execute an API request using Asha's token to `GET /api/organizer/dashboard`.
  3. The backend returns `HTTP 403 Forbidden`: *"Access forbidden: role 'student' lacks permission for this resource"*.
* **Outcome:** Passes ✅. Server-side role guard enforces permissions regardless of frontend.

---

### E10: Corrupted / Unsupported Resume Upload
* **Account:** Log in as `asha@demo.com` and go to **Profile** (`/profile`).
* **Steps:**
  1. Try uploading an image (`.png`) or file exceeding 5 MB.
  2. The system rejects the file with `HTTP 415 Unsupported Media Type` or `413 Request Entity Too Large` and displays a friendly error message, keeping manual entry accessible.
* **Outcome:** Passes ✅. Clear error; manual profile form remains functional.

---

### E11: Duplicate Event Listing Prevention
* **Account:** Log in as `organizer@demo.com` and go to **Organizer Workspace** (`/organizer`).
* **Steps:**
  1. Click **Publish New Internship**.
  2. Enter the title *"Full-Stack Engineering Internship 2026"* with TechCorp India and the same start date.
  3. Click **Publish Listing**.
  4. The system rejects the duplicate with `HTTP 409 Conflict`: *"Near-duplicate opportunity already exists with title 'Full-Stack Engineering Internship 2026' and start date"*.
* **Outcome:** Passes ✅. Near-duplicate listings are flagged and blocked.

---

### E12: Ineligible Student Applies to Strict-Eligibility Opening
* **Account:** Log in as `ravi@demo.com` (Ravi is a 2nd Year ECE student).
* **Steps:**
  1. Go to Opportunities and open *"Deep Systems Kernel Engineering Internship"* (`/opportunities/5`).
  2. Notice this listing has a strict eligibility requirement: 3rd year CSE students only.
  3. Ravi's Fit Breakdown calculates: **Low Match (20 pts)**, with eligibility warning: *"Open to academic year(s) [3], but student is in Year 2 and Department ECE"*.
  4. Click **Apply for Internship**.
  5. The API programmatically blocks the submission with `HTTP 403 Forbidden`: *"Eligibility criteria not met: Requires academic year [3], but your profile is Year 2 and Restricted to departments: CSE"*.
* **Outcome:** Passes ✅. Strict eligibility is strictly enforced at submission time.
