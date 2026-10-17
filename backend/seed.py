import json
from datetime import datetime, timedelta, timezone
from sqlmodel import Session, select

from app.database import engine, init_db
from app.models import (
    User,
    StudentProfile,
    Opportunity,
    SavedOpportunity,
    Application,
    Participation,
    Team,
    TeamMember,
    Task
)
from app.security import hash_password

def seed_database():
    print("Initializing database schema...")
    init_db()

    with Session(engine) as session:
        # Check if already seeded
        existing_asha = session.exec(select(User).where(User.email == "asha@demo.com")).first()
        if existing_asha:
            print("Database already contains seed data. Skipping seed.")
            return

        print("Seeding demo users and profiles...")
        default_pwd = hash_password("Demo@123")
        now = datetime.now(timezone.utc)

        # 1. USERS
        # Students
        asha = User(
            email="asha@demo.com",
            password_hash=default_pwd,
            role="student",
            name="Asha Sharma",
            college="GnaN Institute of Technology",
            department="CSE",
            year=3,
            section="CSE-A"
        )
        ravi = User(
            email="ravi@demo.com",
            password_hash=default_pwd,
            role="student",
            name="Ravi Kumar",
            college="GnaN Institute of Technology",
            department="ECE",
            year=2,
            section="ECE-B"
        )
        meena = User(
            email="meena@demo.com",
            password_hash=default_pwd,
            role="student",
            name="Meena Iyer",
            college="GnaN Institute of Technology",
            department="CSE",
            year=3,
            section="CSE-A"
        )
        kiran = User(
            email="kiran@demo.com",
            password_hash=default_pwd,
            role="student",
            name="Kiran Patel",
            college="GnaN Institute of Technology",
            department="IT",
            year=1,
            section="IT-A"
        )
        # Staff & Organizers
        organizer = User(
            email="organizer@demo.com",
            password_hash=default_pwd,
            role="organizer",
            name="Naveen Reddy (TechCorp Talent)",
            college=None
        )
        ambassador = User(
            email="ambassador@demo.com",
            password_hash=default_pwd,
            role="ambassador",
            name="Pooja Verma (Campus Ambassador)",
            college="GnaN Institute of Technology"
        )
        coordinator = User(
            email="coordinator@demo.com",
            password_hash=default_pwd,
            role="coordinator",
            name="Dr. Suresh Rao (CSE-A Coordinator)",
            college="GnaN Institute of Technology",
            department="CSE",
            section="CSE-A"
        )

        session.add_all([asha, ravi, meena, kiran, organizer, ambassador, coordinator])
        session.commit()
        for u in [asha, ravi, meena, kiran, organizer, ambassador, coordinator]:
            session.refresh(u)

        # 2. STUDENT PROFILES
        # Asha: strong ML/Python
        p_asha = StudentProfile(
            user_id=asha.id,
            phone="+91 98765 43210",
            skills_json=json.dumps(["Python", "Machine Learning", "FastAPI", "Docker", "SQL", "Deep Learning", "TensorFlow"]),
            nontech_skills_json=json.dumps(["Leadership", "Technical Writing"]),
            interests_json=json.dumps(["Artificial Intelligence", "Data Science", "Backend Engineering"]),
            career_goals="Aspiring ML Engineer building intelligent infrastructure.",
            academic_json=json.dumps({"gpa": "9.4", "coursework": ["Data Structures", "Algorithms", "Database Systems"]}),
            projects_json=json.dumps([
                {"title": "Automated Medical Scan Classifier", "desc": "ResNet-50 computer vision pipeline in PyTorch", "tech": "Python, PyTorch"},
                {"title": "Nexus Fit Scoring Engine", "desc": "Deterministic opportunity recommender", "tech": "FastAPI, SQLModel"}
            ]),
            availability="Available"
        )
        # Ravi: React / Node
        p_ravi = StudentProfile(
            user_id=ravi.id,
            phone="+91 98765 43211",
            skills_json=json.dumps(["JavaScript", "TypeScript", "React", "Node.js", "Express", "Tailwind CSS", "HTML", "CSS"]),
            nontech_skills_json=json.dumps(["UI Design", "Agile Collaboration"]),
            interests_json=json.dumps(["Web Development", "Open Source", "Design Systems"]),
            career_goals="Full-stack frontend-heavy software engineer.",
            academic_json=json.dumps({"gpa": "8.6", "coursework": ["Digital Circuits", "Web Technologies"]}),
            projects_json=json.dumps([
                {"title": "Campus Club Portal", "desc": "React SPA with tailwind and auth", "tech": "React, Node.js"}
            ]),
            availability="Available"
        )
        # Meena: UI/UX + Flutter, Busy
        p_meena = StudentProfile(
            user_id=meena.id,
            phone="+91 98765 43212",
            skills_json=json.dumps(["Flutter", "UI/UX", "Figma", "Dart", "Mobile App Development"]),
            nontech_skills_json=json.dumps(["User Research", "Wireframing"]),
            interests_json=json.dumps(["Mobile Development", "Product Design"]),
            career_goals="Product designer & mobile developer.",
            academic_json=json.dumps({"gpa": "8.9"}),
            projects_json=json.dumps([
                {"title": "Smart Campus Navigation Flutter App", "desc": "Indoor interactive map UI", "tech": "Flutter, Figma"}
            ]),
            availability="Busy"  # Busy status for testing availability weighting
        )
        # Kiran: Incomplete profile
        p_kiran = StudentProfile(
            user_id=kiran.id,
            phone="+91 98765 43213",
            skills_json=json.dumps([]),  # Empty skills to show incomplete state
            interests_json=json.dumps([]),
            availability="Available"
        )

        session.add_all([p_asha, p_ravi, p_meena, p_kiran])
        session.commit()

        # 3. OPPORTUNITIES (~15 items covering all categories and edge cases)
        print("Seeding diverse opportunities and edge-case listings...")
        opps = [
            # 1. Active internship (organizer-owned), closes in <48h
            Opportunity(
                title="Full-Stack Engineering Internship 2026",
                description="Join TechCorp's core platform team to build scalable microservices and student dashboards. You will write high-throughput APIs in Python/FastAPI and integrate modern React frontends.",
                category="internship",
                eligibility_text="Open to 2nd and 3rd year engineering students with strong programming foundations.",
                allowed_years_json="[2, 3]",
                allowed_depts_json='["CSE", "ECE", "IT"]',
                strict_eligibility=False,
                required_skills_json='["Python", "FastAPI", "React", "SQL"]',
                start_at=now + timedelta(days=7),
                end_at=now + timedelta(days=90),
                deadline_at=now + timedelta(hours=36),  # Closes in <48h
                venue="Bangalore Tech Park / Hybrid",
                organizer_name="TechCorp India",
                organizer_contact="hr@techcorp.demo",
                registration_link="https://techcorp.demo/apply",
                posted_by=organizer.id
            ),
            # 2. Active internship (organizer-owned), closes in 14 days
            Opportunity(
                title="Machine Learning Research Intern",
                description="Work alongside research scientists on applied computer vision and NLP models for campus intelligence. Involves model fine-tuning, benchmark evaluation, and API deployment.",
                category="internship",
                eligibility_text="Pre-final and final year students with hands-on ML coursework or personal projects.",
                allowed_years_json="[3, 4]",
                allowed_depts_json='["CSE", "IT"]',
                strict_eligibility=False,
                required_skills_json='["Python", "Machine Learning", "Deep Learning", "Docker"]',
                start_at=now + timedelta(days=20),
                end_at=now + timedelta(days=120),
                deadline_at=now + timedelta(days=12),
                venue="Remote",
                organizer_name="TechCorp India",
                organizer_contact="ml-team@techcorp.demo",
                registration_link="https://techcorp.demo/ml-apply",
                posted_by=organizer.id
            ),
            # 3. Already expired (saved by Asha, for E1)
            Opportunity(
                title="Summer Cloud DevOps Fellowship",
                description="Intensive Kubernetes and cloud infrastructure program. Registration closed last week.",
                category="internship",
                eligibility_text="All engineering branches.",
                allowed_years_json="[2, 3, 4]",
                allowed_depts_json="[]",
                strict_eligibility=False,
                required_skills_json='["Docker", "Kubernetes", "Linux"]',
                start_at=now + timedelta(days=5),
                end_at=now + timedelta(days=60),
                deadline_at=now - timedelta(days=3),  # Expired 3 days ago!
                venue="Online",
                organizer_name="CloudScale Foundation",
                organizer_contact="devops@cloudscale.demo",
                posted_by=organizer.id
            ),
            # 4. Null deadline opportunity (for E2)
            Opportunity(
                title="Open Source Systems Architecture Study Group",
                description="Collaborative exploration of kernel architecture and distributed consensus. No firm deadline set by organizers.",
                category="project",
                eligibility_text="Self-motivated contributors passionate about systems programming.",
                allowed_years_json="[]",
                allowed_depts_json="[]",
                strict_eligibility=False,
                required_skills_json='["C++", "Linux", "Git"]',
                start_at=now + timedelta(days=14),
                end_at=now + timedelta(days=45),
                deadline_at=None,  # Null deadline for E2!
                venue="Room 302, GnaN Innovation Center",
                organizer_name="Open Source Guild",
                posted_by=organizer.id
            ),
            # 5. Strict eligibility (3rd yr CSE only) vs 2nd yr student (for E12)
            Opportunity(
                title="Deep Systems Kernel Engineering Internship",
                description="High-performance embedded kernel optimization. Restricted strictly to 3rd year CSE students.",
                category="internship",
                eligibility_text="Strictly restricted to 3rd year CSE students with operating systems coursework.",
                allowed_years_json="[3]",
                allowed_depts_json='["CSE"]',
                strict_eligibility=True,  # STRICT ELIGIBILITY for E12!
                required_skills_json='["C", "Linux", "Algorithms"]',
                start_at=now + timedelta(days=30),
                end_at=now + timedelta(days=180),
                deadline_at=now + timedelta(days=10),
                venue="Hyderabad Core R&D Lab",
                organizer_name="Deep Systems Corp",
                posted_by=organizer.id
            ),
            # 6. Near-duplicate title listing (for E11 demo warning)
            Opportunity(
                title="Full-Stack Engineering Internship 2026 - Fall Cohort",
                description="Secondary cohort for TechCorp platform team focusing on frontend design systems.",
                category="internship",
                eligibility_text="Open to 2nd and 3rd year students.",
                allowed_years_json="[2, 3]",
                allowed_depts_json='["CSE", "ECE"]',
                strict_eligibility=False,
                required_skills_json='["React", "JavaScript", "HTML", "CSS"]',
                start_at=now + timedelta(days=60),
                end_at=now + timedelta(days=150),
                deadline_at=now + timedelta(days=25),
                venue="Hybrid",
                organizer_name="TechCorp India",
                posted_by=organizer.id
            ),
            # 7. Hackathon 1
            Opportunity(
                title="GnaN Grand Hackathon 2026",
                description="36-hour flagship hackathon solving real-world civic, education, and healthcare problems. Prizes worth INR 2,00,000.",
                category="hackathon",
                eligibility_text="Open to multidisciplinary teams from all affiliated colleges.",
                allowed_years_json="[1, 2, 3, 4]",
                allowed_depts_json="[]",
                strict_eligibility=False,
                required_skills_json='["Python", "React", "Mobile App Development", "UI/UX"]',
                start_at=now + timedelta(days=8),
                end_at=now + timedelta(days=10),
                deadline_at=now + timedelta(days=5),
                venue="Main Auditorium, GnaN Campus",
                organizer_name="GnaN Student Council",
                registration_link="https://hackathon.thegnan.edu",
                college="GnaN Institute of Technology",
                posted_by=ambassador.id
            ),
            # 8. Hackathon 2
            Opportunity(
                title="AI Agents & Automation Hack",
                description="Virtual hackathon focused on autonomous LLM agents and multi-agent workflows.",
                category="hackathon",
                eligibility_text="Open to all developers worldwide.",
                allowed_years_json="[]",
                allowed_depts_json="[]",
                strict_eligibility=False,
                required_skills_json='["Python", "FastAPI", "Machine Learning"]',
                start_at=now + timedelta(days=16),
                end_at=now + timedelta(days=18),
                deadline_at=now + timedelta(days=12),
                venue="Online / Discord",
                organizer_name="Autonomous AI Lab",
                posted_by=organizer.id
            ),
            # 9. Workshop 1
            Opportunity(
                title="Hands-on Flutter & Mobile UI Masterclass",
                description="A full-day interactive workshop on building smooth cross-platform iOS and Android apps with Flutter and Dart.",
                category="workshop",
                eligibility_text="Beginners and intermediate developers welcome.",
                allowed_years_json="[1, 2, 3]",
                allowed_depts_json="[]",
                strict_eligibility=False,
                required_skills_json='["Flutter", "UI/UX", "Dart"]',
                start_at=now + timedelta(days=4),
                end_at=now + timedelta(days=4),
                deadline_at=now + timedelta(days=2),
                venue="Lab 4, Computer Science Block",
                organizer_name="Mobile Developers Club",
                college="GnaN Institute of Technology",
                posted_by=ambassador.id
            ),
            # 10. Workshop 2
            Opportunity(
                title="Generative AI with Large Language Models Workshop",
                description="Explore prompt engineering, RAG pipelines, and model evaluation with industry practitioners.",
                category="workshop",
                eligibility_text="Basic Python knowledge recommended.",
                allowed_years_json="[2, 3, 4]",
                allowed_depts_json="[]",
                strict_eligibility=False,
                required_skills_json='["Python", "Machine Learning"]',
                start_at=now + timedelta(days=11),
                end_at=now + timedelta(days=11),
                deadline_at=now + timedelta(days=9),
                venue="Seminar Hall 1",
                organizer_name="AI & Data Science Society",
                college="GnaN Institute of Technology",
                posted_by=ambassador.id
            ),
            # 11. Scholarship
            Opportunity(
                title="Women in STEM Academic Excellence Scholarship",
                description="Merit scholarship granting INR 50,000 fee sponsorship and executive mentorship for female engineering students.",
                category="scholarship",
                eligibility_text="Female undergraduate students with CGPA >= 8.5.",
                allowed_years_json="[2, 3]",
                allowed_depts_json="[]",
                strict_eligibility=False,
                required_skills_json=json.dumps([]),
                start_at=now + timedelta(days=20),
                end_at=now + timedelta(days=20),
                deadline_at=now + timedelta(days=15),
                venue="Online Application Portal",
                organizer_name="Foundation for Tech Diversity",
                posted_by=organizer.id
            ),
            # 12. Project Opportunity
            Opportunity(
                title="Smart Campus IoT Energy Optimization Project",
                description="Funded faculty-mentored research project to install smart power meters and predictive load shedding models across hostel buildings.",
                category="project",
                eligibility_text="Students interested in IoT, sensors, and data pipelines.",
                allowed_years_json="[2, 3, 4]",
                allowed_depts_json='["CSE", "ECE", "EEE"]',
                strict_eligibility=False,
                required_skills_json='["Python", "C++", "Data Science"]',
                start_at=now + timedelta(days=14),
                end_at=now + timedelta(days=120),
                deadline_at=now + timedelta(days=8),
                venue="GnaN Green Energy Center",
                organizer_name="Department of CSE & EEE",
                college="GnaN Institute of Technology",
                section="CSE-A",
                posted_by=coordinator.id
            ),
            # 13. Technical Event
            Opportunity(
                title="Algorithmic Code Sprint - Fall Edition",
                description="Fast-paced 3-hour competitive programming sprint on algorithmic efficiency and data structures.",
                category="technical_event",
                eligibility_text="Open to all years and branches.",
                allowed_years_json="[]",
                allowed_depts_json="[]",
                strict_eligibility=False,
                required_skills_json='["Algorithms", "C++", "Python", "Java"]',
                start_at=now + timedelta(days=6),
                end_at=now + timedelta(days=6),
                deadline_at=now + timedelta(days=5),
                venue="Virtual Contest Platform",
                organizer_name="Coding Society",
                college="GnaN Institute of Technology",
                section="CSE-A",
                posted_by=coordinator.id
            ),
            # 14. Non-Technical Event
            Opportunity(
                title="Campus Leadership & Startup Pitch Fest",
                description="Pitch non-technical venture concepts and social impact projects to alumni investors and venture partners.",
                category="non_technical_event",
                eligibility_text="Open to all students.",
                allowed_years_json="[]",
                allowed_depts_json="[]",
                strict_eligibility=False,
                required_skills_json='["Public Speaking", "UI/UX"]',
                start_at=now + timedelta(days=18),
                end_at=now + timedelta(days=18),
                deadline_at=now + timedelta(days=14),
                venue="Management Block Amphitheatre",
                organizer_name="E-Cell GnaN",
                college="GnaN Institute of Technology",
                posted_by=ambassador.id
            )
        ]

        session.add_all(opps)
        session.commit()
        for o in opps:
            session.refresh(o)

        # 4. SAVED OPPORTUNITIES (PRD §10: Asha saves expired opp to demo E1)
        print("Seeding saved opportunities (including expired item for Asha)...")
        # Asha saves expired opp (#3) and active internship (#1)
        save_expired = SavedOpportunity(user_id=asha.id, opportunity_id=opps[2].id)
        save_active = SavedOpportunity(user_id=asha.id, opportunity_id=opps[0].id)
        # Ravi saves hackathon (#7)
        save_ravi = SavedOpportunity(user_id=ravi.id, opportunity_id=opps[6].id)
        session.add_all([save_expired, save_active, save_ravi])
        session.commit()

        # 5. APPLICATIONS WITH VARIED STATUSES (PRD §10)
        print("Seeding applications with varied statuses...")
        # Asha applied to Internship #1 (status: shortlisted)
        app_asha = Application(
            user_id=asha.id,
            opportunity_id=opps[0].id,
            note="Excited to contribute to high-performance microservices and dashboard engineering.",
            status="shortlisted",
            applied_at=now - timedelta(days=2)
        )
        # Ravi applied to Internship #1 (status: submitted)
        app_ravi = Application(
            user_id=ravi.id,
            opportunity_id=opps[0].id,
            note="Full-stack engineer with React expertise ready to build modern interactive components.",
            status="submitted",
            applied_at=now - timedelta(days=1)
        )
        # Meena applied to ML Intern #2 (status: under_review)
        app_meena = Application(
            user_id=meena.id,
            opportunity_id=opps[1].id,
            note="Passionate about UI/UX interfaces for ML models.",
            status="under_review",
            applied_at=now - timedelta(hours=18)
        )

        session.add_all([app_asha, app_ravi, app_meena])
        session.commit()

        # 6. PARTICIPATION (For P1 history & LinkedIn generator)
        part_asha = Participation(
            user_id=asha.id,
            opportunity_id=opps[6].id,  # GnaN Grand Hackathon
            status="attended",
            reflection_text="Led our multidisciplinary team through 36 hours of non-stop rapid prototyping. Built an AI computer vision triage agent for emergency campus first-response."
        )
        session.add(part_asha)
        session.commit()

        # 7. TEAMS & SKILL COVERAGE (PRD §10)
        print("Seeding teams demonstrating fillable and unfillable missing skills...")
        # Team 1: "SmartCampus Navigator" needing Python, React, Flutter (Fillable via Meena!)
        team1 = Team(
            name="SmartCampus Navigator",
            description="Developing an indoor Bluetooth BLE + Flutter navigation app for GnaN University buildings.",
            owner_id=asha.id,
            opportunity_id=opps[6].id,  # Linked to Hackathon
            required_skills_json=json.dumps(["Python", "React", "Flutter"]),
            max_size=4,
            is_open=True
        )
        session.add(team1)
        session.commit()
        session.refresh(team1)

        # Asha is leader member (has Python, React) -> Flutter is MISSING
        member_asha = TeamMember(team_id=team1.id, user_id=asha.id, role="leader")
        session.add(member_asha)
        session.commit()

        # Team 2: "Autonomous Rover Club" needing Rust, Kubernetes (Unfillable -> E5 "no match currently available")
        team2 = Team(
            name="Autonomous Rover Club",
            description="High-reliability embedded flight and rover telemetry platform written in safe systems languages.",
            owner_id=ravi.id,
            opportunity_id=opps[3].id,
            required_skills_json=json.dumps(["Rust", "Kubernetes"]),
            max_size=3,
            is_open=True
        )
        session.add(team2)
        session.commit()
        session.refresh(team2)

        member_ravi_t2 = TeamMember(team_id=team2.id, user_id=ravi.id, role="leader")
        session.add(member_ravi_t2)
        session.commit()

        # 8. TASKS (PRD §10: various owners & statuses, plus one unassigned)
        print("Seeding tasks including one unassigned task...")
        task1 = Task(
            team_id=team1.id,
            title="Design Floor Plan GeoJSON Schemas",
            description="Draft standard coordinates for Block A and Block B hallways.",
            owner_id=asha.id,
            deadline=now + timedelta(days=3),
            status="in_progress",
            created_by=asha.id
        )
        task2 = Task(
            team_id=team1.id,
            title="Setup FastAPI Routing Microservice",
            description="Pathfinding graph search endpoint using Dijkstra / A*.",
            owner_id=asha.id,
            deadline=now + timedelta(days=6),
            status="todo",
            created_by=asha.id
        )
        # Deliberately unassigned task (e.g. previous member left -> E7)
        task_unassigned = Task(
            team_id=team1.id,
            title="Implement BLE Beacon Proximity Estimator",
            description="Filter signal RSSI noise to calculate user meter radius.",
            owner_id=None,  # UNASSIGNED!
            deadline=now + timedelta(days=5),
            status="todo",
            created_by=asha.id
        )
        task_done = Task(
            team_id=team1.id,
            title="Initial Problem Statement Architecture Review",
            description="Finalize database schema and technical stack choices.",
            owner_id=asha.id,
            deadline=now - timedelta(days=1),
            status="done",
            created_by=asha.id
        )

        session.add_all([task1, task2, task_unassigned, task_done])
        session.commit()

        print("Database seeded successfully with demo accounts, opportunities, applications, teams, and edge cases!")

if __name__ == "__main__":
    seed_database()
