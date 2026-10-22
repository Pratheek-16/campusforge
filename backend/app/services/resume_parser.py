"""
Resume Parser — CampusForge
Extracts: name, email, phone, college, year, department, CGPA, skills (tech + non-tech),
projects, experience, certifications, interests, career goals.

Strategy:
  1. Always run deterministic regex extraction (works offline, no API key needed).
  2. If GEMINI_API_KEY is set, call Gemini-1.5-flash with a detailed structured prompt
     and MERGE results (AI wins for text fields, union for lists).
"""

import re
import json
from typing import Dict, Any, List, Optional
from pypdf import PdfReader
from io import BytesIO


# ─────────────────────────────────────────────
# SKILL TAXONOMY  (600+ entries, normalized)
# ─────────────────────────────────────────────
TECH_SKILLS = [
    # Languages
    "Python", "JavaScript", "TypeScript", "Java", "C", "C++", "C#", "Go", "Rust",
    "Kotlin", "Swift", "Ruby", "PHP", "Scala", "R", "MATLAB", "Shell", "Bash",
    "PowerShell", "Perl", "Dart", "Lua", "Haskell", "Elixir", "Clojure", "F#",
    "Assembly", "Verilog", "VHDL", "Solidity", "HTML", "CSS", "SASS", "LESS",
    # Web Frameworks & Libraries
    "React", "Next.js", "Vue.js", "Angular", "Svelte", "Nuxt.js", "Gatsby",
    "Remix", "Astro", "jQuery", "Bootstrap", "Tailwind CSS", "Material UI",
    "Chakra UI", "Shadcn UI", "Ant Design", "FastAPI", "Django", "Flask",
    "Express", "Node.js", "NestJS", "Spring Boot", "Spring MVC", "Hibernate",
    "Laravel", "Symfony", "Rails", "Sinatra", "Gin", "Echo", "Fiber",
    "ASP.NET", "Blazor", "Phoenix", "Actix",
    # Databases
    "PostgreSQL", "MySQL", "SQLite", "MongoDB", "Redis", "Cassandra", "DynamoDB",
    "Firebase", "Firestore", "Supabase", "CockroachDB", "MariaDB", "Oracle",
    "MS SQL Server", "Elasticsearch", "Neo4j", "InfluxDB", "TimescaleDB",
    "Pinecone", "Weaviate", "ChromaDB", "Qdrant",
    # Cloud & DevOps
    "AWS", "GCP", "Azure", "DigitalOcean", "Heroku", "Vercel", "Netlify",
    "Render", "Railway", "Fly.io", "Docker", "Kubernetes", "Terraform",
    "Ansible", "Helm", "Prometheus", "Grafana", "Datadog", "CI/CD",
    "GitHub Actions", "Jenkins", "GitLab CI", "CircleCI", "ArgoCD",
    "Nginx", "Apache", "Linux", "Ubuntu", "Debian", "CentOS",
    # AI / ML / Data
    "Machine Learning", "Deep Learning", "NLP", "Computer Vision", "LLMs",
    "Generative AI", "RAG", "Fine-tuning", "Transformers", "BERT", "GPT",
    "TensorFlow", "PyTorch", "Keras", "Scikit-Learn", "XGBoost", "LightGBM",
    "Pandas", "NumPy", "Matplotlib", "Seaborn", "Plotly", "OpenCV",
    "Hugging Face", "LangChain", "LlamaIndex", "Ollama", "Stable Diffusion",
    "Data Science", "Data Analysis", "Data Visualization", "Feature Engineering",
    "A/B Testing", "Statistical Analysis", "Tableau", "Power BI", "Excel",
    "PySpark", "Apache Kafka", "Apache Airflow", "dbt", "MLflow", "Weights & Biases",
    # Mobile
    "React Native", "Flutter", "Android", "iOS", "Swift UI", "Jetpack Compose",
    "Expo", "Xamarin", "Ionic",
    # Tools & Misc
    "Git", "GitHub", "GitLab", "Bitbucket", "Jira", "Confluence", "Notion",
    "Figma", "Adobe XD", "Sketch", "Photoshop", "Illustrator", "Canva",
    "REST APIs", "GraphQL", "gRPC", "WebSockets", "OAuth", "JWT",
    "Microservices", "Serverless", "WebAssembly", "Blockchain", "Solidity",
    "Cybersecurity", "Penetration Testing", "Ethical Hacking", "Burp Suite",
    "Wireshark", "Metasploit", "OWASP", "Network Security", "Cryptography",
    "Embedded Systems", "Arduino", "Raspberry Pi", "IoT", "RTOS", "FreeRTOS",
    "3D Printing", "CAD", "SolidWorks", "AutoCAD", "ROS", "Robotics",
    "Unity", "Unreal Engine", "OpenGL", "Vulkan", "WebGL", "Three.js",
    "Selenium", "Playwright", "Cypress", "Jest", "Pytest", "JUnit",
    "Postman", "Swagger", "OpenAPI", "RabbitMQ", "Redis Pub/Sub",
    "Stripe", "Razorpay", "Twilio", "SendGrid", "Cloudinary",
]

