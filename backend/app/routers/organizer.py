import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, Opportunity, Application, StudentProfile
from app.schemas import ApplicationRead, OpportunityRead
from app.dependencies import require_role
from app.services.status_engine import compute_opportunity_status
from app.services.skill_matcher import normalize_skill, normalize_skill_set
from app.routers.opportunities import format_opportunity_response

router = APIRouter(prefix="/organizer", tags=["Organizer Workspace"])

@router.get("/dashboard")
def get_organizer_dashboard(
    current_user: User = Depends(require_role("organizer")),
    session: Session = Depends(get_session)
):
    # Retrieve only organizer's own listings
    listings = session.exec(
        select(Opportunity).where(Opportunity.posted_by == current_user.id).order_by(Opportunity.created_at.desc())
    ).all()

    total_listings = len(listings)
    active_listings = 0
    total_applications = 0
    status_counts = {
        "submitted": 0,
        "under_review": 0,
        "shortlisted": 0,
        "rejected": 0,
        "accepted": 0
    }

    formatted_listings = []
    for opp in listings:
        c_status = compute_opportunity_status(
            start_at=opp.start_at,
            end_at=opp.end_at,
            deadline_at=opp.deadline_at,
            is_closed=opp.is_closed
        )
        if c_status in ["upcoming", "ongoing"]:
            active_listings += 1

        apps = session.exec(
            select(Application).where(Application.opportunity_id == opp.id)
        ).all()
        app_count = len(apps)
        total_applications += app_count

        for a in apps:
            if a.status in status_counts:
                status_counts[a.status] += 1

        formatted_listings.append({
            "id": opp.id,
            "title": opp.title,
            "category": opp.category,
            "computed_status": c_status,
            "deadline_at": opp.deadline_at,
            "start_at": opp.start_at,
            "is_closed": opp.is_closed,
            "applications_count": app_count
        })

    return {
        "metrics": {
            "total_listings": total_listings,
            "active_listings": active_listings,
            "total_applications": total_applications,
            "status_counts": status_counts
        },
        "listings": formatted_listings
    }

@router.get("/opportunities/{id}/applications", response_model=List[ApplicationRead])
def get_opportunity_applications(
    id: int,
    status_filter: Optional[str] = None,
    current_user: User = Depends(require_role("organizer")),
    session: Session = Depends(get_session)
):
    opp = session.get(Opportunity, id)
    if not opp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")

    if opp.posted_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view applications for another organizer's listing"
        )

    query = select(Application).where(Application.opportunity_id == id)
    if status_filter and status_filter.lower() != "all":
        query = query.where(Application.status == status_filter.lower())

    apps = session.exec(query.order_by(Application.applied_at.desc())).all()
    req_skills = json.loads(opp.required_skills_json or "[]")

    results = []
    for app in apps:
        student = session.get(User, app.user_id)
        profile = session.exec(
            select(StudentProfile).where(StudentProfile.user_id == app.user_id)
        ).first()

        student_skills = json.loads(profile.skills_json) if profile and profile.skills_json else []
        norm_skills = normalize_skill_set(student_skills)
        matched_count = sum(1 for r in req_skills if normalize_skill(r) in norm_skills)

        results.append(ApplicationRead(
            id=app.id,
            user_id=app.user_id,
            opportunity_id=app.opportunity_id,
            note=app.note,
            status=app.status,
            applied_at=app.applied_at,
            student_name=student.name if student else "Unknown",
            student_email=student.email if student else "Unknown",
            student_skills=student_skills,
            opportunity_title=opp.title,
            opportunity_category=opp.category,
            matched_skill_count=matched_count
        ))

    return results
