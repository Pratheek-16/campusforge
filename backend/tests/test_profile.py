import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.database import get_session
from app.services.resume_parser import deterministic_parse_resume

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

def test_resume_parser_deterministic():
    sample_text = """
    Asha Sharma
    B.Tech Computer Science and Engineering, CGPA: 9.2, 2022-2026
    Skills: Python, FastAPI, React, JavaScript, Machine Learning, Docker, SQL
    Projects:
    - Built a real-time smart campus navigation system using React and Python
    - Developed an automated resume parsing platform with Machine Learning
    """
    data = deterministic_parse_resume(sample_text)
    assert "Python" in data["suggested_skills"]
    assert "React" in data["suggested_skills"]
    assert "Machine Learning" in data["suggested_skills"]
    assert data["suggested_education"]["gpa"] == "9.2"
    assert len(data["suggested_projects"]) >= 1

def test_student_profile_flow(client: TestClient):
    # Register student
    reg = client.post("/api/auth/register", json={
        "email": "asha_profile@demo.com",
        "password": "Password123!",
        "name": "Asha Sharma",
        "role": "student",
        "college": "GnaN University",
        "department": "CSE",
        "year": 3
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get initial profile
    res = client.get("/api/profile", headers=headers)
    assert res.status_code == 200
    assert res.json()["user"]["name"] == "Asha Sharma"

    # 2. Update with empty skills should fail with 422
    bad_update = client.put("/api/profile", headers=headers, json={
        "name": "Asha",
        "college": "GnaN",
        "department": "CSE",
        "year": 3,
        "skills": []
    })
    assert bad_update.status_code == 422

    # 3. Valid update
    valid_update = client.put("/api/profile", headers=headers, json={
        "name": "Asha Sharma",
        "college": "GnaN University",
        "department": "CSE",
        "year": 3,
        "phone": "+91 9876543210",
        "skills": ["Python", "FastAPI", "React", "SQL"],
        "interests": ["Web Development", "Artificial Intelligence"],
        "availability": "Available"
    })
    assert valid_update.status_code == 200
    p = valid_update.json()
    assert "Python" in p["skills"]
    assert p["phone"] == "+91 9876543210"