NON_TECH_SKILLS = [
    "Leadership", "Communication", "Public Speaking", "Teamwork", "Collaboration",
    "Problem Solving", "Critical Thinking", "Time Management", "Project Management",
    "Agile", "Scrum", "Kanban", "Product Management", "Research", "Writing",
    "Content Writing", "Technical Writing", "Presentation", "Mentoring",
    "Event Management", "Community Building", "Sales", "Marketing",
    "Digital Marketing", "SEO", "Social Media Marketing", "Customer Service",
    "Negotiation", "Conflict Resolution", "Decision Making", "Adaptability",
    "Creativity", "Innovation", "Entrepreneurship", "Business Development",
    "Financial Analysis", "Accounting", "Fundraising", "Grant Writing",
]

# Alias map (what students write → canonical name)
SKILL_ALIASES = {
    "js": "JavaScript", "ts": "TypeScript", "reactjs": "React", "react.js": "React",
    "vuejs": "Vue.js", "vue.js": "Vue.js", "angularjs": "Angular",
    "nextjs": "Next.js", "next js": "Next.js", "nodejs": "Node.js", "node js": "Node.js",
    "nestjs": "NestJS", "expressjs": "Express", "express.js": "Express",
    "py": "Python", "ml": "Machine Learning", "dl": "Deep Learning",
    "ai": "Machine Learning", "genai": "Generative AI", "gen ai": "Generative AI",
    "postgres": "PostgreSQL", "psql": "PostgreSQL", "mongo": "MongoDB",
    "k8s": "Kubernetes", "kube": "Kubernetes", "tf": "TensorFlow",
    "pytorch": "PyTorch", "sklearn": "Scikit-Learn", "scikit learn": "Scikit-Learn",
    "cv": "Computer Vision", "nlp": "NLP", "llm": "LLMs", "llms": "LLMs",
    "golang": "Go", "golang lang": "Go", "cpp": "C++", "csharp": "C#",
    "ui/ux": "UI/UX Design", "ui ux": "UI/UX Design", "ux": "UI/UX Design",
    "tailwind": "Tailwind CSS", "rn": "React Native",
    "gha": "GitHub Actions", "gh actions": "GitHub Actions",
    "aws lambda": "AWS", "aws s3": "AWS", "ec2": "AWS",
    "gcp": "GCP", "google cloud": "GCP", "azure": "Azure",
    "verilog hdl": "Verilog", "system verilog": "Verilog",
    "oop": "Object-Oriented Programming", "oops": "Object-Oriented Programming",
    "dsa": "Data Structures & Algorithms", "data structures": "Data Structures & Algorithms",
    "algo": "Algorithms", "algorithms": "Algorithms",
    "os": "Operating Systems", "dbms": "Database Management",
    "cn": "Computer Networks", "networking": "Computer Networks",
    "se": "Software Engineering", "agile methodology": "Agile",
    "pub sub": "Redis Pub/Sub", "pub/sub": "Redis Pub/Sub",
    "postman api": "Postman", "rest api": "REST APIs", "restful": "REST APIs",
    "graphql api": "GraphQL", "api development": "REST APIs",
}

# All skills in one flat lookup set (lowercase → canonical)
_SKILL_LOOKUP: Dict[str, str] = {}
for s in TECH_SKILLS + NON_TECH_SKILLS:
    _SKILL_LOOKUP[s.lower()] = s
