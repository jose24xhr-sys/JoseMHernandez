import { useState, useRef, useEffect, useCallback } from "react";

// ─── constants ────────────────────────────────────────────────────────────────
const TYPE_MAP = {
  article: { lbl: "Article",  cls: "b-article" },
  video:   { lbl: "Video",    cls: "b-video"   },
  test:    { lbl: "Testing",  cls: "b-test"    },
  support: { lbl: "Support",  cls: "b-support" },
  deploy:  { lbl: "Deploy",   cls: "b-deploy"  },
};
const STATUS_LABELS = { "s-draft": "Draft", "s-review": "In review", "s-done": "Published", "s-planned": "Planned" };
const STATUS_ORDER  = ["s-planned", "s-draft", "s-review", "s-done"];
const DAYS          = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const TYPE_KEYS     = ["article", "video", "test", "support", "deploy"];
const TYPE_COLORS   = { article: "#1D9E75", video: "#7F77DD", test: "#EF9F27", support: "#378ADD", deploy: "#E24B4A" };
const CATS          = ["Onboarding", "Scheduling", "Routes", "Billing", "Integrations", "FAQ"];

// ─── date helpers ─────────────────────────────────────────────────────────────
function getMonday(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return x;
}
function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function shiftDate(s, n) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return fmt(d);
}
function fmtRange(s, e) {
  const a = parseDate(s), b = parseDate(e);
  const same = a.getMonth() === b.getMonth();
  return `${a.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${b.toLocaleDateString("en-US", { month: same ? undefined : "short", day: "numeric", year: "numeric" })}`;
}

// ─── initial state ────────────────────────────────────────────────────────────
const mon0 = getMonday();
const fri0 = new Date(mon0);
fri0.setDate(mon0.getDate() + 4);

const INITIAL = {
  weekStart: fmt(mon0),
  weekEnd: fmt(fri0),
  view: "weekly",
  selectedDay: "Mon",
  notes: "",
  copied: false,
  collapsed: { done: false, planned: false, articles: false, blockers: false, notes: false },
  nextId: 100,
  blockers: [
    { id: 60, text: "Waiting for consolidated beta user feedback to prioritize new articles." },
  ],
  articles: [
    { id: "a1", title: "Configure service zones",            cat: "Onboarding",   status: "s-done"    },
    { id: "a2", title: "Add and manage technicians",         cat: "Onboarding",   status: "s-review"  },
    { id: "a3", title: "Automatic route optimization",       cat: "Routes",       status: "s-draft"   },
    { id: "a4", title: "How to use the scheduling calendar", cat: "Scheduling",   status: "s-draft"   },
    { id: "a5", title: "Connect with QuickBooks",            cat: "Integrations", status: "s-planned" },
    { id: "a6", title: "Chat agent FAQ",                     cat: "FAQ",          status: "s-planned" },
  ],
  tasks: [
    { id: 1,  text: "Wrote article: how to configure service zones",  type: "article", done: true,  assignedDays: ["Mon"], description: "", link: "", subtasks: [] },
    { id: 2,  text: "Recorded intro video: dashboard tour",           type: "video",   done: true,  assignedDays: ["Tue"], description: "", link: "", subtasks: [] },
    { id: 3,  text: "Answered 12 beta user queries",                  type: "support", done: true,  assignedDays: ["Wed"], description: "", link: "", subtasks: [] },
    { id: 4,  text: "Ran end-to-end scheduling flow test",            type: "test",    done: true,  assignedDays: ["Thu"], description: "", link: "", subtasks: [] },
    { id: 5,  text: "Deployed update to staging environment",         type: "deploy",  done: true,  assignedDays: ["Fri"], description: "", link: "", subtasks: [] },
    { id: 10, text: "Article: route optimization by job type",        type: "article", done: false, assignedDays: [],      description: "", link: "", subtasks: [] },
    { id: 11, text: "Video: how to add technicians to a team",        type: "video",   done: false, assignedDays: [],      description: "", link: "", subtasks: [] },
    { id: 12, text: "Testing: agent responses to billing questions",  type: "test",    done: false, assignedDays: [],      description: "", link: "", subtasks: [] },
    { id: 13, text: "Onboarding session with 2 new clients",          type: "support", done: false, assignedDays: [],      description: "", link: "", subtasks: [] },
    { id: 14, text: "Review FAQs with beta user feedback",            type: "article", done: false, assignedDays: [],      description: "", link: "", subtasks: [] },
  ],
  newTask:    { text: "", type: "article" },
  newArt:     { title: "", cat: "Onboarding", status: "s-planned" },
  newBlocker: "",
  newSubtask: {},
};

