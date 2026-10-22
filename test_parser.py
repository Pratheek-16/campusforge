import sys
sys.path.insert(0, 'backend')
from app.services.resume_parser import deterministic_parse_resume

SAMPLE_RESUME = """
Pratheek Kumar
pratheek@gmail.com | +91 9876543210 | linkedin.com/in/pratheek | github.com/pratheek16

GnaN Institute of Technology, Vellore
B.Tech in Computer Science & Engineering | 3rd Year | CGPA: 8.7 | 2022-2026

SKILLS
Python, React, FastAPI, PostgreSQL, Docker, Machine Learning, TensorFlow, Git, AWS
Problem Solving, Leadership, Communication, Teamwork, Event Management

PROJECTS
Student Opportunity Platform
Built a full-stack web app using React, FastAPI, and PostgreSQL for students to discover 
internships and events. Deployed on Render with Supabase database.

AI Resume Parser
Developed an NLP-based resume parser using Python and spaCy that extracts skills, 
projects, and education details from PDF resumes.

EXPERIENCE
Software Development Intern | June 2024 - August 2024
TechCorp Solutions, Bangalore
Developed REST APIs using FastAPI and integrated with PostgreSQL database.
Worked with Docker containers for deployment.

CERTIFICATIONS
AWS Cloud Practitioner Essentials
Google Data Analytics Certificate
"""

result = deterministic_parse_resume(SAMPLE_RESUME)
print("=== EXTRACTION RESULTS ===")
print(f"Name:        {result['suggested_name']}")
print(f"Email:       {result['suggested_email']}")
print(f"Phone:       {result['suggested_phone']}")
print(f"College:     {result['suggested_college']}")
print(f"Department:  {result['suggested_department']}")
print(f"Year:        {result['suggested_year']}")
print(f"Education:   {result['suggested_education']}")
print(f"\nTech Skills ({len(result['suggested_skills'])}): {result['suggested_skills']}")
print(f"\nSoft Skills ({len(result['suggested_nontech_skills'])}): {result['suggested_nontech_skills']}")
print(f"\nProjects ({len(result['suggested_projects'])}):")
for p in result['suggested_projects']:
    print(f"  - {p['title']}: {p['description'][:80]}... | Tech: {p['technologies']}")
print(f"\nExperience ({len(result['suggested_experience'])}):")
for e in result['suggested_experience']:
    print(f"  - {e['title']} @ {e['company']} ({e['duration']})")
print(f"\nCerts: {result['suggested_certifications']}")
print(f"Links: {result['suggested_links']}")
