from datetime import datetime, timezone
from typing import Optional

def normalize_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensures datetime is timezone-aware UTC for safe comparisons."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

def compute_opportunity_status(
    start_at: datetime,
    end_at: Optional[datetime] = None,
    deadline_at: Optional[datetime] = None,
    is_closed: bool = False,
    now: Optional[datetime] = None
) -> str:
    """
    Derives status at read-time. Never trusts a stored status string.
    
    Status states:
    - 'closed': organizer explicitly closed it
    - 'invalid_deadline': deadline_at is None ("Deadline not specified")
    - 'expired': deadline_at is in the past
    - 'completed': end_at is in the past
    - 'ongoing': currently happening (start_at <= now <= end_at)
    - 'upcoming': hasn't started yet and deadline is in the future
    """
    if is_closed:
        return "closed"

    if deadline_at is None:
        return "invalid_deadline"

    if now is None:
        now = datetime.now(timezone.utc)
    else:
        now = normalize_utc(now)

    norm_deadline = normalize_utc(deadline_at)
    norm_start = normalize_utc(start_at)
    norm_end = normalize_utc(end_at)

    # If end_at has passed, it's completed
    if norm_end and norm_end < now:
        return "completed"

    # If deadline has passed, it's expired
    if norm_deadline and norm_deadline < now:
        return "expired"

    # If already started and not ended
    if norm_start and norm_start <= now:
        return "ongoing"

    # Otherwise upcoming
    return "upcoming"

def is_opportunity_open_for_apply(
    status: str
) -> tuple[bool, str]:
    """
    Checks whether an opportunity can accept applications.
    Returns (can_apply: bool, reason_message: str).
    """
    if status == "invalid_deadline":
        return False, "Applications blocked: Deadline not specified for this opportunity."
    if status == "expired":
        return False, "Applications blocked: Registration/application deadline has passed."
    if status == "closed":
        return False, "Applications blocked: This opportunity has been closed by the organizer."
    if status == "completed":
        return False, "Applications blocked: This opportunity has already completed."
    return True, "Open for applications"
