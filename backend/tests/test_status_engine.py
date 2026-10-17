from datetime import datetime, timedelta, timezone
import pytest
from app.services.status_engine import compute_opportunity_status, is_opportunity_open_for_apply

def test_status_null_deadline():
    """E2: Seeded or legacy null-deadline item must derive 'invalid_deadline'."""
    now = datetime.now(timezone.utc)
    status = compute_opportunity_status(
        start_at=now + timedelta(days=1),
        end_at=now + timedelta(days=5),
        deadline_at=None,
        now=now
    )
    assert status == "invalid_deadline"
    can_apply, reason = is_opportunity_open_for_apply(status)
    assert not can_apply
    assert "Deadline not specified" in reason

def test_status_expired():
    """E1: Opportunity with deadline in the past must derive 'expired' and block apply."""
    now = datetime.now(timezone.utc)
    status = compute_opportunity_status(
        start_at=now + timedelta(days=1),
        end_at=now + timedelta(days=5),
        deadline_at=now - timedelta(hours=1),
        now=now
    )
    assert status == "expired"
    can_apply, reason = is_opportunity_open_for_apply(status)
    assert not can_apply
    assert "deadline has passed" in reason

def test_status_upcoming_and_ongoing():
    now = datetime.now(timezone.utc)
    # Upcoming
    status_up = compute_opportunity_status(
        start_at=now + timedelta(days=2),
        end_at=now + timedelta(days=5),
        deadline_at=now + timedelta(days=1),
        now=now
    )
    assert status_up == "upcoming"
    can_apply, _ = is_opportunity_open_for_apply(status_up)
    assert can_apply

    # Ongoing
    status_on = compute_opportunity_status(
        start_at=now - timedelta(hours=2),
        end_at=now + timedelta(days=2),
        deadline_at=now + timedelta(days=1),
        now=now
    )
    assert status_on == "ongoing"

def test_status_completed_and_closed():
    now = datetime.now(timezone.utc)
    # Completed
    status_comp = compute_opportunity_status(
        start_at=now - timedelta(days=5),
        end_at=now - timedelta(days=1),
        deadline_at=now - timedelta(days=6),
        now=now
    )
    assert status_comp == "completed"

    # Closed by organizer
    status_closed = compute_opportunity_status(
        start_at=now + timedelta(days=2),
        deadline_at=now + timedelta(days=1),
        is_closed=True,
        now=now
    )
    assert status_closed == "closed"
