import json
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, or_

from app.database import get_session
from app.models import User, Opportunity, SavedOpportunity, Application, StudentProfile, Participation
from app.schemas import OpportunityCreate, OpportunityUpdate, OpportunityRead, FitAssessment, OpportunitySummary
from app.dependencies import get_current_user, get_optional_user, require_role
from app.services.status_engine import compute_opportunity_status, normalize_utc
from app.services.fit_engine import calculate_opportunity_fit
from app.services.content_generator import generate_opportunity_summary
from app.config import settings

router = APIRouter(prefix="/opportunities", tags=["Opportunities"])

def format_opportunity_response(
    opp: Opportunity,
    current_user: Optional[User],
    session: Session
) -> OpportunityRead:
    comp_status = compute_opportunity_status(
        start_at=opp.start_at,
        end_at=opp.end_at,
        deadline_at=opp.deadline_at,
        is_closed=opp.is_closed
    )
    
    is_saved = False
    app_status = None
    if current_user:
        saved_entry = session.exec(
            select(SavedOpportunity).where(
                SavedOpportunity.user_id == current_user.id,
                SavedOpportunity.opportunity_id == opp.id
            )
        ).first()
        is_saved = saved_entry is not None

        application_entry = session.exec(
            select(Application).where(
                Application.user_id == current_user.id,
                Application.opportunity_id == opp.id
            )
        ).first()
        if application_entry:
            app_status = application_entry.status

    return OpportunityRead(
        id=opp.id,
        title=opp.title,
        description=opp.description,
        category=opp.category,
        eligibility_text=opp.eligibility_text,
        allowed_years=json.loads(opp.allowed_years_json or "[]"),
        allowed_depts=json.loads(opp.allowed_depts_json or "[]"),
        strict_eligibility=opp.strict_eligibility,
        required_skills=json.loads(opp.required_skills_json or "[]"),
        start_at=opp.start_at,
        end_at=opp.end_at,
        deadline_at=opp.deadline_at,
        venue=opp.venue,
        online_link=opp.online_link,
        organizer_name=opp.organizer_name,
        organizer_contact=opp.organizer_contact,
        registration_link=opp.registration_link,
        resources=json.loads(opp.resources_json or "[]"),
        college=opp.college,
        section=opp.section,
        posted_by=opp.posted_by,
        is_closed=opp.is_closed,
        created_at=opp.created_at,
        updated_at=opp.updated_at,
        computed_status=comp_status,
        is_saved=is_saved,
        application_status=app_status
    )

@router.get("", response_model=List[OpportunityRead])
def list_opportunities(
    q: Optional[str] = Query(None, description="Search keyword in title or description"),
    category: Optional[str] = Query(None, description="Filter by category"),
    college: Optional[str] = Query(None, description="Filter by college"),
    skill: Optional[str] = Query(None, description="Filter by required skill"),
    status_filter: Optional[str] = Query("all", description="active, expired, or all"),
    current_user: Optional[User] = Depends(get_optional_user),
    session: Session = Depends(get_session)
):
    query = select(Opportunity)
    
    if q:
        kw = f"%{q.strip().lower()}%"
        query = query.where(
            or_(
                Opportunity.title.ilike(kw),
                Opportunity.description.ilike(kw),
                Opportunity.organizer_name.ilike(kw)
            )
        )
    
    if category and category.lower() != "all":
        query = query.where(Opportunity.category == category.lower())

    if college and college.lower() != "all":
        query = query.where(Opportunity.college.ilike(f"%{college.strip()}%"))

    results = session.exec(query.order_by(Opportunity.start_at.desc())).all()
    
    formatted_list: List[OpportunityRead] = []
    for opp in results:
        read_obj = format_opportunity_response(opp, current_user, session)
        
        # Skill filtering
        if skill:
            req_skills = [s.lower() for s in read_obj.required_skills]
            if skill.lower() not in req_skills:
                continue

        # Status filtering
        if status_filter == "active":
            if read_obj.computed_status in ["expired", "closed", "completed"]:
                continue
        elif status_filter == "expired":
            if read_obj.computed_status != "expired":
                continue

        formatted_list.append(read_obj)

    return formatted_list

@router.get("/{id}", response_model=OpportunityRead)
def get_opportunity(
    id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    session: Session = Depends(get_session)
):
    opp = session.get(Opportunity, id)
    if not opp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    return format_opportunity_response(opp, current_user, session)

