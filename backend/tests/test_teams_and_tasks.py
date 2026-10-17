import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.database import get_session
from app.models import User, StudentProfile, Team, TeamMember, Task
from app.security import hash_password

@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session

@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()

def test_teams_skills_and_tasks_workflow(client: TestClient, session: Session):
    # 1. Create Asha (Owner: Python, React)
    asha = User(email="asha_t@demo.com", password_hash=hash_password("Demo@123"), role="student", name="Asha Sharma")
    session.add(asha)
    session.commit()
    session.refresh(asha)
    session.add(StudentProfile(user_id=asha.id, skills_json='["Python", "React"]', availability="Available"))

    # 2. Create Meena (Candidate: Flutter, UI/UX)
    meena = User(email="meena_t@demo.com", password_hash=hash_password("Demo@123"), role="student", name="Meena Iyer")
    session.add(meena)
    session.commit()
    session.refresh(meena)
    session.add(StudentProfile(user_id=meena.id, skills_json='["Flutter", "UI/UX"]', availability="Busy"))

    # 3. Create Ravi (No Flutter, has Node.js)
    ravi = User(email="ravi_t@demo.com", password_hash=hash_password("Demo@123"), role="student", name="Ravi Kumar")
    session.add(ravi)
    session.commit()
    session.refresh(ravi)
    session.add(StudentProfile(user_id=ravi.id, skills_json='["Node.js"]', availability="Available"))

    session.commit()

    # Login as Asha
    tok_res = client.post("/api/auth/login", json={"email": "asha_t@demo.com", "password": "Demo@123"})
    asha_token = tok_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {asha_token}"}

    # 4. Create Team requiring Python, React, Flutter, and Rust
    create_res = client.post("/api/teams", headers=headers, json={
        "name": "Smart Campus Navigator",
        "description": "Building mobile indoor navigation",
        "required_skills": ["Python", "React", "Flutter", "Rust"],
        "max_size": 4
    })
    assert create_res.status_code == 201
    team = create_res.json()
    team_id = team["id"]

    # Check skill coverage: Asha covers Python & React; Flutter & Rust are missing
    assert "Python" in team["covered_skills"]
    assert "React" in team["covered_skills"]
    assert "Flutter" in team["missing_skills"]
    assert "Rust" in team["missing_skills"]

    # 5. Candidate search for Flutter (E5 & E6)
    cand_res = client.get(f"/api/teams/{team_id}/candidates?skill=Flutter", headers=headers)
    assert cand_res.status_code == 200
    candidates = cand_res.json()
    assert len(candidates) == 1
    assert candidates[0]["name"] == "Meena Iyer"
    assert "Flutter" in candidates[0]["matched_skills"]
    # Ravi does NOT have Flutter, so MUST NOT appear (E6)
    assert not any(c["name"] == "Ravi Kumar" for c in candidates)

    # 6. Candidate search for Rust (Nobody has it -> E5 "no match currently available")
    rust_cands = client.get(f"/api/teams/{team_id}/candidates?skill=Rust", headers=headers).json()
    assert len(rust_cands) == 0  # Frontend will show "No match currently available"

    # 7. Add Ravi as a member
    member_ravi = TeamMember(team_id=team_id, user_id=ravi.id, role="member")
    session.add(member_ravi)
    session.commit()

    # 8. Task creation (E7): Owner required and must be team member
    now = datetime.now(timezone.utc)
    # Task assigned to outsider (should fail with 400)
    outsider = User(email="outsider@demo.com", password_hash="x", role="student", name="Outsider")
    session.add(outsider)
    session.commit()

    bad_task = client.post(f"/api/teams/{team_id}/tasks", headers=headers, json={
        "title": "Backend API",
        "owner_id": outsider.id,
        "deadline": (now + timedelta(days=3)).isoformat(),
        "status": "todo"
    })
    assert bad_task.status_code == 400
    assert "active member" in bad_task.json()["detail"].lower()

    # Valid task assigned to Ravi
    valid_task = client.post(f"/api/teams/{team_id}/tasks", headers=headers, json={
        "title": "Build Node Middleware",
        "description": "Express gateway setup",
        "owner_id": ravi.id,
        "deadline": (now + timedelta(days=3)).isoformat(),
        "status": "todo"
    })
    assert valid_task.status_code == 201
    task_id = valid_task.json()["id"]

    # 9. CONSISTENCY E7: When member leaves, open tasks become 'Unassigned — needs owner'
    del_res = client.delete(f"/api/teams/{team_id}/members/{ravi.id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["unassigned_tasks_count"] == 1

    # Verify task state
    tasks_res = client.get(f"/api/teams/{team_id}/tasks", headers=headers).json()
    unassigned_t = [t for t in tasks_res if t["id"] == task_id][0]
    assert unassigned_t["owner_id"] is None
    assert unassigned_t["is_unassigned"] is True
    assert "Unassigned" in unassigned_t["owner_name"]