// ─── pure SVG mini chart (no dependencies) ───────────────────────────────────
function MiniChart({ tasks }) {
  const W = 700, H = 130, PAD = { top: 10, right: 16, bottom: 28, left: 28 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  // count completed tasks per type per day
  const counts = {};
  DAYS.forEach(d => { counts[d] = {}; TYPE_KEYS.forEach(k => { counts[d][k] = 0; }); });
  tasks.filter(t => t.done).forEach(t => {
    (t.assignedDays || []).forEach(d => {
      if (counts[d]) counts[d][t.type] = (counts[d][t.type] || 0) + 1;
    });
  });

  const maxVal = Math.max(1, ...TYPE_KEYS.flatMap(k => DAYS.map(d => counts[d][k])));
  const xStep  = innerW / (DAYS.length - 1);

  function xOf(i)   { return PAD.left + i * xStep; }
  function yOf(val) { return PAD.top + innerH - (val / maxVal) * innerH; }

  // smooth cubic bezier path
  function smoothPath(points) {
    if (points.length < 2) return "";
    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[i + 1];
      const cpx = (x0 + x1) / 2;
      d += ` C ${cpx} ${y0} ${cpx} ${y1} ${x1} ${y1}`;
    }
    return d;
  }

  const yTicks = [0, Math.ceil(maxVal / 2), maxVal];

  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "10px 12px 8px", marginBottom: 12 }}>
      {/* legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 14px", marginBottom: 8 }}>
        {TYPE_KEYS.map(k => (
          <span key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--color-text-secondary)" }}>
            <span style={{ display: "inline-block", width: 16, height: 2, borderRadius: 1, background: TYPE_COLORS[k] }} />
            {TYPE_MAP[k].lbl}
          </span>
        ))}
      </div>

      {/* SVG chart */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} aria-label="Completed tasks by day and type" role="img">
        {/* grid lines */}
        {yTicks.map(v => (
          <line key={v}
            x1={PAD.left} y1={yOf(v)}
            x2={PAD.left + innerW} y2={yOf(v)}
            stroke="rgba(128,128,128,0.12)" strokeWidth="0.5"
          />
        ))}
        {/* y-axis labels */}
        {yTicks.map(v => (
          <text key={v} x={PAD.left - 5} y={yOf(v) + 4} textAnchor="end"
            fontSize="9" fill="rgba(128,128,128,0.7)">{v}</text>
        ))}

        {/* lines per type */}
        {TYPE_KEYS.map(k => {
          const pts = DAYS.map((d, i) => [xOf(i), yOf(counts[d][k])]);
          return (
            <g key={k}>
              <path d={smoothPath(pts)} fill="none" stroke={TYPE_COLORS[k]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              {pts.map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r="3" fill={TYPE_COLORS[k]} stroke="white" strokeWidth="1.5" />
              ))}
            </g>
          );
        })}

        {/* x-axis labels */}
        {DAYS.map((d, i) => (
          <text key={d} x={xOf(i)} y={H - 6} textAnchor="middle"
            fontSize="10" fill="rgba(128,128,128,0.8)">{d}</text>
        ))}
      </svg>
    </div>
  );
}

// ─── small atoms ─────────────────────────────────────────────────────────────
function Badge({ type }) {
  const t = TYPE_MAP[type] || { lbl: type, cls: "b-support" };
  return <span className={`wr-badge ${t.cls}`}>{t.lbl}</span>;
}

