from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, Team, TeamMember, Task
from app.schemas import TaskCreate, TaskUpdate, TaskRead
from app.dependencies import require_role
from app.services.status_engine import normalize_utc

router = APIRouter(tags=["Project Execution & Tasks"])

def check_is_team_member(team_id: int, user_id: int, session: Session) -> bool:
    return session.exec(
        select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
    ).first() is not None

@router.get("/teams/{id}/tasks", response_model=List[TaskRead])
def get_team_tasks(
    id: int,
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    team = session.get(Team, id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    if not check_is_team_member(id, current_user.id, session):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only team members can view task execution boards")

    tasks = session.exec(
        select(Task).where(Task.team_id == id).order_by(Task.deadline.asc())
    ).all()

    results = []
    for t in tasks:
        owner_name = None
        is_unassigned = t.owner_id is None
        if t.owner_id:
            owner = session.get(User, t.owner_id)
            owner_name = owner.name if owner else None
        else:
            owner_name = "Unassigned — needs owner"

        results.append(TaskRead(
            id=t.id,
            team_id=t.team_id,
            title=t.title,
            description=t.description,
            owner_id=t.owner_id,
            owner_name=owner_name,
            is_unassigned=is_unassigned,
            deadline=t.deadline,
            status=t.status,
            created_by=t.created_by,
            created_at=t.created_at
        ))
    return results

@router.post("/teams/{id}/tasks", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_team_task(
    id: int,
    data: TaskCreate,
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    team = session.get(Team, id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    # Requester must be team member
    if not check_is_team_member(id, current_user.id, session):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only team members can create tasks")

    # E7: Owner required at creation and MUST be a current team member
    if not data.owner_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Task owner is required at creation"
        )
    if not check_is_team_member(id, data.owner_id, session):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task owner must be an active member of this team"
        )

    # Valid status
    valid_statuses = ["todo", "in_progress", "blocked", "done"]
    if data.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid task status '{data.status}'. Must be one of {valid_statuses}"
        )

    task = Task(
        team_id=id,
        title=data.title.strip(),
        description=data.description or "",
        owner_id=data.owner_id,
        deadline=data.deadline,
        status=data.status,
        created_by=current_user.id
    )
    session.add(task)
    session.commit()
    session.refresh(task)

    owner = session.get(User, task.owner_id)

    return TaskRead(
        id=task.id,
        team_id=task.team_id,
        title=task.title,
        description=task.description,
        owner_id=task.owner_id,
        owner_name=owner.name if owner else "Unknown",
        is_unassigned=False,
        deadline=task.deadline,
        status=task.status,
        created_by=task.created_by,
        created_at=task.created_at
    )

@router.patch("/tasks/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    data: TaskUpdate,
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if not check_is_team_member(task.team_id, current_user.id, session):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only team members can update tasks")

    if data.title is not None:
        task.title = data.title.strip()
    if data.description is not None:
        task.description = data.description
    if data.deadline is not None:
        task.deadline = data.deadline
    if data.status is not None:
        valid_statuses = ["todo", "in_progress", "blocked", "done"]
        if data.status not in valid_statuses:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid status '{data.status}'")
        task.status = data.status

    if data.owner_id is not None:
        # If assigning to another user, they must be on team
        if not check_is_team_member(task.team_id, data.owner_id, session):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned owner must be an active member of this team")
        task.owner_id = data.owner_id

    session.add(task)
    session.commit()
    session.refresh(task)

    owner_name = "Unassigned — needs owner"
    if task.owner_id:
        owner = session.get(User, task.owner_id)
        owner_name = owner.name if owner else "Unknown"

    return TaskRead(
        id=task.id,
        team_id=task.team_id,
        title=task.title,
        description=task.description,
        owner_id=task.owner_id,
        owner_name=owner_name,
        is_unassigned=task.owner_id is None,
        deadline=task.deadline,
        status=task.status,
        created_by=task.created_by,
        created_at=task.created_at
    )

@router.delete("/tasks/{task_id}", status_code=status.HTTP_200_OK)
def delete_task(
    task_id: int,
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session)
):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if not check_is_team_member(task.team_id, current_user.id, session):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only team members can delete tasks")

    session.delete(task)
    session.commit()
    return {"message": "Task deleted successfully"}