for alias, canonical in SKILL_ALIASES.items():
    _SKILL_LOOKUP[alias.lower()] = canonical


# ─────────────────────────────────────────────
# PDF / TEXT EXTRACTION
# ─────────────────────────────────────────────
def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(file_bytes))
    parts = []
    for page in reader.pages:
        txt = page.extract_text()
        if txt:
            parts.append(txt)
    return "\n".join(parts).strip()

def extract_text_from_docx_or_txt(file_bytes: bytes, filename: str) -> str:
    try:
        return file_bytes.decode("utf-8", errors="ignore")
    except Exception:
        return ""


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def _normalize_whitespace(text: str) -> str:
    return re.sub(r"[ \t]+", " ", text)

def _find_skills_in_text(text: str) -> Dict[str, List[str]]:
    """Scan text for all tech and non-tech skills. Returns {tech:[], nontech:[]}."""
    lower = text.lower()
    tech_found = set()
    nontech_found = set()

    # Direct lookup (word-boundary aware)
    for key, canonical in _SKILL_LOOKUP.items():
        # Try word boundary match for short keys, substring for longer ones
        pattern = r"(?<![a-z])" + re.escape(key) + r"(?![a-z])"
        if re.search(pattern, lower):
            if canonical in NON_TECH_SKILLS:
                nontech_found.add(canonical)
            else:
                tech_found.add(canonical)

    return {
        "tech": sorted(list(tech_found)),
        "nontech": sorted(list(nontech_found))
    }

def _extract_name(text: str, lines: List[str]) -> Optional[str]:
    """
    Heuristic: name is usually one of the first non-empty lines,
    title case or all caps, 2-4 words, no special chars.
    """
    skip_words = {
        "resume", "curriculum", "vitae", "cv", "profile", "objective",
        "summary", "contact", "information", "skills", "education",
        "experience", "projects", "certifications", "achievements"
    }
    skip_pattern = re.compile(r"@|linkedin|github|phone|mobile|\d{5,}|http|www\.|•|·")

    non_empty = [l.strip() for l in lines if l.strip()]
    for line in non_empty[:10]:
        if skip_pattern.search(line.lower()):
            continue
        if line.lower().strip() in skip_words:
            continue
        words = line.split()
        if 2 <= len(words) <= 5 and all(re.match(r"^[A-Za-z.\-']+$", w) for w in words):
            return line.title()
    return None

def _extract_email(text: str) -> Optional[str]:
    match = re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", text)
    return match.group(0) if match else None

def _extract_phone(text: str) -> Optional[str]:
    match = re.search(r"(?:\+91[-.\s]?)?[6-9]\d{4}[-.\s]?\d{5}", text)
    return match.group(0).strip() if match else None

def _extract_college(text: str, lines: List[str]) -> Optional[str]:
    """Look for college/university/institute name."""
    # Pattern match on lines
    for line in lines:
        stripped = line.strip()
        if re.search(
            r"\b(university|college|institute|institution|iit|nit|iiit|bits|vtu|anna university|deemed)\b",
            stripped.lower()
        ):
            # Clean it up
            cleaned = re.sub(r"\s+", " ", stripped).strip()
            if 5 < len(cleaned) < 120:
                return cleaned
    return None

def _extract_degree(text: str) -> Optional[str]:
    lower = text.lower()
    patterns = [
        (r"b\.?tech|bachelor of technology", "B.Tech"),
        (r"b\.?e\.?\b|bachelor of engineering", "B.E."),
        (r"b\.?sc|bachelor of science", "B.Sc"),
        (r"b\.?c\.?a|bachelor of computer applications", "BCA"),
        (r"b\.?com", "B.Com"),
        (r"m\.?tech|master of technology", "M.Tech"),
        (r"m\.?e\.?\b|master of engineering", "M.E."),
        (r"mba", "MBA"),
        (r"m\.?sc|master of science", "M.Sc"),
        (r"ph\.?d|doctorate", "Ph.D"),
        (r"diploma", "Diploma"),
    ]
    for pattern, label in patterns:
        if re.search(pattern, lower):
            return label
    return None