function Cb({ checked }) {
  return (
    <div className={`wr-cb ${checked ? "checked" : ""}`}>
      {checked && (
        <svg width="9" height="9" viewBox="0 0 10 10">
          <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
}

function DelBtn({ onClick, style }) {
  return (
    <button
      className="wr-del"
      style={style}
      onClick={e => { e.stopPropagation(); onClick(); }}
      title="Delete"
    >×</button>
  );
}

// ─── section wrapper ──────────────────────────────────────────────────────────
function Section({ title, sectionKey, collapsed, onToggle, count, hint, children }) {
  return (
    <div className="wr-section">
      <div className="wr-shdr">
        <button className="wr-stitle" onClick={() => onToggle(sectionKey)}>
          <span style={{ fontSize: 9, opacity: 0.6 }}>{collapsed ? "▸" : "▾"}</span>
          {title}
          {count !== undefined && <span className="wr-count">{count}</span>}
        </button>
        {hint && <span className="wr-shint">{hint}</span>}
      </div>
      {!collapsed && <div className="wr-sbody">{children}</div>}
    </div>
  );
}

// ─── task item ────────────────────────────────────────────────────────────────
function TaskItem({ task, handlers, newSubtaskVal, showAssign }) {
  const [open, setOpen] = useState(false);
  const { onToggle, onDelete, onUpdateDesc, onUpdateLink,
          onToggleSub, onDeleteSub, onAddSub, onDayAssign, onSubInput } = handlers;

  return (
    <div className={`wr-task ${task.done ? "done" : ""}`}>
      <div className="wr-tmain" onClick={() => onToggle(task.id)}>
        <Cb checked={task.done} />
        <span className="wr-ttext">{task.text}</span>
        <Badge type={task.type} />
        <button className="wr-expbtn" onClick={e => { e.stopPropagation(); setOpen(o => !o); }}>
          {open ? "▲" : "▼"}
        </button>
        <DelBtn onClick={() => onDelete(task.id)} />
      </div>

      {open && (
        <div className="wr-texpand">
          {showAssign && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
              {DAYS.map(d => (
                <button key={d}
                  className={`wr-daybtn ${task.assignedDays.includes(d) ? "active" : ""}`}
                  onClick={e => { e.stopPropagation(); onDayAssign(task.id, d); }}>
                  {d}
                </button>
              ))}
            </div>
          )}
          <textarea className="wr-expta" placeholder="Optional description..."
            value={task.description}
            onChange={e => onUpdateDesc(task.id, e.target.value)} />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="text" className="wr-input" placeholder="https://... (optional link)"
              value={task.link}
              onChange={e => onUpdateLink(task.id, e.target.value)} />
            {task.link && <a href={task.link} target="_blank" rel="noreferrer" className="wr-linka">Open</a>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {(task.subtasks || []).map((sub, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-secondary)" }}>
                <div className={`wr-subcb ${sub.done ? "checked" : ""}`}
                  onClick={() => onToggleSub(task.id, i)} />
                <span style={{ flex: 1, textDecoration: sub.done ? "line-through" : "none", opacity: sub.done ? 0.5 : 1 }}>{sub.text}</span>
                <DelBtn onClick={() => onDeleteSub(task.id, i)} style={{ fontSize: 12 }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input type="text" className="wr-input" style={{ fontSize: 11 }} placeholder="Add subtask..."
              value={newSubtaskVal || ""}
              onChange={e => onSubInput(task.id, e.target.value)}
              onKeyDown={e => e.key === "Enter" && onAddSub(task.id)} />
            <button className="wr-btn" onClick={() => onAddSub(task.id)}>+ Sub</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function WeeklyReport() {
  const [s, setS] = useState(INITIAL);

  const upd = useCallback(fn => {
    setS(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      fn(next);
      return next;
    });
  }, []);

  // tasks
  const toggleTask   = id       => upd(s => { const t = s.tasks.find(t => t.id === id); if (t) t.done = !t.done; });
  const deleteTask   = id       => upd(s => { s.tasks = s.tasks.filter(t => t.id !== id); });
  const updateDesc   = (id, v)  => upd(s => { const t = s.tasks.find(t => t.id === id); if (t) t.description = v; });
  const updateLink   = (id, v)  => upd(s => { const t = s.tasks.find(t => t.id === id); if (t) t.link = v; });
  const toggleSub    = (tid, i) => upd(s => { const t = s.tasks.find(t => t.id === tid); if (t) t.subtasks[i].done = !t.subtasks[i].done; });
  const deleteSub    = (tid, i) => upd(s => { const t = s.tasks.find(t => t.id === tid); if (t) t.subtasks.splice(i, 1); });
  const addSub       = tid      => { const txt = (s.newSubtask[tid] || "").trim(); if (!txt) return; upd(s => { const t = s.tasks.find(t => t.id === tid); if (t) t.subtasks.push({ text: txt, done: false }); s.newSubtask[tid] = ""; }); };
  const subInput     = (id, v)  => upd(s => { s.newSubtask[id] = v; });
  const dayAssign    = (id, day)=> upd(s => { const t = s.tasks.find(t => t.id === id); if (!t) return; const i = t.assignedDays.indexOf(day); if (i > -1) t.assignedDays.splice(i, 1); else t.assignedDays.push(day); });
  const addTask      = ()       => { if (!s.newTask.text.trim()) return; upd(s => { s.tasks.push({ id: s.nextId++, text: s.newTask.text.trim(), type: s.newTask.type, done: false, assignedDays: [], description: "", link: "", subtasks: [] }); s.newTask = { text: "", type: "article" }; }); };

  // articles
  const cycleStatus   = id => upd(s => {
    const a = s.articles.find(a => a.id === id); if (!a) return;
    const ni = (STATUS_ORDER.indexOf(a.status) + 1) % STATUS_ORDER.length;
    a.status = STATUS_ORDER[ni];
    if (STATUS_ORDER[ni] === "s-done" && !s.tasks.some(t => t.text === `Published article: ${a.title}` && t.done)) {
      s.tasks.push({ id: s.nextId++, text: `Published article: ${a.title}`, type: "article", done: true, assignedDays: [], description: "Auto-added when marked Published.", link: "", subtasks: [] });
    }
  });
  const deleteArticle = id => upd(s => { s.articles = s.articles.filter(a => a.id !== id); });
  const addArticle    = ()  => { if (!s.newArt.title.trim()) return; upd(s => { s.articles.push({ id: `a${s.nextId++}`, title: s.newArt.title.trim(), cat: s.newArt.cat, status: s.newArt.status }); s.newArt = { ...s.newArt, title: "" }; }); };

  // blockers
  const deleteBlocker = id => upd(s => { s.blockers = s.blockers.filter(b => b.id !== id); });
  const addBlocker    = ()  => { if (!s.newBlocker.trim()) return; upd(s => { s.blockers.push({ id: s.nextId++, text: s.newBlocker.trim() }); s.newBlocker = ""; }); };

  // nav
  const prevWeek      = () => upd(s => { s.weekStart = shiftDate(s.weekStart, -7); s.weekEnd = shiftDate(s.weekEnd, -7); });
  const nextWeek      = () => upd(s => { s.weekStart = shiftDate(s.weekStart,  7); s.weekEnd = shiftDate(s.weekEnd,  7); });
  const toggleSection = key => upd(s => { s.collapsed[key] = !s.collapsed[key]; });

  // copy
  const copyReport = () => {
    const lines = [`${s.view === "weekly" ? "WEEKLY" : "DAILY"} REPORT — ROUTEMIZE`, `Period: ${s.weekStart} to ${s.weekEnd}`];
    if (s.view === "daily") lines.push(`Day: ${s.selectedDay}`);
    lines.push("", "BLOCKERS:");
    s.blockers.forEach(b => lines.push(`  • ${b.text}`));
    lines.push("\nTASKS:");
    const filt = s.view === "daily" ? s.tasks.filter(t => t.assignedDays.includes(s.selectedDay)) : s.tasks;
    filt.forEach(t => lines.push(`  ${t.done ? "[x]" : "[ ]"} [${TYPE_MAP[t.type]?.lbl}] ${t.text}`));
    lines.push("\nARTICLES:");
    s.articles.forEach(a => lines.push(`  · ${a.title} — ${a.cat} — ${STATUS_LABELS[a.status]}`));
    lines.push("\nNOTES:", s.notes || "(no notes)");
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      upd(s => { s.copied = true; });
      setTimeout(() => upd(s => { s.copied = false; }), 1800);
    });
  };

  const filtTasks = s.view === "daily" ? s.tasks.filter(t => t.assignedDays.includes(s.selectedDay)) : s.tasks;
  const doneTasks = filtTasks.filter(t => t.done);
  const pendTasks = filtTasks.filter(t => !t.done);

  const taskHandlers = {
    onToggle: toggleTask, onDelete: deleteTask,
    onUpdateDesc: updateDesc, onUpdateLink: updateLink,
    onToggleSub: toggleSub, onDeleteSub: deleteSub,
    onAddSub: addSub, onDayAssign: dayAssign, onSubInput: subInput,
  };

  const renderTask = (t, showAssign = false) => (
    <TaskItem key={t.id} task={t} handlers={taskHandlers}
      newSubtaskVal={s.newSubtask[t.id]} showAssign={showAssign} />
  );

  return (
    <>
      <style>{CSS}</style>
      <div className="wr-root">

        {/* header */}
        <div className="wr-header">
          <h1 className="wr-h1">Operations report — Customer Success Lead</h1>
          <div className="wr-meta">Routemize · {fmtRange(s.weekStart, s.weekEnd)}</div>
        </div>

        {/* chart */}
        <MiniChart tasks={s.tasks} />

        {/* view toggle */}
        <div className="wr-toolbar">
          <button className={`wr-btn ${s.view === "weekly" ? "active" : ""}`} onClick={() => upd(s => { s.view = "weekly"; })}>Weekly view</button>
          <button className={`wr-btn ${s.view === "daily"  ? "active" : ""}`} onClick={() => upd(s => { s.view = "daily";  })}>Daily view</button>
        </div>

        {/* week nav — single compact line */}
        <div className="wr-weeknav">
          <button className="wr-btn" onClick={prevWeek}>← Prev</button>
          <input type="date" className="wr-dateinput" value={s.weekStart}
            onChange={e => upd(st => { st.weekStart = e.target.value; })} />
          <span className="wr-to">to</span>
          <input type="date" className="wr-dateinput" value={s.weekEnd}
            onChange={e => upd(st => { st.weekEnd = e.target.value; })} />
          <button className="wr-btn" onClick={nextWeek}>Next →</button>
        </div>

        {/* stats */}
        <div className="wr-stats">
          {[
            { lbl: "Tasks completed",    val: doneTasks.length,   sub: `of ${filtTasks.length} ${s.view === "daily" ? "today" : "total"}` },
            { lbl: "Articles published", val: s.articles.filter(a => a.status === "s-done").length, sub: `of ${s.articles.length} total` },
            { lbl: "Pending",            val: pendTasks.length,   sub: "tasks remaining" },
            { lbl: "In progress",        val: s.articles.filter(a => ["s-review", "s-draft"].includes(a.status)).length, sub: "articles draft/review" },
          ].map(d => (
            <div key={d.lbl} className="wr-stat">
              <div className="wr-stat-lbl">{d.lbl}</div>
              <div className="wr-stat-val">{d.val}</div>
              <div className="wr-stat-sub">{d.sub}</div>
            </div>
          ))}
        </div>

        {/* ── daily view ── */}
        {s.view === "daily" && (
          <>
            <div className="wr-daytabs">
              {DAYS.map(d => (
                <button key={d} className={`wr-btn ${s.selectedDay === d ? "active-green" : ""}`}
                  onClick={() => upd(s => { s.selectedDay = d; })}>{d}</button>
              ))}
            </div>

            <Section title={`Tasks for ${s.selectedDay}`} sectionKey="done"
              collapsed={s.collapsed.done} onToggle={toggleSection}
              count={s.tasks.filter(t => t.assignedDays.includes(s.selectedDay)).length}>
              {s.tasks.filter(t => t.assignedDays.includes(s.selectedDay)).length === 0
                ? <div className="wr-empty">No tasks assigned to this day.</div>
                : s.tasks.filter(t => t.assignedDays.includes(s.selectedDay)).map(t => renderTask(t, true))}
            </Section>

            {s.tasks.filter(t => !t.done && !t.assignedDays.includes(s.selectedDay)).length > 0 && (
              <div className="wr-assignpanel">
                <div className="wr-assignhdr">Weekly backlog — assign to this day</div>
                {s.tasks.filter(t => !t.done && !t.assignedDays.includes(s.selectedDay)).map(t => (
                  <div key={t.id} className="wr-assignrow" onClick={() => dayAssign(t.id, s.selectedDay)}>
                    <span className="wr-assignbadge">+ Assign</span>
                    <span style={{ flex: 1, fontSize: 12 }}>{t.text}</span>
                    <Badge type={t.type} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── blockers ── */}
        <Section title="Blockers / Risks" sectionKey="blockers"
          collapsed={s.collapsed.blockers} onToggle={toggleSection} count={s.blockers.length}>
          {s.blockers.map(b => (
            <div key={b.id} className="wr-blocker">
              <span style={{ flex: 1 }}>{b.text}</span>
              <DelBtn onClick={() => deleteBlocker(b.id)} />
            </div>
          ))}
          <div className="wr-addrow">
            <input type="text" className="wr-input" placeholder="New blocker or risk..."
              value={s.newBlocker}
              onChange={e => upd(s => { s.newBlocker = e.target.value; })}
              onKeyDown={e => e.key === "Enter" && addBlocker()} />
            <button className="wr-btn" onClick={addBlocker}>+ Blocker</button>
          </div>
        </Section>

        {/* ── weekly task sections ── */}
        {s.view === "weekly" && (
          <>
            <Section title="Completed activities" sectionKey="done"
              collapsed={s.collapsed.done} onToggle={toggleSection} count={doneTasks.length}>
              {doneTasks.length === 0
                ? <div className="wr-empty">No completed activities.</div>
                : doneTasks.map(t => renderTask(t, true))}
            </Section>

            <Section title="Activity backlog" sectionKey="planned"
              collapsed={s.collapsed.planned} onToggle={toggleSection} count={pendTasks.length}>
              {pendTasks.length === 0
                ? <div className="wr-empty">No pending activities.</div>
                : pendTasks.map(t => renderTask(t, true))}
              <div className="wr-addrow" style={{ marginTop: 8 }}>
                <input type="text" className="wr-input" placeholder="New activity..."
                  value={s.newTask.text}
                  onChange={e => upd(s => { s.newTask.text = e.target.value; })}
                  onKeyDown={e => e.key === "Enter" && addTask()} />
                <select className="wr-select" value={s.newTask.type}
                  onChange={e => upd(s => { s.newTask.type = e.target.value; })}>
                  {Object.entries(TYPE_MAP).map(([v, { lbl }]) => <option key={v} value={v}>{lbl}</option>)}
                </select>
                <button className="wr-btn accent" onClick={addTask}>+ Add</button>
              </div>
            </Section>
          </>
        )}

        {/* ── articles ── */}
        <Section title="Knowledge base articles" sectionKey="articles"
          collapsed={s.collapsed.articles} onToggle={toggleSection}
          count={s.articles.length} hint="click status to cycle">
          <table className="wr-table">
            <thead>
              <tr>
                <th style={{ width: "46%" }}>Article</th>
                <th style={{ width: "22%" }}>Category</th>
                <th style={{ width: "22%" }}>Status</th>
                <th style={{ width: "10%" }} />
              </tr>
            </thead>
            <tbody>
              {s.articles.map(a => (
                <tr key={a.id}>
                  <td>{a.title}</td>
                  <td style={{ color: "var(--color-text-secondary)" }}>{a.cat}</td>
                  <td>
                    <span className={`wr-pill ${a.status}`} onClick={() => cycleStatus(a.id)}>
                      {STATUS_LABELS[a.status]}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <DelBtn onClick={() => deleteArticle(a.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="wr-addrow">
            <input type="text" className="wr-input" placeholder="Article title..."
              value={s.newArt.title}
              onChange={e => upd(s => { s.newArt.title = e.target.value; })}
              onKeyDown={e => e.key === "Enter" && addArticle()} />
            <select className="wr-select" value={s.newArt.cat}
              onChange={e => upd(s => { s.newArt.cat = e.target.value; })}>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="wr-select" value={s.newArt.status}
              onChange={e => upd(s => { s.newArt.status = e.target.value; })}>
              {STATUS_ORDER.map(v => <option key={v} value={v}>{STATUS_LABELS[v]}</option>)}
            </select>
            <button className="wr-btn" onClick={addArticle}>+ Article</button>
          </div>
        </Section>

        {/* ── notes ── */}
        <Section title="Notes & observations" sectionKey="notes"
          collapsed={s.collapsed.notes} onToggle={toggleSection}>
          <textarea className="wr-notes" placeholder="Comments, observations, blockers, ideas..."
            value={s.notes}
            onChange={e => upd(s => { s.notes = e.target.value; })} />
        </Section>

        {/* export bar */}
        <div className="wr-exportbar">
          <span>{doneTasks.length} completed · {s.articles.length} articles · {s.blockers.length} blocker(s)</span>
          <button className="wr-btn accent" onClick={copyReport}>
            {s.copied ? "Copied!" : "Copy report"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const CSS = `
.wr-root{
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  padding:1.5rem;max-width:780px;margin:0 auto;font-size:14px;
  color:var(--color-text-primary);
  background:var(--color-background-primary);
  --acc:#1D9E75;--acc-l:#E1F5EE;--acc-d:#0F6E56;
}
.wr-header{border-left:3px solid var(--acc);padding-left:1rem;margin-bottom:1rem;border-radius:0}
.wr-h1{font-size:18px;font-weight:500;margin:0;color:var(--color-text-primary)}
.wr-meta{font-size:12px;color:var(--color-text-secondary);margin-top:3px}

.wr-toolbar{display:flex;gap:8px;margin-bottom:8px}
.wr-weeknav{display:flex;align-items:center;gap:6px;margin-bottom:1rem;flex-wrap:nowrap;overflow-x:auto}
.wr-dateinput{font-size:12px;padding:4px 6px;width:126px;min-width:110px;
  border:0.5px solid var(--color-border-tertiary);border-radius:8px;
  background:var(--color-background-primary);color:var(--color-text-primary)}
.wr-to{font-size:12px;color:var(--color-text-secondary);white-space:nowrap}

.wr-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:1.25rem}
.wr-stat{background:var(--color-background-secondary);border-radius:8px;padding:.75rem 1rem}
.wr-stat-lbl{font-size:11px;color:var(--color-text-secondary);margin-bottom:3px}
.wr-stat-val{font-size:22px;font-weight:500;color:var(--color-text-primary)}
.wr-stat-sub{font-size:11px;color:var(--color-text-tertiary);margin-top:2px}

.wr-section{margin-bottom:1.1rem}
.wr-shdr{display:flex;align-items:center;gap:8px;padding-bottom:5px;border-bottom:0.5px solid var(--color-border-tertiary)}
.wr-stitle{font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.08em;
  color:var(--color-text-secondary);flex:1;background:none;border:none;cursor:pointer;
  text-align:left;display:flex;gap:5px;align-items:center;padding:0}
.wr-stitle:hover{color:var(--color-text-primary)}
.wr-count{font-size:10px;padding:1px 5px;border-radius:20px;background:var(--color-background-secondary);
  color:var(--color-text-tertiary);font-weight:400;margin-left:2px}
.wr-shint{font-size:11px;color:var(--color-text-tertiary)}
.wr-sbody{padding-top:.6rem;display:flex;flex-direction:column;gap:5px}

.wr-task{border:0.5px solid var(--color-border-tertiary);border-radius:8px;
  background:var(--color-background-primary);overflow:hidden}
.wr-tmain{display:flex;align-items:flex-start;gap:8px;padding:.55rem .8rem;cursor:pointer}
.wr-tmain:hover{background:var(--color-background-secondary)}
.wr-task.done .wr-ttext{text-decoration:line-through;color:var(--color-text-tertiary)}
.wr-task.done{opacity:.6}
.wr-ttext{flex:1;font-size:13px;line-height:1.4;color:var(--color-text-primary)}
.wr-cb{width:15px;height:15px;border:1.5px solid var(--color-border-primary);border-radius:4px;
  flex-shrink:0;margin-top:1px;display:flex;align-items:center;justify-content:center}
.wr-cb.checked{background:var(--acc);border-color:var(--acc)}
.wr-badge{font-size:10px;padding:2px 7px;border-radius:20px;font-weight:500;flex-shrink:0}
.b-article{background:#E1F5EE;color:#0F6E56}
.b-video{background:#EEEDFE;color:#3C3489}
.b-test{background:#FAEEDA;color:#633806}
.b-support{background:#E6F1FB;color:#0C447C}
.b-deploy{background:#FCEBEB;color:#791F1F}
.wr-expbtn{font-size:9px;color:var(--color-text-tertiary);cursor:pointer;padding:2px 5px;
  border:0.5px solid var(--color-border-tertiary);border-radius:4px;background:transparent;flex-shrink:0}
.wr-expbtn:hover{background:var(--color-background-secondary)}

.wr-del{font-size:15px;line-height:1;color:var(--color-text-tertiary);cursor:pointer;
  padding:1px 5px;border:none;border-radius:4px;background:transparent;flex-shrink:0;
  opacity:.4;transition:opacity .12s,background .12s,color .12s}
.wr-del:hover{opacity:1;background:#FCEBEB;color:#791F1F}

.wr-texpand{padding:.5rem .8rem .75rem 2rem;display:flex;flex-direction:column;gap:7px}
.wr-expta{width:100%;font-size:12px;padding:6px 8px;border:0.5px solid var(--color-border-tertiary);
  border-radius:6px;background:var(--color-background-secondary);
  color:var(--color-text-primary);resize:vertical;min-height:56px;font-family:inherit}
.wr-daybtn{font-size:10px;padding:3px 8px;border:0.5px solid var(--color-border-secondary);border-radius:6px;
  background:var(--color-background-primary);color:var(--color-text-primary);cursor:pointer}
.wr-daybtn.active{background:var(--acc);color:#fff;border-color:var(--acc);font-weight:500}
.wr-subcb{width:12px;height:12px;border:1px solid var(--color-border-secondary);border-radius:3px;
  flex-shrink:0;cursor:pointer}
.wr-subcb.checked{background:var(--acc);border-color:var(--acc)}
.wr-linka{font-size:12px;color:var(--acc);text-decoration:none;white-space:nowrap}

.wr-table{width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed}
.wr-table th{text-align:left;padding:6px 8px;color:var(--color-text-secondary);
  border-bottom:0.5px solid var(--color-border-tertiary);font-weight:500}
.wr-table td{padding:6px 8px;border-bottom:0.5px solid var(--color-border-tertiary);
  word-break:break-word;vertical-align:middle;color:var(--color-text-primary)}
.wr-table tr:last-child td{border-bottom:none}
.wr-pill{display:inline-block;font-size:10px;padding:2px 7px;border-radius:20px;
  font-weight:500;cursor:pointer;user-select:none}
.s-draft{background:#F1EFE8;color:#5F5E5A}
.s-review{background:#FAEEDA;color:#633806}
.s-done{background:#EAF3DE;color:#3B6D11}
.s-planned{background:#E6F1FB;color:#185FA5}

.wr-blocker{background:#FCEBEB;color:#791F1F;border:0.5px solid rgba(121,31,31,.18);
  border-radius:8px;padding:.55rem .8rem;font-size:12px;display:flex;align-items:center;gap:8px}

.wr-daytabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:1rem}
.wr-assignpanel{background:var(--color-background-secondary);border-radius:10px;padding:1rem;margin-bottom:1rem}
.wr-assignhdr{font-size:11px;text-transform:uppercase;letter-spacing:.08em;
  color:var(--color-text-secondary);font-weight:500;margin-bottom:.75rem}
.wr-assignrow{display:flex;align-items:center;gap:8px;padding:7px 0;
  border-bottom:0.5px solid var(--color-border-tertiary);cursor:pointer}
.wr-assignrow:last-child{border-bottom:none}
.wr-assignrow:hover{opacity:.8}
.wr-assignbadge{font-size:10px;padding:2px 7px;border-radius:20px;font-weight:500;
  background:var(--color-background-secondary);color:var(--color-text-tertiary);
  border:0.5px solid var(--color-border-secondary);flex-shrink:0}

.wr-addrow{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
.wr-input{font-size:12px;flex:1;min-width:100px;padding:5px 8px;
  border:0.5px solid var(--color-border-tertiary);border-radius:8px;
  background:var(--color-background-primary);color:var(--color-text-primary)}
.wr-select{font-size:12px;flex:1;min-width:90px;padding:5px 8px;
  border:0.5px solid var(--color-border-tertiary);border-radius:8px;
  background:var(--color-background-primary);color:var(--color-text-primary)}

.wr-btn{font-size:12px;padding:5px 11px;border:0.5px solid var(--color-border-secondary);
  border-radius:8px;background:var(--color-background-primary);
  color:var(--color-text-primary);cursor:pointer;white-space:nowrap}
.wr-btn:hover{background:var(--color-background-secondary)}
.wr-btn.active{background:var(--color-background-secondary);font-weight:500;
  border-color:var(--color-border-primary)}
.wr-btn.active-green{background:var(--acc);color:#fff;border-color:var(--acc);font-weight:500}
.wr-btn.accent{background:var(--acc-l);color:var(--acc-d);border-color:var(--acc)}
.wr-btn.accent:hover{opacity:.85}

.wr-notes{width:100%;min-height:80px;font-size:13px;padding:8px 10px;
  border:0.5px solid var(--color-border-tertiary);border-radius:8px;
  background:var(--color-background-primary);color:var(--color-text-primary);
  resize:vertical;font-family:inherit;line-height:1.5}
.wr-exportbar{display:flex;gap:8px;margin-top:1.5rem;padding-top:1.5rem;
  border-top:0.5px solid var(--color-border-tertiary);flex-wrap:wrap;align-items:center}
.wr-exportbar span{font-size:12px;color:var(--color-text-secondary);flex:1}
.wr-empty{font-size:12px;color:var(--color-text-tertiary);padding:4px 0}
`;