import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.database import get_session
from app.models import Opportunity, User, StudentProfile
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

def test_application_edge_cases(client: TestClient, session: Session):
    # Create Organizer
    org = User(
        email="org@demo.com",
        password_hash=hash_password("Demo@123"),
        role="organizer",
        name="Lead Organizer"
    )
    # Create Student (Year 2, ECE)
    student = User(
        email="ravi_app@demo.com",
        password_hash=hash_password("Demo@123"),
        role="student",
        name="Ravi Kumar",
        college="GnaN Tech",
        department="ECE",
        year=2
    )
    session.add(org)
    session.add(student)
    session.commit()
    session.refresh(org)
    session.refresh(student)

    # Student token
    login_res = client.post("/api/auth/login", json={"email": "ravi_app@demo.com", "password": "Demo@123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    now = datetime.now(timezone.utc)

    # 1. Active Opportunity
    active_opp = Opportunity(
        title="Frontend Internship",
        description="Build responsive web applications in React.",
        category="internship",
        required_skills_json='["React", "JavaScript"]',
        start_at=now + timedelta(days=10),
        deadline_at=now + timedelta(days=5),
        organizer_name="TechCorp",
        posted_by=org.id
    )
    # 2. Expired Opportunity (E1)
    expired_opp = Opportunity(
        title="Expired Hackathon",
        description="Past registration deadline.",
        category="hackathon",
        start_at=now + timedelta(days=10),
        deadline_at=now - timedelta(days=1),
        organizer_name="Hacks Inc",
        posted_by=org.id
    )
    # 3. Null Deadline Opportunity (E2)
    null_deadline_opp = Opportunity(
        title="Legacy Workshop",
        description="No deadline specified in system.",
        category="workshop",
        start_at=now + timedelta(days=10),
        deadline_at=None,
        organizer_name="Workshops Guild",
        posted_by=org.id
    )
    # 4. Strict Eligibility (E12): Requires Year 3 only, CSE department
    strict_opp = Opportunity(
        title="Advanced Systems Fellowship",
        description="Strictly for 3rd year CSE students.",
        category="internship",
        allowed_years_json="[3]",
        allowed_depts_json='["CSE"]',
        strict_eligibility=True,
        start_at=now + timedelta(days=15),
        deadline_at=now + timedelta(days=7),
        organizer_name="Deep Systems",
        posted_by=org.id
    )

    session.add_all([active_opp, expired_opp, null_deadline_opp, strict_opp])
    session.commit()

    # TEST: Apply to active opp -> 201 Created
    res1 = client.post(f"/api/opportunities/{active_opp.id}/apply", headers=headers, json={"note": "Excited to apply"})
    assert res1.status_code == 201
    assert res1.json()["status"] == "submitted"

    # TEST E3: Duplicate application -> 409 Conflict
    res_dup = client.post(f"/api/opportunities/{active_opp.id}/apply", headers=headers, json={"note": "Applying again"})
    assert res_dup.status_code == 409
    assert "already submitted" in res_dup.json()["detail"].lower()

    # TEST E1: Expired opportunity application -> 400 Bad Request
    res_exp = client.post(f"/api/opportunities/{expired_opp.id}/apply", headers=headers, json={})
    assert res_exp.status_code == 400
    assert "deadline has passed" in res_exp.json()["detail"].lower()

    # TEST E2: Null deadline opportunity application -> 400 Bad Request
    res_null = client.post(f"/api/opportunities/{null_deadline_opp.id}/apply", headers=headers, json={})
    assert res_null.status_code == 400
    assert "deadline not specified" in res_null.json()["detail"].lower()

    # TEST E12: Strict eligibility mismatch (Year 2 student applying to Year 3 only opp) -> 403 Forbidden
    res_strict = client.post(f"/api/opportunities/{strict_opp.id}/apply", headers=headers, json={})
    assert res_strict.status_code == 403
    assert "eligibility criteria not met" in res_strict.json()["detail"].lower()

    # TEST E1: Saved expired opportunity remains visible with status="expired"
    save_res = client.post(f"/api/opportunities/{expired_opp.id}/save", headers=headers)
    assert save_res.status_code == 200
    saved_list = client.get("/api/saved", headers=headers).json()
    assert len(saved_list) == 1
    assert saved_list[0]["id"] == expired_opp.id
    assert saved_list[0]["computed_status"] == "expired"
