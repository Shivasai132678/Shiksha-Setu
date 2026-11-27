"""Unit tests for the Shiksha Setu risk scoring and teacher-driven outreach planner."""

import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from risk_engine import (
    SCHOOLS_A1,
    STUDENTS_A2,
    allocate_weekly_outreach,
    build_stress_test_cohort,
    rank_students,
    score_student,
)


class TestRiskEngine(unittest.TestCase):
    def test_top_five_prioritized_students(self):
        ranked = rank_students(STUDENTS_A2, SCHOOLS_A1)
        top5_ids = [r.student_id for r in ranked[:5]]
        self.assertEqual(top5_ids, ["ST009", "ST004", "ST012", "ST007", "ST006"])
        for r in ranked[:4]:
            self.assertEqual(r.tier, "Tier 1 - Immediate")

    def test_deterministic_safety_floor_overrides_low_weights(self):
        student = {
            "student_id": "TEST1",
            "school_id": 1,
            "attendance": 45.0,
            "prev_score": 85.0,
            "distance_km": 1.0,
            "prior_visits": 0,
        }
        res = score_student(student)
        self.assertEqual(res.tier, "Tier 1 - Immediate")
        self.assertIn("R1_SEVERE_ABSENTEEISM (<50%)", res.triggered_rules)

    def test_case_review_and_teacher_calls_do_not_consume_visit_slots_by_default(self):
        ranked = rank_students(STUDENTS_A2, SCHOOLS_A1)
        plan = allocate_weekly_outreach(ranked, reserve_buffer_pct=0.10)
        # Only ST012 and ST007 are 1A home_visit; ST009/ST004 are case_review; ST006/ST002/ST011 are teacher_call
        self.assertEqual(plan["scheduled_visits"], 2)
        self.assertEqual(plan["projected_cost_inr"], 500.0)
        self.assertEqual(plan["case_review_queue_count"], 2)
        self.assertEqual(plan["teacher_call_queue_count"], 3)

    def test_teacher_approval_adds_exact_visit_to_plan(self):
        ranked = rank_students(STUDENTS_A2, SCHOOLS_A1)
        empty_plan = allocate_weekly_outreach(ranked, approved_visit_ids=set())
        self.assertEqual(empty_plan["scheduled_visits"], 0)
        self.assertEqual(empty_plan["projected_cost_inr"], 0.0)

        one_visit_plan = allocate_weekly_outreach(ranked, approved_visit_ids={"ST012"})
        self.assertEqual(one_visit_plan["scheduled_visits"], 1)
        self.assertEqual(one_visit_plan["projected_cost_inr"], 250.0)

    def test_stress_test_exceeds_90_visit_cap_and_defers_overflow(self):
        sim = build_stress_test_cohort(240)
        ranked = rank_students(sim, SCHOOLS_A1)
        plan = allocate_weekly_outreach(ranked, reserve_buffer_pct=0.10)
        self.assertGreater(plan["eligible_visits"], 90)
        self.assertEqual(plan["scheduled_visits"], 90)
        self.assertEqual(plan["deferred_visits"], plan["eligible_visits"] - 90)
        self.assertEqual(plan["projected_cost_inr"], 22500.0)

    def test_stable_students_need_zero_visit_cost(self):
        for sid in ("ST001", "ST005", "ST008"):
            s = next(x for x in STUDENTS_A2 if x["student_id"] == sid)
            res = score_student(s)
            self.assertEqual(res.tier, "Tier 4 - Stable")
            self.assertEqual(res.action_channel, "monitor")
            self.assertEqual(res.estimated_visit_cost_inr, 0.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
