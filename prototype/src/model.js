export const SCHOOLS_A1 = [
  { school_id: 1, name: "School 1", enrolled: 100, avg_attendance: 82 },
  { school_id: 2, name: "School 2", enrolled: 95, avg_attendance: 76 },
  { school_id: 3, name: "School 3", enrolled: 90, avg_attendance: 72 },
  { school_id: 4, name: "School 4", enrolled: 85, avg_attendance: 68 },
  { school_id: 5, name: "School 5", enrolled: 100, avg_attendance: 65 },
  { school_id: 6, name: "School 6", enrolled: 80, avg_attendance: 80 },
  { school_id: 7, name: "School 7", enrolled: 90, avg_attendance: 61 },
  { school_id: 8, name: "School 8", enrolled: 85, avg_attendance: 74 },
  { school_id: 9, name: "School 9", enrolled: 90, avg_attendance: 70 },
  { school_id: 10, name: "School 10", enrolled: 85, avg_attendance: 62 },
];

export const STUDENTS_A2 = [
  {
    student_id: "ST001",
    school_id: 1,
    attendance: 92,
    prev_score: 78,
    distance_km: 1,
    prior_visits: 0,
  },
  {
    student_id: "ST002",
    school_id: 1,
    attendance: 54,
    prev_score: 62,
    distance_km: 4,
    prior_visits: 1,
  },
  {
    student_id: "ST003",
    school_id: 2,
    attendance: 68,
    prev_score: 71,
    distance_km: 3,
    prior_visits: 0,
  },
  {
    student_id: "ST004",
    school_id: 3,
    attendance: 41,
    prev_score: 45,
    distance_km: 6,
    prior_visits: 2,
  },
  {
    student_id: "ST005",
    school_id: 3,
    attendance: 83,
    prev_score: 81,
    distance_km: 2,
    prior_visits: 0,
  },
  {
    student_id: "ST006",
    school_id: 4,
    attendance: 59,
    prev_score: 52,
    distance_km: 5,
    prior_visits: 1,
  },
  {
    student_id: "ST007",
    school_id: 5,
    attendance: 48,
    prev_score: 58,
    distance_km: 7,
    prior_visits: 0,
  },
  {
    student_id: "ST008",
    school_id: 6,
    attendance: 88,
    prev_score: 85,
    distance_km: 1,
    prior_visits: 0,
  },
  {
    student_id: "ST009",
    school_id: 7,
    attendance: 35,
    prev_score: 39,
    distance_km: 8,
    prior_visits: 2,
  },
  {
    student_id: "ST010",
    school_id: 8,
    attendance: 72,
    prev_score: 68,
    distance_km: 3,
    prior_visits: 0,
  },
  {
    student_id: "ST011",
    school_id: 9,
    attendance: 57,
    prev_score: 60,
    distance_km: 4,
    prior_visits: 1,
  },
  {
    student_id: "ST012",
    school_id: 10,
    attendance: 44,
    prev_score: 48,
    distance_km: 6,
    prior_visits: 0,
  },
];

function buildStressCohort(nTotal = 240) {
  const out = [...STUDENTS_A2];
  let seed = 42;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = 13; i <= nTotal; i++) {
    const r1 = rnd(),
      r2 = rnd();
    const school = SCHOOLS_A1[(i - 1) % 10];
    const unreached = i % 2 === 0;
    const att = unreached ? Math.round(32 + r1 * 17) : Math.round(45 + r1 * 45);
    const dist = unreached ? Math.round(4 + r2 * 4) : Math.round(1 + r2 * 6);
    const score = unreached
      ? Math.round(38 + r1 * 18)
      : Math.round(48 + r1 * 38);
    const visits = unreached ? 0 : att < 50 ? 2 : att < 62 ? 1 : 0;
    out.push({
      student_id: `SIM${String(i).padStart(3, "0")}`,
      school_id: school.school_id,
      attendance: att,
      prev_score: score,
      distance_km: dist,
      prior_visits: visits,
      simulated: true,
    });
  }
  return out;
}

export const STRESS_COHORT = buildStressCohort(240);

