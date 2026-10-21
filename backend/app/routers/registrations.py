"""
Event Registration Router
Handles native in-app registration with dual-mode checkout:
  - Free events: instant 1-click registration + digital ticket
  - Paid events: UPI QR code checkout + UTR verification OR demo instant pay
  - External link: track Google Form / external portal registrations
"""
import json
import uuid
import random
import string
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, Opportunity, EventRegistration
from app.schemas import EventRegistrationCreate, EventRegistrationRead
from app.dependencies import require_role, get_current_user
from app.services.status_engine import compute_opportunity_status

router = APIRouter(prefix="/events", tags=["Event Registration"])


def _gen_ticket_code(opp_id: int) -> str:
    """Generate a unique CF-PASS ticket code."""
    rand = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"CF-{opp_id:04d}-{rand}"


def _format_registration(reg: EventRegistration, opp: Opportunity) -> EventRegistrationRead:
    return EventRegistrationRead(
        id=reg.id,
        ticket_code=reg.ticket_code,
        opportunity_id=reg.opportunity_id,
        opportunity_title=opp.title,
        category=opp.category,
        status=reg.status,
        payment_status=reg.payment_status,
        amount_paid=reg.amount_paid,
        payment_reference=reg.payment_reference,
        payment_method=reg.payment_method,
        attendee_name=reg.attendee_name,
        attendee_email=reg.attendee_email,
        attendee_college=reg.attendee_college,
        attendee_phone=reg.attendee_phone,
        event_start_at=opp.start_at,
        event_venue=opp.venue,
        college=opp.college,
        created_at=reg.created_at,
    )


@router.post("/{opp_id}/register", response_model=EventRegistrationRead, status_code=status.HTTP_201_CREATED)
def register_for_event(
    opp_id: int,
    data: EventRegistrationCreate,
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session),
):
    """Register a student for a non-internship event via native in-app checkout."""
    opp = session.get(Opportunity, opp_id)
    if not opp:
        raise HTTPException(status_code=404, detail="Event not found")

    # Non-internship events only
    if opp.category == "internship":
        raise HTTPException(status_code=400, detail="Use the standard application flow for internships")

    # Check event is not expired / closed
    comp_status = compute_opportunity_status(opp.start_at, opp.end_at, opp.deadline_at, opp.is_closed)
    if comp_status in ("expired", "closed", "completed"):
        raise HTTPException(status_code=400, detail="Registrations for this event are closed")
    if comp_status == "invalid_deadline":
        raise HTTPException(status_code=400, detail="Event has no deadline specified; registration is blocked")

    # Duplicate prevention
    existing = session.exec(
        select(EventRegistration).where(
            EventRegistration.user_id == current_user.id,
            EventRegistration.opportunity_id == opp_id
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="You are already registered for this event",
            headers={"X-Ticket-Code": existing.ticket_code}
        )

    # Payment validation for paid events
    is_paid = getattr(opp, "is_paid", False)
    fee = getattr(opp, "fee_amount", 0.0)

    payment_status = "free"
    amount_paid = 0.0
    payment_ref = None

    if is_paid and fee > 0:
        if data.payment_method == "upi_utr":
            if not data.payment_reference or len(data.payment_reference.strip()) < 6:
                raise HTTPException(status_code=400, detail="Please enter a valid UPI transaction reference (UTR number)")
            payment_status = "paid_upi"
            amount_paid = data.amount_paid or fee
            payment_ref = data.payment_reference.strip()

        elif data.payment_method == "demo_instant":
            # Demo / Test mode — instant confirmation
            payment_status = "paid_demo"
            amount_paid = fee
            payment_ref = f"DEMO-TXN-{uuid.uuid4().hex[:10].upper()}"

        elif data.payment_method == "google_form":
            # Student completed external form — mark as tracked
            payment_status = "external_form"
            amount_paid = 0.0
            payment_ref = "via_external_form"
        else:
            raise HTTPException(status_code=400, detail="Invalid payment method for paid event")
    else:
        # Free event — also accept google_form tracking
        payment_method_val = data.payment_method or "free"
        if payment_method_val == "google_form":
            payment_status = "external_form"
        else:
            payment_status = "free"

    # Generate unique ticket
    ticket_code = _gen_ticket_code(opp_id)
    while session.exec(select(EventRegistration).where(EventRegistration.ticket_code == ticket_code)).first():
        ticket_code = _gen_ticket_code(opp_id)

    reg = EventRegistration(
        user_id=current_user.id,
        opportunity_id=opp_id,
        ticket_code=ticket_code,
        status="confirmed",
        payment_status=payment_status,
        amount_paid=amount_paid,
        payment_reference=payment_ref,
        payment_method=data.payment_method or "free",
        attendee_name=data.attendee_name or current_user.name,
        attendee_email=data.attendee_email or current_user.email,
        attendee_college=data.attendee_college or current_user.college,
        attendee_phone=data.attendee_phone,
    )
    session.add(reg)
    session.commit()
    session.refresh(reg)
    return _format_registration(reg, opp)


@router.get("/{opp_id}/my-ticket", response_model=EventRegistrationRead)
def get_my_ticket(
    opp_id: int,
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session),
):
    """Retrieve a student's own ticket for a specific event."""
    reg = session.exec(
        select(EventRegistration).where(
            EventRegistration.user_id == current_user.id,
            EventRegistration.opportunity_id == opp_id,
        )
    ).first()
    if not reg:
        raise HTTPException(status_code=404, detail="No registration found for this event")
    opp = session.get(Opportunity, opp_id)
    return _format_registration(reg, opp)


