import { useState, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";

// ─── constants ────────────────────────────────────────────────────────────────
const TYPE_MAP = {
  video:   { lbl: "Video",    cls: "b-video"   },
  test:    { lbl: "Testing",  cls: "b-test"    },
  support: { lbl: "Support",  cls: "b-support" },
  deploy:  { lbl: "Deploy",   cls: "b-deploy"  },
};
// "article" type is removed from task backlog — articles live only in KB section
const TASK_TYPES   = ["video", "test", "support", "deploy"];
const TYPE_KEYS    = ["video", "test", "support", "deploy"];
const TYPE_COLORS  = { video: "#7F77DD", test: "#EF9F27", support: "#378ADD", deploy: "#E24B4A" };
const STATUS_LABELS = { "s-draft": "Draft", "s-review": "In review", "s-done": "Published", "s-planned": "Planned" };
const STATUS_ORDER  = ["s-planned", "s-draft", "s-review", "s-done"];
const DAYS          = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const TODAY_DAY     = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()];
const CATS          = ["Onboarding", "Scheduling", "Routes", "Billing", "Integrations", "FAQ"];

// ─── date helpers ─────────────────────────────────────────────────────────────
function getMonday(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return x;
}
function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function parseDate(s) { const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); }
function shiftDate(s, n) { const d=parseDate(s); d.setDate(d.getDate()+n); return fmt(d); }
function fmtRange(s, e) {
  const a=parseDate(s), b=parseDate(e);
  return `${a.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${b.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`;
}
// Returns index 0–4 for Mon–Fri of current week; -1 if weekend
function todayDayIndex() {
  const i = DAYS.indexOf(TODAY_DAY);
  return i; // -1 on weekends
}

// ─── initial state ────────────────────────────────────────────────────────────
const mon0 = getMonday();
const fri0 = new Date(mon0); fri0.setDate(mon0.getDate()+4);

const INITIAL = {
  weekStart: fmt(mon0), weekEnd: fmt(fri0),
  view: "weekly",
  selectedDay: DAYS.includes(TODAY_DAY) ? TODAY_DAY : "Mon",
  notes: "", copied: false,
  collapsed: { done: false, planned: false, articles: false, blockers: false, notes: false },
  nextId: 100,
  blockers: [{ id: 60, text: "Waiting for beta user feedback to prioritize new articles." }],
  articles: [
    { id:"a1", title:"Configure service zones",            cat:"Onboarding",   status:"s-done"    },
    { id:"a2", title:"Add and manage technicians",         cat:"Onboarding",   status:"s-review"  },
    { id:"a3", title:"Automatic route optimization",       cat:"Routes",       status:"s-draft"   },
    { id:"a4", title:"How to use the scheduling calendar", cat:"Scheduling",   status:"s-draft"   },
    { id:"a5", title:"Connect with QuickBooks",            cat:"Integrations", status:"s-planned" },
    { id:"a6", title:"Chat agent FAQ",                     cat:"FAQ",          status:"s-planned" },
  ],
  tasks: [
    { id:2,  text:"Recorded intro video: dashboard tour",          type:"video",   done:true,  assignedDays:["Tue"], description:"", link:"", subtasks:[] },
    { id:3,  text:"Answered 12 beta user queries",                 type:"support", done:true,  assignedDays:["Wed"], description:"", link:"", subtasks:[] },
    { id:4,  text:"Ran end-to-end scheduling flow test",           type:"test",    done:true,  assignedDays:["Thu"], description:"", link:"", subtasks:[] },
    { id:5,  text:"Deployed update to staging environment",        type:"deploy",  done:true,  assignedDays:["Fri"], description:"", link:"", subtasks:[] },
    { id:11, text:"Video: how to add technicians to a team",       type:"video",   done:false, assignedDays:[],      description:"", link:"", subtasks:[] },
    { id:12, text:"Testing: agent responses to billing questions", type:"test",    done:false, assignedDays:[],      description:"", link:"", subtasks:[] },
    { id:13, text:"Onboarding session with 2 new clients",         type:"support", done:false, assignedDays:[],      description:"", link:"", subtasks:[] },
  ],
  newTask:    { text:"", type:"video" },
  newArt:     { title:"", cat:"Onboarding", status:"s-planned" },
  newBlocker: "",
  newSubtask: {},
};

function normalizeTask(task) {
  return {
    ...task,
    assignedDays: task.assignedDays || task.assigned_days || [],
    subtasks: task.subtasks || [],
    description: task.description || "",
    link: task.link || "",
  };
}

