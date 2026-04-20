import { useState, useEffect } from "react";

const typeMap = {
  article: { label: "Artículo", cls: "badge-article" },
  video:   { label: "Video",    cls: "badge-video"   },
  test:    { label: "Testing",  cls: "badge-test"    },
  support: { label: "Soporte",  cls: "badge-support" },
  deploy:  { label: "Deploy",   cls: "badge-deploy"  },
};

const statusLabels = {
  "s-draft":   "Borrador",
  "s-review":  "En revisión",
  "s-done":    "Publicado",
  "s-planned": "Planeado",
};

const initialState = {
  doneTasks: [
    { id: 1,  text: "Redacté artículo: cómo configurar zonas de servicio",      type: "article", done: true },
    { id: 2,  text: "Grabé video introductorio: tour del dashboard",            type: "video",   done: true },
    { id: 3,  text: "Respondí 12 consultas de usuarios beta",                   type: "support", done: true },
    { id: 4,  text: "Ejecuté prueba de flujo de agendamiento end-to-end",       type: "test",    done: true },
    { id: 5,  text: "Deploy de actualización en entorno de staging",            type: "deploy",  done: true },
  ],
  plannedTasks: [
    { id: 10, text: "Artículo: optimización de rutas por tipo de trabajo",      type: "article", done: false },
    { id: 11, text: "Video: cómo agregar técnicos al equipo",                   type: "video",   done: false },
    { id: 12, text: "Testing: respuestas del agente a preguntas de facturación",type: "test",    done: false },
    { id: 13, text: "Sesión de onboarding con 2 nuevos clientes",               type: "support", done: false },
    { id: 14, text: "Revisión de FAQs con feedback de usuarios beta",           type: "article", done: false },
  ],
  articles: [
    { title: "Configurar zonas de servicio",           cat: "Onboarding",    status: "s-done"    },
    { title: "Agregar y gestionar técnicos",           cat: "Onboarding",    status: "s-review"  },
    { title: "Optimización de rutas automática",       cat: "Rutas",         status: "s-draft"   },
    { title: "Cómo usar el calendario de agendamiento",cat: "Scheduling",    status: "s-draft"   },
    { title: "Conectar con QuickBooks",                cat: "Integraciones", status: "s-planned" },
    { title: "Preguntas frecuentes del agente de chat",cat: "FAQ",           status: "s-planned" },
  ],
  videos: [
    { id: 20, text: "Tour del dashboard — introducción general (grabado)",         type: "video", done: true  },
    { id: 21, text: "Cómo crear tu primer job en Routemize",                       type: "video", done: false },
    { id: 22, text: "Configurar notificaciones automáticas al cliente",            type: "video", done: false },
    { id: 23, text: "Walkthrough: agendamiento con múltiples técnicos",            type: "video", done: false },
  ],
  tests: [
    { id: 30, text: "Prueba: flujo completo de agendamiento (inicio → confirmación)", type: "test", done: true  },
    { id: 31, text: "Prueba: respuestas del agente a preguntas fuera de contexto",    type: "test", done: false },
    { id: 32, text: "Prueba: escalamiento correcto a soporte humano",                 type: "test", done: false },
    { id: 33, text: "Prueba: artículos vinculados correctamente en respuestas",       type: "test", done: false },
    { id: 34, text: "Prueba de regresión tras último deploy",                         type: "test", done: false },
  ],
  supports: [
    { id: 40, text: "Atendí consultas de usuarios beta vía live chat (semana pasada)", type: "support", done: true  },
    { id: 41, text: "Documenté 5 preguntas recurrentes para convertir en artículos",   type: "support", done: true  },
    { id: 42, text: "Sesión de onboarding programada para nuevos contratistas",        type: "support", done: false },
    { id: 43, text: "Recolectar feedback estructurado de usuarios beta activos",       type: "support", done: false },
  ],
};

function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function fmt(d) {
  return d.toISOString().split("T")[0];
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
    <div
      className={`task-item ${item.done ? "done" : ""}`}
      onClick={onToggle}
    >
      <Checkbox checked={item.done} />
      <span className="task-text">{item.text}</span>
      <Badge type={item.type} />
    </div>
  );
}

