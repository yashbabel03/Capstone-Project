from __future__ import annotations

import re

EQUIPMENT = re.compile(
    r"\b(walk-?in|freezer|cooler|fryer|grill|oven|probe|gasket|compressor|WALK-IN-[A-Z]+-\d+)\b",
    re.I,
)
TEMP = re.compile(r"(-?\d+(?:\.\d+)?)\s*(?:°\s*)?(C|F|celsius|fahrenheit)?\b")
DURATION = re.compile(r"(\d+)\s*(minutes?|mins?|hours?|hrs?)", re.I)
DEPT = re.compile(r"\b(kitchen|prep|expo|foh|receiving|facilities|dish)\b", re.I)


def extract_context(query: str) -> dict:
    temps = TEMP.findall(query)
    return {
        "equipment": list({m.group(0) for m in EQUIPMENT.finditer(query)}),
        "readings": [{"value": t[0], "unit": t[1] or ""} for t in temps[:4]],
        "duration": [m.group(0) for m in DURATION.finditer(query)],
        "department": list({m.group(0).lower() for m in DEPT.finditer(query)}),
        "issue": query.strip()[:240],
    }
