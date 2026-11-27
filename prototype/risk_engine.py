"""
Shiksha Setu Foundation — Education Intervention Intelligence Engine
------------------------------------------------------------------
Transparent, deterministic-first student risk prioritization and
teacher-driven outreach capacity planner for Challenge A (Veltris).

Key design principles:
1. Deterministic safety floors run before statistical weighting.
2. Zero black-box ML on n=12 records; every score decomposes into
   exact auditable feature contributions.
3. Separates action channels cleanly:
   - home_visit  (1A: First-Contact Outreach -> Rs. 250/visit)
   - case_review (1B: Review Prior Outreach -> Rs. 0 until teacher approves visit)
   - teacher_call (2A: Teacher Check-In Call -> Rs. 0 until teacher approves visit)
   - monitor     (3A/4A: Routine tracking -> Rs. 0)
4. Teacher decisions drive the weekly outreach plan; capacity enforces
   5 workers x 4 visits/day x 5 days = 100 max (90 with 10% buffer).
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Set


DEFAULT_WEIGHTS: Dict[str, float] = {
    "attendance": 45.0,
    "academic": 25.0,
    "distance": 20.0,
    "intervention_signal": 10.0,
}

SCHOOLS_A1: List[Dict] = [
    {"school_id": 1, "name": "School 1", "enrolled": 100, "avg_attendance": 82.0},
    {"school_id": 2, "name": "School 2", "enrolled": 95, "avg_attendance": 76.0},
    {"school_id": 3, "name": "School 3", "enrolled": 90, "avg_attendance": 72.0},
    {"school_id": 4, "name": "School 4", "enrolled": 85, "avg_attendance": 68.0},
    {"school_id": 5, "name": "School 5", "enrolled": 100, "avg_attendance": 65.0},
    {"school_id": 6, "name": "School 6", "enrolled": 80, "avg_attendance": 80.0},
    {"school_id": 7, "name": "School 7", "enrolled": 90, "avg_attendance": 61.0},
    {"school_id": 8, "name": "School 8", "enrolled": 85, "avg_attendance": 74.0},
    {"school_id": 9, "name": "School 9", "enrolled": 90, "avg_attendance": 70.0},
    {"school_id": 10, "name": "School 10", "enrolled": 85, "avg_attendance": 62.0},
]

STUDENTS_A2: List[Dict] = [
    {"student_id": "ST001", "school_id": 1, "attendance": 92.0, "prev_score": 78.0, "distance_km": 1.0, "prior_visits": 0},
    {"student_id": "ST002", "school_id": 1, "attendance": 54.0, "prev_score": 62.0, "distance_km": 4.0, "prior_visits": 1},
    {"student_id": "ST003", "school_id": 2, "attendance": 68.0, "prev_score": 71.0, "distance_km": 3.0, "prior_visits": 0},
    {"student_id": "ST004", "school_id": 3, "attendance": 41.0, "prev_score": 45.0, "distance_km": 6.0, "prior_visits": 2},
    {"student_id": "ST005", "school_id": 3, "attendance": 83.0, "prev_score": 81.0, "distance_km": 2.0, "prior_visits": 0},
    {"student_id": "ST006", "school_id": 4, "attendance": 59.0, "prev_score": 52.0, "distance_km": 5.0, "prior_visits": 1},
    {"student_id": "ST007", "school_id": 5, "attendance": 48.0, "prev_score": 58.0, "distance_km": 7.0, "prior_visits": 0},
    {"student_id": "ST008", "school_id": 6, "attendance": 88.0, "prev_score": 85.0, "distance_km": 1.0, "prior_visits": 0},
    {"student_id": "ST009", "school_id": 7, "attendance": 35.0, "prev_score": 39.0, "distance_km": 8.0, "prior_visits": 2},
    {"student_id": "ST010", "school_id": 8, "attendance": 72.0, "prev_score": 68.0, "distance_km": 3.0, "prior_visits": 0},
    {"student_id": "ST011", "school_id": 9, "attendance": 57.0, "prev_score": 60.0, "distance_km": 4.0, "prior_visits": 1},
    {"student_id": "ST012", "school_id": 10, "attendance": 44.0, "prev_score": 48.0, "distance_km": 6.0, "prior_visits": 0},
]

OPERATIONAL_A3: Dict[str, float] = {
    "outreach_workers": 5,
    "max_visits_per_worker_per_day": 4,
    "working_days_per_week": 5,
    "weekly_capacity_visits": 100,
    "weekly_budget_inr": 25000.0,
    "cost_per_visit_inr": 250.0,
    "teacher_coordinators": 10,
}


@dataclass
class RiskAssessment:
    student_id: str
    school_id: int
    attendance: float
    prev_score: float
    distance_km: float
    prior_visits: int
    total_score: float
    attendance_pts: float
    academic_pts: float
    distance_pts: float
    intervention_pts: float
    tier: str
    sub_route: str
    action_channel: str  # "home_visit", "case_review", "teacher_call", "monitor"
    triggered_rules: List[str]
    recommended_action: str
    estimated_visit_cost_inr: float

    def to_dict(self) -> Dict:
        return asdict(self)


def _clamp(val: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, val))


def score_student(
    student: Dict,
    weights: Optional[Dict[str, float]] = None,
    school_avg_attendance: Optional[float] = None,
) -> RiskAssessment:
    """Compute an auditable 0-100 risk score and separate action channel."""
    w = dict(DEFAULT_WEIGHTS)
    if weights:
        w.update(weights)
    weight_sum = sum(w.values())
    if weight_sum <= 0:
        raise ValueError("Risk weights must sum to a positive number.")
    scale = 100.0 / weight_sum

    att = float(student["attendance"])
    score = float(student["prev_score"])
    dist = float(student["distance_km"])
    visits = int(student["prior_visits"])

    att_norm = _clamp((85.0 - att) / 55.0)
    acad_norm = _clamp((75.0 - score) / 45.0)
    dist_norm = _clamp(dist / 8.0)

    if att < 65.0 and visits == 0:
        int_norm = 1.0
    elif att < 60.0 and visits >= 2:
        int_norm = 0.8
    elif att < 65.0 and visits == 1:
        int_norm = 0.5
    else:
        int_norm = 0.0

    att_pts = round(att_norm * w["attendance"] * scale, 2)
    acad_pts = round(acad_norm * w["academic"] * scale, 2)
    dist_pts = round(dist_norm * w["distance"] * scale, 2)
    int_pts = round(int_norm * w["intervention_signal"] * scale, 2)
    total = round(min(100.0, att_pts + acad_pts + dist_pts + int_pts), 2)

    rules: List[str] = []
    if att < 50.0:
        rules.append("R1_SEVERE_ABSENTEEISM (<50%)")
    if visits >= 2 and att < 60.0:
        rules.append("R2_PRIOR_OUTREACH_REVIEW (>=2 visits, <60%)")
    if att < 60.0 and visits == 0:
        rules.append("R3_UNREACHED_AT_RISK (<60%, 0 visits)")
    if school_avg_attendance is not None and (school_avg_attendance - att) >= 20.0:
        rules.append("R4_SCHOOL_OUTLIER (>=20pp below school avg)")

    if total >= 65.0 or att < 50.0 or (visits >= 2 and att < 60.0):
        tier = "Tier 1 - Immediate"
        if visits >= 2:
            sub_route = "1B: Prior Outreach Review"
            action_channel = "case_review"
            action = (
                f"{visits} prior visits recorded with outcomes unknown. Teacher Coordinator "
                f"should review what was tried before approving another visit and ask whether "
                f"distance ({dist:.0f} km), health, or household work is the main barrier."
            )
            cost = 0.0  # Does not consume a visit slot until teacher approves a new visit
        elif visits == 1:
            sub_route = "Teacher Follow-Up"
            action_channel = "teacher_call"
            action = "Check the previous outreach outcome with the teacher before approving another visit."
            cost = 0.0
        else:
            sub_route = "1A: First-Contact Visit"
            action_channel = "home_visit"
            action = (
                "No prior visits recorded. Teacher approves initial household visit within "
                "48 hours to understand barriers (transport, health, or seasonal work) and "
                "log a structured outcome."
            )
            cost = 250.0
    elif total >= 40.0:
        tier = "Tier 2 - Targeted Support"
        sub_route = "2A: Teacher Check-In Call"
        action_channel = "teacher_call"
        action = (
            "Teacher Coordinator phone or in-school check-in within 72 hours. "
            "Do not schedule a Rs. 250 home visit unless check-in flags an unresolved barrier."
        )
        cost = 0.0
    elif total >= 20.0:
        tier = "Tier 3 - Watchlist"
        sub_route = "3A: School-Level Monitoring"
        action_channel = "monitor"
        action = "Monitor weekly attendance trend via Teacher Coordinator; no home visit needed."
        cost = 0.0
    else:
        tier = "Tier 4 - Stable"
        sub_route = "4A: Routine Tracking"
        action_channel = "monitor"
        action = "Standard weekly attendance register; no outreach required."
        cost = 0.0

    return RiskAssessment(
        student_id=str(student["student_id"]),
        school_id=int(student["school_id"]),
        attendance=att,
        prev_score=score,
        distance_km=dist,
        prior_visits=visits,
        total_score=total,
        attendance_pts=att_pts,
        academic_pts=acad_pts,
        distance_pts=dist_pts,
        intervention_pts=int_pts,
        tier=tier,
        sub_route=sub_route,
        action_channel=action_channel,
        triggered_rules=rules,
        recommended_action=action,
        estimated_visit_cost_inr=cost,
    )


def rank_students(
    students: List[Dict],
    schools: Optional[List[Dict]] = None,
    weights: Optional[Dict[str, float]] = None,
) -> List[RiskAssessment]:
    school_map = {s["school_id"]: s["avg_attendance"] for s in (schools or [])}
    assessments = [
        score_student(s, weights=weights, school_avg_attendance=school_map.get(s["school_id"]))
        for s in students
    ]
    assessments.sort(key=lambda r: (-r.total_score, r.attendance, -r.distance_km))
    return assessments


def allocate_weekly_outreach(
    assessments: List[RiskAssessment],
    approved_visit_ids: Optional[Set[str]] = None,
    workers: int = 5,
    max_per_worker_per_day: int = 4,
    days: int = 5,
    weekly_budget_inr: float = 25000.0,
    cost_per_visit_inr: float = 250.0,
    reserve_buffer_pct: float = 0.10,
) -> Dict:
    """
    Build a constrained weekly outreach plan strictly from approved household visits.
    - If approved_visit_ids is provided, ONLY those students consume visit slots.
    - Otherwise, defaults strictly to action_channel == 'home_visit' (1A first-contact),
      keeping case_review (1B) and teacher_call (2A) in separate non-visit queues.
    """
    if min(workers, max_per_worker_per_day, days, cost_per_visit_inr) <= 0:
        raise ValueError("Worker capacity and visit cost must be positive.")
    if weekly_budget_inr < 0 or not 0 <= reserve_buffer_pct <= 1:
        raise ValueError("Budget must be non-negative and reserve must be between 0 and 1.")
    max_capacity = workers * max_per_worker_per_day * days
    effective_budget = weekly_budget_inr * (1.0 - reserve_buffer_pct)
    max_affordable = int(effective_budget // cost_per_visit_inr)
    visit_cap = min(max_capacity, max_affordable)

    if approved_visit_ids is not None:
        eligible = [a for a in assessments if a.student_id in approved_visit_ids]
    else:
        eligible = [a for a in assessments if a.action_channel == "home_visit"]

    case_reviews = [a for a in assessments if a.action_channel == "case_review" and a not in eligible]
    teacher_calls = [a for a in assessments if a.action_channel == "teacher_call" and a not in eligible]

    scheduled = eligible[:visit_cap]
    deferred = eligible[visit_cap:]

    scheduled_by_school = sorted(scheduled, key=lambda r: (r.school_id, -r.total_score))
    worker_loads: Dict[str, List[Dict]] = {f"Worker {i+1}": [] for i in range(workers)}
    weekly_worker_capacity = max_per_worker_per_day * days
    for item in scheduled_by_school:
        available = [load for load in worker_loads.values() if len(load) < weekly_worker_capacity]
        existing_school = next((load for load in available if load and load[-1]["school_id"] == item.school_id), None)
        load = existing_school if existing_school is not None else min(available, key=len)
        load.append(
            {
                "student_id": item.student_id,
                "school_id": item.school_id,
                "tier": item.tier,
                "sub_route": item.sub_route,
                "risk_score": item.total_score,
                "day": len(load) // max_per_worker_per_day + 1,
                "distance_km": item.distance_km,
            }
        )

    total_cost = len(scheduled) * cost_per_visit_inr
    return {
        "max_capacity_visits": max_capacity,
        "visit_cap_after_buffer": visit_cap,
        "reserve_buffer_inr": round(weekly_budget_inr - effective_budget, 2),
        "eligible_visits": len(eligible),
        "scheduled_visits": len(scheduled),
        "deferred_visits": len(deferred),
        "case_review_queue_count": len(case_reviews),
        "teacher_call_queue_count": len(teacher_calls),
        "projected_cost_inr": total_cost,
        "remaining_budget_inr": round(weekly_budget_inr - total_cost, 2),
        "worker_assignments": worker_loads,
    }


def build_stress_test_cohort(n_total: int = 240) -> List[Dict]:
    """
    SIMULATED high-load cohort (clearly labeled synthetic) generating >105
    first-contact home visits to verify deferral behavior above the 90/100 cap.
    """
    out = list(STUDENTS_A2)
    seed = 42
    for i in range(len(STUDENTS_A2) + 1, n_total + 1):
        seed = (seed * 1664525 + 1013904223) % 4294967296
        r1 = seed / 4294967296
        seed = (seed * 1664525 + 1013904223) % 4294967296
        r2 = seed / 4294967296
        school = SCHOOLS_A1[(i - 1) % 10]
        # ~50% unreached severe-risk (<49%, 0 visits) so eligible visits > 105
        if i % 2 == 0:
            att = round(32 + r1 * 17)
            dist = round(4 + r2 * 4)
            score = round(38 + r1 * 18)
            visits = 0
        else:
            att = round(45 + r1 * 45)
            dist = round(1 + r2 * 6)
            score = round(48 + r1 * 38)
            visits = 2 if att < 50 else (1 if att < 62 else 0)
        out.append(
            {
                "student_id": f"SIM{i:03d}",
                "school_id": school["school_id"],
                "attendance": float(att),
                "prev_score": float(score),
                "distance_km": float(dist),
                "prior_visits": int(visits),
                "simulated": True,
            }
        )
    return out


if __name__ == "__main__":
    ranked = rank_students(STUDENTS_A2, SCHOOLS_A1)
    print(f"{'Rank':<5} {'ID':<6} {'Sch':<4} {'Att%':<6} {'Score':<6} {'Dist':<5} {'Vis':<4} {'Risk':<6} {'Channel':<13} {'Route'}")
    print("-" * 108)
    for i, r in enumerate(ranked, 1):
        print(
            f"{i:<5} {r.student_id:<6} {r.school_id:<4} {r.attendance:<6.0f} "
            f"{r.prev_score:<6.0f} {r.distance_km:<5.0f} {r.prior_visits:<4} "
            f"{r.total_score:<6.1f} {r.action_channel:<13} {r.sub_route}"
        )
