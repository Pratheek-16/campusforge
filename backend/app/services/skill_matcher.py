import re
from typing import List, Set, Dict

# Standard skill alias lookup
CANONICAL_ALIASES: Dict[str, str] = {
    "js": "javascript",
    "ts": "typescript",
    "py": "python",
    "reactjs": "react",
    "react.js": "react",
    "nodejs": "node.js",
    "node": "node.js",
    "expressjs": "express",
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "dl": "deep learning",
    "postgres": "postgresql",
    "sql server": "mssql",
    "k8s": "kubernetes",
    "tailwind": "tailwind css",
    "golang": "go",
    "ui/ux": "ui/ux design",
    "ui ux": "ui/ux design",
    "rn": "react native",
    "aws": "amazon web services",
    "gcp": "google cloud platform"
}

def normalize_skill(skill: str) -> str:
    """Normalizes a skill by lowercasing, stripping whitespace/punctuation, and resolving aliases."""
    if not skill:
        return ""
    cleaned = re.sub(r"[\t\r\n]", "", skill).strip().lower()
    return CANONICAL_ALIASES.get(cleaned, cleaned)

def normalize_skill_set(skills: List[str]) -> Set[str]:
    """Converts a list of skills into a normalized set."""
    normalized = set()
    for s in skills:
        norm = normalize_skill(s)
        if norm:
            normalized.add(norm)
    return normalized

def match_candidate_for_missing_skill(
    target_skill: str,
    other_required_skills: List[str],
    candidate_user: Any,
    candidate_profile: Any,
    team_interests: Optional[List[str]] = None
) -> Optional[Dict[str, Any]]:
    """
    Candidate matching strictly conforming to PRD §5.2:
    - Hard gate: candidate MUST have the target skill in profile (otherwise returns None).
    - Score = 70 (skill present) + 20 * (other skills overlap ratio) + 10 * (interest overlap).
    - If student is Busy, adjusted by x0.5.
    """
    import json
    if team_interests is None:
        team_interests = []

    profile_skills = json.loads(candidate_profile.skills_json or "[]")
    normalized_profile_skills = normalize_skill_set(profile_skills)
    norm_target = normalize_skill(target_skill)

    # HARD GATE (E6): Never present a candidate without skill evidence
    if norm_target not in normalized_profile_skills:
        return None

    # Find which skill matched the target
    matched_target = [s for s in profile_skills if normalize_skill(s) == norm_target]
    matched_target_name = matched_target[0] if matched_target else target_skill

    # 1. Other required skills overlap (up to 20 points)
    other_matched = []
    norm_others = [normalize_skill(s) for s in other_required_skills if normalize_skill(s) != norm_target]
    for s in profile_skills:
        if normalize_skill(s) in norm_others and normalize_skill(s) != norm_target:
            other_matched.append(s)

    if norm_others:
        skill_overlap_pts = int(round((len(other_matched) / len(norm_others)) * 20))
    else:
        skill_overlap_pts = 20

    # 2. Interest overlap (up to 10 points)
    candidate_interests = json.loads(candidate_profile.interests_json or "[]")
    norm_candidate_interests = {i.strip().lower() for i in candidate_interests}
    norm_team_interests = {i.strip().lower() for i in team_interests}
    shared_interests = [i for i in candidate_interests if i.strip().lower() in norm_team_interests]
    interest_pts = 10 if shared_interests else (5 if candidate_interests else 0)

    # Total score calculation
    raw_score = 70 + skill_overlap_pts + interest_pts

    # Availability adjustment
    avail = candidate_profile.availability or "Available"
    if "busy" in avail.lower():
        raw_score = int(raw_score * 0.5)

    final_score = min(100, max(0, raw_score))

    # Plain-English explanation
    exp_parts = [f"Verified skill in {matched_target_name}"]
    if other_matched:
        exp_parts.append(f"also covers {', '.join(other_matched)}")
    if shared_interests:
        exp_parts.append(f"shares interests in {', '.join(shared_interests)}")
    if "busy" in avail.lower():
        exp_parts.append("availability marked as Busy (reduced score)")
    else:
        exp_parts.append(f"status: {avail}")

    explanation = "; ".join(exp_parts) + "."

    return {
        "user_id": candidate_user.id,
        "name": candidate_user.name,
        "email": candidate_user.email,
        "matched_skills": [matched_target_name] + other_matched,
        "other_skills": [s for s in profile_skills if s not in [matched_target_name] + other_matched],
        "shared_interests": shared_interests,
        "availability": avail,
        "score": final_score,
        "explanation": explanation
    }