export default function WeeklyReport() {
  const mon = getMonday();
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);

  const [weekStart, setWeekStart] = useState(fmt(mon));
  const [weekEnd,   setWeekEnd]   = useState(fmt(fri));
  const [state, setState]         = useState(initialState);
  const [nextId, setNextId]       = useState(100);
  const [notes, setNotes]         = useState("");

  const [newTaskText, setNewTaskText]   = useState("");
  const [newTaskType, setNewTaskType]   = useState("article");
  const [newArtTitle, setNewArtTitle]   = useState("");
  const [newArtCat,   setNewArtCat]     = useState("Onboarding");
  const [newArtStatus,setNewArtStatus]  = useState("s-planned");
  const [copied, setCopied]             = useState(false);

  function toggle(listKey, id) {
    setState(prev => ({
      ...prev,
      [listKey]: prev[listKey].map(t => t.id === id ? { ...t, done: !t.done } : t),
    }));
  }

  function addTask() {
    if (!newTaskText.trim()) return;
    setState(prev => ({
      ...prev,
      plannedTasks: [...prev.plannedTasks, { id: nextId, text: newTaskText.trim(), type: newTaskType, done: false }],
    }));
    setNextId(n => n + 1);
    setNewTaskText("");
  }

  function addArticle() {
    if (!newArtTitle.trim()) return;
    setState(prev => ({
      ...prev,
      articles: [...prev.articles, { title: newArtTitle.trim(), cat: newArtCat, status: newArtStatus }],
    }));
    setNewArtTitle("");
  }

  function copyReport() {
    const lines = [];
    lines.push("REPORTE SEMANAL — ROUTEMIZE");
    lines.push(`Semana: ${weekStart} al ${weekEnd}\n`);
    lines.push("ACTIVIDADES COMPLETADAS (semana pasada):");
    state.doneTasks.filter(t => t.done).forEach(t => lines.push(`  [x] ${t.text}`));
    lines.push("\nACTIVIDADES PLANIFICADAS:");
    state.plannedTasks.forEach(t => lines.push(`  [ ] ${t.text}`));
    lines.push("\nARTÍCULOS:");
    state.articles.forEach(a => lines.push(`  · ${a.title} — ${a.cat} — ${statusLabels[a.status]}`));
    lines.push("\nTESTING:");
    state.tests.forEach(t => lines.push(`  ${t.done ? "[x]" : "[ ]"} ${t.text}`));
    lines.push("\nNOTAS:");
    lines.push(notes || "(sin notas)");
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const artDone     = state.articles.filter(a => a.status === "s-done").length;
  const vidDone     = state.videos.filter(v => v.done).length;
  const testDone    = state.tests.filter(t => t.done).length;
  const supportDone = state.supports.filter(s => s.done).length;
  const totalDone   = [...state.doneTasks, ...state.videos, ...state.tests, ...state.supports].filter(t => t.done).length;

  const stats = [
    { label: "Artículos publicados",  value: artDone,     sub: `de ${state.articles.length} totales`      },
    { label: "Videos grabados",       value: vidDone,     sub: `de ${state.videos.length} planeados`      },
    { label: "Pruebas completadas",   value: testDone,    sub: `de ${state.tests.length} programadas`     },
    { label: "Tickets de soporte",    value: supportDone, sub: "resueltos esta semana"                    },
  ];

  return (
    <>
      <style>{`
        .wr-root {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: var(--wr-bg, #ffffff);
          color: var(--wr-text, #1a1a18);
          padding: 2rem;
          max-width: 760px;
          margin: 0 auto;
        }
        @media (prefers-color-scheme: dark) {
          .wr-root {
            --wr-bg: #1c1c1a;
            --wr-bg2: #262622;
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
          --wr-text: #1a1a18;
          --wr-text2: #5f5e5a;
          --wr-text3: #888780;
          --wr-border: rgba(0,0,0,0.12);
          --wr-border2: rgba(0,0,0,0.22);
          --wr-border3: rgba(0,0,0,0.32);
          --wr-accent: #1D9E75;
          --wr-accent-light: #E1F5EE;
          --wr-accent-dark: #0F6E56;
        }
        .wr-header { border-left: 3px solid var(--wr-accent); padding-left: 1rem; margin-bottom: 2rem; }
        .wr-header h1 { font-size: 20px; font-weight: 500; color: var(--wr-text); margin: 0; }
        .wr-header .meta { font-size: 13px; color: var(--wr-text2); margin-top: 4px; }
        .wr-week-selector { display: flex; gap: 8px; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; }
        .wr-week-selector label { font-size: 13px; color: var(--wr-text2); }
        .wr-week-selector input { font-size: 13px; padding: 6px 10px; border: 0.5px solid var(--wr-border); border-radius: 8px; background: var(--wr-bg); color: var(--wr-text); }
        .wr-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 1.5rem; }
        .wr-stat-card { background: var(--wr-bg2); border-radius: 8px; padding: 0.85rem 1rem; }
        .wr-stat-card .label { font-size: 12px; color: var(--wr-text2); margin-bottom: 4px; }
        .wr-stat-card .value { font-size: 22px; font-weight: 500; color: var(--wr-text); }
        .wr-stat-card .sub { font-size: 11px; color: var(--wr-text3); margin-top: 2px; }
        .wr-section { margin-bottom: 2rem; }
        .wr-section-title { font-size: 13px; font-weight: 500; color: var(--wr-text2); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.75rem; padding-bottom: 6px; border-bottom: 0.5px solid var(--wr-border); }
        .task-list { display: flex; flex-direction: column; gap: 6px; }
        .task-item { display: flex; align-items: flex-start; gap: 10px; padding: 0.75rem 1rem; background: var(--wr-bg); border: 0.5px solid var(--wr-border); border-radius: 8px; cursor: pointer; transition: background 0.15s; }
        .task-item:hover { background: var(--wr-bg2); }
        .task-item.done { opacity: 0.55; }
        .task-item.done .task-text { text-decoration: line-through; color: var(--wr-text2); }
        .checkbox { width: 16px; height: 16px; border: 1.5px solid var(--wr-border3); border-radius: 4px; flex-shrink: 0; margin-top: 1px; display: flex; align-items: center; justify-content: center; }
        .checkbox.checked { background: var(--wr-accent); border-color: var(--wr-accent); }
        .task-text { font-size: 14px; color: var(--wr-text); flex: 1; line-height: 1.4; }
        .task-badge { font-size: 11px; padding: 2px 8px; border-radius: 20px; flex-shrink: 0; font-weight: 500; }
        .badge-article { background: #E1F5EE; color: #0F6E56; }
        .badge-video   { background: #EEEDFE; color: #3C3489; }
        .badge-test    { background: #FAEEDA; color: #633806; }
        .badge-support { background: #E6F1FB; color: #0C447C; }
        .badge-deploy  { background: #FCEBEB; color: #791F1F; }
        .wr-articles-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .wr-articles-table th { text-align: left; padding: 8px 10px; color: var(--wr-text2); border-bottom: 0.5px solid var(--wr-border); font-weight: 500; }
        .wr-articles-table td { padding: 8px 10px; border-bottom: 0.5px solid var(--wr-border); color: var(--wr-text); }
        .wr-articles-table tr:last-child td { border-bottom: none; }
        .status-pill { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 20px; font-weight: 500; }
        .s-draft   { background: #F1EFE8; color: #5F5E5A; }
        .s-review  { background: #FAEEDA; color: #633806; }
        .s-done    { background: #EAF3DE; color: #3B6D11; }
        .s-planned { background: #E6F1FB; color: #185FA5; }
        .wr-add-row { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
        .wr-add-row input, .wr-add-row select { font-size: 13px; padding: 6px 10px; border: 0.5px solid var(--wr-border); border-radius: 8px; background: var(--wr-bg); color: var(--wr-text); flex: 1; min-width: 100px; }
        .wr-btn { font-size: 13px; padding: 6px 14px; border: 0.5px solid var(--wr-border2); border-radius: 8px; background: var(--wr-bg); color: var(--wr-text); cursor: pointer; white-space: nowrap; }
        .wr-btn:hover { background: var(--wr-bg2); }
        .wr-btn-primary { background: var(--wr-accent-light); color: var(--wr-accent-dark); border-color: var(--wr-accent); }
        .wr-btn-primary:hover { opacity: 0.85; }
        .wr-notes { width: 100%; min-height: 80px; font-size: 14px; padding: 10px 12px; border: 0.5px solid var(--wr-border); border-radius: 8px; background: var(--wr-bg); color: var(--wr-text); resize: vertical; font-family: inherit; line-height: 1.5; }
        .wr-export-bar { display: flex; gap: 8px; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 0.5px solid var(--wr-border); flex-wrap: wrap; align-items: center; }
        .wr-export-bar span { font-size: 13px; color: var(--wr-text2); flex: 1; }
      `}</style>

      <div className="wr-root">
        <div className="wr-header">
          <h1>Reporte semanal — Customer success lead</h1>
          <div className="meta">Routemize · {weekStart} al {weekEnd}</div>
        </div>

        <div className="wr-week-selector">
          <label>Semana del</label>
          <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} />
          <label>al</label>
          <input type="date" value={weekEnd} onChange={e => setWeekEnd(e.target.value)} />
        </div>

        <div className="wr-stats-grid">
          {stats.map(s => (
            <div className="wr-stat-card" key={s.label}>
              <div className="label">{s.label}</div>
              <div className="value">{s.value}</div>
              <div className="sub">{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="wr-section">
          <div className="wr-section-title">Actividades de la semana pasada</div>
          <div className="task-list">
            {state.doneTasks.map(t => (
              <TaskItem key={t.id} item={t} onToggle={() => toggle("doneTasks", t.id)} />
            ))}
          </div>
        </div>

        <div className="wr-section">
          <div className="wr-section-title">Actividades planificadas esta semana</div>
          <div className="task-list">
            {state.plannedTasks.map(t => (
              <TaskItem key={t.id} item={t} onToggle={() => toggle("plannedTasks", t.id)} />
            ))}
          </div>
          <div className="wr-add-row" style={{ marginTop: 12 }}>
            <input
              type="text"
              placeholder="Nueva actividad..."
              value={newTaskText}
              onChange={e => setNewTaskText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTask()}
            />
            <select value={newTaskType} onChange={e => setNewTaskType(e.target.value)}>
              <option value="article">Artículo</option>
              <option value="video">Video</option>
              <option value="test">Testing</option>
              <option value="support">Soporte</option>
              <option value="deploy">Deploy</option>
            </select>
            <button className="wr-btn wr-btn-primary" onClick={addTask}>+ Agregar</button>
          </div>
        </div>

        <div className="wr-section">
          <div className="wr-section-title">Artículos para base de conocimiento</div>
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
                <tr key={i}>
                  <td>{a.title}</td>
                  <td style={{ color: "var(--wr-text2)" }}>{a.cat}</td>
                  <td><span className={`status-pill ${a.status}`}>{statusLabels[a.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="wr-add-row">
            <input
              type="text"
              placeholder="Título del artículo..."
              value={newArtTitle}
              onChange={e => setNewArtTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addArticle()}
            />
            <select value={newArtCat} onChange={e => setNewArtCat(e.target.value)}>
              {["Onboarding","Scheduling","Rutas","Facturación","Integraciones","FAQ"].map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select value={newArtStatus} onChange={e => setNewArtStatus(e.target.value)}>
              <option value="s-planned">Planeado</option>
              <option value="s-draft">Borrador</option>
              <option value="s-review">En revisión</option>
              <option value="s-done">Publicado</option>
            </select>
            <button className="wr-btn" onClick={addArticle}>+ Artículo</button>
          </div>
        </div>

        <div className="wr-section">
          <div className="wr-section-title">Videos de onboarding / capacitación</div>
          <div className="task-list">
            {state.videos.map(t => (
              <TaskItem key={t.id} item={t} onToggle={() => toggle("videos", t.id)} />
            ))}
          </div>
        </div>

        <div className="wr-section">
          <div className="wr-section-title">Pruebas de testing del agente</div>
          <div className="task-list">
            {state.tests.map(t => (
              <TaskItem key={t.id} item={t} onToggle={() => toggle("tests", t.id)} />
            ))}
          </div>
        </div>

        <div className="wr-section">
          <div className="wr-section-title">Soporte a usuarios beta</div>
          <div className="task-list">
            {state.supports.map(t => (
              <TaskItem key={t.id} item={t} onToggle={() => toggle("supports", t.id)} />
            ))}
          </div>
        </div>

        <div className="wr-section">
          <div className="wr-section-title">Notas y observaciones para el equipo</div>
          <textarea
            className="wr-notes"
            placeholder="Comentarios, blockers, feedback de usuarios, ideas para el producto..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

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