const clamp = (v) => Math.max(0, Math.min(1, v));
export function scoreStudent(s, w, overrides) {
  const school = SCHOOLS_A1.find((x) => x.school_id === s.school_id);
  const attPts = +(clamp((85 - s.attendance) / 55) * w.wAtt * w.scale).toFixed(
    2,
  );
  const acadPts = +(
    clamp((75 - s.prev_score) / 45) *
    w.wAcad *
    w.scale
  ).toFixed(2);
  const distPts = +(clamp(s.distance_km / 8) * w.wDist * w.scale).toFixed(2);
  let intNorm = 0;
  if (s.attendance < 65 && s.prior_visits === 0) intNorm = 1.0;
  else if (s.attendance < 60 && s.prior_visits >= 2) intNorm = 0.8;
  else if (s.attendance < 65 && s.prior_visits === 1) intNorm = 0.5;
  const intPts = +(intNorm * w.wInt * w.scale).toFixed(2);
  const total = +Math.min(100, attPts + acadPts + distPts + intPts).toFixed(2);

  let tier, subRoute, channel, flagReason, guidance;
  if (overrides[s.student_id] && s.attendance >= 50) {
    tier = "Tier 3";
    subRoute = "Watchlist (Override)";
    channel = "monitor";
    flagReason = `Teacher override: "${overrides[s.student_id]}"`;
    guidance =
      "Downgraded to Watchlist with logged reason. Monitor next weekly register.";
  } else if (
    total >= 65 ||
    s.attendance < 50 ||
    (s.prior_visits >= 2 && s.attendance < 60)
  ) {
    tier = "Tier 1";
    if (s.prior_visits >= 2) {
      subRoute = "Prior Review (1B)";
      channel = "case_review";
      flagReason = `${s.attendance}% attendance; ${s.prior_visits} visits recorded, outcomes unknown`;
      guidance =
        "Check what was tried in prior visits before approving another ₹250 slot; ask whether distance, health, or work is the barrier.";
    } else if (s.prior_visits === 1) {
      subRoute = "Teacher Follow-Up";
      channel = "teacher_call";
      flagReason = `${s.attendance}% attendance; one prior visit recorded`;
      guidance =
        "Check the previous outcome with the teacher before scheduling a new visit.";
    } else {
      subRoute = "Initial Visit (1A)";
      channel = "home_visit";
      flagReason = `${s.attendance}% attendance; no prior visits recorded`;
      guidance =
        "Approve initial household check-in (₹250) within 48h to understand barriers and log a structured outcome.";
    }
  } else if (total >= 40) {
    tier = "Tier 2";
    subRoute = "Teacher Call (2A)";
    channel = "teacher_call";
    flagReason =
      school && school.avg_attendance - s.attendance >= 20
        ? `School outlier (-${school.avg_attendance - s.attendance}pp vs School ${s.school_id} avg)`
        : `Below-target attendance (${s.attendance}%) & score (${s.prev_score})`;
    guidance =
      "Start with a low-cost teacher phone or in-school check-in (₹0) within 72h before scheduling a home visit.";
  } else if (total >= 20) {
    tier = "Tier 3";
    subRoute = "Watchlist (3A)";
    channel = "monitor";
    flagReason = `Moderate attendance (${s.attendance}%)`;
    guidance =
      "Monitor weekly register via Teacher Coordinator; no home visit needed.";
  } else {
    tier = "Tier 4";
    subRoute = "Stable (4A)";
    channel = "monitor";
    flagReason = "Healthy attendance & academic baseline";
    guidance = "Routine weekly tracking; no outreach needed.";
  }
  return {
    ...s,
    total,
    attPts,
    acadPts,
    distPts,
    intPts,
    tier,
    subRoute,
    channel,
    flagReason,
    guidance,
  };
}

export const defaults = { wAtt: 45, wAcad: 25, wDist: 20, wInt: 10 };
export const routes = {
  home_visit: "First home visit",
  case_review: "Prior outreach review",
  teacher_call: "Teacher check-in",
  monitor: "Register check",
};
export const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export function makePlan(rows, state) {
  const candidates = rows.filter((r) => state.approved.includes(r.student_id));
  const done = (id) => state.completed.includes(id);
  candidates.sort(
    (a, b) => Number(done(b.student_id)) - Number(done(a.student_id)),
  );
  const cap = Math.max(100 - state.reserve, state.completed.length);
  const workers = Array.from({ length: 5 }, () => []);
  candidates
    .slice(0, cap)
    .sort((a, b) => a.school_id - b.school_id)
    .forEach((r) => {
      const available = workers.filter((worker) => worker.length < 20);
      const worker =
        available.find((w) => w.at(-1)?.school_id === r.school_id) ||
        available.reduce((a, b) => (a.length <= b.length ? a : b));
      worker.push(r);
    });
  return {
    cap,
    workers,
    scheduled: candidates.slice(0, cap),
    deferred: candidates.slice(cap),
  };
}
export function load(key) {
  const read = (k, d) => {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? d;
    } catch {
      return d;
    }
  };
  const previous = key.endsWith("case")
    ? {
        approved: read("ss_v3_approved", []).filter((id) =>
          STUDENTS_A2.some((s) => s.student_id === id),
        ),
        statuses: read("ss_v3_statuses", {}),
        overrides: read("ss_v3_overrides", {}),
        events: read("ss_v3_log", []).filter((e) =>
          STUDENTS_A2.some((s) => s.student_id === e.student_id),
        ),
      }
    : {};
  return {
    approved: [],
    completed: [],
    statuses: {},
    events: [],
    overrides: {},
    reserve: 10,
    offline: false,
    weights: defaults,
    ...previous,
    ...read(key, {}),
  };
}
