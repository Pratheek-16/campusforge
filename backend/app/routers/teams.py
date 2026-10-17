import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, Team, TeamMember, TeamRequest, Task, StudentProfile, Opportunity
from app.schemas import (
    TeamCreate,
    TeamRead,
    TeamMemberRead,
    CandidateMatch
)
from app.dependencies import get_current_user, require_role
from app.services.skill_matcher import (
    normalize_skill,
    normalize_skill_set,
    match_candidate_for_missing_skill
)

router = APIRouter(prefix="/teams", tags=["Smart Team Formation"])

def get_team_skill_coverage(team: Team, session: Session) -> tuple[List[str], List[str], List[TeamMemberRead]]:
    """Calculates covered vs missing required skills from actual team member profiles."""
    memberships = session.exec(
        select(TeamMember).where(TeamMember.team_id == team.id)
    ).all()

    member_reads: List[TeamMemberRead] = []
    all_member_skills_set = set()

    for m in memberships:
        user = session.get(User, m.user_id)
        if not user:
            continue
        profile = session.exec(
            select(StudentProfile).where(StudentProfile.user_id == user.id)
        ).first()

        skills = json.loads(profile.skills_json) if profile and profile.skills_json else []
        for s in skills:
            norm = normalize_skill(s)
            if norm:
                all_member_skills_set.add(norm)

        member_reads.append(TeamMemberRead(
            user_id=user.id,
            name=user.name,
            email=user.email,
            role=m.role,
            skills=skills,
            availability=profile.availability if profile else "Available",
            joined_at=m.joined_at
        ))

    required_skills = json.loads(team.required_skills_json or "[]")
    covered: List[str] = []
    missing: List[str] = []

    for req in required_skills:
        if normalize_skill(req) in all_member_skills_set:
            covered.append(req)
        else:
            missing.append(req)

    return covered, missing, member_reads

