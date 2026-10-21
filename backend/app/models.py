from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field, UniqueConstraint

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(SQLModel, table=True):
    __tablename__ = "users"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    role: str = Field(default="student")  # student, organizer, ambassador, coordinator
    name: str
    college: Optional[str] = None
    department: Optional[str] = None
    year: Optional[int] = None
    section: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)


class StudentProfile(SQLModel, table=True):
    __tablename__ = "student_profiles"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(unique=True, foreign_key="users.id", index=True)
    phone: Optional[str] = None
    skills_json: str = Field(default="[]")            # list of technical skills
    nontech_skills_json: str = Field(default="[]")    # list of soft skills
    interests_json: str = Field(default="[]")         # list of domains/interests
    career_goals: Optional[str] = ""
    academic_json: str = Field(default="{}")          # gpa, coursework
    projects_json: str = Field(default="[]")          # [{title, desc, tech}]
    certifications_json: str = Field(default="[]")    # [{title, issuer, year}]
    experience_json: str = Field(default="[]")        # [{title, company, duration}]
    availability: str = Field(default="Available")    # Available, Busy, 10-15 hrs/week
    resume_filename: Optional[str] = None


class Opportunity(SQLModel, table=True):
    __tablename__ = "opportunities"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    description: str
    category: str = Field(index=True)  # internship, hackathon, workshop, scholarship, project, technical_event, non_technical_event, other
    eligibility_text: str = Field(default="")
    allowed_years_json: str = Field(default="[]")     # e.g. [2, 3] or [] for all
    allowed_depts_json: str = Field(default="[]")     # e.g. ["CSE", "IT"] or [] for all
    strict_eligibility: bool = Field(default=False)
    required_skills_json: str = Field(default="[]")   # list of required skills
    start_at: datetime
    end_at: Optional[datetime] = None
    deadline_at: Optional[datetime] = None            # None => "Deadline not specified"
    venue: Optional[str] = None
    online_link: Optional[str] = None
    organizer_name: str
    organizer_contact: Optional[str] = None
    registration_link: Optional[str] = None
    resources_json: str = Field(default="[]")
    college: Optional[str] = None
    section: Optional[str] = None
    posted_by: int = Field(foreign_key="users.id")
    is_closed: bool = Field(default=False)
    is_paid: bool = Field(default=False)
    fee_amount: float = Field(default=0.0)
    host_upi_id: Optional[str] = None
    registration_type: str = Field(default="both")  # native, external_link, both
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class SavedOpportunity(SQLModel, table=True):
    __tablename__ = "saved_opportunities"
    __table_args__ = (UniqueConstraint("user_id", "opportunity_id", name="uq_user_saved_opportunity"),)
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    opportunity_id: int = Field(foreign_key="opportunities.id", index=True)
    saved_at: datetime = Field(default_factory=utc_now)


class Application(SQLModel, table=True):
    __tablename__ = "applications"
    __table_args__ = (UniqueConstraint("user_id", "opportunity_id", name="uq_user_opportunity_application"),)
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    opportunity_id: int = Field(foreign_key="opportunities.id", index=True)
    note: Optional[str] = ""
    status: str = Field(default="submitted")  # submitted, under_review, shortlisted, rejected, accepted
    applied_at: datetime = Field(default_factory=utc_now)


class Participation(SQLModel, table=True):
    __tablename__ = "participations"
    __table_args__ = (UniqueConstraint("user_id", "opportunity_id", name="uq_user_participation"),)
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    opportunity_id: int = Field(foreign_key="opportunities.id", index=True)
    status: str = Field(default="registered")  # registered, attended
    reflection_text: Optional[str] = ""
    created_at: datetime = Field(default_factory=utc_now)


class EventRegistration(SQLModel, table=True):
    __tablename__ = "event_registrations"
    __table_args__ = (UniqueConstraint("user_id", "opportunity_id", name="uq_user_event_registration"),)
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    opportunity_id: int = Field(foreign_key="opportunities.id", index=True)
    ticket_code: str = Field(index=True, unique=True)
    status: str = Field(default="confirmed")  # confirmed, cancelled
    payment_status: str = Field(default="free")  # free, paid_upi, paid_demo, external_form
    amount_paid: float = Field(default=0.0)
    payment_reference: Optional[str] = None  # UTR or Demo Txn ID
    payment_method: Optional[str] = None    # free, upi_utr, demo_instant, google_form
    attendee_name: str
    attendee_email: str
    attendee_college: Optional[str] = None
    attendee_phone: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)


class Team(SQLModel, table=True):
    __tablename__ = "teams"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: str = ""
    owner_id: int = Field(foreign_key="users.id", index=True)
    opportunity_id: Optional[int] = Field(default=None, foreign_key="opportunities.id", nullable=True)
    required_skills_json: str = Field(default="[]")
    max_size: int = Field(default=4)
    is_open: bool = Field(default=True)
    created_at: datetime = Field(default_factory=utc_now)


class TeamMember(SQLModel, table=True):
    __tablename__ = "team_members"
    __table_args__ = (UniqueConstraint("team_id", "user_id", name="uq_team_user_member"),)
    
    id: Optional[int] = Field(default=None, primary_key=True)
    team_id: int = Field(foreign_key="teams.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    role: str = Field(default="member")  # leader, member
    joined_at: datetime = Field(default_factory=utc_now)


class TeamRequest(SQLModel, table=True):
    __tablename__ = "team_requests"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    team_id: int = Field(foreign_key="teams.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    type: str = Field(default="join_request")  # join_request, invite
    status: str = Field(default="pending")     # pending, accepted, declined
    created_at: datetime = Field(default_factory=utc_now)


class Task(SQLModel, table=True):
    __tablename__ = "tasks"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    team_id: int = Field(foreign_key="teams.id", index=True)
    title: str
    description: Optional[str] = ""
    owner_id: Optional[int] = Field(default=None, foreign_key="users.id", nullable=True)
    deadline: datetime
    status: str = Field(default="todo")        # todo, in_progress, blocked, done
    created_by: int = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=utc_now)
