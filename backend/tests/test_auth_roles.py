import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.database import get_session

# In-memory database for tests
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

def test_register_and_login(client: TestClient):
    # 1. Register student
    reg_payload = {
        "email": "teststudent@demo.com",
        "password": "Password123!",
        "name": "Test Student",
        "role": "student",
        "college": "Engineering College A",
        "department": "CSE",
        "year": 3
    }
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 201, res.text
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "teststudent@demo.com"
    assert data["user"]["role"] == "student"

    # 2. Duplicate registration returns 409
    res_dup = client.post("/api/auth/register", json=reg_payload)
    assert res_dup.status_code == 409

    # 3. Login success
    login_res = client.post("/api/auth/login", json={
        "email": "teststudent@demo.com",
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # 4. Auth me
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["name"] == "Test Student"

    # 5. Invalid credentials
    bad_login = client.post("/api/auth/login", json={
        "email": "teststudent@demo.com",
        "password": "WrongPassword"
    })
    assert bad_login.status_code == 401