def _extract_department(text: str) -> Optional[str]:
    lower = text.lower()
    dept_map = {
        r"computer science|cse\b|cs\b": "Computer Science & Engineering",
        r"information technology|it\b": "Information Technology",
        r"electronics.*(communication|engineer)|ece\b": "Electronics & Communication Engineering",
        r"electrical.*(electronic)?s?|eee\b|ee\b": "Electrical & Electronics Engineering",
        r"mechanical|mech\b": "Mechanical Engineering",
        r"civil engineering|civil\b": "Civil Engineering",
        r"artificial intelligence|ai\b.*ml|machine learning.*ai": "AI & Machine Learning",
        r"data science|ds\b": "Data Science",
        r"biomedical|biotech": "Biomedical Engineering",
        r"chemical engineering|chem\b": "Chemical Engineering",
        r"aeronautical|aerospace": "Aerospace Engineering",
        r"mathematics|maths?\b": "Mathematics",
        r"physics\b": "Physics",
        r"mba|business administration": "Business Administration",
    }
    for pattern, dept in dept_map.items():
        if re.search(pattern, lower):
            return dept
    return None

def _extract_year_and_graduation(text: str) -> Dict:
    result = {}
    lower = text.lower()
    # CGPA / GPA
    m = re.search(r"(?:cgpa|gpa|cpi)[^\d]*([0-9]+\.[0-9]+)", lower)
    if m:
        result["gpa"] = m.group(1)

    # Graduation year — look for year ranges like 2022-2026 or standalone 2026
    m = re.search(r"20(2[0-9])\s*[-–]\s*20(2[0-9])", text)
    if m:
        result["graduation_year"] = f"20{m.group(2)}"
    else:
        m = re.search(r"\b(202[3-9]|2030)\b", text)
        if m:
            result["graduation_year"] = m.group(1)

    # Current year (1st/2nd/3rd/4th year)
    m = re.search(r"\b([1-4](?:st|nd|rd|th)?\s*year)\b", lower)
    if m:
        yr_text = m.group(1)
        y = re.search(r"[1-4]", yr_text)
        if y:
            result["current_year"] = int(y.group(0))

    return result

def _extract_projects(text: str, tech_skills: List[str]) -> List[Dict]:
    """
    Heuristically extract projects. Looks for project section and
    bullet points that describe what was built.
    """
    projects = []

    # First try to find a dedicated projects section
    proj_section_match = re.search(
        r"(?:projects?|personal projects?|academic projects?|key projects?)\s*\n(.*?)(?:\n(?:experience|internship|certification|skill|education|achievement|work history|employment)\b|\Z)",
        text,
        re.IGNORECASE | re.DOTALL
    )
    section_text = proj_section_match.group(1) if proj_section_match else text

    # Split into paragraphs
    paragraphs = re.split(r"\n\s*\n", section_text)

    project_keywords = re.compile(
        r"\b(built|developed|implemented|designed|created|deployed|architected|"
        r"engineered|automated|integrated|optimized|launched|led|managed|used|using)\b",
        re.IGNORECASE
    )

    # Section header words to skip as project titles
    section_headers = {"projects", "experience", "skills", "education", "certifications",
                       "internship", "achievements", "summary", "objective", "contact"}

    seen_titles = set()

    for para in paragraphs:
        lines = [l.strip() for l in para.strip().split("\n") if l.strip()]
        if not lines or len(lines) < 1:
            continue
        if not project_keywords.search(para):
            continue

        # Title is first non-section-header line
        title = lines[0].strip()
        # Remove leading bullets/dashes
        title = re.sub(r"^[-•*▪◦]\s*", "", title).strip()
        # Skip section headers
        if title.lower() in section_headers or len(title) < 4 or len(title) > 100:
            continue
        if title.lower() in seen_titles:
            continue
        seen_titles.add(title.lower())

        description = " ".join(lines[1:3])[:300] if len(lines) > 1 else lines[0][:300]
        para_lower = para.lower()
        used_techs = [s for s in tech_skills if s.lower() in para_lower]

        projects.append({
            "title": title,
            "description": description or title,
            "technologies": used_techs[:6]
        })
        if len(projects) >= 5:
            break

    return projects

