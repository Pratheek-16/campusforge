import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, Opportunity, Application, StudentProfile, Participation, SavedOpportunity
from app.schemas import (
    ApplicationCreate,
    ApplicationRead,
    ApplicationStatusUpdate,
    OpportunityRead
)
from app.dependencies import get_current_user, require_role
from app.services.status_engine import compute_opportunity_status, is_opportunity_open_for_apply
from app.services.skill_matcher import normalize_skill, normalize_skill_set
from app.routers.opportunities import format_opportunity_response

router = APIRouter(tags=["Applications & Participation"])

@router.post("/opportunities/{id}/apply", response_model=ApplicationRead, status_code=status.HTTP_201_CREATED)
def apply_to_opportunity(
    id: int,
    data: ApplicationCreate,
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    opp = session.get(Opportunity, id)
    if not opp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")

    # 1. Deadline & Status Enforcement (E1 & E2)
    comp_status = compute_opportunity_status(
        start_at=opp.start_at,
        end_at=opp.end_at,
        deadline_at=opp.deadline_at,
        is_closed=opp.is_closed
    )
    can_apply, reason_msg = is_opportunity_open_for_apply(comp_status)
    if not can_apply:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=reason_msg
        )

    # 2. Duplicate Application Prevention (E3)
    existing_app = session.exec(
        select(Application).where(
            Application.user_id == current_user.id,
            Application.opportunity_id == id
        )
    ).first()
    if existing_app:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"You have already submitted an application for this opportunity (Status: {existing_app.status})"
        )

    # 3. Strict Eligibility Verification (E12)
    if opp.strict_eligibility:
        allowed_years = json.loads(opp.allowed_years_json or "[]")
        allowed_depts = json.loads(opp.allowed_depts_json or "[]")
        
        ineligible_reasons = []
        if allowed_years and current_user.year not in allowed_years:
            ineligible_reasons.append(f"Requires academic year {allowed_years}, but your profile is Year {current_user.year or 'unspecified'}")
        
        if allowed_depts and (current_user.department or "").strip().lower() not in [d.lower() for d in allowed_depts]:
            ineligible_reasons.append(f"Restricted to departments: {', '.join(allowed_depts)}")

        if ineligible_reasons:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Eligibility criteria not met: {' and '.join(ineligible_reasons)}"
            )

    # Create application
    application = Application(
        user_id=current_user.id,
        opportunity_id=id,
        note=data.note or "",
        status="submitted"
    )
    session.add(application)
    session.commit()
    session.refresh(application)

    # Student skills count calculation
    profile = session.exec(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    ).first()
    student_skills = json.loads(profile.skills_json) if profile and profile.skills_json else []
    norm_skills = normalize_skill_set(student_skills)
    req_skills = json.loads(opp.required_skills_json or "[]")
    matched_count = sum(1 for r in req_skills if normalize_skill(r) in norm_skills)

    return ApplicationRead(
        id=application.id,
        user_id=application.user_id,
        opportunity_id=application.opportunity_id,
        note=application.note,
        status=application.status,
        applied_at=application.applied_at,
        student_name=current_user.name,
        student_email=current_user.email,
        student_skills=student_skills,
        opportunity_title=opp.title,
        opportunity_category=opp.category,
        matched_skill_count=matched_count
    )

@router.post("/opportunities/{id}/register", status_code=status.HTTP_200_OK)
def register_for_event(
    id: int,
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    """Mark 'I registered' for non-internship events to feed participation."""
    opp = session.get(Opportunity, id)
    if not opp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")

    existing = session.exec(
        select(Participation).where(
            Participation.user_id == current_user.id,
            Participation.opportunity_id == id
        )
    ).first()

    if not existing:
        part = Participation(
            user_id=current_user.id,
            opportunity_id=id,
            status="registered"
        )
        session.add(part)
        session.commit()

    return {"message": "Successfully recorded registration", "status": "registered"}

@router.get("/applications/mine", response_model=List[ApplicationRead])
def get_my_applications(
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    apps = session.exec(
        select(Application).where(Application.user_id == current_user.id).order_by(Application.applied_at.desc())
    ).all()

    profile = session.exec(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    ).first()
    student_skills = json.loads(profile.skills_json) if profile and profile.skills_json else []
    norm_skills = normalize_skill_set(student_skills)

    results = []
    for app in apps:
        opp = session.get(Opportunity, app.opportunity_id)
        matched_count = 0
        if opp:
            req_skills = json.loads(opp.required_skills_json or "[]")
            matched_count = sum(1 for r in req_skills if normalize_skill(r) in norm_skills)

        results.append(ApplicationRead(
            id=app.id,
            user_id=app.user_id,
            opportunity_id=app.opportunity_id,
            note=app.note,
            status=app.status,
            applied_at=app.applied_at,
            student_name=current_user.name,
            student_email=current_user.email,
            student_skills=student_skills,
            opportunity_title=opp.title if opp else "Unknown Opportunity",
            opportunity_category=opp.category if opp else "internship",
            matched_skill_count=matched_count
        ))
    return results

@router.get("/saved", response_model=List[OpportunityRead])
def get_saved_opportunities(
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    """PRD §4.3 & E1: Saved opportunities stay visible with live computed status after expiry."""
    saved_items = session.exec(
        select(SavedOpportunity).where(SavedOpportunity.user_id == current_user.id).order_by(SavedOpportunity.saved_at.desc())
    ).all()

    results = []
    for item in saved_items:
        opp = session.get(Opportunity, item.opportunity_id)
        if opp:
            results.append(format_opportunity_response(opp, current_user, session))
    return results

@router.patch("/applications/{id}/status", response_model=ApplicationRead)
def update_application_status(
    id: int,
    data: ApplicationStatusUpdate,
    current_user: User = Depends(require_role("organizer", "ambassador")),
    session: Session = Depends(get_session)
):
    valid_statuses = ["submitted", "under_review", "shortlisted", "rejected", "accepted"]
    new_status = data.status.lower()
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status '{data.status}'. Must be one of {valid_statuses}"
        )

    app = session.get(Application, id)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    opp = session.get(Opportunity, app.opportunity_id)
    if not opp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated opportunity not found")

    # Organizer can only update applications for their own listings
    if current_user.role == "organizer" and opp.posted_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to update applications for another organizer's listing"
        )

    app.status = new_status
    session.add(app)
    session.commit()
    session.refresh(app)

    # Fetch applicant details
    student = session.get(User, app.user_id)
    profile = session.exec(
        select(StudentProfile).where(StudentProfile.user_id == app.user_id)
    ).first()
    student_skills = json.loads(profile.skills_json) if profile and profile.skills_json else []
    norm_skills = normalize_skill_set(student_skills)
    req_skills = json.loads(opp.required_skills_json or "[]")
    matched_count = sum(1 for r in req_skills if normalize_skill(r) in norm_skills)

    return ApplicationRead(
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
    )