// ─── SVG chart ────────────────────────────────────────────────────────────────
function MiniChart({ tasks, articles, view, selectedDay }) {
  const W=700, H=140, PAD={top:12,right:16,bottom:30,left:32};
  const iW=W-PAD.left-PAD.right, iH=H-PAD.top-PAD.bottom;

  // Build counts: tasks done per type per day + articles published per day
  const counts = {};
  DAYS.forEach(d => { counts[d] = { video:0, test:0, support:0, deploy:0, article:0 }; });

  tasks.filter(t=>t.done).forEach(t => {
    (t.assignedDays||[]).forEach(d => { if (counts[d] && counts[d][t.type]!==undefined) counts[d][t.type]++; });
  });
  // articles marked s-done count as "article" completions on whichever days they have tasks
  articles.filter(a=>a.status==="s-done").forEach(a => {
    const related = tasks.filter(t=>t.text===`Published: ${a.title}` && t.done);
    related.forEach(t => { (t.assignedDays||[]).forEach(d => { if(counts[d]) counts[d].article = (counts[d].article||0)+1; }); });
  });

  const allKeys = [...TYPE_KEYS, "article"];
  const allColors = { ...TYPE_COLORS, article:"#1D9E75" };

  // For daily view, highlight the selected day column
  const hlIdx = view==="daily" ? DAYS.indexOf(selectedDay) : -1;

  const maxVal = Math.max(1, ...allKeys.flatMap(k => DAYS.map(d => counts[d][k]||0)));
  const xStep  = iW / (DAYS.length-1);
  const xOf = i => PAD.left + i*xStep;
  const yOf = v => PAD.top + iH - (v/maxVal)*iH;

  function smoothPath(pts) {
    if (!pts.length) return "";
    let d=`M ${pts[0][0]} ${pts[0][1]}`;
    for(let i=0;i<pts.length-1;i++){
      const [x0,y0]=pts[i],[x1,y1]=pts[i+1],cpx=(x0+x1)/2;
      d+=` C ${cpx} ${y0} ${cpx} ${y1} ${x1} ${y1}`;
    }
    return d;
  }

  const yTicks=[0,Math.ceil(maxVal/2),maxVal];

  // Summary totals for the chart footer
  const totalDone  = tasks.filter(t=>t.done).length;
  const artDone    = articles.filter(a=>a.status==="s-done").length;
  const dayDone    = view==="daily" ? tasks.filter(t=>t.done && (t.assignedDays||[]).includes(selectedDay)).length : null;

  return (
    <div style={{background:"var(--color-background-secondary)",borderRadius:10,padding:"10px 14px 10px",marginBottom:12}}>
      <div style={{display:"flex",flexWrap:"wrap",gap:"6px 14px",marginBottom:6}}>
        {[...allKeys].map(k=>(
          <span key={k} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--color-text-secondary)"}}>
            <span style={{display:"inline-block",width:14,height:2,borderRadius:1,background:allColors[k]}}/>
            {k==="article"?"Article (KB)":TYPE_MAP[k]?.lbl}
          </span>
        ))}
        <span style={{marginLeft:"auto",fontSize:11,color:"var(--color-text-secondary)"}}>
          {view==="daily"
            ? <><strong style={{color:"var(--color-text-primary)"}}>{dayDone}</strong> done {selectedDay} · <strong style={{color:"var(--color-text-primary)"}}>{totalDone}</strong> weekly total</>
            : <><strong style={{color:"var(--color-text-primary)"}}>{totalDone}</strong> tasks done · <strong style={{color:"var(--color-text-primary)"}}>{artDone}</strong> articles published</>
          }
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",display:"block"}} role="img" aria-label="Activity chart">
        {/* highlight column for daily view */}
        {hlIdx>=0 && (
          <rect x={xOf(hlIdx)-18} y={PAD.top-4} width={36} height={iH+8}
            fill="rgba(29,158,117,0.07)" rx="4"/>
        )}
        {yTicks.map(v=>(
          <g key={v}>
            <line x1={PAD.left} y1={yOf(v)} x2={PAD.left+iW} y2={yOf(v)} stroke="rgba(128,128,128,0.1)" strokeWidth="0.5"/>
            <text x={PAD.left-5} y={yOf(v)+4} textAnchor="end" fontSize="9" fill="rgba(128,128,128,0.6)">{v}</text>
          </g>
        ))}
        {allKeys.map(k=>{
          const pts=DAYS.map((d,i)=>[xOf(i),yOf(counts[d][k]||0)]);
          return (
            <g key={k}>
              <path d={smoothPath(pts)} fill="none" stroke={allColors[k]} strokeWidth="1.5" strokeLinecap="round"/>
              {pts.map(([cx,cy],i)=>(
                <circle key={i} cx={cx} cy={cy} r={hlIdx===i?4:3}
                  fill={allColors[k]} stroke="white" strokeWidth={hlIdx===i?"2":"1.5"}/>
              ))}
            </g>
          );
        })}
        {DAYS.map((d,i)=>(
          <text key={d} x={xOf(i)} y={H-6} textAnchor="middle" fontSize="10"
            fill={hlIdx===i?"#1D9E75":"rgba(128,128,128,0.7)"} fontWeight={hlIdx===i?"500":"400"}>{d}</text>
        ))}
      </svg>
    </div>
  );
}

// ─── atoms ────────────────────────────────────────────────────────────────────
function Badge({type}){
  const t=TYPE_MAP[type]||{lbl:type,cls:"b-support"};
  return <span className={`wr-badge ${t.cls}`}>{t.lbl}</span>;
}
function Cb({checked}){
  return(
    <div className={`wr-cb ${checked?"on":""}`}>
      {checked&&<svg width="9" height="9" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>}
    </div>
  );
}
function DelBtn({onClick,style}){
  return <button className="wr-del" style={style} onClick={e=>{e.stopPropagation();onClick();}} title="Delete">×</button>;
}
function Section({title,sectionKey,collapsed,onToggle,count,hint,children}){
  return(
    <div className="wr-section">
      <div className="wr-shdr">
        <button className="wr-stitle" onClick={()=>onToggle(sectionKey)}>
          <span className="wr-chev">{collapsed?"▸":"▾"}</span>
          {title}
          {count!==undefined&&<span className="wr-count">{count}</span>}
        </button>
        {hint&&<span className="wr-shint">{hint}</span>}
      </div>
      {!collapsed&&<div className="wr-sbody">{children}</div>}
    </div>
  );
}

