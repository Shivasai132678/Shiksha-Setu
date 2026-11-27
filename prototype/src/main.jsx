import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  ScanLine,
  ArrowRight,
  ArrowUpRight,
  Menu,
  ArrowLeft,
  LayoutDashboard,
  NotebookTabs,
  CalendarDays,
  School,
  History,
  SlidersHorizontal,
  Search,
  MapPin,
  ClipboardList,
  Download,
  Check,
} from "lucide-react";
import {
  SCHOOLS_A1 as schools,
  STUDENTS_A2,
  STRESS_COHORT,
  defaults,
  routes,
  days,
  scoreStudent,
  makePlan,
  load,
} from "./model";
import "./style.css";

const nav = [
  ["overview", "District desk", LayoutDashboard],
  ["register", "Student register", NotebookTabs],
  ["plan", "Field schedule", CalendarDays],
  ["schools", "Schools", School],
  ["journal", "Decision journal", History],
  ["settings", "Demo settings", SlidersHorizontal],
];
const firstVisit = "home_visit";
const money = (n) => "₹" + n.toLocaleString("en-IN");
const enrolment = schools.reduce((total, school) => total + school.enrolled, 0);
const districtBaseline = schools.reduce(
  (total, school) => total + school.enrolled * school.avg_attendance, 0,
) / enrolment;
const schoolsByAttendance = [...schools].sort(
  (a, b) => a.avg_attendance - b.avg_attendance,
);
const go = (route) => {
  location.hash = route;
};
function Brand() {
  return (
    <span className="brand">
      <span className="mark">
        <BookOpen size={24} />
      </span>
      Shiksha Setu
    </span>
  );
}
function SchoolPlot() {
  return (
    <figure className="schoolPlot">
      <figcaption>
        <h2>Attendance by school</h2>
        <p><span className="baselineKey" /> District baseline <strong>{districtBaseline.toFixed(2)}%</strong></p>
      </figcaption>
      <div className="plotAxis" aria-hidden="true">
        <span>50%</span><span>60</span><span>70</span><span>80</span><span>90</span><span>100%</span>
      </div>
      <ol style={{ "--baseline": (districtBaseline - 50) * 2 + "%" }}>
        {schoolsByAttendance.map((school) => (
          <li key={school.school_id}>
            <a href={"#register/" + school.school_id}>
              <span>{school.name}</span>
              <span className="plotTrack" aria-hidden="true">
                <span className="plotDot" style={{ left: (school.avg_attendance - 50) * 2 + "%" }} />
              </span>
              <strong>{school.avg_attendance}%</strong>
            </a>
          </li>
        ))}
      </ol>
    </figure>
  );
}
function Cover() {
  return (
    <div className="welcome">
      <header className="mast">
        <Brand />
        <span className="folioLabel">District assessment demo</span>
      </header>
      <main className="coverSheet">
        <div className="sheetHeader">
          <span className="folioLabel"><ScanLine size={16} /> District attendance</span>
          <span className="folioLabel">{schools.length} schools &nbsp; / &nbsp; {enrolment} enrolled</span>
        </div>
        <div className="coverGrid">
          <div className="coverCopy">
            <h1>Attendance<br /><em>register</em></h1>
            <p>Review students who are missing school, plan family outreach, and record what happens next.</p>
            <a className="primary enter" href="#overview">
              Open district desk <ArrowRight size={20} />
            </a>
          </div>
          <SchoolPlot />
        </div>
        <div className="coverIndex">
          <a href="#register"><span>Find a student</span><ArrowUpRight size={18} /></a>
          <a href="#plan"><span>Check field visits</span><ArrowUpRight size={18} /></a>
          <a href="#journal"><span>Read the decision journal</span><ArrowUpRight size={18} /></a>
        </div>
      </main>
      <footer className="coverFoot">
        <span>Shiksha Setu Foundation</span><span>Synthetic assessment data</span>
      </footer>
    </div>
  );
}
function Section({ title, children }) {
  return (
    <div className="sectionTitle">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
function Metric({ value, label }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
function Table({ rows, state }) {
  return (
    <div className="scroll studentTable">
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>School</th>
            <th className="numeric">Attendance</th>
            <th>Next action</th>
            <th>Priority</th>
            <th><span className="srOnly">Open case</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.student_id}>
              <td>
                <a href={"#case/" + r.student_id}>{r.student_id}</a>
              </td>
              <td>School {r.school_id}</td>
              <td className="numeric">
                <b>{r.attendance}%</b>
              </td>
              <td>{state.statuses[r.student_id] || routes[r.channel]}</td>
              <td>
                <span className={"tier t" + r.tier.slice(-1)}>{r.tier}</span>
              </td>
              <td>
                <a
                  aria-label={"Open " + r.student_id}
                  href={"#case/" + r.student_id}
                >
                  <ArrowUpRight size={16} />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="empty">No students match these filters.</p>
      )}
    </div>
  );
}
function Overview({ rows, state, plan }) {
  const urgent = rows.filter((row) => row.tier === "Tier 1");
  const visible = urgent.slice(0, 5);
  const [selected, setSelected] = useState("");
  const active = visible.find((row) => row.student_id === selected) ?? visible[0];
  return (
    <>
      <div className="deskSummary">
        <span><strong>{urgent.length}</strong> immediate-priority cases</span>
        <a href="#plan"><strong>{plan.scheduled.length} / {plan.cap}</strong> weekly visits <ArrowUpRight size={15} /></a>
        <a href="#schools"><strong>{districtBaseline.toFixed(2)}%</strong> district attendance <ArrowUpRight size={15} /></a>
      </div>
      <section className="queue">
        <Section title="Cases to review">
          <a className="textLink" href="#register">Full register <ArrowRight size={16} /></a>
        </Section>
        {active ? (
          <div className="reviewSpread">
            <div className="queueList" role="group" aria-label="Preview priority cases">
              {visible.map((row) => (
                <button
                  type="button"
                  key={row.student_id}
                  className="caseSelector"
                  aria-pressed={active.student_id === row.student_id}
                  onClick={() => setSelected(row.student_id)}
                >
                  <span className="queueIdentity"><strong>{row.student_id}</strong><small>School {row.school_id}</small></span>
                  <span className="queueRate">{row.attendance}%</span>
                  <span className="queueAction">{state.statuses[row.student_id] || routes[row.channel]}</span>
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
            <div className="casePreview" aria-live="polite">
              <div className="previewHeading">
                <h3>{active.student_id}</h3>
                <span className="tier t1">{active.tier}</span>
              </div>
              <div className="previewRate"><strong>{active.attendance}%</strong><span>baseline attendance</span></div>
              <p>{active.flagReason}</p>
              <p className="muted">{active.guidance}</p>
              <a className="primary" href={"#case/" + active.student_id}>Open case <ArrowUpRight size={17} /></a>
            </div>
          </div>
        ) : <p className="empty">There are no Tier 1 cases in this scenario.</p>}
      </section>
    </>
  );
}
function Register({ rows, state, school }) {
  const [q, setQ] = useState(""),
    [tier, setTier] = useState("");
  const found = rows.filter(
    (r) =>
      (!school || r.school_id === Number(school)) &&
      r.student_id.toLowerCase().includes(q.toLowerCase().trim()) &&
      (!tier || r.tier === tier),
  );
  return (
    <>
      <div className="tools">
        <label className="search">
          <Search size={17} />
          <input
            placeholder="Search student ID"
            aria-label="Search student ID"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <select
          aria-label="School"
          value={school || ""}
          onChange={(e) => go("register/" + e.target.value)}
        >
          <option value="">All schools</option>
          {schools.map((s) => (
            <option key={s.school_id} value={s.school_id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Priority"
          value={tier}
          onChange={(e) => setTier(e.target.value)}
        >
          <option value="">All priorities</option>
          {[1, 2, 3, 4].map((i) => (
            <option key={i}>Tier {i}</option>
          ))}
        </select>
      </div>
      <Section title="Ranked cases">
        <small>
          {found.length} {found.length === 1 ? "student" : "students"}
        </small>
      </Section>
      <Table rows={found} state={state} />
    </>
  );
}
function Case({ r, state, save, plan }) {
  const [mode, choose] = useState(
      state.approved.includes(r.student_id) ? firstVisit : r.channel,
    ),
    [note, setNote] = useState(""),
    [msg, setMsg] = useState(""),
    [tag, setTag] = useState("Unconfirmed"),
    [followMessage, setFollowMessage] = useState("");
  const id = r.student_id,
    approved = state.approved.includes(id),
    complete = state.completed.includes(id),
    scheduled = plan.scheduled.some((s) => s.student_id === id);
  const history = state.events.filter((event) => event.student_id === id);
  const school = schools[r.school_id - 1],
    entries = state.events
      .filter((e) => e.student_id === id && e.register)
      .sort((a, b) => b.register.week - a.register.week);
  const record = (action, detail, changes = {}, register) =>
    save({
      ...changes,
      events: [
        {
          ts: new Date().toLocaleString(),
          student_id: id,
          action,
          detail,
          register,
          synced: !state.offline,
        },
        ...state.events,
      ],
    });
  function decide() {
    const trimmed = note.trim();
    let status,
      code,
      changes = {};
    if (mode === "override") {
      if (!trimmed) return setMsg("Enter a reason for the override.");
      if (r.attendance < 50)
        return setMsg(
          "Attendance below 50% requires district co-sign. This case stays in Tier 1.",
        );
      status = "Watchlist override";
      code = "OVERRIDE_DOWNGRADE";
      changes = {
        overrides: { ...state.overrides, [id]: trimmed },
        approved: complete
          ? state.approved
          : state.approved.filter((x) => x !== id),
      };
    } else if (mode === firstVisit) {
      if (complete) return;
      if (approved) {
        if (!scheduled)
          return setMsg("Visit deferred until a weekly slot opens.");
        if (!trimmed)
          return setMsg("Add an outcome note before completing this visit.");
        changes.completed = [...state.completed, id];
        status = "Visit completed";
        code = "VISIT_OUTCOME";
      } else {
        changes.approved = [...state.approved, id];
        status = "Visit approved";
        code = "VISIT_APPROVED";
      }
    } else {
      status = {
        teacher_call: "Check-in recorded",
        monitor: "Register checked",
        case_review: "Prior review recorded",
      }[mode];
      code = {
        teacher_call: "TEACHER_CHECKIN_CALL",
        monitor: "REGISTER_CHECK",
        case_review: "PRIOR_OUTREACH_REVIEW",
      }[mode];
    }
    record(code, status + " · " + tag + (trimmed ? " · " + trimmed : ""), {
      ...changes,
      statuses: { ...state.statuses, [id]: status },
    });
    setNote("");
    setMsg(status + ".");
  }
  function follow(e) {
    e.preventDefault();
    const form = e.currentTarget,
      fd = new FormData(form),
      [week, present, days] = ["week", "present", "days"].map((k) =>
        Number(fd.get(k)),
      );
    if (present > days)
      return setFollowMessage("Days present cannot exceed school days.");
    if (entries.some((e) => e.register.week === week))
      return setFollowMessage("This week already has an entry.");
    record(
      "WEEKLY_REGISTER",
      "Week " + week + " · " + present + " of " + days + " days present",
      {},
      { week, present, days },
    );
    form.reset();
    setFollowMessage("Attendance saved.");
  }
  return (
    <>
      <a className="back" href="#register">
        <ArrowLeft size={15} /> Student register
      </a>
      <div className="casehead">
        <h1>{id}</h1>
        <span className={"tier t" + r.tier.slice(-1)}>{r.tier}</span>
      </div>
      <p className="sub">
        <MapPin size={16} /> {school.name} · {r.distance_km} km from school
      </p>
      <div className="metrics caseMetrics">
        <Metric
          value={r.attendance + "%"}
          label={"Attendance · school average " + school.avg_attendance + "%"}
        />
        <Metric value={r.prev_score} label="Previous term score" />
        <Metric value={r.prior_visits} label="Prior visits in baseline" />
      </div>
      <div className="casegrid">
        <section>
          <Section title="Case evidence" />
          <h3>{routes[r.channel]}</h3>
          <p>{r.guidance}</p>
          <h4>Risk score · {r.total.toFixed(1)} / 100</h4>
          {[
            ["Attendance", r.attPts],
            ["Academic score", r.acadPts],
            ["Distance", r.distPts],
            ["Outreach history", r.intPts],
          ].map(([name, v]) => (
            <div className="risk" key={name}>
              <span>{name}</span>
              <meter min="0" max="100" value={v} />
              <b>{v.toFixed(1)}</b>
            </div>
          ))}
          <p className="muted">{r.flagReason}</p>
          <details>
            <summary>Suggested conversation</summary>
            <p>
              What has made it difficult to attend school recently? What support
              would help this week?{" "}
              {r.prior_visits > 0
                ? "Ask which earlier steps helped and what still needs follow-up."
                : ""}
            </p>
          </details>
        </section>
        <section className="decision">
          <Section title="Teacher decision" />
          <label>
            Action
            <select
              aria-label="Action"
              value={mode}
              onChange={(e) => {
                choose(e.target.value);
                setMsg("");
              }}
            >
              {Object.entries({
                ...routes,
                override: "Override to watchlist",
              }).map(([k, v]) => (
                <option value={k} key={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Reported barrier
            <select aria-label="Reported barrier" value={tag} onChange={(e) => setTag(e.target.value)}>
              {[
                "Unconfirmed",
                "Transport",
                "Health",
                "Household work",
                "Other",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Case note
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Record what the student or family shared."
            />
          </label>
          <button
            className="primary"
            onClick={decide}
            disabled={mode === firstVisit && complete}
          >
            {mode === firstVisit
              ? complete
                ? "Visit completed"
                : approved
                  ? "Record visit outcome"
                  : "Approve home visit · ₹250"
              : mode === "override"
                ? "Request override"
                : "Record decision"}{" "}
            <Check size={16} />
          </button>
          <p className="feedback" role="status">{msg}</p>
          {mode === firstVisit && approved && !complete && (
            <button
              onClick={() => {
                record("VISIT_REMOVED", "Approval removed", {
                  approved: state.approved.filter((x) => x !== id),
                  statuses: { ...state.statuses, [id]: "" },
                });
                setMsg("Approval removed.");
              }}
            >
              Remove approval
            </button>
          )}
        </section>
      </div>

      <section className="followPanel">
        <Section title="Weekly follow-up" />
        <p className="muted">Track attendance against the baseline after outreach.</p>
        <form className="tools follow" onSubmit={follow}>
          {[
            ["Pilot week", "week", 1, 13],
            ["Days present", "present", 0, 7],
            ["School days", "days", 1, 7],
          ].map(([label, name, min, max]) => (
            <label key={name}>
              {label}
              <input type="number" required {...{ name, min, max }} />
            </label>
          ))}
          <button>Save attendance</button>
        </form>
        <p className="feedback" role="status">{followMessage}</p>
        {entries.map((e, i) => {
          const v = (100 * e.register.present) / e.register.days,
            delta = v - r.attendance;
          return (
            <p key={i}>
              Week {e.register.week} · {v.toFixed(1)}% attendance ·{" "}
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)} pp from baseline
            </p>
          );
        })}
      </section>
      <section className="caseHistory">
        <Section title="Action history" />
        {history.length ? history.map((event, index) => (
          <article className="event" key={index}>
            <small>{event.ts} · {event.synced ? "Saved locally" : "Queued offline"}</small>
            <p>{event.detail}</p>
          </article>
        )) : <p className="muted">Decisions and follow-up entries for {id} will appear here.</p>}
      </section>
    </>
  );
}
function Schedule({ plan, state, rows, save, stress }) {
  const [day, setDay] = useState("");
  function exportCsv() {
    const lines = [
      ["Worker", "Day", "Student", "School", "Status", "Cost INR"],
    ];
    plan.workers.forEach((worker, w) =>
      worker.forEach((r, i) =>
        lines.push([
          w + 1,
          days[Math.floor(i / 4)],
          r.student_id,
          r.school_id,
          state.completed.includes(r.student_id) ? "Completed" : "Scheduled",
          250,
        ]),
      ),
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([lines.map((l) => l.join(",")).join("\n")], {
        type: "text/csv",
      }),
    );
    a.download = "weekly-field-schedule.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function changeApprovals(approved, action) {
    save({
      approved,
      events: [
        {
          ts: new Date().toLocaleString(),
          student_id: "District",
          action,
          detail: approved.length + " total approvals",
          synced: !state.offline,
        },
        ...state.events,
      ],
    });
  }
  return (
    <>
      <div className="metrics">
        <Metric
          value={plan.scheduled.length + " / " + plan.cap}
          label="Scheduled visits"
        />
        <Metric
          value={money(plan.scheduled.length * 250)}
          label="Planned spend of ₹25,000"
        />
        <Metric value={plan.deferred.length} label="Deferred visits" />
      </div>
      <div className="tools">
        <label>
          Budget reserve · {state.reserve}%{" "}
          <input
            type="range"
            aria-label="Budget reserve"
            min="0"
            max={Math.min(50, 100 - state.completed.length)}
            value={state.reserve}
            onChange={(e) => save({ reserve: Number(e.target.value) })}
          />
        </label>
        <select
          value={day}
          aria-label="Worker day"
          onChange={(e) => setDay(e.target.value)}
        >
          <option value="">All days</option>
          {days.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <button disabled={!plan.scheduled.length} onClick={exportCsv}>
          <Download size={16} /> Export CSV
        </button>
      </div>
      <Section title="Worker assignments" />
      {!plan.scheduled.length && (
        <p className="assignmentNote">No visits assigned. <a href="#register">Choose a student</a> to approve a home visit.</p>
      )}
      <div className="scroll">
        <table className="timetable">
          <thead>
            <tr>
              <th>Worker</th>
              {days
                .filter((d) => !day || d === day)
                .map((d) => (
                  <th key={d}>{d}</th>
                ))}
            </tr>
          </thead>
          <tbody>
            {plan.workers.map((worker, w) => (
              <tr key={w}>
                <th>Worker {w + 1}</th>
                {days.map(
                  (d, i) =>
                    (!day || day === d) && (
                      <td key={d}>
                        {worker.slice(4 * i, 4 * i + 4).map((r) => (
                          <a
                            className="slot"
                            key={r.student_id}
                            href={"#case/" + r.student_id}
                          >
                            {r.student_id}{" "}
                            {state.completed.includes(r.student_id) && "✓"}
                          </a>
                        ))}
                        {!worker[4 * i] && "—"}
                      </td>
                    ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="tools">
        {stress && (
          <button
            onClick={() =>
              changeApprovals(
                [
                  ...new Set([
                    ...state.approved,
                    ...rows
                      .filter((r) => r.channel === firstVisit)
                      .map((r) => r.student_id),
                  ]),
                ],
                "SIMULATED_BATCH_APPROVAL",
              )
            }
          >
            Approve simulated first visits
          </button>
        )}
        {state.approved.length > state.completed.length && (
          <button
            onClick={() => {
              if (confirm("Remove pending visit approvals from this plan?"))
                changeApprovals(
                  [...state.completed],
                  "PENDING_APPROVALS_CLEARED",
                );
            }}
          >
            Clear pending visits
          </button>
        )}
      </div>
      {plan.deferred.length > 0 && (
        <details>
          <summary>Deferred students ({plan.deferred.length})</summary>
          <Table rows={plan.deferred} state={state} />
        </details>
      )}
    </>
  );
}
function Schools({ state, rows }) {
  return (
    <div className="schoolSpread">
      <SchoolPlot />
      <section className="schoolRecords" aria-label="School records">
        <p className="intro">
          School attendance comes from the district baseline. Follow-up figures
          use each student’s latest recorded week.
        </p>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                {[
                  "School",
                  "Enrolment",
                  "Attendance",
                  "Sample cases",
                  "Follow-up average",
                ].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => {
                const group = rows.filter((r) => r.school_id === s.school_id),
                  latest = group
                    .map(
                      (r) =>
                        state.events
                          .filter(
                            (e) => e.student_id === r.student_id && e.register,
                          )
                          .sort((a, b) => b.register.week - a.register.week)[0]
                          ?.register,
                    )
                    .filter(Boolean);
                return (
                  <tr key={s.school_id}>
                    <th>
                      <a href={"#register/" + s.school_id}>
                        {s.name} <ArrowUpRight size={14} />
                      </a>
                    </th>
                    <td>{s.enrolled}</td>
                    <td>{s.avg_attendance}%</td>
                    <td>{group.length}</td>
                    <td>
                      {latest.length
                        ? (
                            latest.reduce(
                              (n, r) => n + (100 * r.present) / r.days,
                              0,
                            ) / latest.length
                          ).toFixed(1) +
                          "% (" +
                          latest.length +
                          ")"
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
function Journal({ state }) {
  const [filter, setFilter] = useState("");
  return (
    <>
      <div className="tools">
        <select
          aria-label="Decision type"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All decisions</option>
          {[...new Set(state.events.map((e) => e.action))].map((k) => (
            <option key={k} value={k}>
              {k.toLowerCase().replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
      {!state.events.length && (
        <div className="blank">
          <ClipboardList />
          <h3>No decisions recorded</h3>
          <p>
            Teacher decisions and weekly attendance entries will appear here.
          </p>
          <a href="#register">
            Open student register <ArrowRight size={16} />
          </a>
        </div>
      )}
      {state.events
        .filter((event) => !filter || event.action === filter)
        .map((event, index) => (
          <article className="event journalEntry" key={index}>
            <div className="eventMeta">
              <small>{event.ts}</small>
              <span>{event.synced ? "Saved locally" : "Queued offline"}</span>
            </div>
            <div>
              <h3>
                {event.student_id === "District" ? (
                  "District"
                ) : (
                  <a href={"#case/" + event.student_id}>{event.student_id}</a>
                )}{" "}
                · {event.action.toLowerCase().replaceAll("_", " ")}
              </h3>
              <p>{event.detail}</p>
            </div>
          </article>
        ))}
    </>
  );
}
function Settings({ stress, setStress, state, save }) {
  return (
    <div className="settings">
      <section className="settingsSection">
        <Section title="Pilot dataset" />
        <p>
          Switch between the assessment records and a simulated high-load week.
          Each scenario keeps its own decisions.
        </p>
        <select
          aria-label="Pilot dataset"
          value={stress ? "stress" : "case"}
          onChange={(e) => setStress(e.target.value === "stress")}
        >
          <option value="case">Assessment · 12 students</option>
          <option value="stress">Capacity test · 240 students</option>
        </select>
      </section>
      <section className="settingsSection">
        <Section title="Offline simulation" />
        <p>
          Queue decisions while offline. Reconnecting marks them saved on this
          device.
        </p>
        <button
          onClick={() =>
            save({
              offline: !state.offline,
              events: state.offline
                ? state.events.map((e) => ({ ...e, synced: true }))
                : state.events,
            })
          }
        >
          {state.offline ? "Reconnect simulation" : "Simulate offline"}
        </button>
      </section>
      <section className="settingsSection">
        <Section title="Risk weights" />
        <p>
          Weights are normalised to 100%. Attendance safeguards apply
          independently.
        </p>
        {Object.entries({
          wAtt: "Attendance",
          wAcad: "Academic score",
          wDist: "Distance",
          wInt: "Outreach history",
        }).map(([k, v]) => (
          <label key={k}>
            {v} ·{" "}
            {Math.round(
              (100 * state.weights[k]) /
                Object.values(state.weights).reduce((a, b) => a + b, 0),
            )}
            %
            <input
              type="range"
              min={
                Object.entries(state.weights).some(([j, n]) => j !== k && n > 0)
                  ? 0
                  : 1
              }
              max="100"
              value={state.weights[k]}
              onChange={(e) =>
                save({
                  weights: { ...state.weights, [k]: Number(e.target.value) },
                })
              }
            />
          </label>
        ))}
        <button onClick={() => save({ weights: defaults })}>
          Restore default weights
        </button>
      </section>
    </div>
  );
}
function App() {
  const [route, setRoute] = useState(location.hash.slice(1)),
    [stress, changeStress] = useState(() => {
      try {
        return sessionStorage.getItem("ss_stitch_scenario") === "stress";
      } catch {
        return false;
      }
    }),
    [state, setState] = useState(() =>
      load(stress ? "ss_stitch_v1_stress" : "ss_stitch_v1_case"),
    ),
    [error, setError] = useState(""),
    [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const update = () => {
      setRoute(location.hash.slice(1));
      setMenuOpen(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  function save(patch) {
    const next = { ...state, ...patch };
    try {
      localStorage.setItem(
        stress ? "ss_stitch_v1_stress" : "ss_stitch_v1_case",
        JSON.stringify(next),
      );
      setState(next);
      setError("");
    } catch {
      setError(
        "This browser could not save the change. Check local storage and try again.",
      );
    }
  }
  function setStress(v) {
    try {
      sessionStorage.setItem("ss_stitch_scenario", v ? "stress" : "case");
    } catch {}
    changeStress(v);
    setState(load(v ? "ss_stitch_v1_stress" : "ss_stitch_v1_case"));
  }
  if (!route) return <Cover />;
  const [page, arg] = route.split("/"),
    weights = {
      ...state.weights,
      scale: 100 / Object.values(state.weights).reduce((a, b) => a + b, 0),
    };
  const rows = (stress ? STRESS_COHORT : STUDENTS_A2)
    .map((s) => scoreStudent(s, weights, state.overrides))
    .sort(
      (a, b) =>
        b.total - a.total ||
        a.attendance - b.attendance ||
        b.distance_km - a.distance_km,
    );
  const plan = makePlan(rows, state),
    student = rows.find((r) => r.student_id === arg),
    title = nav.find((n) => n[0] === page)?.[1] || "Student case";
  const props = { rows, state, plan, save, stress, setStress };
  return (
    <div className="workspace">
      <a className="skipLink" href="#main-content" onClick={(event) => {
        event.preventDefault();
        document.getElementById("main-content").focus();
      }}>Skip to content</a>
      <header className="workspaceHeader">
        <div className="workspaceMast">
          <a className="brandlink" href="#" aria-label="Shiksha Setu front page">
            <Brand />
          </a>
          <a className="environment" href="#settings">
            <i className={state.offline ? "off" : ""} />
            {state.offline ? "Offline simulation" : stress ? "Capacity simulation" : "Assessment demo"}
          </a>
          <button className="menuToggle" aria-expanded={menuOpen} aria-controls="workspace-nav" onClick={() => setMenuOpen(!menuOpen)}><Menu size={18} /> Menu</button>
        </div>
        <nav id="workspace-nav" aria-label="Workspace" className={menuOpen ? "isOpen" : ""}>
          {nav.map(([k, v, Icon]) => (
            <a
              key={k}
              href={"#" + k}
              aria-current={
                k === page || (k === "register" && page === "case")
                  ? "page"
                  : undefined
              }
            >
              <Icon size={18} />
              {v}
            </a>
          ))}
        </nav>
      </header>
      <div className="desk">
        <main id="main-content" tabIndex={-1} key={page === "case" ? route : page}>
          {page !== "case" && <h1>{title}</h1>}
          {error && <p role="alert">{error}</p>}
          {page === "overview" ? (
            <Overview {...props} />
          ) : page === "register" ? (
            <Register {...props} school={arg} />
          ) : page === "case" && student ? (
            <Case {...props} r={student} />
          ) : page === "plan" ? (
            <Schedule {...props} />
          ) : page === "schools" ? (
            <Schools {...props} />
          ) : page === "journal" ? (
            <Journal {...props} />
          ) : page === "settings" ? (
            <Settings {...props} />
          ) : (
            <a href="#register">Return to student register</a>
          )}
        </main>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
