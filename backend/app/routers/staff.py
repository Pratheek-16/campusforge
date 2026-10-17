import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, Opportunity
from app.schemas import OpportunityCreate, OpportunityUpdate, OpportunityRead
from app.dependencies import require_role
from app.routers.opportunities import format_opportunity_response

router = APIRouter(prefix="/staff", tags=["Ambassador & Coordinator"])

@router.get("/opportunities", response_model=List[OpportunityRead])
def get_staff_opportunities(
    current_user: User = Depends(require_role("ambassador", "coordinator")),
    session: Session = Depends(get_session)
):
    query = select(Opportunity)
    if current_user.role == "ambassador":
        if not current_user.college:
            return []
        query = query.where(Opportunity.college == current_user.college)
    elif current_user.role == "coordinator":
        if not current_user.section:
            return []
        query = query.where(Opportunity.section == current_user.section)

    listings = session.exec(query.order_by(Opportunity.start_at.desc())).all()
    return [format_opportunity_response(opp, current_user, session) for opp in listings]