// ─── task item ────────────────────────────────────────────────────────────────
function TaskItem({task,h,newSubVal,showAssign,lockedDays}){
  const [open,setOpen]=useState(false);
  return(
    <div className={`wr-task ${task.done?"done":""}`}>
      <div className="wr-tmain" onClick={()=>h.toggle(task.id)}>
        <Cb checked={task.done}/>
        <span className="wr-ttext">{task.text}</span>
        <Badge type={task.type}/>
        <button className="wr-expbtn" onClick={e=>{e.stopPropagation();setOpen(o=>!o);}}>{open?"▲":"▼"}</button>
        <DelBtn onClick={()=>h.del(task.id)}/>
      </div>
      {open&&(
        <div className="wr-texpand">
          {showAssign&&(
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
              {DAYS.map(d=>{
                const assigned=task.assignedDays.includes(d);
                // locked = day already passed relative to today in this week
                const dayIdx=DAYS.indexOf(d);
                const todayIdx=todayDayIndex();
                const isPast=todayIdx>=0 && dayIdx<todayIdx;
                const disabled=isPast && !assigned;
                return(
                  <button key={d}
                    className={`wr-daybtn ${assigned?"active":""} ${disabled?"disabled":""}`}
                    disabled={disabled}
                    title={disabled?"Cannot assign to a past day":""}
                    onClick={e=>{e.stopPropagation();if(!disabled)h.dayAssign(task.id,d);}}>
                    {d}
                  </button>
                );
              })}
            </div>
          )}
          <textarea className="wr-expta" placeholder="Notes..."
            value={task.description} onChange={e=>h.desc(task.id,e.target.value)}/>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <input type="text" className="wr-input" placeholder="https://... link"
              value={task.link} onChange={e=>h.link(task.id,e.target.value)}/>
            {task.link&&<a href={task.link} target="_blank" rel="noreferrer" className="wr-linka">Open</a>}
          </div>
          {(task.subtasks||[]).map((sub,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--color-text-secondary)"}}>
              <div className={`wr-subcb ${sub.done?"on":""}`} onClick={()=>h.toggleSub(task.id,i)}/>
              <span style={{flex:1,textDecoration:sub.done?"line-through":"none",opacity:sub.done?.5:1}}>{sub.text}</span>
              <DelBtn onClick={()=>h.delSub(task.id,i)} style={{fontSize:12}}/>
            </div>
          ))}
          <div style={{display:"flex",gap:6}}>
            <input type="text" className="wr-input" style={{fontSize:11}} placeholder="Add subtask..."
              value={newSubVal||""} onChange={e=>h.subInput(task.id,e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&h.addSub(task.id)}/>
            <button className="wr-btn sm" onClick={()=>h.addSub(task.id)}>+ Sub</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function WeeklyReport(){
  const [s, setS] = useState(INITIAL);
  const [loading, setLoading] = useState(true);
useEffect(() => {
  async function loadData() {
    setLoading(true);

    const { data: tasksData, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .order("id", { ascending: true });

    const { data: articlesData, error: articlesError } = await supabase
      .from("articles")
      .select("*")
      .order("id", { ascending: true });

    const { data: blockersData, error: blockersError } = await supabase
      .from("blockers")
      .select("*")
      .order("id", { ascending: true });

    const { data: reportsData, error: reportsError } = await supabase
      .from("reports")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (tasksError) console.error("Tasks load error:", tasksError);
    if (articlesError) console.error("Articles load error:", articlesError);
    if (blockersError) console.error("Blockers load error:", blockersError);
    if (reportsError) console.error("Reports load error:", reportsError);

    setS(prev => ({
      ...prev,
      tasks: tasksData ? tasksData.map(normalizeTask) : prev.tasks,
      articles: articlesData || prev.articles,
      blockers: blockersData || prev.blockers,
      notes: reportsData?.notes ?? prev.notes,
      weekStart: reportsData?.week_start ?? prev.weekStart,
      weekEnd: reportsData?.week_end ?? prev.weekEnd,
    }));

    setLoading(false);
  }

  loadData();
}, []);
  // ── task handlers
  const h = {
  toggle: async id => {
    const task = s.tasks.find(t => t.id === id);
    if (!task) return;

    const newDone = !task.done;

    const { error } = await supabase
      .from("tasks")
      .update({ done: newDone })
      .eq("id", id);

    if (error) {
      console.error("Toggle task error:", error);
      return;
    }

    upd(s => {
      const t = s.tasks.find(t => t.id === id);
      if (t) t.done = newDone;
    });
  },

  del: async id => {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete task error:", error);
      return;
    }

    upd(s => {
      s.tasks = s.tasks.filter(t => t.id !== id);
    });
  },

  desc: async (id, v) => {
    const { error } = await supabase
      .from("tasks")
      .update({ description: v })
      .eq("id", id);

    if (error) {
      console.error("Update description error:", error);
      return;
    }

    upd(s => {
      const t = s.tasks.find(t => t.id === id);
      if (t) t.description = v;
    });
  },

  link: async (id, v) => {
    const { error } = await supabase
      .from("tasks")
      .update({ link: v })
      .eq("id", id);

    if (error) {
      console.error("Update link error:", error);
      return;
    }

    upd(s => {
      const t = s.tasks.find(t => t.id === id);
      if (t) t.link = v;
    });
  },

  toggleSub: async (tid, i) => {
    const task = s.tasks.find(t => t.id === tid);
    if (!task) return;

    const subtasks = [...(task.subtasks || [])];
    if (!subtasks[i]) return;

    subtasks[i].done = !subtasks[i].done;

    const { error } = await supabase
      .from("tasks")
      .update({ subtasks })
      .eq("id", tid);

    if (error) {
      console.error("Toggle subtask error:", error);
      return;
    }

    upd(s => {
      const t = s.tasks.find(t => t.id === tid);
      if (t) t.subtasks = subtasks;
    });
  },

  delSub: async (tid, i) => {
    const task = s.tasks.find(t => t.id === tid);
    if (!task) return;

    const subtasks = [...(task.subtasks || [])];
    subtasks.splice(i, 1);

    const { error } = await supabase
      .from("tasks")
      .update({ subtasks })
      .eq("id", tid);

    if (error) {
      console.error("Delete subtask error:", error);
      return;
    }

    upd(s => {
      const t = s.tasks.find(t => t.id === tid);
      if (t) t.subtasks = subtasks;
    });
  },

  addSub: async tid => {
    const txt = (s.newSubtask[tid] || "").trim();
    if (!txt) return;

    const task = s.tasks.find(t => t.id === tid);
    if (!task) return;

    const subtasks = [...(task.subtasks || []), { text: txt, done: false }];

    const { error } = await supabase
      .from("tasks")
      .update({ subtasks })
      .eq("id", tid);

    if (error) {
      console.error("Add subtask error:", error);
      return;
    }

    upd(s => {
      const t = s.tasks.find(t => t.id === tid);
      if (t) t.subtasks = subtasks;
      s.newSubtask[tid] = "";
    });
  },

  subInput: (id, v) =>
    upd(s => {
      s.newSubtask[id] = v;
    }),

  dayAssign: async (id, day) => {
    const task = s.tasks.find(t => t.id === id);
    if (!task) return;

    const assignedDays = [...(task.assignedDays || [])];
    const idx = assignedDays.indexOf(day);

    if (idx > -1) assignedDays.splice(idx, 1);
    else assignedDays.push(day);

    const { error } = await supabase
      .from("tasks")
      .update({ assigned_days: assignedDays })
      .eq("id", id);

    if (error) {
      console.error("Assign day error:", error);
      return;
    }

    upd(s => {
      const t = s.tasks.find(t => t.id === id);
      if (t) t.assignedDays = assignedDays;
    });
  },
};

  const addTask = async () => {
  if (!s.newTask.text.trim()) return;

  const payload = {
    text: s.newTask.text.trim(),
    type: s.newTask.type,
    done: false,
    assigned_days: [],
    description: "",
    link: "",
    subtasks: [],
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Add task error:", error);
    return;
  }

  upd(s => {
    s.tasks.push(normalizeTask(data));
    s.newTask = { text: "", type: "video" };
  });
};


  const addDayTask = async () => {
  if (!s.newDayTask?.text?.trim()) return;

  const payload = {
    text: s.newDayTask.text.trim(),
    type: s.newDayTask.type || "support",
    done: false,
    assigned_days: [s.selectedDay],
    description: "",
    link: "",
    subtasks: [],
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Add day task error:", error);
    return;
  }

  upd(s => {
    s.tasks.push(normalizeTask(data));
    s.newDayTask = { text: "", type: "support" };
  });
};

  // ── article handlers
  const cycleStatus = async id => {
  const article = s.articles.find(a => a.id === id);
  if (!article) return;

  const ni = (STATUS_ORDER.indexOf(article.status) + 1) % STATUS_ORDER.length;
  const newStatus = STATUS_ORDER[ni];

  const { error } = await supabase
    .from("articles")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) {
    console.error("Cycle article status error:", error);
    return;
  }

  upd(s => {
    const a = s.articles.find(a => a.id === id);
    if (a) a.status = newStatus;
  });

  if (newStatus === "s-done") {
    const label = `Published: ${article.title}`;
    const alreadyExists = s.tasks.some(t => t.text === label && t.done);

    if (!alreadyExists) {
      const todayIdx = todayDayIndex();
      const assignDay = todayIdx >= 0 ? [DAYS[todayIdx]] : [];

      const { data, error: taskError } = await supabase
        .from("tasks")
        .insert([{
          text: label,
          type: "deploy",
          done: true,
          assigned_days: assignDay,
          description: "KB article published.",
          link: "",
          subtasks: [],
        }])
        .select()
        .single();

      if (taskError) {
        console.error("Auto-create publish task error:", taskError);
        return;
      }

      upd(s => {
        s.tasks.push(normalizeTask(data));
      });
    }
  }
};

const delArticle = async id => {
  const { error } = await supabase
    .from("articles")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete article error:", error);
    return;
  }

  upd(s => {
    s.articles = s.articles.filter(a => a.id !== id);
  });
};

const addArticle = async () => {
  if (!s.newArt.title.trim()) return;

  const payload = {
    title: s.newArt.title.trim(),
    cat: s.newArt.cat,
    status: s.newArt.status,
  };

  const { data, error } = await supabase
    .from("articles")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Add article error:", error);
    return;
  }

  upd(s => {
    s.articles.push(data);
    s.newArt = { ...s.newArt, title: "" };
  });
};

  // ── blocker handlers
 const delBlocker = async id => {
  const { error } = await supabase
    .from("blockers")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete blocker error:", error);
    return;
  }

  upd(s => {
    s.blockers = s.blockers.filter(b => b.id !== id);
  });
};

const addBlocker = async () => {
  if (!s.newBlocker.trim()) return;

  const saveNotes = async value => {
  upd(s => {
    s.notes = value;
  });

  const { error } = await supabase
    .from("reports")
    .upsert([{
      id: 1,
      week_start: s.weekStart,
      week_end: s.weekEnd,
      notes: value,
    }]);

  if (error) {
    console.error("Save notes error:", error);
  }
};

  const { data, error } = await supabase
    .from("blockers")
    .insert([{ text: s.newBlocker.trim() }])
    .select()
    .single();

  if (error) {
    console.error("Add blocker error:", error);
    return;
  }

  upd(s => {
    s.blockers.push(data);
    s.newBlocker = "";
  });
};


  // ── nav
  const prevWeek=()=>upd(s=>{s.weekStart=shiftDate(s.weekStart,-7);s.weekEnd=shiftDate(s.weekEnd,-7);});
  const nextWeek=()=>upd(s=>{s.weekStart=shiftDate(s.weekStart,7);s.weekEnd=shiftDate(s.weekEnd,7);});
  const toggleSection=key=>upd(s=>{s.collapsed[key]=!s.collapsed[key];});

  const copyReport=()=>{
    const lines=[`${s.view==="weekly"?"WEEKLY":"DAILY"} REPORT — ROUTEMIZE`,`Period: ${s.weekStart} to ${s.weekEnd}`];
    if(s.view==="daily")lines.push(`Day: ${s.selectedDay}`);
    lines.push("","BLOCKERS:");s.blockers.forEach(b=>lines.push(`  • ${b.text}`));
    lines.push("\nTASKS:");
    const filt=s.view==="daily"?s.tasks.filter(t=>t.assignedDays.includes(s.selectedDay)):s.tasks;
    filt.forEach(t=>lines.push(`  ${t.done?"[x]":"[ ]"} [${TYPE_MAP[t.type]?.lbl||t.type}] ${t.text}`));
    lines.push("\nARTICLES:");s.articles.forEach(a=>lines.push(`  · ${a.title} — ${a.cat} — ${STATUS_LABELS[a.status]}`));
    lines.push("\nNOTES:",s.notes||"(no notes)");
    navigator.clipboard.writeText(lines.join("\n")).then(()=>{upd(s=>{s.copied=true;});setTimeout(()=>upd(s=>{s.copied=false;}),1800);});
  };

  // ── derived state
  const allTasks   = s.tasks;
  const doneTasks  = allTasks.filter(t=>t.done);
  const pendTasks  = allTasks.filter(t=>!t.done);

  // Daily
  const dayTasks   = allTasks.filter(t=>(t.assignedDays||[]).includes(s.selectedDay));
  const dayDone    = dayTasks.filter(t=>t.done).length;
  const dayPend    = dayTasks.filter(t=>!t.done).length;

  // Stats depend on view
  const statDone   = s.view==="daily" ? dayDone  : doneTasks.length;
  const statPend   = s.view==="daily" ? dayPend  : pendTasks.length;
  const statTotal  = s.view==="daily" ? dayTasks.length : allTasks.length;
  const statLabel  = s.view==="daily" ? s.selectedDay : "total";

  // Group pending tasks by type for weekly backlog
  const pendByType = {};
  TASK_TYPES.forEach(k=>{pendByType[k]=pendTasks.filter(t=>t.type===k);});

  // Unassigned tasks for daily backlog panel
  const unassigned = pendTasks.filter(t=>!(t.assignedDays||[]).includes(s.selectedDay));

  const renderTask=(t,showAssign)=>(
    <TaskItem key={t.id} task={t} h={h} newSubVal={s.newSubtask[t.id]} showAssign={showAssign}/>
  );

if (loading) {
  return <div style={{ padding: "2rem" }}>Loading data...</div>;
}

  return(
    <>{/* styles injected once */}<style>{CSS}</style>
    <div className="wr-root">

      {/* header */}
      <div className="wr-header">
        <h1 className="wr-h1">Operations report — Customer Success Lead</h1>
        <div className="wr-meta">Routemize · {fmtRange(s.weekStart,s.weekEnd)}</div>
      </div>

      {/* chart */}
      <MiniChart tasks={s.tasks} articles={s.articles} view={s.view} selectedDay={s.selectedDay}/>

      {/* view toggle */}
      <div className="wr-toolbar">
        <button className={`wr-viewbtn ${s.view==="weekly"?"active":""}`} onClick={()=>upd(s=>{s.view="weekly";})}>Weekly view</button>
        <button className={`wr-viewbtn ${s.view==="daily"?"active":""}`}  onClick={()=>upd(s=>{s.view="daily"; })}>Daily view</button>
      </div>

      {/* week nav */}
      <div className="wr-weeknav">
        <button className="wr-navbtn" onClick={prevWeek}>← Prev</button>
        <input type="date" className="wr-dateinput" value={s.weekStart} onChange={e=>upd(st=>{st.weekStart=e.target.value;})}/>
        <span className="wr-to">to</span>
        <input type="date" className="wr-dateinput" value={s.weekEnd}   onChange={e=>upd(st=>{st.weekEnd=e.target.value;})}/>
        <button className="wr-navbtn" onClick={nextWeek}>Next →</button>
      </div>

      {/* stats — change based on view */}
      <div className="wr-stats">
        {[
          {lbl: s.view==="daily"?`Done (${statLabel})`:"Tasks completed",  val:statDone,  sub:`of ${statTotal} ${statLabel}`},
          {lbl:"Articles published", val:s.articles.filter(a=>a.status==="s-done").length, sub:`of ${s.articles.length} total`},
          {lbl:"Pending",            val:statPend, sub:`tasks ${s.view==="daily"?`on ${s.selectedDay}`:"remaining"}`},
          {lbl:"In progress",        val:s.articles.filter(a=>["s-review","s-draft"].includes(a.status)).length, sub:"articles draft/review"},
        ].map(d=>(
          <div key={d.lbl} className="wr-stat">
            <div className="wr-stat-lbl">{d.lbl}</div>
            <div className="wr-stat-val">{d.val}</div>
            <div className="wr-stat-sub">{d.sub}</div>
          </div>
        ))}
      </div>

      {/* ─── DAILY VIEW ─── */}
      {s.view==="daily"&&(
        <>
          {/* day tabs */}
          <div className="wr-daytabs">
            {DAYS.map(d=>(
              <button key={d} className={`wr-daytab ${s.selectedDay===d?"active":""}`}
                onClick={()=>upd(s=>{s.selectedDay=d;})}>
                {d}
                {allTasks.filter(t=>(t.assignedDays||[]).includes(d)&&t.done).length>0&&(
                  <span className="wr-daytab-dot"/>
                )}
              </button>
            ))}
          </div>

          {/* tasks for this day */}
          <Section title={`Tasks — ${s.selectedDay}`} sectionKey="done"
            collapsed={s.collapsed.done} onToggle={toggleSection} count={dayTasks.length}>
            {dayTasks.length===0
              ?<div className="wr-empty">No tasks assigned to {s.selectedDay}.</div>
              :dayTasks.map(t=>renderTask(t,true))}
            {/* add task directly to this day */}
            <div className="wr-addrow" style={{marginTop:8}}>
              <input type="text" className="wr-input" placeholder={`New task for ${s.selectedDay}...`}
                value={s.newDayTask?.text||""}
                onChange={e=>upd(s=>{if(!s.newDayTask)s.newDayTask={text:"",type:"support"};s.newDayTask.text=e.target.value;})}
                onKeyDown={e=>e.key==="Enter"&&addDayTask()}/>
              <select className="wr-select" value={s.newDayTask?.type||"support"}
                onChange={e=>upd(s=>{if(!s.newDayTask)s.newDayTask={text:"",type:"support"};s.newDayTask.type=e.target.value;})}>
                {TASK_TYPES.map(v=><option key={v} value={v}>{TYPE_MAP[v].lbl}</option>)}
              </select>
              <button className="wr-btn accent" onClick={addDayTask}>+ Add</button>
            </div>
          </Section>

          {/* weekly backlog — assign to day */}
          {unassigned.length>0&&(
            <div className="wr-assignpanel">
              <div className="wr-assignhdr">Weekly backlog — tap to assign to {s.selectedDay}</div>
              {unassigned.map(t=>{
                const todayIdx=todayDayIndex();
                const selIdx=DAYS.indexOf(s.selectedDay);
                const isPast=todayIdx>=0&&selIdx<todayIdx;
                return(
                  <div key={t.id} className={`wr-assignrow ${isPast?"disabled":""}`}
                    onClick={()=>!isPast&&h.dayAssign(t.id,s.selectedDay)}>
                    <span className="wr-assignbadge">{isPast?"Past":"+ Assign"}</span>
                    <span style={{flex:1,fontSize:12,color:isPast?"var(--color-text-tertiary)":"var(--color-text-primary)"}}>{t.text}</span>
                    <Badge type={t.type}/>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── WEEKLY VIEW ─── */}
      {s.view==="weekly"&&(
        <>
          {/* Completed */}
          <Section title="Completed activities" sectionKey="done"
            collapsed={s.collapsed.done} onToggle={toggleSection} count={doneTasks.length}>
            {doneTasks.length===0
              ?<div className="wr-empty">No completed activities yet.</div>
              :doneTasks.map(t=>renderTask(t,true))}
          </Section>

          {/* Backlog grouped by type */}
          <Section title="Activity backlog" sectionKey="planned"
            collapsed={s.collapsed.planned} onToggle={toggleSection} count={pendTasks.length}>
            {pendTasks.length===0&&<div className="wr-empty">All caught up!</div>}
            {TASK_TYPES.map(k=>{
              const group=pendByType[k];
              if(!group.length)return null;
              return(
                <div key={k} className="wr-type-group">
                  <div className="wr-type-group-hdr">
                    <span className={`wr-badge ${TYPE_MAP[k].cls}`}>{TYPE_MAP[k].lbl}</span>
                    <span className="wr-type-count">{group.length}</span>
                  </div>
                  {group.map(t=>renderTask(t,true))}
                </div>
              );
            })}
            <div className="wr-addrow" style={{marginTop:10}}>
              <input type="text" className="wr-input" placeholder="New activity..."
                value={s.newTask.text}
                onChange={e=>upd(s=>{s.newTask.text=e.target.value;})}
                onKeyDown={e=>e.key==="Enter"&&addTask()}/>
              <select className="wr-select" value={s.newTask.type}
                onChange={e=>upd(s=>{s.newTask.type=e.target.value;})}>
                {TASK_TYPES.map(v=><option key={v} value={v}>{TYPE_MAP[v].lbl}</option>)}
              </select>
              <button className="wr-btn accent" onClick={addTask}>+ Add</button>
            </div>
          </Section>
        </>
      )}

      {/* ─── BLOCKERS ─── */}
      <Section title="Blockers / Risks" sectionKey="blockers"
        collapsed={s.collapsed.blockers} onToggle={toggleSection} count={s.blockers.length}>
        {s.blockers.map(b=>(
          <div key={b.id} className="wr-blocker">
            <span style={{flex:1}}>{b.text}</span>
            <DelBtn onClick={()=>delBlocker(b.id)}/>
          </div>
        ))}
        <div className="wr-addrow">
          <input type="text" className="wr-input" placeholder="New blocker or risk..."
            value={s.newBlocker}
            onChange={e=>upd(s=>{s.newBlocker=e.target.value;})}
            onKeyDown={e=>e.key==="Enter"&&addBlocker()}/>
          <button className="wr-btn" onClick={addBlocker}>+ Blocker</button>
        </div>
      </Section>

      {/* ─── KNOWLEDGE BASE ARTICLES ─── */}
      <Section title="Knowledge base articles" sectionKey="articles"
        collapsed={s.collapsed.articles} onToggle={toggleSection}
        count={s.articles.length} hint="click status to cycle">
        <table className="wr-table">
          <thead>
            <tr>
              <th style={{width:"46%"}}>Article</th>
              <th style={{width:"22%"}}>Category</th>
              <th style={{width:"22%"}}>Status</th>
              <th style={{width:"10%"}}/>
            </tr>
          </thead>
          <tbody>
            {s.articles.map(a=>(
              <tr key={a.id}>
                <td>{a.title}</td>
                <td style={{color:"var(--color-text-secondary)"}}>{a.cat}</td>
                <td><span className={`wr-pill ${a.status}`} onClick={()=>cycleStatus(a.id)}>{STATUS_LABELS[a.status]}</span></td>
                <td style={{textAlign:"center"}}><DelBtn onClick={()=>delArticle(a.id)}/></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="wr-addrow">
          <input type="text" className="wr-input" placeholder="Article title..."
            value={s.newArt.title}
            onChange={e=>upd(s=>{s.newArt.title=e.target.value;})}
            onKeyDown={e=>e.key==="Enter"&&addArticle()}/>
          <select className="wr-select" value={s.newArt.cat} onChange={e=>upd(s=>{s.newArt.cat=e.target.value;})}>
            {CATS.map(c=><option key={c}>{c}</option>)}
          </select>
          <select className="wr-select" value={s.newArt.status} onChange={e=>upd(s=>{s.newArt.status=e.target.value;})}>
            {STATUS_ORDER.map(v=><option key={v} value={v}>{STATUS_LABELS[v]}</option>)}
          </select>
          <button className="wr-btn" onClick={addArticle}>+ Article</button>
        </div>
      </Section>

      {/* ─── NOTES ─── */}
      <Section title="Notes & observations" sectionKey="notes"
        collapsed={s.collapsed.notes} onToggle={toggleSection}>
        <textarea
  className="wr-notes"
  placeholder="Comments, blockers, ideas..."
  value={s.notes}
  onChange={e => saveNotes(e.target.value)}
/>
      </Section>

      {/* export bar */}
      <div className="wr-exportbar">
        <span>
          {s.view==="daily"
            ?<>{dayDone} done {s.selectedDay} · {doneTasks.length} weekly · {s.articles.filter(a=>a.status==="s-done").length} articles published</>
            :<>{doneTasks.length} completed · {s.articles.length} articles · {s.blockers.length} blocker(s)</>
          }
        </span>
        <button className="wr-btn accent" onClick={copyReport}>{s.copied?"Copied!":"Copy report"}</button>
      </div>
    </div></>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const CSS=`
.wr-root{
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  padding:1.5rem;max-width:800px;margin:0 auto;font-size:14px;
  color:var(--color-text-primary);background:var(--color-background-primary);
  --acc:#1D9E75;--acc-l:#E1F5EE;--acc-d:#0F6E56;
}
.wr-header{border-left:3px solid var(--acc);padding-left:1rem;margin-bottom:1rem;border-radius:0}
.wr-h1{font-size:18px;font-weight:500;margin:0;color:var(--color-text-primary)}
.wr-meta{font-size:12px;color:var(--color-text-secondary);margin-top:3px}

/* view toggle — clear pill style so it's obviously interactive */
.wr-toolbar{display:flex;gap:6px;margin-bottom:10px;padding:3px;background:var(--color-background-secondary);border-radius:10px;width:fit-content}
.wr-viewbtn{font-size:12px;padding:5px 14px;border:none;border-radius:8px;
  background:transparent;color:var(--color-text-secondary);cursor:pointer;font-weight:400;transition:all .15s}
.wr-viewbtn:hover{color:var(--color-text-primary)}
.wr-viewbtn.active{background:var(--color-background-primary);color:var(--color-text-primary);
  font-weight:500;box-shadow:0 1px 3px rgba(0,0,0,.08);border:0.5px solid var(--color-border-tertiary)}

/* week nav */
.wr-weeknav{display:flex;align-items:center;gap:6px;margin-bottom:1rem;flex-wrap:nowrap;overflow-x:auto}
.wr-navbtn{font-size:12px;padding:5px 10px;border:1px solid var(--color-border-secondary);
  border-radius:8px;background:var(--color-background-primary);color:var(--color-text-primary);cursor:pointer}
.wr-navbtn:hover{background:var(--color-background-secondary)}
.wr-dateinput{font-size:12px;padding:4px 6px;width:126px;min-width:110px;
  border:1px solid var(--color-border-secondary);border-radius:8px;
  background:var(--color-background-primary);color:var(--color-text-primary)}
.wr-to{font-size:12px;color:var(--color-text-secondary);white-space:nowrap}

/* stats */
.wr-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:1.25rem}
.wr-stat{background:var(--color-background-secondary);border-radius:8px;padding:.75rem 1rem;
  border:1px solid var(--color-border-tertiary)}
.wr-stat-lbl{font-size:11px;color:var(--color-text-secondary);margin-bottom:3px}
.wr-stat-val{font-size:22px;font-weight:500;color:var(--color-text-primary)}
.wr-stat-sub{font-size:11px;color:var(--color-text-tertiary);margin-top:2px}

/* section */
.wr-section{margin-bottom:1.1rem}
.wr-shdr{display:flex;align-items:center;gap:8px;padding-bottom:5px;border-bottom:0.5px solid var(--color-border-tertiary)}
.wr-stitle{font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.08em;
  color:var(--color-text-secondary);flex:1;background:none;border:none;cursor:pointer;
  text-align:left;display:flex;gap:5px;align-items:center;padding:0}
.wr-stitle:hover{color:var(--color-text-primary)}
.wr-chev{font-size:9px;opacity:.6}
.wr-count{font-size:10px;padding:1px 6px;border-radius:20px;background:var(--color-background-secondary);
  color:var(--color-text-tertiary);font-weight:400;margin-left:2px;border:0.5px solid var(--color-border-tertiary)}
.wr-shint{font-size:11px;color:var(--color-text-tertiary)}
.wr-sbody{padding-top:.6rem;display:flex;flex-direction:column;gap:5px}

/* type group in backlog */
.wr-type-group{margin-bottom:10px}
.wr-type-group-hdr{display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:4px 0}
.wr-type-count{font-size:11px;color:var(--color-text-tertiary)}

/* task */
.wr-task{border:1px solid var(--color-border-tertiary);border-radius:8px;
  background:var(--color-background-primary);overflow:hidden}
.wr-tmain{display:flex;align-items:flex-start;gap:8px;padding:.55rem .8rem;cursor:pointer}
.wr-tmain:hover{background:var(--color-background-secondary)}
.wr-task.done .wr-ttext{text-decoration:line-through;color:var(--color-text-tertiary)}
.wr-task.done{opacity:.62}
.wr-ttext{flex:1;font-size:13px;line-height:1.4;color:var(--color-text-primary)}

/* checkbox — clearly visible */
.wr-cb{width:16px;height:16px;border:2px solid var(--color-border-secondary);border-radius:4px;
  flex-shrink:0;margin-top:1px;display:flex;align-items:center;justify-content:center;
  transition:background .1s,border-color .1s}
.wr-cb.on{background:var(--acc);border-color:var(--acc)}

.wr-badge{font-size:10px;padding:2px 7px;border-radius:20px;font-weight:500;flex-shrink:0}
.b-article{background:#E1F5EE;color:#0F6E56}
.b-video{background:#EEEDFE;color:#3C3489}
.b-test{background:#FAEEDA;color:#633806}
.b-support{background:#E6F1FB;color:#0C447C}
.b-deploy{background:#FCEBEB;color:#791F1F}

.wr-expbtn{font-size:9px;color:var(--color-text-tertiary);cursor:pointer;padding:2px 5px;
  border:1px solid var(--color-border-tertiary);border-radius:4px;background:transparent;flex-shrink:0}
.wr-expbtn:hover{background:var(--color-background-secondary)}
.wr-del{font-size:15px;line-height:1;color:var(--color-text-tertiary);cursor:pointer;
  padding:1px 5px;border:none;border-radius:4px;background:transparent;flex-shrink:0;
  opacity:.35;transition:opacity .12s,background .12s,color .12s}
.wr-del:hover{opacity:1;background:#FCEBEB;color:#791F1F}

.wr-texpand{padding:.5rem .8rem .75rem 2rem;display:flex;flex-direction:column;gap:7px}
.wr-expta{width:100%;font-size:12px;padding:6px 8px;border:1px solid var(--color-border-tertiary);
  border-radius:6px;background:var(--color-background-secondary);
  color:var(--color-text-primary);resize:vertical;min-height:54px;font-family:inherit}

/* day assign buttons inside task expand */
.wr-daybtn{font-size:10px;padding:3px 9px;border:1.5px solid var(--color-border-secondary);
  border-radius:6px;background:var(--color-background-primary);color:var(--color-text-primary);cursor:pointer;font-weight:400}
.wr-daybtn:hover{border-color:var(--acc)}
.wr-daybtn.active{background:var(--acc);color:#fff;border-color:var(--acc);font-weight:500}
.wr-daybtn.disabled{opacity:.35;cursor:not-allowed;border-color:var(--color-border-tertiary)}

.wr-subcb{width:12px;height:12px;border:1.5px solid var(--color-border-secondary);border-radius:3px;
  flex-shrink:0;cursor:pointer}
.wr-subcb.on{background:var(--acc);border-color:var(--acc)}
.wr-linka{font-size:12px;color:var(--acc);text-decoration:none;white-space:nowrap}

/* articles table */
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

/* daily tabs */
.wr-daytabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:1rem}
.wr-daytab{font-size:12px;padding:5px 14px;border:1.5px solid var(--color-border-secondary);
  border-radius:8px;background:var(--color-background-primary);color:var(--color-text-primary);
  cursor:pointer;display:flex;align-items:center;gap:5px;font-weight:400;transition:all .12s}
.wr-daytab:hover{border-color:var(--acc);color:var(--acc)}
.wr-daytab.active{background:var(--acc);color:#fff;border-color:var(--acc);font-weight:500}
.wr-daytab-dot{width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.7}

/* assign panel */
.wr-assignpanel{background:var(--color-background-secondary);border-radius:10px;padding:1rem;margin-bottom:1rem;
  border:0.5px solid var(--color-border-tertiary)}
.wr-assignhdr{font-size:11px;text-transform:uppercase;letter-spacing:.08em;
  color:var(--color-text-secondary);font-weight:500;margin-bottom:.75rem}
.wr-assignrow{display:flex;align-items:center;gap:8px;padding:7px 0;
  border-bottom:0.5px solid var(--color-border-tertiary);cursor:pointer}
.wr-assignrow:last-child{border-bottom:none}
.wr-assignrow:hover{opacity:.8}
.wr-assignrow.disabled{cursor:not-allowed;opacity:.45}
.wr-assignbadge{font-size:10px;padding:2px 7px;border-radius:20px;font-weight:500;
  background:var(--color-background-secondary);color:var(--color-text-tertiary);
  border:0.5px solid var(--color-border-secondary);flex-shrink:0}

/* add row */
.wr-addrow{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
.wr-input{font-size:12px;flex:1;min-width:100px;padding:5px 8px;
  border:1px solid var(--color-border-secondary);border-radius:8px;
  background:var(--color-background-primary);color:var(--color-text-primary)}
.wr-input:focus{outline:none;border-color:var(--acc)}
.wr-select{font-size:12px;flex:1;min-width:90px;padding:5px 8px;
  border:1px solid var(--color-border-secondary);border-radius:8px;
  background:var(--color-background-primary);color:var(--color-text-primary)}

/* buttons */
.wr-btn{font-size:12px;padding:5px 11px;border:1px solid var(--color-border-secondary);
  border-radius:8px;background:var(--color-background-primary);
  color:var(--color-text-primary);cursor:pointer;white-space:nowrap}
.wr-btn:hover{background:var(--color-background-secondary)}
.wr-btn.sm{font-size:11px;padding:4px 8px}
.wr-btn.accent{background:var(--acc-l);color:var(--acc-d);border-color:var(--acc)}
.wr-btn.accent:hover{opacity:.85}

.wr-notes{width:100%;min-height:80px;font-size:13px;padding:8px 10px;
  border:1px solid var(--color-border-secondary);border-radius:8px;
  background:var(--color-background-primary);color:var(--color-text-primary);
  resize:vertical;font-family:inherit;line-height:1.5}
.wr-exportbar{display:flex;gap:8px;margin-top:1.5rem;padding-top:1.5rem;
  border-top:0.5px solid var(--color-border-tertiary);flex-wrap:wrap;align-items:center}
.wr-exportbar span{font-size:12px;color:var(--color-text-secondary);flex:1}
.wr-empty{font-size:12px;color:var(--color-text-tertiary);padding:4px 0}
`;