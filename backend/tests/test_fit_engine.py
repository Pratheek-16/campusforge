import pytest
from datetime import datetime, timedelta, timezone
from app.services.fit_engine import calculate_opportunity_fit
from app.services.content_generator import generate_opportunity_summary

def test_fit_engine_strong_match():
    assessment = calculate_opportunity_fit(
        student_skills=["Python", "FastAPI", "React", "SQL"],
        student_interests=["Artificial Intelligence", "Web Development"],
        student_year=3,
        student_department="CSE",
        student_availability="Available",
        required_skills=["Python", "FastAPI"],
        allowed_years=[3, 4],
        allowed_depts=["CSE"],
        category="internship"
    )
    assert assessment.score >= 80
    assert assessment.label == "Strong"
    assert assessment.is_eligible is True
    assert "Python" in assessment.matched_skills
    assert "FastAPI" in assessment.matched_skills
    assert len(assessment.missing_skills) == 0

def test_fit_engine_ineligible_year_and_missing_skills():
    assessment = calculate_opportunity_fit(
        student_skills=["HTML", "CSS"],
        student_interests=["Design"],
        student_year=2,
        student_department="ECE",
        student_availability="Busy",
        required_skills=["Rust", "Kubernetes", "Go"],
        allowed_years=[3, 4],  # Student is year 2 -> ineligible
        allowed_depts=["CSE"],  # Student is ECE -> ineligible
        category="hackathon"
    )
    assert assessment.score < 40
    assert assessment.label == "Low"
    assert assessment.is_eligible is False
    assert len(assessment.eligibility_reasons) >= 1
    assert "Rust" in assessment.missing_skills
    assert "Kubernetes" in assessment.missing_skills
    assert "Busy" in assessment.availability_note

def test_fit_engine_no_skills_specified():
    assessment = calculate_opportunity_fit(
        student_skills=["Python"],
        student_interests=[],
        student_year=3,
        student_department="CSE",
        student_availability="Available",
        required_skills=[],
        allowed_years=[],
        allowed_depts=[],
        category="workshop"
    )
    # Neutral skills: 30 pts + eligibility 20 pts = 50 (Partial)
    assert assessment.label in ["Partial", "Strong"]
    assert any("neutral skill weighting" in r for r in assessment.reasons)

def test_deterministic_summary():
    now = datetime.now(timezone.utc)
    summary = generate_opportunity_summary(
        title="AI Hackathon 2026",
        description="A 48-hour collaborative hackathon to build intelligent campus solutions.",
        category="hackathon",
        eligibility_text="Open to engineering students",
        allowed_years=[2, 3, 4],
        allowed_depts=["CSE", "IT"],
        required_skills=["Python", "React"],
        deadline_at=now + timedelta(days=7),
        start_at=now + timedelta(days=10),
        organizer_name="GnaN Innovation Lab"
    )
    assert "AI Hackathon" in summary["purpose"] or "collaborative hackathon" in summary["purpose"]
    assert "Python" in summary["required_skills"]
    assert "Application Deadline" in summary["key_deadlines"]
