import { useMemo, useState } from "react";

const typeMap = {
  article: { label: "Artículo", cls: "badge-article" },
  video: { label: "Video", cls: "badge-video" },
  test: { label: "Testing", cls: "badge-test" },
  support: { label: "Soporte", cls: "badge-support" },
  deploy: { label: "Deploy", cls: "badge-deploy" },
};

const statusLabels = {
  "s-draft": "Borrador",
  "s-review": "En revisión",
  "s-done": "Publicado",
  "s-planned": "Planeado",
};

const reportTypeLabels = {
  operations: "Operations",
  content: "Content",
  testing: "Testing",
  support: "Support Feedback",
};

const dailyBucketsTemplate = {
  Mon: [],
  Tue: [],
  Wed: [],
  Thu: [],
  Fri: [],
};

const initialState = {
  doneTasks: [
    { id: 1, text: "Redacté artículo: cómo configurar zonas de servicio", type: "article", done: true, day: "Mon" },
    { id: 2, text: "Grabé video introductorio: tour del dashboard", type: "video", done: true, day: "Tue" },
    { id: 3, text: "Respondí 12 consultas de usuarios beta", type: "support", done: true, day: "Wed" },
    { id: 4, text: "Ejecuté prueba de flujo de agendamiento end-to-end", type: "test", done: true, day: "Thu" },
    { id: 5, text: "Deploy de actualización en entorno de staging", type: "deploy", done: true, day: "Fri" },
  ],
  plannedTasks: [
    { id: 10, text: "Artículo: optimización de rutas por tipo de trabajo", type: "article", done: false, day: "Mon" },
    { id: 11, text: "Video: cómo agregar técnicos al equipo", type: "video", done: false, day: "Tue" },
    { id: 12, text: "Testing: respuestas del agente a preguntas de facturación", type: "test", done: false, day: "Wed" },
    { id: 13, text: "Sesión de onboarding con 2 nuevos clientes", type: "support", done: false, day: "Thu" },
    { id: 14, text: "Revisión de FAQs con feedback de usuarios beta", type: "article", done: false, day: "Fri" },
  ],
  articles: [
    { title: "Configurar zonas de servicio", cat: "Onboarding", status: "s-done" },
    { title: "Agregar y gestionar técnicos", cat: "Onboarding", status: "s-review" },
    { title: "Optimización de rutas automática", cat: "Rutas", status: "s-draft" },
    { title: "Cómo usar el calendario de agendamiento", cat: "Scheduling", status: "s-draft" },
    { title: "Conectar con QuickBooks", cat: "Integraciones", status: "s-planned" },
    { title: "Preguntas frecuentes del agente de chat", cat: "FAQ", status: "s-planned" },
  ],
  videos: [
    { id: 20, text: "Tour del dashboard — introducción general (grabado)", type: "video", done: true, day: "Tue" },
    { id: 21, text: "Cómo crear tu primer job en Routemize", type: "video", done: false, day: "Wed" },
    { id: 22, text: "Configurar notificaciones automáticas al cliente", type: "video", done: false, day: "Thu" },
    { id: 23, text: "Walkthrough: agendamiento con múltiples técnicos", type: "video", done: false, day: "Fri" },
  ],
  tests: [
    { id: 30, text: "Prueba: flujo completo de agendamiento (inicio → confirmación)", type: "test", done: true, day: "Mon" },
    { id: 31, text: "Prueba: respuestas del agente a preguntas fuera de contexto", type: "test", done: false, day: "Tue" },
    { id: 32, text: "Prueba: escalamiento correcto a soporte humano", type: "test", done: false, day: "Wed" },
    { id: 33, text: "Prueba: artículos vinculados correctamente en respuestas", type: "test", done: false, day: "Thu" },
    { id: 34, text: "Prueba de regresión tras último deploy", type: "test", done: false, day: "Fri" },
  ],
  supports: [
    { id: 40, text: "Atendí consultas de usuarios beta vía live chat (semana pasada)", type: "support", done: true, day: "Mon" },
    { id: 41, text: "Documenté 5 preguntas recurrentes para convertir en artículos", type: "support", done: true, day: "Tue" },
    { id: 42, text: "Sesión de onboarding programada para nuevos contratistas", type: "support", done: false, day: "Thu" },
    { id: 43, text: "Recolectar feedback estructurado de usuarios beta activos", type: "support", done: false, day: "Fri" },
  ],
  blockers: [
    { id: 60, text: "Esperando feedback consolidado de usuarios beta para priorizar nuevos artículos." },
  ],
};

