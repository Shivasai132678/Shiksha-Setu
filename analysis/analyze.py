"""Reproduce Challenge A tables from the assessment CSV files. Python 3.10+."""
import csv
from pathlib import Path
from statistics import correlation
import sys

folder = Path(__file__).resolve().parent
sys.path.insert(0, str(folder.parent / "prototype"))
from risk_engine import rank_students


def read_table(name):
    with (folder / name).open(newline="", encoding="utf-8") as source:
        return [{k: (v if k == "id" else int(v)) for k, v in row.items()}
                for row in csv.DictReader(source)]


schools = read_table("schools.csv")
students = read_table("students.csv")
enrolled = sum(s["enrolled"] for s in schools)
absences = [s["enrolled"] * (100 - s["attendance"]) / 100 for s in schools]
lowest = sorted(range(len(schools)), key=lambda i: schools[i]["attendance"])[:3]
print(f"Enrollment: {enrolled}; weighted attendance: {100*(1-sum(absences)/enrolled):.2f}%")
print(f"Estimated daily absences: {sum(absences):.1f}")
print(f"Lowest three schools: {sum(absences[i] for i in lowest)/sum(absences):.1%} of estimated absences")
for field in ("score", "km", "visits"):
    r = correlation([s["attendance"] for s in students], [s[field] for s in students])
    print(f"Attendance vs {field}, Pearson r: {r:.3f}")
records = [dict(student_id=s["id"], school_id=s["school"], attendance=s["attendance"],
                prev_score=s["score"], distance_km=s["km"], prior_visits=s["visits"]) for s in students]
baselines = [dict(school_id=s["school"], avg_attendance=s["attendance"]) for s in schools]
ranked = rank_students(records, baselines)
print("Student   Points   Action")
for row in ranked:
    print(f"{row.student_id:8} {row.total_score:6.2f}   {row.action_channel}")
print(f"Physical ceiling: {5*4*5} visits; funded ceiling: {25000//250} visits")
print(f"With 10% reserve: 90 planned visits, INR {90*250:,} planned spend")
