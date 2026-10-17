import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.config import settings

def generate_opportunity_summary(
    title: str,
    description: str,
    category: str,
    eligibility_text: str,
    allowed_years: List[int],
    allowed_depts: List[str],
    required_skills: List[str],
    deadline_at: Optional[datetime],
    start_at: datetime,
    organizer_name: str,
    gemini_key: str = ""
) -> Dict[str, Any]:
    """
    Generates a structured opportunity summary.
    Works deterministically with template extraction and optional Gemini polishing.
    """
    # Deterministic fallback summary
    purpose = description[:250].strip() + ("..." if len(description) > 250 else "")
    
    eligibility_parts = []
    if eligibility_text:
        eligibility_parts.append(eligibility_text)
    if allowed_years:
        eligibility_parts.append(f"Eligible Years: {', '.join(map(str, allowed_years))}")
    if allowed_depts:
        eligibility_parts.append(f"Eligible Departments: {', '.join(allowed_depts)}")
    eligibility_str = " | ".join(eligibility_parts) if eligibility_parts else "Open to all students"

    benefits = f"Hands-on industry experience and mentorship organized by {organizer_name} in {category.title()} track."
    
    deadline_str = deadline_at.strftime("%B %d, %Y") if deadline_at else "Deadline not specified"
    start_str = start_at.strftime("%B %d, %Y") if start_at else "TBD"
    deadlines = f"Application Deadline: {deadline_str} | Starts: {start_str}"

    summary = {
        "purpose": purpose,
        "eligibility": eligibility_str,
        "benefits": benefits,
        "required_skills": required_skills or ["General participation"],
        "key_deadlines": deadlines
    }

    # Optional Gemini Polish
    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            prompt = f"""
            Summarize the following student opportunity concisely into a JSON object with keys:
            purpose, eligibility, benefits, required_skills (list of strings), key_deadlines.
            Title: {title}
            Category: {category}
            Description: {description}
            Deadline: {deadline_str}
            Organizer: {organizer_name}
            Only return valid JSON:
            """
            response = model.generate_content(prompt)
            raw = response.text.strip().strip("`").replace("json", "", 1).strip()
            ai_summary = json.loads(raw)
            if all(k in ai_summary for k in ["purpose", "eligibility", "benefits", "required_skills", "key_deadlines"]):
                return ai_summary
        except Exception:
            pass

    return summary

def generate_linkedin_draft(
    opportunity_title: str,
    category: str,
    organizer_name: str,
    skills_gained: List[str],
    student_reflection: str = "",
    student_name: str = "",
    gemini_key: str = ""
) -> Dict[str, str]:
    """
    Generates an editable LinkedIn post draft.
    Deterministic template fallback ensures 100% operation without Gemini API key.
    """
    skills_formatted = ", ".join(skills_gained) if skills_gained else "problem-solving and agile collaboration"
    user_note = f"\n\nReflecting on the experience: \"{student_reflection}\"" if student_reflection else ""
    
    template_draft = (
        f"🚀 Proud to share my recent participation in {opportunity_title}, organized by {organizer_name}!\n\n"
        f"During this {category}, I had the opportunity to deepen my skills in {skills_formatted} and work through "
        f"challenging practical problem statements.{user_note}\n\n"
        f"Grateful to the mentors and organizers for providing such an impactful learning environment. Looking forward "
        f"to taking these learnings into my upcoming projects!\n\n"
        f"#StudentOpportunity #{category.replace(' ', '')} #ContinuousLearning #GrowthMindset #CampusForge"
    )

    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            prompt = f"""
            Write an engaging, authentic LinkedIn post celebrating a student's completion of:
            Event: {opportunity_title} ({category}) by {organizer_name}
            Skills applied: {skills_formatted}
            Student personal reflection: {student_reflection}
            Keep it professional, enthusiastic, and under 180 words. Include relevant hashtags.
            """
            response = model.generate_content(prompt)
            if response.text.strip():
                return {"draft": response.text.strip(), "source": "gemini"}
        except Exception:
            pass

    return {"draft": template_draft, "source": "template"}