def _extract_experience(text: str) -> List[Dict]:
    """
    Extract internship/work experience entries.
    Looks for company names, roles, and durations.
    """
    experience = []
    # Common experience section markers
    exp_section = re.search(
        r"(?:experience|internship|work history|employment)(.*?)(?:education|project|skill|certificate|achievement|\Z)",
        text,
        re.IGNORECASE | re.DOTALL
    )
    if not exp_section:
        return []

    section_text = exp_section.group(1)
    lines = [l.strip() for l in section_text.split("\n") if l.strip() and len(l.strip()) > 4]

    i = 0
    while i < len(lines) and len(experience) < 4:
        line = lines[i]
        # Look for duration pattern (months/year ranges)
        duration_match = re.search(
            r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]*(20\d{2})"
            r"\s*[-–to]+\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]*(20\d{2}|present|current)",
            line.lower()
        )
        # Look for role patterns
        role_match = re.search(
            r"\b(intern|developer|engineer|analyst|designer|researcher|assistant|consultant|lead|manager)\b",
            line.lower()
        )
        if duration_match or role_match:
            title = line[:80]
            company = lines[i + 1][:60] if i + 1 < len(lines) else ""
            duration = duration_match.group(0) if duration_match else ""
            description = " ".join(lines[i + 2: i + 4])[:200] if i + 2 < len(lines) else ""
            experience.append({
                "title": title,
                "company": company,
                "duration": duration,
                "description": description
            })
            i += 3
        else:
            i += 1

    return experience

def _extract_certifications(text: str) -> List[str]:
    """Look for certification/course mentions."""
    certs = []
    cert_section = re.search(
        r"(?:certification|certificate|course|mooc|credential)(.*?)(?:project|skill|experience|education|achievement|\Z)",
        text,
        re.IGNORECASE | re.DOTALL
    )
    if cert_section:
        lines = [l.strip() for l in cert_section.group(1).split("\n") if l.strip() and len(l.strip()) > 5]
        for line in lines[:6]:
            if len(line) < 100:
                certs.append(line)
    return certs

def _extract_linkedin_github(text: str) -> Dict:
    result = {}
    linkedin = re.search(r"linkedin\.com/in/([a-zA-Z0-9\-_]+)", text, re.IGNORECASE)
    if linkedin:
        result["linkedin"] = f"https://linkedin.com/in/{linkedin.group(1)}"
    github = re.search(r"github\.com/([a-zA-Z0-9\-_]+)", text, re.IGNORECASE)
    if github:
        result["github"] = f"https://github.com/{github.group(1)}"
    return result


# ─────────────────────────────────────────────
# MAIN DETERMINISTIC PARSER
# ─────────────────────────────────────────────
def deterministic_parse_resume(text: str) -> Dict[str, Any]:
    text = _normalize_whitespace(text)
    lines = [l.strip() for l in text.split("\n")]

    skills_found = _find_skills_in_text(text)
    edu_info = _extract_year_and_graduation(text)
    degree = _extract_degree(text)
    dept = _extract_department(text)
    if degree:
        edu_info["degree"] = degree
    if dept:
        edu_info["department"] = dept

    projects = _extract_projects(text, skills_found["tech"])
    experience = _extract_experience(text)
    certifications = _extract_certifications(text)
    links = _extract_linkedin_github(text)

    return {
        # Personal info
        "suggested_name": _extract_name(text, lines),
        "suggested_email": _extract_email(text),
        "suggested_phone": _extract_phone(text),
        "suggested_college": _extract_college(text, lines),
        "suggested_department": dept,
        "suggested_year": edu_info.get("current_year"),
        # Skills split by type
        "suggested_skills": skills_found["tech"],
        "suggested_nontech_skills": skills_found["nontech"],
        # Education
        "suggested_education": edu_info,
        # Projects, experience, certs
        "suggested_projects": projects,
        "suggested_experience": experience,
        "suggested_certifications": certifications,
        # Links
        "suggested_links": links,
    }