@router.post("", response_model=OpportunityRead, status_code=status.HTTP_201_CREATED)
def create_opportunity(
    data: OpportunityCreate,
    current_user: User = Depends(require_role("organizer", "ambassador", "coordinator")),
    session: Session = Depends(get_session)
):
    # Role scope constraints
    if current_user.role == "organizer" and data.category != "internship":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organizers are permitted to publish only internship opportunities"
        )
    
    college_scope = (data.college.strip() if data.college else current_user.college) if current_user.role == "ambassador" else data.college
    section_scope = current_user.section if current_user.role == "coordinator" else data.section

    # Date validation (PRD 4.2: reject invalid dates)
    if data.end_at and data.start_at:
        norm_start = normalize_utc(data.start_at)
        norm_end = normalize_utc(data.end_at)
        if norm_end < norm_start:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="End date cannot be earlier than start date"
            )
        if data.deadline_at:
            norm_deadline = normalize_utc(data.deadline_at)
            if norm_deadline > norm_end:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Registration deadline cannot be after the opportunity end date"
                )

    # Duplicate listing minimization (E11)
    norm_start = normalize_utc(data.start_at)
    existing_all = session.exec(
        select(Opportunity).where(
            Opportunity.title.ilike(data.title.strip()),
            Opportunity.organizer_name.ilike(data.organizer_name.strip())
        )
    ).all()
    
    for ex in existing_all:
        if normalize_utc(ex.start_at) == norm_start:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Near-duplicate opportunity already exists with title '{data.title}' and start date"
            )

    opp = Opportunity(
        title=data.title.strip(),
        description=data.description.strip(),
        category=data.category.lower(),
        eligibility_text=data.eligibility_text or "",
        allowed_years_json=json.dumps(data.allowed_years or []),
        allowed_depts_json=json.dumps(data.allowed_depts or []),
        strict_eligibility=data.strict_eligibility,
        required_skills_json=json.dumps(data.required_skills or []),
        start_at=data.start_at,
        end_at=data.end_at,
        deadline_at=data.deadline_at,
        venue=data.venue,
        online_link=data.online_link,
        organizer_name=data.organizer_name.strip(),
        organizer_contact=data.organizer_contact,
        registration_link=data.registration_link,
        resources_json=json.dumps(data.resources or []),
        college=college_scope,
        section=section_scope,
        posted_by=current_user.id,
        is_closed=False
    )
    session.add(opp)
    session.commit()
    session.refresh(opp)
    return format_opportunity_response(opp, current_user, session)

@router.put("/{id}", response_model=OpportunityRead)
def update_opportunity(
    id: int,
    data: OpportunityUpdate,
    current_user: User = Depends(require_role("organizer", "ambassador", "coordinator")),
    session: Session = Depends(get_session)
):
    opp = session.get(Opportunity, id)
    if not opp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")

    # Ownership checks
    if current_user.role == "organizer" and opp.posted_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit your own listings")
    if current_user.role == "ambassador" and opp.college != current_user.college:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit opportunities for your college")
    if current_user.role == "coordinator":
        if opp.section != current_user.section:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit opportunities for your section")
        # Coordinator has limited fields permission (description, links, dates)
        if data.category and data.category != opp.category:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Coordinators cannot change opportunity category")

    # Update allowed fields
    if data.title is not None:
        opp.title = data.title.strip()
    if data.description is not None:
        opp.description = data.description.strip()
    if data.category is not None and current_user.role != "coordinator":
        opp.category = data.category.lower()
    if data.eligibility_text is not None:
        opp.eligibility_text = data.eligibility_text
    if data.allowed_years is not None:
        opp.allowed_years_json = json.dumps(data.allowed_years)
    if data.allowed_depts is not None:
        opp.allowed_depts_json = json.dumps(data.allowed_depts)
    if data.strict_eligibility is not None:
        opp.strict_eligibility = data.strict_eligibility
    if data.required_skills is not None:
        opp.required_skills_json = json.dumps(data.required_skills)
    if data.start_at is not None:
        opp.start_at = data.start_at
    if data.end_at is not None:
        opp.end_at = data.end_at
    if data.deadline_at is not None:
        opp.deadline_at = data.deadline_at
    if data.venue is not None:
        opp.venue = data.venue
    if data.online_link is not None:
        opp.online_link = data.online_link
    if data.registration_link is not None:
        opp.registration_link = data.registration_link
    if data.is_closed is not None:
        opp.is_closed = data.is_closed

    opp.updated_at = datetime.now(timezone.utc)
    session.add(opp)
    session.commit()
    session.refresh(opp)
    return format_opportunity_response(opp, current_user, session)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_opportunity(
    id: int,
    current_user: User = Depends(require_role("organizer", "ambassador", "coordinator")),
    session: Session = Depends(get_session)
):
    opp = session.get(Opportunity, id)
    if not opp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")

    # Ownership checks
    if current_user.role == "organizer" and opp.posted_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own listings")
    if current_user.role == "ambassador" and opp.college != current_user.college and opp.posted_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete opportunities for your college")
    if current_user.role == "coordinator" and opp.section != current_user.section and opp.posted_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete opportunities for your section")

    session.delete(opp)
    session.commit()
    return None

