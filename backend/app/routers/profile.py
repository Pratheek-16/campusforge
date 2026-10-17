import os
import json
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, StudentProfile
from app.schemas import (
    StudentProfileRead,
    StudentProfileUpdate,
    ResumeAnalysisResponse,
    UserRead
)
from app.dependencies import get_current_user, require_role
from app.config import settings
from app.services.resume_parser import (
    extract_text_from_pdf,
    extract_text_from_docx_or_txt,
    analyze_resume_text
)

router = APIRouter(prefix="/profile", tags=["Student Profile"])

def format_profile_response(profile: StudentProfile, user: User) -> StudentProfileRead:
    return StudentProfileRead(
        id=profile.id,
        user_id=profile.user_id,
        phone=profile.phone,
        skills=json.loads(profile.skills_json or "[]"),
        nontech_skills=json.loads(profile.nontech_skills_json or "[]"),
        interests=json.loads(profile.interests_json or "[]"),
        career_goals=profile.career_goals or "",
        academic=json.loads(profile.academic_json or "{}"),
        projects=json.loads(profile.projects_json or "[]"),
        certifications=json.loads(profile.certifications_json or "[]"),
        experience=json.loads(profile.experience_json or "[]"),
        availability=profile.availability,
        resume_filename=profile.resume_filename,
        user=UserRead.model_validate(user)
    )

@router.get("", response_model=StudentProfileRead)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    profile = session.exec(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    ).first()
    if not profile:
        profile = StudentProfile(user_id=current_user.id)
        session.add(profile)
        session.commit()
        session.refresh(profile)

    return format_profile_response(profile, current_user)

@router.put("", response_model=StudentProfileRead)
def update_profile(
    data: StudentProfileUpdate,
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    # Validation per PRD 4.4: name, college, department, year, >=1 skill required
    target_name = (data.name or current_user.name or "").strip()
    target_college = (data.college or current_user.college or "").strip()
    target_dept = (data.department or current_user.department or "").strip()
    target_year = data.year if data.year is not None else current_user.year

    if not target_name:
        raise HTTPException(status_code=422, detail="Full name is required")
    if not target_college:
        raise HTTPException(status_code=422, detail="College name is required")
    if not target_dept:
        raise HTTPException(status_code=422, detail="Department is required")
    if not target_year or target_year < 1 or target_year > 5:
        raise HTTPException(status_code=422, detail="Valid academic year (1-5) is required")
    if not data.skills or len(data.skills) == 0:
        raise HTTPException(status_code=422, detail="At least one technical skill is required")

    # Update User entity fields
    current_user.name = target_name
    current_user.college = target_college
    current_user.department = target_dept
    current_user.year = target_year
    if data.section is not None:
        current_user.section = data.section.strip()
    session.add(current_user)

    profile = session.exec(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    ).first()
    if not profile:
        profile = StudentProfile(user_id=current_user.id)

    profile.phone = data.phone
    profile.skills_json = json.dumps(data.skills)
    profile.nontech_skills_json = json.dumps(data.nontech_skills)
    profile.interests_json = json.dumps(data.interests)
    profile.career_goals = data.career_goals
    profile.academic_json = json.dumps(data.academic)
    profile.projects_json = json.dumps(data.projects)
    profile.certifications_json = json.dumps(data.certifications)
    profile.experience_json = json.dumps(data.experience)
    profile.availability = data.availability or "Available"

    session.add(profile)
    session.commit()
    session.refresh(profile)

    return format_profile_response(profile, current_user)

@router.post("/resume/analyze", response_model=ResumeAnalysisResponse)
async def analyze_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("student"))
):
    # Validation: File size <= 5MB, format PDF/DOCX/TXT
    max_size = 5 * 1024 * 1024  # 5 MB
    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the 5 MB limit"
        )

    filename = file.filename or "resume.pdf"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".pdf", ".docx", ".txt"]:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file format '{ext}'. Only PDF, DOCX, and TXT are supported."
        )

    # Extract text safely
    try:
        if ext == ".pdf":
            text = extract_text_from_pdf(contents)
        else:
            text = extract_text_from_docx_or_txt(contents, filename)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse resume document: {str(e)}. Please try manual entry."
        )

    if not text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract readable text from resume. Please verify the file or use manual entry."
        )

    # Save file securely to uploads folder with unique ID
    saved_filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}_{filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, saved_filename)
    with open(file_path, "wb") as f:
        f.write(contents)

    analysis = analyze_resume_text(text, settings.GEMINI_API_KEY)

    return ResumeAnalysisResponse(
        extracted_text=text[:1000],  # sample preview
        suggested_skills=analysis.get("suggested_skills", []),
        suggested_projects=analysis.get("suggested_projects", []),
        suggested_experience=analysis.get("suggested_experience", []),
        suggested_education=analysis.get("suggested_education", {}),
        filename=saved_filename
    )

@router.post("/resume/confirm", response_model=StudentProfileRead)
def confirm_resume_profile(
    data: StudentProfileUpdate,
    filename: Optional[str] = None,
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    profile = session.exec(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    ).first()
    if not profile:
        profile = StudentProfile(user_id=current_user.id)

    if filename:
        profile.resume_filename = filename

    # Update User fields if provided
    if data.name:
        current_user.name = data.name.strip()
    if data.college:
        current_user.college = data.college.strip()
    if data.department:
        current_user.department = data.department.strip()
    if data.year:
        current_user.year = data.year
    if data.section:
        current_user.section = data.section.strip()
    session.add(current_user)

    profile.skills_json = json.dumps(data.skills)
    profile.nontech_skills_json = json.dumps(data.nontech_skills)
    profile.interests_json = json.dumps(data.interests)
    profile.career_goals = data.career_goals
    profile.academic_json = json.dumps(data.academic)
    profile.projects_json = json.dumps(data.projects)
    profile.certifications_json = json.dumps(data.certifications)
    profile.experience_json = json.dumps(data.experience)
    profile.availability = data.availability or "Available"

    session.add(profile)
    session.commit()
    session.refresh(profile)

    return format_profile_response(profile, current_user)