# ─────────────────────────────────────────────
# GEMINI-ENHANCED PARSER (optional)
# ─────────────────────────────────────────────
GEMINI_PROMPT = """You are a precise resume parser. Extract ALL structured information from the resume text below.

Return ONLY a valid JSON object with these exact keys (use null for missing fields):
{{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "phone number",
  "college": "Full college/university name",
  "department": "Department or branch",
  "year": 2,
  "cgpa": "8.5",
  "graduation_year": "2026",
  "tech_skills": ["Python", "React", "PostgreSQL", ...],
  "nontech_skills": ["Leadership", "Communication", ...],
  "projects": [
    {{"title": "Project Name", "description": "What it does and how", "technologies": ["Tech1", "Tech2"]}}
  ],
  "experience": [
    {{"title": "Role Title", "company": "Company Name", "duration": "Jun 2024 - Aug 2024", "description": "What you did"}}
  ],
  "certifications": ["AWS Certified Cloud Practitioner", "Google Data Analytics"],
  "career_goals": "One sentence about career objective if mentioned",
  "linkedin": "https://linkedin.com/in/username or null",
  "github": "https://github.com/username or null"
}}

Rules:
- tech_skills: include ALL programming languages, frameworks, tools, databases, cloud platforms, libraries mentioned ANYWHERE in the resume
- nontech_skills: include soft skills like leadership, communication, teamwork, event management etc.
- Be thorough with skills — scan every section (projects, experience, certifications, skills section)
- For projects: extract real project titles and meaningful descriptions, not generic text
- For year: extract as integer (1, 2, 3, or 4) if mentioned
- Return ONLY the JSON, no markdown, no explanation

RESUME TEXT:
{text}"""


def analyze_resume_text(text: str, gemini_api_key: str = "") -> Dict[str, Any]:
    """
    Main entry point. Always runs deterministic parser first.
    If Gemini API key is set, enhances with AI and merges results.
    """
    result = deterministic_parse_resume(text)

    if not gemini_api_key:
        return result

    try:
        import google.generativeai as genai
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = GEMINI_PROMPT.format(text=text[:4000])
        response = model.generate_content(prompt)
        raw = response.text.strip()

        # Strip markdown code block if present
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            raw = raw.strip()

        ai = json.loads(raw)

        # Merge: AI text fields win; skill lists are unioned
        if ai.get("name"):
            result["suggested_name"] = ai["name"]
        if ai.get("email"):
            result["suggested_email"] = ai["email"]
        if ai.get("phone"):
            result["suggested_phone"] = ai["phone"]
        if ai.get("college"):
            result["suggested_college"] = ai["college"]
        if ai.get("department"):
            result["suggested_department"] = ai["department"]
        if ai.get("year"):
            result["suggested_year"] = ai["year"]
        if ai.get("career_goals"):
            result["suggested_career_goals"] = ai["career_goals"]

        # Education
        edu = result.get("suggested_education", {})
        if ai.get("cgpa"):
            edu["gpa"] = ai["cgpa"]
        if ai.get("graduation_year"):
            edu["graduation_year"] = ai["graduation_year"]
        if ai.get("department"):
            edu["department"] = ai["department"]
        result["suggested_education"] = edu

        # Skills — union of deterministic + AI
        ai_tech = [s for s in (ai.get("tech_skills") or []) if isinstance(s, str)]
        ai_nontech = [s for s in (ai.get("nontech_skills") or []) if isinstance(s, str)]
        result["suggested_skills"] = sorted(list(
            set(result["suggested_skills"]) | set(ai_tech)
        ))
        result["suggested_nontech_skills"] = sorted(list(
            set(result["suggested_nontech_skills"]) | set(ai_nontech)
        ))

        # Projects — prefer AI's (usually better)
        if ai.get("projects"):
            result["suggested_projects"] = ai["projects"][:5]

        # Experience — prefer AI's
        if ai.get("experience"):
            result["suggested_experience"] = ai["experience"][:4]

        # Certifications — union
        ai_certs = ai.get("certifications") or []
        existing_certs = result.get("suggested_certifications", [])
        result["suggested_certifications"] = list(set(existing_certs) | set(ai_certs))

        # Links
        links = result.get("suggested_links", {})
        if ai.get("linkedin"):
            links["linkedin"] = ai["linkedin"]
        if ai.get("github"):
            links["github"] = ai["github"]
        result["suggested_links"] = links

    except Exception as e:
        # Silently fall back to deterministic result — never break the upload flow
        pass

    return result
