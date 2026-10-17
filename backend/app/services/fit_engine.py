from typing import List, Dict, Any, Optional
from app.services.skill_matcher import normalize_skill, normalize_skill_set
from app.schemas import FitAssessment

def calculate_opportunity_fit(
    student_skills: List[str],
    student_interests: List[str],
    student_year: Optional[int],
    student_department: Optional[str],
    student_availability: str,
    required_skills: List[str],
    allowed_years: List[int],
    allowed_depts: List[str],
    category: str,
    prior_participated_categories: Optional[List[str]] = None,
    opportunity_id: int = 0
) -> FitAssessment:
    """
    Computes deterministic 0-100 fit score based on PRD §5.1:
    - skill_score = matched_required / total_required (weight 60)
    - eligibility = year & department allowed (weight 20)
    - interest_bonus = overlap(interests, category/tags) (weight 10)
    - history_bonus = prior participation in same category (weight 10)
    """
    if prior_participated_categories is None:
        prior_participated_categories = []

    normalized_student_skills = normalize_skill_set(student_skills)
    normalized_interests = {i.strip().lower() for i in student_interests if i}
    reasons: List[str] = []
    eligibility_reasons: List[str] = []

    # 1. Skill evaluation (60 points)
    matched_skills: List[str] = []
    missing_skills: List[str] = []

    if not required_skills:
        skill_score_pts = 30  # 50% neutral for unspecified skills
        reasons.append("No specific technical skills required (neutral skill weighting applied).")
    else:
        for req in required_skills:
            if normalize_skill(req) in normalized_student_skills:
                matched_skills.append(req)
            else:
                missing_skills.append(req)

        match_ratio = len(matched_skills) / len(required_skills)
        skill_score_pts = int(round(match_ratio * 60))

        if matched_skills:
            reasons.append(f"Matches {len(matched_skills)} of {len(required_skills)} required skills ({', '.join(matched_skills)}).")
        if missing_skills:
            reasons.append(f"Missing {len(missing_skills)} required skills: {', '.join(missing_skills)}.")

    # 2. Eligibility evaluation (20 points)
    is_eligible = True
    year_ok = True
    dept_ok = True

    if allowed_years and student_year:
        if student_year not in allowed_years:
            year_ok = False
            eligibility_reasons.append(f"Open to academic year(s) {allowed_years}, but student is in Year {student_year}.")
    elif allowed_years and not student_year:
        year_ok = False
        eligibility_reasons.append(f"Requires academic year in {allowed_years}, but student year is not set.")

    if allowed_depts and student_department:
        normalized_depts = [d.strip().lower() for d in allowed_depts]
        if student_department.strip().lower() not in normalized_depts:
            dept_ok = False
            eligibility_reasons.append(f"Restricted to departments: {', '.join(allowed_depts)}.")
    elif allowed_depts and not student_department:
        dept_ok = False
        eligibility_reasons.append(f"Restricted to departments: {', '.join(allowed_depts)}, but student department is not set.")

    if not year_ok or not dept_ok:
        is_eligible = False
        eligibility_pts = 0
    else:
        eligibility_pts = 20
        reasons.append("Fully satisfies academic year and department eligibility criteria.")

    # 3. Interest overlap (10 points)
    interest_pts = 0
    cat_lower = category.lower()
    for item in normalized_interests:
        if item in cat_lower or cat_lower in item or any(req.lower() in item for req in required_skills):
            interest_pts = 10
            reasons.append(f"Aligns directly with your interest in {item.title()}.")
            break

    # 4. History bonus (10 points)
    history_pts = 0
    if cat_lower in [c.lower() for c in prior_participated_categories]:
        history_pts = 10
        reasons.append(f"Consistent with your prior participation in {category} events.")

    # Total score calculation
    raw_total = skill_score_pts + eligibility_pts + interest_pts + history_pts
    final_score = min(100, max(0, raw_total))

    # Label assignment
    if final_score >= 70:
        label = "Strong"
    elif final_score >= 40:
        label = "Partial"
    else:
        label = "Low"

    # Availability note
    avail_note = f"Current availability: {student_availability or 'Available'}."
    if "busy" in (student_availability or "").lower():
        avail_note += " (Heads-up: You marked your status as Busy, which may limit execution bandwidth)."

    return FitAssessment(
        opportunity_id=opportunity_id,
        score=final_score,
        label=label,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        is_eligible=is_eligible,
        eligibility_reasons=eligibility_reasons,
        reasons=reasons,
        availability_note=avail_note
    )
