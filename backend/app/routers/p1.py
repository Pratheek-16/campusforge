import json
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, Opportunity, Application, StudentProfile, Participation, SavedOpportunity
from app.schemas import FitAssessment, LinkedInDraftRequest, LinkedInDraftResponse
from app.dependencies import require_role
from app.services.status_engine import compute_opportunity_status, normalize_utc
from app.services.fit_engine import calculate_opportunity_fit
from app.services.content_generator import generate_linkedin_draft
from app.services.skill_matcher import normalize_skill, normalize_skill_set
from app.config import settings

router = APIRouter(prefix="/p1", tags=["P1 Advanced Intelligence"])

@router.get("/recommendations")
def get_recommendations(
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    """
    PRD §4.11 Recommendations:
    Reuses deterministic fit engine over active opportunities.
    Ranks by score descending, explaining why each is recommended. Excludes expired.
    """
    profile = session.exec(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    ).first()

    student_skills = json.loads(profile.skills_json) if profile and profile.skills_json else []
    student_interests = json.loads(profile.interests_json) if profile and profile.interests_json else []
    student_availability = profile.availability if profile else "Available"

    participations = session.exec(
        select(Participation).where(Participation.user_id == current_user.id)
    ).all()
    prior_cats = []
    for p in participations:
        p_opp = session.get(Opportunity, p.opportunity_id)
        if p_opp:
            prior_cats.append(p_opp.category)

    opportunities = session.exec(select(Opportunity)).all()
    recommended = []

    for opp in opportunities:
        c_status = compute_opportunity_status(
            start_at=opp.start_at,
            end_at=opp.end_at,
            deadline_at=opp.deadline_at,
            is_closed=opp.is_closed
        )
        # Exclude expired or closed
        if c_status in ["expired", "closed", "completed"]:
            continue

        assessment = calculate_opportunity_fit(
            student_skills=student_skills,
            student_interests=student_interests,
            student_year=current_user.year,
            student_department=current_user.department,
            student_availability=student_availability,
            required_skills=json.loads(opp.required_skills_json or "[]"),
            allowed_years=json.loads(opp.allowed_years_json or "[]"),
            allowed_depts=json.loads(opp.allowed_depts_json or "[]"),
            category=opp.category,
            prior_participated_categories=prior_cats,
            opportunity_id=opp.id
        )

        # Highlight string: "Recommended because: matches Python, FastAPI; open to 2nd years; deadline in 6 days."
        highlight_parts = []
        if assessment.matched_skills:
            highlight_parts.append(f"matches {', '.join(assessment.matched_skills[:2])}")
        if current_user.year:
            highlight_parts.append(f"open to Year {current_user.year} students")
        if opp.deadline_at:
            days_left = (normalize_utc(opp.deadline_at) - datetime.now(timezone.utc)).days
            if days_left >= 0:
                highlight_parts.append(f"deadline in {days_left} day(s)")

        rec_explanation = "Recommended because: " + "; ".join(highlight_parts) if highlight_parts else "General recommendation based on your profile"

        recommended.append({
            "opportunity_id": opp.id,
            "title": opp.title,
            "category": opp.category,
            "organizer_name": opp.organizer_name,
            "deadline_at": opp.deadline_at,
            "fit_score": assessment.score,
            "fit_label": assessment.label,
            "explanation": rec_explanation,
            "matched_skills": assessment.matched_skills,
            "missing_skills": assessment.missing_skills
        })

    # Sort descending by fit score
    recommended.sort(key=lambda r: r["fit_score"], reverse=True)
    return recommended

@router.post("/linkedin-draft/{opportunity_id}", response_model=LinkedInDraftResponse)
def create_linkedin_draft_endpoint(
    opportunity_id: int,
    data: LinkedInDraftRequest,
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    """
    PRD §4.11: Generates an editable LinkedIn post draft with copy button and explicit note:
    'Not posted automatically'.
    """
    opp = session.get(Opportunity, opportunity_id)
    if not opp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")

    profile = session.exec(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    ).first()
    student_skills = json.loads(profile.skills_json) if profile and profile.skills_json else []

    draft_result = generate_linkedin_draft(
        opportunity_title=opp.title,
        category=opp.category,
        organizer_name=opp.organizer_name,
        skills_gained=student_skills[:3],
        student_reflection=data.reflection or "",
        student_name=current_user.name,
        gemini_key=settings.GEMINI_API_KEY
    )

    return LinkedInDraftResponse(
        draft=draft_result["draft"],
        source=draft_result["source"]
    )

@router.get("/activity-stream")
def get_daily_activity_stream(
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    """PRD §4.11: Derived prioritized activity feed."""
    now = datetime.now(timezone.utc)
    activities = []

    # 1. Status changes on my applications
    apps = session.exec(
        select(Application).where(Application.user_id == current_user.id).order_by(Application.applied_at.desc())
    ).all()
    for a in apps:
        opp = session.get(Opportunity, a.opportunity_id)
        opp_name = opp.title if opp else "Opportunity"
        activities.append({
            "type": "application_status",
            "title": f"Application Status: {a.status.replace('_', ' ').title()}",
            "description": f"Your application for '{opp_name}' is currently {a.status.replace('_', ' ')}.",
            "timestamp": a.applied_at
        })

    # 2. Deadlines closing in <= 3 days for saved items
    saved = session.exec(
        select(SavedOpportunity).where(SavedOpportunity.user_id == current_user.id)
    ).all()
    for s in saved:
        opp = session.get(Opportunity, s.opportunity_id)
        if opp and opp.deadline_at:
            norm_dl = normalize_utc(opp.deadline_at)
            days_left = (norm_dl - now).days
            if 0 <= days_left <= 3:
                activities.append({
                    "type": "urgent_deadline",
                    "title": f"Deadline Approaching: {opp.title}",
                    "description": f"Registration closes in {days_left} day(s) on {opp.deadline_at.strftime('%b %d')}.",
                    "timestamp": opp.deadline_at
                })

    activities.sort(key=lambda a: normalize_utc(a["timestamp"]), reverse=True)
    return activities[:10]
