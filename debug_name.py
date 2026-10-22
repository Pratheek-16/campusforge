import sys; sys.path.insert(0,'backend')
from app.services.resume_parser import _normalize_whitespace, _extract_name
import re

text = "\nPratheek Kumar\npratheek@gmail.com | +91 9876543210"
text = _normalize_whitespace(text)
lines = [l.strip() for l in text.split('\n')]
non_empty = [l for l in lines if l.strip()]
print("First 5 non-empty:", non_empty[:5])
for line in non_empty[:5]:
    words = line.split()
    has_skip = bool(re.search(r"[@|/\\|•|linkedin|github|phone|email|curriculum|resume|cv]", line.lower()))
    word_ok = all(re.match(r"^[A-Za-z.\-']+$", w) for w in words)
    print(f"  {repr(line)}: words={len(words)}, word_ok={word_ok}, has_skip={has_skip}")

result = _extract_name(text, lines)
print("Extracted name:", result)
