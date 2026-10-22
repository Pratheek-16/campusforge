from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# --- Auth Schemas ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)
    role: str = Field(default="student")  # student, organizer, ambassador, coordinator
    college: Optional[str] = None
    department: Optional[str] = None
    year: Optional[int] = None
    section: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRead(BaseModel):
    id: int
    email: str
    role: str
    name: str
    college: Optional[str] = None
    department: Optional[str] = None
    year: Optional[int] = None
    section: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserRead

# --- Profile Schemas ---
class StudentProfileRead(BaseModel):
    id: int
    user_id: int
    phone: Optional[str] = None
    skills: List[str] = []
    nontech_skills: List[str] = []
    interests: List[str] = []
    career_goals: Optional[str] = ""
    academic: Dict[str, Any] = {}
    projects: List[Dict[str, Any]] = []
    certifications: List[Dict[str, Any]] = []
    experience: List[Dict[str, Any]] = []
    availability: str = "Available"
    resume_filename: Optional[str] = None
    user: Optional[UserRead] = None

class StudentProfileUpdate(BaseModel):
    name: Optional[str] = None
    college: Optional[str] = None
    department: Optional[str] = None
    year: Optional[int] = None
    section: Optional[str] = None
    phone: Optional[str] = None
    skills: List[str] = []
    nontech_skills: List[str] = []
    interests: List[str] = []
    career_goals: Optional[str] = ""
    academic: Dict[str, Any] = {}
    projects: List[Dict[str, Any]] = []
    certifications: List[Dict[str, Any]] = []
    experience: List[Dict[str, Any]] = []
    availability: str = "Available"

class ResumeAnalysisResponse(BaseModel):
    extracted_text: str
    filename: str
    # Personal info
    suggested_name: Optional[str] = None
    suggested_email: Optional[str] = None
    suggested_phone: Optional[str] = None
    suggested_college: Optional[str] = None
    suggested_department: Optional[str] = None
    suggested_year: Optional[int] = None
    suggested_career_goals: Optional[str] = None
    # Skills
    suggested_skills: List[str] = []
    suggested_nontech_skills: List[str] = []
    # Structured data
    suggested_projects: List[Dict[str, Any]] = []
    suggested_experience: List[Dict[str, Any]] = []
    suggested_education: Dict[str, Any] = {}
    suggested_certifications: List[str] = []
    suggested_links: Dict[str, str] = {}

# --- Opportunity Schemas ---
class OpportunityCreate(BaseModel):
    title: str = Field(min_length=3)
    description: str = Field(min_length=10)
    category: str
    eligibility_text: Optional[str] = ""
    allowed_years: List[int] = []
    allowed_depts: List[str] = []
    strict_eligibility: bool = False
    required_skills: List[str] = []
    start_at: datetime
    end_at: Optional[datetime] = None
    deadline_at: Optional[datetime] = None
    venue: Optional[str] = None
    online_link: Optional[str] = None
    organizer_name: str = Field(min_length=2)
    organizer_contact: Optional[str] = None
    registration_link: Optional[str] = None
    resources: List[str] = []
    college: Optional[str] = None
    section: Optional[str] = None
    is_paid: bool = False
    fee_amount: float = 0.0
    host_upi_id: Optional[str] = None
    registration_type: str = "both"  # native, external_link, both

class OpportunityUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    eligibility_text: Optional[str] = None
    allowed_years: Optional[List[int]] = None
    allowed_depts: Optional[List[str]] = None
    strict_eligibility: Optional[bool] = None
    required_skills: Optional[List[str]] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    deadline_at: Optional[datetime] = None
    venue: Optional[str] = None
    online_link: Optional[str] = None
    organizer_name: Optional[str] = None
    organizer_contact: Optional[str] = None
    registration_link: Optional[str] = None
    resources: Optional[List[str]] = None
    is_closed: Optional[bool] = None
    is_paid: Optional[bool] = None
    fee_amount: Optional[float] = None
    host_upi_id: Optional[str] = None
    registration_type: Optional[str] = None