@router.post("", response_model=TeamRead, status_code=status.HTTP_201_CREATED)
def create_team(
    data: TeamCreate,
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    team = Team(
        name=data.name.strip(),
        description=data.description or "",
        owner_id=current_user.id,
        opportunity_id=data.opportunity_id,
        required_skills_json=json.dumps(data.required_skills or []),
        max_size=data.max_size,
        is_open=True
    )
    session.add(team)
    session.commit()
    session.refresh(team)

    # Creator is added as leader member
    leader_member = TeamMember(
        team_id=team.id,
        user_id=current_user.id,
        role="leader"
    )
    session.add(leader_member)
    session.commit()

    covered, missing, members = get_team_skill_coverage(team, session)

    opp_title = None
    if team.opportunity_id:
        opp = session.get(Opportunity, team.opportunity_id)
        if opp:
            opp_title = opp.title

    return TeamRead(
        id=team.id,
        name=team.name,
        description=team.description,
        owner_id=team.owner_id,
        owner_name=current_user.name,
        opportunity_id=team.opportunity_id,
        opportunity_title=opp_title,
        required_skills=data.required_skills or [],
        max_size=team.max_size,
        is_open=team.is_open,
        created_at=team.created_at,
        members=members,
        covered_skills=covered,
        missing_skills=missing
    )

@router.get("", response_model=List[TeamRead])
def list_teams(
    is_open: Optional[bool] = None,
    session: Session = Depends(get_session)
):
    query = select(Team)
    if is_open is not None:
        query = query.where(Team.is_open == is_open)

    teams = session.exec(query.order_by(Team.created_at.desc())).all()
    results = []
    for team in teams:
        covered, missing, members = get_team_skill_coverage(team, session)
        owner = session.get(User, team.owner_id)
        opp_title = None
        if team.opportunity_id:
            opp = session.get(Opportunity, team.opportunity_id)
            if opp:
                opp_title = opp.title

        results.append(TeamRead(
            id=team.id,
            name=team.name,
            description=team.description,
            owner_id=team.owner_id,
            owner_name=owner.name if owner else "Unknown",
            opportunity_id=team.opportunity_id,
            opportunity_title=opp_title,
            required_skills=json.loads(team.required_skills_json or "[]"),
            max_size=team.max_size,
            is_open=team.is_open,
            created_at=team.created_at,
            members=members,
            covered_skills=covered,
            missing_skills=missing
        ))
    return results

@router.get("/{id}", response_model=TeamRead)
def get_team(id: int, session: Session = Depends(get_session)):
    team = session.get(Team, id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    covered, missing, members = get_team_skill_coverage(team, session)
    owner = session.get(User, team.owner_id)
    opp_title = None
    if team.opportunity_id:
        opp = session.get(Opportunity, team.opportunity_id)
        if opp:
            opp_title = opp.title

    return TeamRead(
        id=team.id,
        name=team.name,
        description=team.description,
        owner_id=team.owner_id,
        owner_name=owner.name if owner else "Unknown",
        opportunity_id=team.opportunity_id,
        opportunity_title=opp_title,
        required_skills=json.loads(team.required_skills_json or "[]"),
        max_size=team.max_size,
        is_open=team.is_open,
        created_at=team.created_at,
        members=members,
        covered_skills=covered,
        missing_skills=missing
    )

@router.put("/{id}", response_model=TeamRead)
def update_team(
    id: int,
    data: TeamCreate,
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    team = session.get(Team, id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    if team.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only team owner can modify team settings")

    team.name = data.name.strip()
    team.description = data.description or ""
    team.opportunity_id = data.opportunity_id
    team.required_skills_json = json.dumps(data.required_skills or [])
    team.max_size = data.max_size
    session.add(team)
    session.commit()
    session.refresh(team)

    covered, missing, members = get_team_skill_coverage(team, session)
    opp_title = None
    if team.opportunity_id:
        opp = session.get(Opportunity, team.opportunity_id)
        if opp:
            opp_title = opp.title

    return TeamRead(
        id=team.id,
        name=team.name,
        description=team.description,
        owner_id=team.owner_id,
        owner_name=current_user.name,
        opportunity_id=team.opportunity_id,
        opportunity_title=opp_title,
        required_skills=data.required_skills or [],
        max_size=team.max_size,
        is_open=team.is_open,
        created_at=team.created_at,
        members=members,
        covered_skills=covered,
        missing_skills=missing
    )

@router.get("/{id}/skills")
def get_team_skills_panel(id: int, session: Session = Depends(get_session)):
    """Explicit endpoint for covered vs. missing required skills."""
    team = session.get(Team, id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    covered, missing, members = get_team_skill_coverage(team, session)
    return {
        "team_id": team.id,
        "required_skills": json.loads(team.required_skills_json or "[]"),
        "covered_skills": covered,
        "missing_skills": missing,
        "members_count": len(members),
        "max_size": team.max_size
    }

@router.get("/{id}/candidates", response_model=List[CandidateMatch])
def find_candidates_for_team_skill(
    id: int,
    skill: str = Query(..., description="The missing skill to find candidates for"),
    session: Session = Depends(get_session)
):
    """
    PRD §4.8, §5.2, & E5/E6:
    Finds candidates not already on the team.
    Only returns students whose profile actually contains the skill.
    Never presents a candidate as qualified without skill evidence.
    """
    team = session.get(Team, id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    # Team member IDs to exclude
    existing_members = session.exec(
        select(TeamMember.user_id).where(TeamMember.team_id == id)
    ).all()
    excluded_ids = set(existing_members)

    # Other required skills for overlap bonus
    all_req_skills = json.loads(team.required_skills_json or "[]")
    other_skills = [s for s in all_req_skills if normalize_skill(s) != normalize_skill(skill)]

    # Fetch candidate pool (students only)
    candidate_users = session.exec(
        select(User).where(User.role == "student", User.id.notin_(excluded_ids))
    ).all()

    candidates: List[CandidateMatch] = []
    for cand_user in candidate_users:
        profile = session.exec(
            select(StudentProfile).where(StudentProfile.user_id == cand_user.id)
        ).first()
        if not profile:
            continue

        match_data = match_candidate_for_missing_skill(
            target_skill=skill,
            other_required_skills=other_skills,
            candidate_user=cand_user,
            candidate_profile=profile
        )
        if match_data:
            candidates.append(CandidateMatch(**match_data))

    # Sort descending by match score
    candidates.sort(key=lambda c: c.score, reverse=True)
    return candidates

@router.post("/{id}/join-request", status_code=status.HTTP_201_CREATED)
def request_to_join_team(
    id: int,
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    team = session.get(Team, id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    if not team.is_open:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Team is currently closed to new members")

    # Check if already a member
    is_member = session.exec(
        select(TeamMember).where(TeamMember.team_id == id, TeamMember.user_id == current_user.id)
    ).first()
    if is_member:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You are already a member of this team")

    # Check existing pending request
    existing_req = session.exec(
        select(TeamRequest).where(
            TeamRequest.team_id == id,
            TeamRequest.user_id == current_user.id,
            TeamRequest.type == "join_request",
            TeamRequest.status == "pending"
        )
    ).first()
    if existing_req:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already have a pending join request for this team")

    req = TeamRequest(
        team_id=id,
        user_id=current_user.id,
        type="join_request",
        status="pending"
    )
    session.add(req)
    session.commit()
    return {"message": "Join request submitted successfully", "request_id": req.id}

@router.post("/{id}/invite", status_code=status.HTTP_201_CREATED)
def invite_student_to_team(
    id: int,
    user_id: int = Query(..., description="ID of student to invite"),
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    team = session.get(Team, id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    if team.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only team owner can invite members")

    # Check target user
    target_user = session.get(User, user_id)
    if not target_user or target_user.role != "student":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    # Check if already member
    is_member = session.exec(
        select(TeamMember).where(TeamMember.team_id == id, TeamMember.user_id == user_id)
    ).first()
    if is_member:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student is already a member of this team")

    existing_inv = session.exec(
        select(TeamRequest).where(
            TeamRequest.team_id == id,
            TeamRequest.user_id == user_id,
            TeamRequest.type == "invite",
            TeamRequest.status == "pending"
        )
    ).first()
    if existing_inv:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An invitation is already pending for this student")

    req = TeamRequest(
        team_id=id,
        user_id=user_id,
        type="invite",
        status="pending"
    )
    session.add(req)
    session.commit()
    return {"message": f"Invitation sent to {target_user.name}", "request_id": req.id}

@router.patch("/requests/{request_id}")
def update_team_request_status(
    request_id: int,
    status_choice: str = Query(..., description="'accepted' or 'declined'"),
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    req = session.get(TeamRequest, request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team request not found")
    if req.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Request is already {req.status}")

    team = session.get(Team, req.team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team no longer exists")

    choice = status_choice.lower()
    if choice not in ["accepted", "declined"]:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Status must be 'accepted' or 'declined'")

    # Permission check:
    # If join_request: team owner decides
    # If invite: target user decides
    if req.type == "join_request" and team.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the team owner can review join requests")
    if req.type == "invite" and req.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the invited student can accept this invitation")

    req.status = choice
    session.add(req)

    if choice == "accepted":
        # Check team capacity
        current_count = len(session.exec(select(TeamMember).where(TeamMember.team_id == team.id)).all())
        if current_count >= team.max_size:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Team has reached its maximum size")

        new_member = TeamMember(
            team_id=team.id,
            user_id=req.user_id,
            role="member"
        )
        session.add(new_member)

    session.commit()
    return {"message": f"Request marked as {choice}", "status": choice}

@router.delete("/{id}/members/{user_id}", status_code=status.HTTP_200_OK)
def remove_team_member(
    id: int,
    user_id: int,
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    """
    Removes a member from the team.
    PRD §4.9 & E7 Consistency: When a member leaves/is removed,
    their open tasks become visibly 'Unassigned — needs owner'.
    """
    team = session.get(Team, id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    # Must be team owner or member leaving voluntarily
    if team.owner_id != current_user.id and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only team owner can remove members")
    if team.owner_id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Team owner cannot be removed from the team")

    member = session.exec(
        select(TeamMember).where(TeamMember.team_id == id, TeamMember.user_id == user_id)
    ).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found on this team")

    session.delete(member)

    # CONSISTENCY E7: Reassign open tasks to Unassigned (owner_id = None)
    open_tasks = session.exec(
        select(Task).where(
            Task.team_id == id,
            Task.owner_id == user_id,
            Task.status != "done"
        )
    ).all()
    for task in open_tasks:
        task.owner_id = None
        session.add(task)

    session.commit()
    return {
        "message": f"Member removed. {len(open_tasks)} open task(s) flagged as Unassigned — needs owner.",
        "unassigned_tasks_count": len(open_tasks)
    }
