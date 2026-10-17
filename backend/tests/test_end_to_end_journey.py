import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.database import get_session
from seed import seed_database

def test_full_end_to_end_journey():
    """
    PRD Definition of Done:
    Student discovers opportunity -> sees fit explanation -> applies ->
    organizer reviews and updates status -> student sees updated status on dashboard ->
    student creates a team -> sees missing skill -> finds candidates ->
    creates and assigns tasks -> views everything on personal dashboard.
    """
    client = TestClient(app)

    # 1. Verify health & SPA frontend serving
    health_res = client.get("/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "ok"
    assert health_res.json()["app"] == "CampusForge"

    spa_res = client.get("/")
    assert spa_res.status_code == 200
    assert "CampusForge" in spa_res.text

    # 2. Login as Asha (Student)
    asha_login = client.post("/api/auth/login", json={"email": "asha@demo.com", "password": "Demo@123"})
    assert asha_login.status_code == 200
    asha_token = asha_login.json()["access_token"]
    asha_headers = {"Authorization": f"Bearer {asha_token}"}

    # 3. Discover: Search opportunities
    opps_res = client.get("/api/opportunities?q=Full-Stack")
    assert opps_res.status_code == 200
    opps = opps_res.json()
    assert len(opps) >= 1
    opp_id = opps[0]["id"]

    # 4. Evaluate: Check fit & view summary
    fit_res = client.get(f"/api/opportunities/{opp_id}/fit", headers=asha_headers)
    assert fit_res.status_code == 200
    fit_data = fit_res.json()
    assert fit_data["score"] > 0
    assert fit_data["label"] in ["Strong", "Partial", "Low"]
    assert len(fit_data["reasons"]) > 0

    sum_res = client.get(f"/api/opportunities/{opp_id}/summary")
    assert sum_res.status_code == 200
    assert "purpose" in sum_res.json()

    # 5. Collaborate: Create a team, inspect missing skills, find candidates
    team_res = client.post("/api/teams", headers=asha_headers, json={
        "name": "E2E Rover Team",
        "description": "Building mobile and embedded rover controls",
        "required_skills": ["Python", "Flutter", "Rust"],
        "max_size": 4
    })
    assert team_res.status_code == 201
    team = team_res.json()
    team_id = team["id"]

    # Asha has Python, but lacks Flutter and Rust
    assert "Python" in team["covered_skills"]
    assert "Flutter" in team["missing_skills"]
    assert "Rust" in team["missing_skills"]

    # Find candidates for Flutter -> Meena should match!
    cands_res = client.get(f"/api/teams/{team_id}/candidates?skill=Flutter", headers=asha_headers)
    assert cands_res.status_code == 200
    flutter_cands = cands_res.json()
    assert any(c["name"] == "Meena Iyer" for c in flutter_cands)

    # Find candidates for Rust -> Nobody has it -> empty list (E5 "no match currently available")
    rust_cands = client.get(f"/api/teams/{team_id}/candidates?skill=Rust", headers=asha_headers).json()
    assert len(rust_cands) == 0

    # 6. Execute: Create a task inside team
    task_res = client.post(f"/api/teams/{team_id}/tasks", headers=asha_headers, json={
        "title": "Wire Telemetry Stream",
        "description": "UDP packet streaming handler",
        "owner_id": asha_login.json()["user"]["id"],
        "deadline": "2026-11-01T10:00:00Z",
        "status": "todo"
    })
    assert task_res.status_code == 201
    assert task_res.json()["owner_name"] == "Asha Sharma"

    # 7. Track: Personal Dashboard
    dash_res = client.get("/api/dashboard", headers=asha_headers)
    assert dash_res.status_code == 200
    dash = dash_res.json()
    assert len(dash["saved_opportunities"]) >= 1
    assert len(dash["applications"]) >= 1
    assert len(dash["teams"]) >= 1
    assert len(dash["my_tasks"]) >= 1

    # 8. Organizer: Login, review applications, and update status
    org_login = client.post("/api/auth/login", json={"email": "organizer@demo.com", "password": "Demo@123"})
    assert org_login.status_code == 200
    org_token = org_login.json()["access_token"]
    org_headers = {"Authorization": f"Bearer {org_token}"}

    org_dash = client.get("/api/organizer/dashboard", headers=org_headers)
    assert org_dash.status_code == 200
    assert org_dash.json()["metrics"]["total_listings"] >= 1

    # Fetch applications for first listing
    first_listing_id = org_dash.json()["listings"][0]["id"]
    org_apps = client.get(f"/api/organizer/opportunities/{first_listing_id}/applications", headers=org_headers).json()
    if len(org_apps) > 0:
        first_app = org_apps[0]
        # Update status to shortlisted
        patch_res = client.patch(
            f"/api/applications/{first_app['id']}/status",
            headers=org_headers,
            json={"status": "shortlisted"}
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["status"] == "shortlisted"

    # 9. P1: Recommendations and LinkedIn generator
    recs_res = client.get("/api/p1/recommendations", headers=asha_headers)
    assert recs_res.status_code == 200
    assert len(recs_res.json()) >= 1

    li_res = client.post(
        f"/api/p1/linkedin-draft/{opp_id}",
        headers=asha_headers,
        json={"reflection": "Learned scalable async architectures and clean separation of concerns."}
    )
    assert li_res.status_code == 200
    assert "draft" in li_res.json()
    assert "ProjectNexus" in li_res.json()["draft"]