@router.get("/my-tickets", response_model=List[EventRegistrationRead])
def get_my_tickets(
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session),
):
    """Get all event tickets for the logged-in student."""
    regs = session.exec(
        select(EventRegistration).where(EventRegistration.user_id == current_user.id)
        .order_by(EventRegistration.created_at.desc())
    ).all()
    result = []
    for reg in regs:
        opp = session.get(Opportunity, reg.opportunity_id)
        if opp:
            result.append(_format_registration(reg, opp))
    return result


@router.get("/{opp_id}/attendees", response_model=List[EventRegistrationRead])
def get_attendees(
    opp_id: int,
    current_user: User = Depends(require_role("ambassador", "coordinator", "organizer")),
    session: Session = Depends(get_session),
):
    """Get all registered attendees for an event (staff/organizer only)."""
    opp = session.get(Opportunity, opp_id)
    if not opp:
        raise HTTPException(status_code=404, detail="Event not found")

    # Scope check: ambassador can only see their college's events
    if current_user.role == "ambassador" and opp.college and opp.college != current_user.college and opp.posted_by != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view attendees for your college events")
    if current_user.role == "coordinator" and opp.section and opp.section != current_user.section and opp.posted_by != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view attendees for your section events")

    regs = session.exec(
        select(EventRegistration).where(EventRegistration.opportunity_id == opp_id)
        .order_by(EventRegistration.created_at.desc())
    ).all()
    return [_format_registration(reg, opp) for reg in regs]


@router.delete("/{opp_id}/cancel", status_code=status.HTTP_204_NO_CONTENT)
def cancel_registration(
    opp_id: int,
    current_user: User = Depends(require_role("student")),
    session: Session = Depends(get_session),
):
    """Cancel a student's own event registration."""
    reg = session.exec(
        select(EventRegistration).where(
            EventRegistration.user_id == current_user.id,
            EventRegistration.opportunity_id == opp_id,
        )
    ).first()
    if not reg:
        raise HTTPException(status_code=404, detail="No registration found to cancel")

    # Only allow cancellation before event start
    opp = session.get(Opportunity, opp_id)
    if opp and opp.start_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Cannot cancel registration after the event has started")

    reg.status = "cancelled"
    session.add(reg)
    session.commit()
    return None