@router.post("/{id}/save", status_code=status.HTTP_200_OK)
def save_opportunity(
    id: int,
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    opp = session.get(Opportunity, id)
    if not opp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    
    existing = session.exec(
        select(SavedOpportunity).where(
            SavedOpportunity.user_id == current_user.id,
            SavedOpportunity.opportunity_id == id
        )
    ).first()
    
    if not existing:
        saved = SavedOpportunity(user_id=current_user.id, opportunity_id=id)
        session.add(saved)
        session.commit()
    return {"message": "Opportunity saved successfully", "is_saved": True}

@router.delete("/{id}/save", status_code=status.HTTP_200_OK)
def unsave_opportunity(
    id: int,
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    existing = session.exec(
        select(SavedOpportunity).where(
            SavedOpportunity.user_id == current_user.id,
            SavedOpportunity.opportunity_id == id
        )
    ).first()
    
    if existing:
        session.delete(existing)
        session.commit()
    return {"message": "Opportunity removed from saved", "is_saved": False}

@router.get("/{id}/fit", response_model=FitAssessment)
def get_opportunity_fit(
    id: int,
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    opp = session.get(Opportunity, id)
    if not opp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")

    profile = session.exec(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    ).first()

    student_skills = json.loads(profile.skills_json) if profile and profile.skills_json else []
    student_interests = json.loads(profile.interests_json) if profile and profile.interests_json else []
    student_availability = profile.availability if profile else "Available"

    # Prior participation for history bonus
    participations = session.exec(
        select(Participation).where(Participation.user_id == current_user.id)
    ).all()
    prior_cats = []
    for p in participations:
        p_opp = session.get(Opportunity, p.opportunity_id)
        if p_opp:
            prior_cats.append(p_opp.category)

    req_skills = json.loads(opp.required_skills_json or "[]")
    allowed_years = json.loads(opp.allowed_years_json or "[]")
    allowed_depts = json.loads(opp.allowed_depts_json or "[]")

    assessment = calculate_opportunity_fit(
        student_skills=student_skills,
        student_interests=student_interests,
        student_year=current_user.year,
        student_department=current_user.department,
        student_availability=student_availability,
        required_skills=req_skills,
        allowed_years=allowed_years,
        allowed_depts=allowed_depts,
        category=opp.category,
        prior_participated_categories=prior_cats,
        opportunity_id=opp.id
    )
    return assessment

@router.get("/{id}/summary", response_model=OpportunitySummary)
def get_opportunity_summary_endpoint(
    id: int,
    session: Session = Depends(get_session)
):
    opp = session.get(Opportunity, id)
    if not opp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")

    data = generate_opportunity_summary(
        title=opp.title,
        description=opp.description,
        category=opp.category,
        eligibility_text=opp.eligibility_text,
        allowed_years=json.loads(opp.allowed_years_json or "[]"),
        allowed_depts=json.loads(opp.allowed_depts_json or "[]"),
        required_skills=json.loads(opp.required_skills_json or "[]"),
        deadline_at=opp.deadline_at,
        start_at=opp.start_at,
        organizer_name=opp.organizer_name,
        gemini_key=settings.GEMINI_API_KEY
    )
    return OpportunitySummary(
        opportunity_id=opp.id,
        purpose=data["purpose"],
        eligibility=data["eligibility"],
        benefits=data["benefits"],
        required_skills=data["required_skills"],
        key_deadlines=data["key_deadlines"]
    )

