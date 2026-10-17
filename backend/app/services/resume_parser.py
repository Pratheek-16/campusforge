import re
import json
from typing import Dict, Any, List
from pypdf import PdfReader
from io import BytesIO

# Canonical skill taxonomy and normalization
COMMON_SKILLS = [
    "Python", "FastAPI", "Django", "Flask", "JavaScript", "TypeScript", "React",
    "Node.js", "Express", "HTML", "CSS", "Tailwind CSS", "SQL", "PostgreSQL",
    "MySQL", "SQLite", "MongoDB", "Redis", "Git", "Docker", "Kubernetes", "AWS",
    "GCP", "Azure", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
    "Data Science", "Pandas", "NumPy", "Scikit-Learn", "Java", "C++", "C", "C#",
    "Go", "Rust", "Flutter", "React Native", "Android", "Kotlin", "Swift",
    "GraphQL", "REST APIs", "Linux", "CI/CD", "Figma", "UI/UX", "Cybersecurity"
]

SKILL_ALIASES = {
    "js": "JavaScript",
    "ts": "TypeScript",
    "reactjs": "React",
    "react.js": "React",
    "nodejs": "Node.js",
    "py": "Python",
    "ml": "Machine Learning",
    "dl": "Deep Learning",
    "postgres": "PostgreSQL",
    "k8s": "Kubernetes",
    "golang": "Go",
    "ui/ux": "UI/UX",
    "ui ux": "UI/UX",
    "tailwind": "Tailwind CSS",
    "rn": "React Native"
}

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts plain text safely from PDF bytes."""
    reader = PdfReader(BytesIO(file_bytes))
    text_parts = []
    for page in reader.pages:
        txt = page.extract_text()
        if txt:
            text_parts.append(txt)
    return "\n".join(text_parts).strip()

def extract_text_from_docx_or_txt(file_bytes: bytes, filename: str) -> str:
    """Extracts text from docx or plain text."""
    try:
        return file_bytes.decode("utf-8", errors="ignore")
    except Exception:
        return ""

def deterministic_parse_resume(text: str) -> Dict[str, Any]:
    """
    Deterministic rule-based extractor using regex and vocabulary lookups.
    Guarantees 100% offline availability without needing an API key.
    """
    found_skills = set()
    lower_text = text.lower()

    # Look for known skills
    for skill in COMMON_SKILLS:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, lower_text):
            found_skills.add(skill)

    # Check aliases
    for alias, canonical in SKILL_ALIASES.items():
        pattern = r"\b" + re.escape(alias) + r"\b"
        if re.search(pattern, lower_text):
            found_skills.add(canonical)

    # Simple education detection
    education = {}
    if re.search(r"\b(b\.?tech|bachelor|b\.?e|computer science|engineering)\b", lower_text):
        education["degree"] = "B.Tech in Computer Science & Engineering"
    if match := re.search(r"\b(cgpa|gpa)[\s:]*([0-9]+\.?[0-9]*)", lower_text):
        education["gpa"] = match.group(2)
    if match := re.search(r"\b(20[12][0-9]\s*-\s*20[12][0-9]|20[23][0-9])\b", lower_text):
        education["graduation_year"] = match.group(0)

    # Simple projects detection (sentences mentioning built, developed, created, project)
    projects = []
    lines = text.split("\n")
    for line in lines:
        cleaned = line.strip()
        if len(cleaned) > 20 and any(kw in cleaned.lower() for kw in ["project", "built", "developed", "implemented", "designed"]):
            projects.append({
                "title": cleaned[:60],
                "description": cleaned[:200],
                "technologies": [s for s in found_skills if s.lower() in cleaned.lower()]
            })
            if len(projects) >= 3:
                break

    return {
        "suggested_skills": sorted(list(found_skills)),
        "suggested_education": education,
        "suggested_projects": projects,
        "suggested_experience": []
    }

def analyze_resume_text(text: str, gemini_api_key: str = "") -> Dict[str, Any]:
    """
    Extracts structured resume data with optional Gemini enhancement
    and automatic fallback to deterministic extraction.
    """
    result = deterministic_parse_resume(text)

    # If Gemini API key is configured, attempt enhancement
    if gemini_api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            prompt = f"""
            Extract structured resume information from the following text into valid JSON with fields:
            suggested_skills (list of strings),
            suggested_projects (list of objects with title, description, technologies),
            suggested_experience (list of objects with title, company, duration).
            Only return the JSON object:
            {text[:3000]}
            """
            response = model.generate_content(prompt)
            raw = response.text.strip()
            # Clean possible markdown block
            if raw.startswith("```"):
                raw = raw.strip("`").replace("json", "", 1).strip()
            ai_data = json.loads(raw)
            if "suggested_skills" in ai_data and ai_data["suggested_skills"]:
                # Combine skills
                combined_skills = set(result["suggested_skills"]) | set(ai_data.get("suggested_skills", []))
                result["suggested_skills"] = sorted(list(combined_skills))
            if "suggested_projects" in ai_data and ai_data["suggested_projects"]:
                result["suggested_projects"] = ai_data["suggested_projects"]
            if "suggested_experience" in ai_data and ai_data["suggested_experience"]:
                result["suggested_experience"] = ai_data["suggested_experience"]
        except Exception:
            # Fallback gracefully to deterministic result
            pass

    return result
