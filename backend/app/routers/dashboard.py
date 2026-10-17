import json
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, Opportunity, Application, SavedOpportunity, Team, TeamMember, TeamRequest, Task, StudentProfile
from app.schemas import OpportunityRead, ApplicationRead, TeamRead, TaskRead
from app.dependencies import require_role
from app.services.status_engine import compute_opportunity_status, normalize_utc
from app.services.skill_matcher import normalize_skill, normalize_skill_set
from app.routers.opportunities import format_opportunity_response
from app.routers.teams import get_team_skill_coverage

router = APIRouter(prefix="/dashboard", tags=["Personal Dashboard"])

@router.get("")
def get_personal_dashboard(
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    now = datetime.now(timezone.utc)
    fourteen_days_later = now + timedelta(days=14)

    # 1. Saved Opportunities
    saved_entries = session.exec(
        select(SavedOpportunity).where(SavedOpportunity.user_id == current_user.id).order_by(SavedOpportunity.saved_at.desc())
    ).all()
    saved_opps: List[OpportunityRead] = []
    for s in saved_entries:
        opp = session.get(Opportunity, s.opportunity_id)
        if opp:
            saved_opps.append(format_opportunity_response(opp, current_user, session))

    # 2. Applications & Statuses
    app_entries = session.exec(
        select(Application).where(Application.user_id == current_user.id).order_by(Application.applied_at.desc())
    ).all()
    profile = session.exec(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    ).first()
    student_skills = json.loads(profile.skills_json) if profile and profile.skills_json else []
    norm_skills = normalize_skill_set(student_skills)

    applications: List[ApplicationRead] = []
    for a in app_entries:
        opp = session.get(Opportunity, a.opportunity_id)
        matched_count = 0
        if opp:
            req_skills = json.loads(opp.required_skills_json or "[]")
            matched_count = sum(1 for r in req_skills if normalize_skill(r) in norm_skills)
        applications.append(ApplicationRead(
            id=a.id,
            user_id=a.user_id,
            opportunity_id=a.opportunity_id,
            note=a.note,
            status=a.status,
            applied_at=a.applied_at,
            student_name=current_user.name,
            student_email=current_user.email,
            student_skills=student_skills,
            opportunity_title=opp.title if opp else "Opportunity",
            opportunity_category=opp.category if opp else "internship",
            matched_skill_count=matched_count
        ))

    # 3. Active Teams
    memberships = session.exec(
        select(TeamMember).where(TeamMember.user_id == current_user.id)
    ).all()
    teams: List[TeamRead] = []
    for m in memberships:
        t = session.get(Team, m.team_id)
        if t:
            covered, missing, members = get_team_skill_coverage(t, session)
            owner = session.get(User, t.owner_id)
            opp_title = None
            if t.opportunity_id:
                opp = session.get(Opportunity, t.opportunity_id)
                if opp:
                    opp_title = opp.title
            teams.append(TeamRead(
                id=t.id,
                name=t.name,
                description=t.description,
                owner_id=t.owner_id,
                owner_name=owner.name if owner else "Unknown",
                opportunity_id=t.opportunity_id,
                opportunity_title=opp_title,
                required_skills=json.loads(t.required_skills_json or "[]"),
                max_size=t.max_size,
                is_open=t.is_open,
                created_at=t.created_at,
                members=members,
                covered_skills=covered,
                missing_skills=missing
            ))

    # 4. Tasks Assigned to Me
    assigned_tasks = session.exec(
        select(Task).where(Task.owner_id == current_user.id).order_by(Task.deadline.asc())
    ).all()
    my_tasks: List[TaskRead] = []
    for t in assigned_tasks:
        my_tasks.append(TaskRead(
            id=t.id,
            team_id=t.team_id,
            title=t.title,
            description=t.description,
            owner_id=t.owner_id,
            owner_name=current_user.name,
            is_unassigned=False,
            deadline=t.deadline,
            status=t.status,
            created_by=t.created_by,
            created_at=t.created_at
        ))

    # 5. Upcoming Deadlines (Next 14 Days) - Merged list of saved/applied opps + my tasks
    upcoming_deadlines = []
    seen_deadlines = set()

    for item in saved_opps:
        if item.deadline_at:
            norm_dl = normalize_utc(item.deadline_at)
            if now <= norm_dl <= fourteen_days_later:
                key = f"opp_{item.id}"
                if key not in seen_deadlines:
                    seen_deadlines.add(key)
                    upcoming_deadlines.append({
                        "id": item.id,
                        "title": item.title,
                        "type": "opportunity",
                        "category": item.category,
                        "deadline": item.deadline_at,
                        "status": item.computed_status
                    })

    for app_item in applications:
        opp = session.get(Opportunity, app_item.opportunity_id)
        if opp and opp.deadline_at:
            norm_dl = normalize_utc(opp.deadline_at)
            if now <= norm_dl <= fourteen_days_later:
                key = f"opp_{opp.id}"
                if key not in seen_deadlines:
                    seen_deadlines.add(key)
                    upcoming_deadlines.append({
                        "id": opp.id,
                        "title": opp.title,
                        "type": "opportunity",
                        "category": opp.category,
                        "deadline": opp.deadline_at,
                        "status": app_item.status
                    })

    for t in assigned_tasks:
        if t.status != "done":
            norm_dl = normalize_utc(t.deadline)
            if now <= norm_dl <= fourteen_days_later:
                upcoming_deadlines.append({
                    "id": t.id,
                    "title": t.title,
                    "type": "task",
                    "category": f"Team Task ({t.status})",
                    "deadline": t.deadline,
                    "status": t.status
                })

    upcoming_deadlines.sort(key=lambda d: normalize_utc(d["deadline"]))

    # 6. Pending Team Invites and Requests
    # Invites sent to current user
    received_invites = session.exec(
        select(TeamRequest).where(
            TeamRequest.user_id == current_user.id,
            TeamRequest.type == "invite",
            TeamRequest.status == "pending"
        )
    ).all()
    # Requests sent to teams owned by current user
    owned_teams = session.exec(select(Team).where(Team.owner_id == current_user.id)).all()
    owned_team_ids = [ot.id for ot in owned_teams]
    incoming_requests = []
    if owned_team_ids:
        incoming_requests = session.exec(
            select(TeamRequest).where(
                TeamRequest.team_id.in_(owned_team_ids),
                TeamRequest.type == "join_request",
                TeamRequest.status == "pending"
            )
        ).all()

    pending_actions = []
    for inv in received_invites:
        team_obj = session.get(Team, inv.team_id)
        pending_actions.append({
            "request_id": inv.id,
            "type": "invite",
            "team_id": inv.team_id,
            "team_name": team_obj.name if team_obj else "Team",
            "user_name": current_user.name,
            "status": inv.status,
            "created_at": inv.created_at
        })

    for req in incoming_requests:
        team_obj = session.get(Team, req.team_id)
        requester = session.get(User, req.user_id)
        pending_actions.append({
            "request_id": req.id,
            "type": "join_request",
            "team_id": req.team_id,
            "team_name": team_obj.name if team_obj else "Team",
            "user_name": requester.name if requester else "Unknown Student",
            "status": req.status,
            "created_at": req.created_at
        })

    return {
        "saved_opportunities": saved_opps,
        "applications": applications,
        "teams": teams,
        "my_tasks": my_tasks,
        "upcoming_deadlines": upcoming_deadlines,
        "pending_actions": pending_actions
    }