function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function fmt(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseLocalDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function shiftDateString(dateStr, days) {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return fmt(d);
}

function formatHeaderRange(startStr, endStr) {
  const start = parseLocalDate(startStr);
  const end = parseLocalDate(endStr);

  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });

  const endLabel = end.toLocaleDateString("en-US", {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startLabel} – ${endLabel}`;
}

function Badge({ type }) {
  const t = typeMap[type] || { label: type, cls: "badge-support" };
  return <span className={`task-badge ${t.cls}`}>{t.label}</span>;
}

function Checkbox({ checked }) {
  return (
    <div className={`checkbox ${checked ? "checked" : ""}`}>
      {checked && (
        <svg width="10" height="10" viewBox="0 0 10 10">
          <polyline
            points="1.5,5 4,7.5 8.5,2.5"
            stroke="white"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  );
}

function TaskItem({ item, onToggle }) {
  return (
    <div className={`task-item ${item.done ? "done" : ""}`} onClick={onToggle}>
      <Checkbox checked={item.done} />
      <span className="task-text">{item.text}</span>
      <Badge type={item.type} />
    </div>
  );
}

function Section({ title, sectionKey, collapsed, onToggle, children, rightSlot }) {
  return (
    <div className="wr-section">
      <div className="wr-section-header">
        <button className="wr-section-title wr-section-toggle" onClick={() => onToggle(sectionKey)}>
          <span>{collapsed ? "▸" : "▾"}</span>
          <span>{title}</span>
        </button>
        {rightSlot}
      </div>
      {!collapsed && children}
    </div>
  );
}

export default function WeeklyReport() {
  const mon = getMonday();
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);

  const [weekStart, setWeekStart] = useState(fmt(mon));
  const [weekEnd, setWeekEnd] = useState(fmt(fri));
  const [state, setState] = useState(initialState);
  const [nextId, setNextId] = useState(100);
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);

  const [view, setView] = useState("weekly");
  const [reportType, setReportType] = useState("operations");
  const [selectedDay, setSelectedDay] = useState("Mon");
  const [collapsed, setCollapsed] = useState({
    done: false,
    planned: false,
    articles: false,
    videos: false,
    tests: false,
    supports: false,
    blockers: false,
    notes: false,
  });

  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskType, setNewTaskType] = useState("article");
  const [newTaskDay, setNewTaskDay] = useState("Mon");

  const [newArtTitle, setNewArtTitle] = useState("");
  const [newArtCat, setNewArtCat] = useState("Onboarding");
  const [newArtStatus, setNewArtStatus] = useState("s-planned");

  const [newVideoText, setNewVideoText] = useState("");
  const [newVideoDay, setNewVideoDay] = useState("Mon");

  const [newTestText, setNewTestText] = useState("");
  const [newTestDay, setNewTestDay] = useState("Mon");

  const [newBlocker, setNewBlocker] = useState("");

  function toggle(listKey, id) {
    setState((prev) => ({
      ...prev,
      [listKey]: prev[listKey].map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }));
  }

  function toggleSection(key) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function prevWeek() {
    setWeekStart((s) => shiftDateString(s, -7));
    setWeekEnd((e) => shiftDateString(e, -7));
  }

  function nextWeek() {
    setWeekStart((s) => shiftDateString(s, 7));
    setWeekEnd((e) => shiftDateString(e, 7));
  }

  function addTask() {
    if (!newTaskText.trim()) return;
    setState((prev) => ({
      ...prev,
      plannedTasks: [
        ...prev.plannedTasks,
        {
          id: nextId,
          text: newTaskText.trim(),
          type: newTaskType,
          done: false,
          day: newTaskDay,
        },
      ],
    }));
    setNextId((n) => n + 1);
    setNewTaskText("");
    setNewTaskType("article");
    setNewTaskDay("Mon");
  }

  function addArticle() {
    if (!newArtTitle.trim()) return;
    setState((prev) => ({
      ...prev,
      articles: [
        ...prev.articles,
        { title: newArtTitle.trim(), cat: newArtCat, status: newArtStatus },
      ],
    }));
    setNewArtTitle("");
  }

  function addVideo() {
    if (!newVideoText.trim()) return;
    setState((prev) => ({
      ...prev,
      videos: [
        ...prev.videos,
        {
          id: nextId,
          text: newVideoText.trim(),
          type: "video",
          done: false,
          day: newVideoDay,
        },
      ],
    }));
    setNextId((n) => n + 1);
    setNewVideoText("");
    setNewVideoDay("Mon");
  }

  function addTest() {
    if (!newTestText.trim()) return;
    setState((prev) => ({
      ...prev,
      tests: [
        ...prev.tests,
        {
          id: nextId,
          text: newTestText.trim(),
          type: "test",
          done: false,
          day: newTestDay,
        },
      ],
    }));
    setNextId((n) => n + 1);
    setNewTestText("");
    setNewTestDay("Mon");
  }

  function addBlocker() {
    if (!newBlocker.trim()) return;
    setState((prev) => ({
      ...prev,
      blockers: [...prev.blockers, { id: nextId, text: newBlocker.trim() }],
    }));
    setNextId((n) => n + 1);
    setNewBlocker("");
  }

  function cycleStatus(index) {
    const order = ["s-planned", "s-draft", "s-review", "s-done"];
    setState((prev) => {
      const updated = [...prev.articles];
      const current = updated[index].status;
      const currentIndex = order.indexOf(current);
      updated[index] = {
        ...updated[index],
        status: order[(currentIndex + 1) % order.length],
      };
      return { ...prev, articles: updated };
    });
  }

  function copyReport() {
    const lines = [];
    lines.push(`REPORTE ${view === "weekly" ? "SEMANAL" : "DIARIO"} — ROUTEMIZE`);
    lines.push(`Tipo: ${reportTypeLabels[reportType]}`);
    lines.push(`Periodo: ${weekStart} al ${weekEnd}`);
    if (view === "daily") lines.push(`Día seleccionado: ${selectedDay}`);
    lines.push("");

    lines.push("BLOCKERS / RISKS:");
    if (state.blockers.length) {
      state.blockers.forEach((b) => lines.push(`  • ${b.text}`));
    } else {
      lines.push("  (sin blockers)");
    }

    lines.push("\nACTIVIDADES COMPLETADAS:");
    state.doneTasks
      .filter((t) => (view === "daily" ? t.day === selectedDay : true))
      .forEach((t) => lines.push(`  [x] ${t.text}`));

    lines.push("\nACTIVIDADES PLANIFICADAS:");
    state.plannedTasks
      .filter((t) => (view === "daily" ? t.day === selectedDay : true))
      .forEach((t) => lines.push(`  [ ] ${t.text}`));

    lines.push("\nARTÍCULOS:");
    state.articles.forEach((a) =>
      lines.push(`  · ${a.title} — ${a.cat} — ${statusLabels[a.status]}`)
    );

    lines.push("\nVIDEOS:");
    state.videos
      .filter((t) => (view === "daily" ? t.day === selectedDay : true))
      .forEach((t) => lines.push(`  ${t.done ? "[x]" : "[ ]"} ${t.text}`));

    lines.push("\nTESTING:");
    state.tests
      .filter((t) => (view === "daily" ? t.day === selectedDay : true))
      .forEach((t) => lines.push(`  ${t.done ? "[x]" : "[ ]"} ${t.text}`));

    lines.push("\nSOPORTE:");
    state.supports
      .filter((t) => (view === "daily" ? t.day === selectedDay : true))
      .forEach((t) => lines.push(`  ${t.done ? "[x]" : "[ ]"} ${t.text}`));

    lines.push("\nNOTAS:");
    lines.push(notes || "(sin notas)");

    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const dailyData = useMemo(() => {
    const buckets = JSON.parse(JSON.stringify(dailyBucketsTemplate));

    const register = (label, items) => {
      items.forEach((item) => {
        const key = item.day || "Mon";
        if (!buckets[key]) buckets[key] = [];
        buckets[key].push({ ...item, section: label });
      });
    };

    register("Completed", state.doneTasks);
    register("Planned", state.plannedTasks);
    register("Videos", state.videos);
    register("Testing", state.tests);
    register("Support", state.supports);

    return buckets;
  }, [state]);

  const artDone = state.articles.filter((a) => a.status === "s-done").length;
  const vidDone = state.videos.filter((v) => v.done).length;
  const testDone = state.tests.filter((t) => t.done).length;
  const supportDone = state.supports.filter((s) => s.done).length;
  const totalDone = [...state.doneTasks, ...state.videos, ...state.tests, ...state.supports].filter(
    (t) => t.done
  ).length;

  const stats = [
    { label: "Artículos publicados", value: artDone, sub: `de ${state.articles.length} totales` },
    { label: "Videos grabados", value: vidDone, sub: `de ${state.videos.length} planeados` },
    { label: "Pruebas completadas", value: testDone, sub: `de ${state.tests.length} programadas` },
    { label: "Tickets de soporte", value: supportDone, sub: "resueltos esta semana" },
  ];

  const showDone = reportType === "operations" || reportType === "support";
  const showPlanned = reportType === "operations" || reportType === "content" || reportType === "testing";
  const showArticles = reportType === "operations" || reportType === "content";
  const showVideos = reportType === "operations" || reportType === "content";
  const showTests = reportType === "operations" || reportType === "testing";
  const showSupports = reportType === "operations" || reportType === "support";

  return (
    <>
      <style>{`
        .wr-root {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: var(--wr-bg, #ffffff);
          color: var(--wr-text, #1a1a18);
          padding: 2rem;
          max-width: 920px;
          margin: 0 auto;
        }
        @media (prefers-color-scheme: dark) {
          .wr-root {
            --wr-bg: #1c1c1a;
            --wr-bg2: #262622;
            --wr-bg3: #2f2f2b;
            --wr-text: #e8e6df;
            --wr-text2: #a8a69f;
            --wr-text3: #6e6d69;
            --wr-border: rgba(255,255,255,0.1);
            --wr-border2: rgba(255,255,255,0.18);
            --wr-border3: rgba(255,255,255,0.28);
            --wr-accent-light: #0a3d2b;
            --wr-accent-dark: #5DCAA5;
          }
        }
        .wr-root {
          --wr-bg: #ffffff;
          --wr-bg2: #f4f3ef;
          --wr-bg3: #ece9e1;
          --wr-text: #1a1a18;
          --wr-text2: #5f5e5a;
          --wr-text3: #888780;
          --wr-border: rgba(0,0,0,0.12);
          --wr-border2: rgba(0,0,0,0.22);
          --wr-border3: rgba(0,0,0,0.32);
          --wr-accent: #1D9E75;
          --wr-accent-light: #E1F5EE;
          --wr-accent-dark: #0F6E56;
          --wr-danger-bg: #FCEBEB;
          --wr-danger-text: #791F1F;
        }
        .wr-header {
          border-left: 3px solid var(--wr-accent);
          padding-left: 1rem;
          margin-bottom: 1.5rem;
        }
        .wr-header h1 {
          font-size: 20px;
          font-weight: 600;
          color: var(--wr-text);
          margin: 0;
        }
        .wr-header .meta {
          font-size: 13px;
          color: var(--wr-text2);
          margin-top: 4px;
        }
        .wr-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        .wr-toolbar-left, .wr-toolbar-right {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .wr-week-selector {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .wr-week-selector label, .wr-inline-label {
          font-size: 13px;
          color: var(--wr-text2);
        }
        .wr-week-selector input, .wr-select, .wr-input {
          font-size: 13px;
          padding: 7px 10px;
          border: 0.5px solid var(--wr-border);
          border-radius: 8px;
          background: var(--wr-bg);
          color: var(--wr-text);
        }
        .wr-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
          margin-bottom: 1.5rem;
        }
        .wr-stat-card {
          background: var(--wr-bg2);
          border-radius: 10px;
          padding: 0.95rem 1rem;
        }
        .wr-stat-card .label {
          font-size: 12px;
          color: var(--wr-text2);
          margin-bottom: 4px;
        }
        .wr-stat-card .value {
          font-size: 22px;
          font-weight: 600;
          color: var(--wr-text);
        }
        .wr-stat-card .sub {
          font-size: 11px;
          color: var(--wr-text3);
          margin-top: 2px;
        }
        .wr-section {
          margin-bottom: 1.8rem;
        }
        .wr-section-header {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        .wr-section-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--wr-text2);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding-bottom: 6px;
          border-bottom: 0.5px solid var(--wr-border);
          width: 100%;
        }
        .wr-section-toggle {
          background: transparent;
          border: none;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 0;
        }
        .task-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .task-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 0.75rem 1rem;
          background: var(--wr-bg);
          border: 0.5px solid var(--wr-border);
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .task-item:hover {
          background: var(--wr-bg2);
        }
        .task-item.done {
          opacity: 0.58;
        }
        .task-item.done .task-text {
          text-decoration: line-through;
          color: var(--wr-text2);
        }
        .checkbox {
          width: 16px;
          height: 16px;
          border: 1.5px solid var(--wr-border3);
          border-radius: 4px;
          flex-shrink: 0;
          margin-top: 1px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .checkbox.checked {
          background: var(--wr-accent);
          border-color: var(--wr-accent);
        }
        .task-text {
          font-size: 14px;
          color: var(--wr-text);
          flex: 1;
          line-height: 1.4;
        }
        .task-badge {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 20px;
          flex-shrink: 0;
          font-weight: 600;
        }
        .badge-article { background: #E1F5EE; color: #0F6E56; }
        .badge-video   { background: #EEEDFE; color: #3C3489; }
        .badge-test    { background: #FAEEDA; color: #633806; }
        .badge-support { background: #E6F1FB; color: #0C447C; }
        .badge-deploy  { background: #FCEBEB; color: #791F1F; }

        .wr-articles-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          margin-bottom: 10px;
        }
        .wr-articles-table th {
          text-align: left;
          padding: 8px 10px;
          color: var(--wr-text2);
          border-bottom: 0.5px solid var(--wr-border);
          font-weight: 600;
        }
        .wr-articles-table td {
          padding: 8px 10px;
          border-bottom: 0.5px solid var(--wr-border);
          color: var(--wr-text);
        }
        .wr-articles-table tr:last-child td {
          border-bottom: none;
        }
        .status-pill {
          display: inline-block;
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 20px;
          font-weight: 600;
        }
        .status-clickable {
          cursor: pointer;
          user-select: none;
        }
        .s-draft   { background: #F1EFE8; color: #5F5E5A; }
        .s-review  { background: #FAEEDA; color: #633806; }
        .s-done    { background: #EAF3DE; color: #3B6D11; }
        .s-planned { background: #E6F1FB; color: #185FA5; }

        .wr-add-row {
          display: flex;
          gap: 8px;
          margin-top: 10px;
          flex-wrap: wrap;
        }
        .wr-add-row input, .wr-add-row select {
          font-size: 13px;
          padding: 7px 10px;
          border: 0.5px solid var(--wr-border);
          border-radius: 8px;
          background: var(--wr-bg);
          color: var(--wr-text);
          flex: 1;
          min-width: 120px;
        }
        .wr-btn {
          font-size: 13px;
          padding: 7px 14px;
          border: 0.5px solid var(--wr-border2);
          border-radius: 8px;
          background: var(--wr-bg);
          color: var(--wr-text);
          cursor: pointer;
          white-space: nowrap;
        }
        .wr-btn:hover {
          background: var(--wr-bg2);
        }
        .wr-btn-primary {
          background: var(--wr-accent-light);
          color: var(--wr-accent-dark);
          border-color: var(--wr-accent);
        }
        .wr-btn-primary:hover {
          opacity: 0.9;
        }
        .wr-btn-active {
          background: var(--wr-bg3);
          border-color: var(--wr-border3);
          font-weight: 600;
        }
        .wr-notes {
          width: 100%;
          min-height: 90px;
          font-size: 14px;
          padding: 10px 12px;
          border: 0.5px solid var(--wr-border);
          border-radius: 8px;
          background: var(--wr-bg);
          color: var(--wr-text);
          resize: vertical;
          font-family: inherit;
          line-height: 1.5;
        }
        .wr-export-bar {
          display: flex;
          gap: 8px;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 0.5px solid var(--wr-border);
          flex-wrap: wrap;
          align-items: center;
        }
        .wr-export-bar span {
          font-size: 13px;
          color: var(--wr-text2);
          flex: 1;
        }
        .wr-blocker-item {
          background: var(--wr-danger-bg);
          color: var(--wr-danger-text);
          border: 0.5px solid rgba(121,31,31,0.18);
          border-radius: 8px;
          padding: 0.75rem 1rem;
          font-size: 13px;
          margin-bottom: 8px;
        }
        .wr-daily-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }
        .wr-daily-panel {
          background: var(--wr-bg2);
          border-radius: 10px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .wr-daily-section-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--wr-text3);
          margin-bottom: 6px;
          font-weight: 700;
        }
      `}</style>

      <div className="wr-root">
        <div className="wr-header">
          <h1>Reporte operativo — Customer Success Lead</h1>
          <div className="meta">
            Routemize · {formatHeaderRange(weekStart, weekEnd)}
          </div>
        </div>

        <div className="wr-toolbar">
          <div className="wr-toolbar-left">
            <button className={`wr-btn ${view === "weekly" ? "wr-btn-active" : ""}`} onClick={() => setView("weekly")}>
              Weekly View
            </button>
            <button className={`wr-btn ${view === "daily" ? "wr-btn-active" : ""}`} onClick={() => setView("daily")}>
              Daily View
            </button>
          </div>

          <div className="wr-toolbar-right">
            <span className="wr-inline-label">Report type</span>
            <select className="wr-select" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="operations">Operations</option>
              <option value="content">Content</option>
              <option value="testing">Testing</option>
              <option value="support">Support Feedback</option>
            </select>
          </div>
        </div>

        <div className="wr-week-selector">
          <button className="wr-btn" onClick={prevWeek}>← Previous week</button>
          <label>From</label>
          <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
          <label>to</label>
          <input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} />
          <button className="wr-btn" onClick={nextWeek}>Next week →</button>
        </div>

        <div className="wr-stats-grid">
          {stats.map((s) => (
            <div className="wr-stat-card" key={s.label}>
              <div className="label">{s.label}</div>
              <div className="value">{s.value}</div>
              <div className="sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {view === "daily" && (
          <>
            <div className="wr-daily-tabs">
              {Object.keys(dailyBucketsTemplate).map((day) => (
                <button
                  key={day}
                  className={`wr-btn ${selectedDay === day ? "wr-btn-active" : ""}`}
                  onClick={() => setSelectedDay(day)}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className="wr-daily-panel">
              <div className="wr-section-title" style={{ marginBottom: 12 }}>
                Daily breakdown — {selectedDay}
              </div>

              {dailyData[selectedDay].length === 0 ? (
                <div className="wr-inline-label">No items for this day.</div>
              ) : (
                <div className="task-list">
                  {dailyData[selectedDay].map((item) => (
                    <div key={`${item.section}-${item.id}`} className={`task-item ${item.done ? "done" : ""}`}>
                      {"done" in item ? <Checkbox checked={item.done} /> : <div className="checkbox" />}
                      <div style={{ flex: 1 }}>
                        <div className="wr-daily-section-label">{item.section}</div>
                        <div className="task-text">{item.text}</div>
                      </div>
                      <Badge type={item.type} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <Section
          title="Blockers / Risks"
          sectionKey="blockers"
          collapsed={collapsed.blockers}
          onToggle={toggleSection}
        >
          {state.blockers.length ? (
            state.blockers.map((b) => (
              <div className="wr-blocker-item" key={b.id}>
                {b.text}
              </div>
            ))
          ) : (
            <div className="wr-inline-label" style={{ marginBottom: 8 }}>No blockers registered.</div>
          )}

          <div className="wr-add-row">
            <input
              type="text"
              placeholder="Nuevo blocker o riesgo..."
              value={newBlocker}
              onChange={(e) => setNewBlocker(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addBlocker()}
            />
            <button className="wr-btn" onClick={addBlocker}>+ Blocker</button>
          </div>
        </Section>

        {showDone && (
          <Section
            title="Actividades de la semana pasada"
            sectionKey="done"
            collapsed={collapsed.done}
            onToggle={toggleSection}
          >
            <div className="task-list">
              {state.doneTasks
                .filter((t) => (view === "daily" ? t.day === selectedDay : true))
                .map((t) => (
                  <TaskItem key={t.id} item={t} onToggle={() => toggle("doneTasks", t.id)} />
                ))}
            </div>
          </Section>
        )}

        {showPlanned && (
          <Section
            title="Actividades planificadas"
            sectionKey="planned"
            collapsed={collapsed.planned}
            onToggle={toggleSection}
          >
            <div className="task-list">
              {state.plannedTasks
                .filter((t) => (view === "daily" ? t.day === selectedDay : true))
                .map((t) => (
                  <TaskItem key={t.id} item={t} onToggle={() => toggle("plannedTasks", t.id)} />
                ))}
            </div>

            <div className="wr-add-row" style={{ marginTop: 12 }}>
              <input
                type="text"
                placeholder="Nueva actividad..."
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
              />
              <select value={newTaskType} onChange={(e) => setNewTaskType(e.target.value)}>
                <option value="article">Artículo</option>
                <option value="video">Video</option>
                <option value="test">Testing</option>
                <option value="support">Soporte</option>
                <option value="deploy">Deploy</option>
              </select>
              <select value={newTaskDay} onChange={(e) => setNewTaskDay(e.target.value)}>
                <option value="Mon">Mon</option>
                <option value="Tue">Tue</option>
                <option value="Wed">Wed</option>
                <option value="Thu">Thu</option>
                <option value="Fri">Fri</option>
              </select>
              <button className="wr-btn wr-btn-primary" onClick={addTask}>+ Agregar</button>
            </div>
          </Section>
        )}

        {showArticles && (
          <Section
            title="Artículos para base de conocimiento"
            sectionKey="articles"
            collapsed={collapsed.articles}
            onToggle={toggleSection}
            rightSlot={<div className="wr-inline-label">click status to change</div>}
          >
            <table className="wr-articles-table">
              <thead>
                <tr>
                  <th>Artículo</th>
                  <th>Categoría</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {state.articles.map((a, i) => (
                  <tr key={`${a.title}-${i}`}>
                    <td>{a.title}</td>
                    <td style={{ color: "var(--wr-text2)" }}>{a.cat}</td>
                    <td>
                      <span
                        className={`status-pill status-clickable ${a.status}`}
                        onClick={() => cycleStatus(i)}
                        title="Click to change status"
                      >
                        {statusLabels[a.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="wr-add-row">
              <input
                type="text"
                placeholder="Título del artículo..."
                value={newArtTitle}
                onChange={(e) => setNewArtTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addArticle()}
              />
              <select value={newArtCat} onChange={(e) => setNewArtCat(e.target.value)}>
                {["Onboarding", "Scheduling", "Rutas", "Facturación", "Integraciones", "FAQ"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select value={newArtStatus} onChange={(e) => setNewArtStatus(e.target.value)}>
                <option value="s-planned">Planeado</option>
                <option value="s-draft">Borrador</option>
                <option value="s-review">En revisión</option>
                <option value="s-done">Publicado</option>
              </select>
              <button className="wr-btn" onClick={addArticle}>+ Artículo</button>
            </div>
          </Section>
        )}

        {showVideos && (
          <Section
            title="Videos de onboarding / capacitación"
            sectionKey="videos"
            collapsed={collapsed.videos}
            onToggle={toggleSection}
          >
            <div className="task-list">
              {state.videos
                .filter((t) => (view === "daily" ? t.day === selectedDay : true))
                .map((t) => (
                  <TaskItem key={t.id} item={t} onToggle={() => toggle("videos", t.id)} />
                ))}
            </div>

            <div className="wr-add-row">
              <input
                type="text"
                placeholder="Nuevo video..."
                value={newVideoText}
                onChange={(e) => setNewVideoText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addVideo()}
              />
              <select value={newVideoDay} onChange={(e) => setNewVideoDay(e.target.value)}>
                <option value="Mon">Mon</option>
                <option value="Tue">Tue</option>
                <option value="Wed">Wed</option>
                <option value="Thu">Thu</option>
                <option value="Fri">Fri</option>
              </select>
              <button className="wr-btn" onClick={addVideo}>+ Video</button>
            </div>
          </Section>
        )}

        {showTests && (
          <Section
            title="Pruebas de testing del agente"
            sectionKey="tests"
            collapsed={collapsed.tests}
            onToggle={toggleSection}
          >
            <div className="task-list">
              {state.tests
                .filter((t) => (view === "daily" ? t.day === selectedDay : true))
                .map((t) => (
                  <TaskItem key={t.id} item={t} onToggle={() => toggle("tests", t.id)} />
                ))}
            </div>

            <div className="wr-add-row">
              <input
                type="text"
                placeholder="Nueva prueba..."
                value={newTestText}
                onChange={(e) => setNewTestText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTest()}
              />
              <select value={newTestDay} onChange={(e) => setNewTestDay(e.target.value)}>
                <option value="Mon">Mon</option>
                <option value="Tue">Tue</option>
                <option value="Wed">Wed</option>
                <option value="Thu">Thu</option>
                <option value="Fri">Fri</option>
              </select>
              <button className="wr-btn" onClick={addTest}>+ Test</button>
            </div>
          </Section>
        )}

        {showSupports && (
          <Section
            title="Soporte a usuarios beta"
            sectionKey="supports"
            collapsed={collapsed.supports}
            onToggle={toggleSection}
          >
            <div className="task-list">
              {state.supports
                .filter((t) => (view === "daily" ? t.day === selectedDay : true))
                .map((t) => (
                  <TaskItem key={t.id} item={t} onToggle={() => toggle("supports", t.id)} />
                ))}
            </div>
          </Section>
        )}

        <Section
          title="Notas y observaciones para el equipo"
          sectionKey="notes"
          collapsed={collapsed.notes}
          onToggle={toggleSection}
        >
          <textarea
            className="wr-notes"
            placeholder="Comentarios, blockers, feedback de usuarios, ideas para el producto..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Section>

        <div className="wr-export-bar">
          <span>
            {totalDone} tareas completadas · {state.articles.length} artículos · {testDone}/{state.tests.length} pruebas
          </span>
          <button className="wr-btn" onClick={copyReport}>
            {copied ? "¡Copiado!" : "Copiar reporte"}
          </button>
        </div>
      </div>
    </>
  );
}