class OpportunityRead(BaseModel):
    id: int
    title: str
    description: str
    category: str
    eligibility_text: str
    allowed_years: List[int] = []
    allowed_depts: List[str] = []
    strict_eligibility: bool
    required_skills: List[str] = []
    start_at: datetime
    end_at: Optional[datetime] = None
    deadline_at: Optional[datetime] = None
    venue: Optional[str] = None
    online_link: Optional[str] = None
    organizer_name: str
    organizer_contact: Optional[str] = None
    registration_link: Optional[str] = None
    resources: List[str] = []
    college: Optional[str] = None
    section: Optional[str] = None
    posted_by: int
    is_closed: bool
    is_paid: bool = False
    fee_amount: float = 0.0
    host_upi_id: Optional[str] = None
    registration_type: str = "both"
    created_at: datetime
    updated_at: datetime
    computed_status: str       # active, upcoming, ongoing, completed, registration_closed, expired, invalid_deadline
    is_saved: Optional[bool] = False
    application_status: Optional[str] = None
    event_registration: Optional[Dict[str, Any]] = None

# --- Event Registration Schemas ---
class EventRegistrationCreate(BaseModel):
    attendee_name: Optional[str] = None
    attendee_email: Optional[str] = None
    attendee_college: Optional[str] = None
    attendee_phone: Optional[str] = None
    payment_method: str = "free"  # free, upi_utr, demo_instant, google_form
    payment_reference: Optional[str] = None
    amount_paid: float = 0.0

class EventRegistrationRead(BaseModel):
    id: int
    ticket_code: str
    opportunity_id: int
    opportunity_title: str
    category: str
    status: str
    payment_status: str
    amount_paid: float
    payment_reference: Optional[str] = None
    payment_method: Optional[str] = None
    attendee_name: str
    attendee_email: str
    attendee_college: Optional[str] = None
    attendee_phone: Optional[str] = None
    event_start_at: Optional[datetime] = None
    event_venue: Optional[str] = None
    college: Optional[str] = None
    created_at: datetime

class FitAssessment(BaseModel):
    opportunity_id: int
    score: int                  # 0 to 100
    label: str                  # Strong, Partial, Low
    matched_skills: List[str]
    missing_skills: List[str]
    is_eligible: bool
    eligibility_reasons: List[str]
    reasons: List[str]
    availability_note: str

class OpportunitySummary(BaseModel):
    opportunity_id: int
    purpose: str
    eligibility: str
    benefits: str
    required_skills: List[str]
    key_deadlines: str

# --- Application Schemas ---
class ApplicationCreate(BaseModel):
    note: Optional[str] = ""

class ApplicationRead(BaseModel):
    id: int
    user_id: int
    opportunity_id: int
    note: Optional[str] = ""
    status: str
    applied_at: datetime
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    student_skills: List[str] = []
    opportunity_title: Optional[str] = None
    opportunity_category: Optional[str] = None
    matched_skill_count: int = 0

class ApplicationStatusUpdate(BaseModel):
    status: str  # submitted, under_review, shortlisted, rejected, accepted

# --- Team Schemas ---
class TeamCreate(BaseModel):
    name: str = Field(min_length=2)
    description: Optional[str] = ""
    opportunity_id: Optional[int] = None
    required_skills: List[str] = []
    max_size: int = Field(default=4, ge=2, le=10)

class TeamMemberRead(BaseModel):
    user_id: int
    name: str
    email: str
    role: str
    skills: List[str] = []
    availability: str = "Available"
    joined_at: datetime

class TeamRead(BaseModel):
    id: int
    name: str
    description: str
    owner_id: int
    owner_name: Optional[str] = None
    opportunity_id: Optional[int] = None
    opportunity_title: Optional[str] = None
    required_skills: List[str] = []
    max_size: int
    is_open: bool
    created_at: datetime
    members: List[TeamMemberRead] = []
    covered_skills: List[str] = []
    missing_skills: List[str] = []

class CandidateMatch(BaseModel):
    user_id: int
    name: str
    email: str
    matched_skills: List[str]
    other_skills: List[str]
    shared_interests: List[str]
    availability: str
    score: int
    explanation: str

# --- Task Schemas ---
class TaskCreate(BaseModel):
    title: str = Field(min_length=2)
    description: Optional[str] = ""
    owner_id: int               # Owner required at creation and must be team member
    deadline: datetime
    status: str = Field(default="todo")

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    owner_id: Optional[int] = None  # None allowed if reassigning or flagged unassigned
    deadline: Optional[datetime] = None
    status: Optional[str] = None

class TaskRead(BaseModel):
    id: int
    team_id: int
    title: str
    description: Optional[str] = ""
    owner_id: Optional[int] = None
    owner_name: Optional[str] = None
    is_unassigned: bool = False
    deadline: datetime
    status: str
    created_by: int
    created_at: datetime

# --- P1 Schemas ---
class LinkedInDraftRequest(BaseModel):
    reflection: Optional[str] = ""

class LinkedInDraftResponse(BaseModel):
    draft: str
    source: str  # "gemini" or "template"
