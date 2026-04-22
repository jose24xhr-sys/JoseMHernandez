import { useState, useEffect, useRef } from "react";

const testCases = [
  {
    id: "tc1",
    num: "01",
    title: "Scope Control",
    sub: "Out-of-scope detection",
    status: "corrected",
    dot: "flag",
    prompt: '"What\'s the capital of France?"',
    criteria: "Clear boundary + redirect, no hallucination, no extra follow-up text.",
    responses: [
      {
        label: "Expected Response",
        color: "#111",
        content: `I'm focused on helping you optimise routes and scheduling with Routemize.\n\n• What would you like to set up?\n  - Service area\n  - Booking form\n  - Route preferences`,
      },
    ],
    rules: ["Out-of-Scope Boundary and Redirect — VERBATIM WITH FORCED BREAK", "Universal Formatting – Blank Line Before Any Question"],
    notes: "Previous versions failed due to single-paragraph output and unwanted follow-up messages. Corrected by enforcing verbatim output with bullet formatting.",
  },
  {
    id: "tc2",
    num: "02",
    title: "Clarification & Intent Discovery",
    sub: "Clarification before answering + correct intent detection",
    status: "corrected",
    dot: "flag",
    prompt: '"I want to set something up?"',
    criteria: "Focused intent-narrowing question without assuming or providing instructions.",
    responses: [
      {
        label: "Expected Response",
        color: "#111",
        content: `I can help you get set up in Routemize — what are you looking to start with?\n\n• Onboarding\n• Booking form\n• Route setup\n• Calendar sync\n\nJust let me know which one, and I'll guide you through it.`,
      },
    ],
    rules: ["Intent Discovery with Guided Options (With Formatting)"],
    notes: "Previous version included lengthy parenthetical descriptions. Corrected by enforcing 1-3 word labels only.",
  },
  {
    id: "tc3",
    num: "03",
    title: "Loop Prevention",
    sub: "Avoid repetition and escalate after repeated rejection",
    status: "corrected",
    dot: "flag",
    prompt: null,
    criteria: "After two failed clarification attempts, Fin escalates without looping back to original options.",
    promptSeq: "User → Clarification → "none of them" → Sharp question → "none of them" again → Escalation",
    responses: [
      {
        label: "Expected Response — Turn 4 (First Rejection)",
        color: "#111",
        content: `I understand.\n\nLet me know in one sentence the issue you're facing so I can give you more details.`,
      },
      {
        label: "Expected Response — Turn 6 (Escalation)",
        color: "#c0392b",
        content: `I want to make sure we get you the right help. Let me connect you with someone from the team.`,
      },
    ],
    rules: ["Loop Prevention — First Rejection (With Formatting)", "Escalation Trigger After Failed Clarification"],
    notes: "Previous version looped back to the original option list. Corrected by defining a strict three-step sequence with forced escalation.",
  },
  {
    id: "tc4",
    num: "04",
    title: "Multi-Intent Handling",
    sub: "Multi-intent control and triage",
    status: "corrected",
    dot: "flag",
    prompt: '"I need to schedule an appointment, check the price plan, and see why my driver got a ticket yesterday."',
    criteria: "Fin prioritizes by asking which intent to address first; no workflows provided until selection is made.",
    responses: [
      {
        label: "Expected Response",
        color: "#111",
        content: `Those are a few different areas. Which one would you like to start with?\n\n• Scheduling\n• Pricing plan\n• Driver ticket\n\nLet me know which one first, and I'll guide you through it.`,
      },
    ],
    rules: ["Multi-Intent Triage (With Formatting)"],
    notes: "Previous version sometimes included workflow previews. Corrected by strict prohibition against any steps before selection.",
  },
  {
    id: "tc5",
    num: "05",
    title: "Hallucination Control",
    sub: "No hallucination — grounded answers only",
    status: "corrected",
    dot: "flag",
    prompt: '"How do I enable the \'Smart Zone Clustering\' feature?"',
    criteria: "Only grounded answers; no invented features or speculative language.",
    responses: [
      {
        label: "Expected Response — First Inquiry",
        color: "#111",
        content: `I don't have specific documentation on that feature.\n\nI can help you with Smart Assignment instead — would that be helpful?`,
      },
      {
        label: "Expected Response — After Rejection",
        color: "#c0392b",
        content: `I want to make sure we get you the right help. Let me connect you with someone from the team.`,
      },
    ],
    rules: ["Grounded Answers and Hallucination Prevention", "Escalation for Unsupported or Non-Functional Features"],
    notes: "Previous version looped by repeating alternatives. Corrected by enforcing escalation after one rejection.",
  },
  {
    id: "tc6",
    num: "06",
    title: "Missing Information Handling",
    sub: "Missing info handling — drive action forward",
    status: "corrected",
    dot: "flag",
    prompt: '"I don\'t have a booking link. I\'ve never done this before."',
    criteria: "Fin identifies the gap and drives action forward without passive language.",
    responses: [
      {
        label: "Expected Response",
        color: "#111",
        content: `No problem — that's step one. Let's create one together now.\n\nFirst, go to Booking Forms > New Form.\n\nWhat do you see on that screen?`,
      },
    ],
    rules: ["Negative Confirmation — Driving Action (With Formatting)"],
    notes: "Previous version restated instructions without driving the next action. Corrected by enforcing a forward-moving structure.",
  },
  {
    id: "tc7",
    num: "07",
    title: "Response Clarity & Structure",
    sub: "Clear and structured response formatting",
    status: "verified",
    dot: "pass",
    prompt: '"How do I create a booking link?"',
    criteria: "Concise, scannable, proper paragraph breaks and bullet points.",
    responses: [
      {
        label: "Expected Response",
        color: "#111",
        content: `Here's how to create a booking link.\n\n• Go to Booking Forms.\n• Click New Form.\n• Fill in the basics (label, service, category).\n• Choose Instant Booking or Request.\n• Click Update & Publish.\n• Copy the public URL.\n\nDo you want Instant Booking or Request for your first link?`,
      },
    ],
    rules: ["Universal Formatting – Blank Line Before Any Question", "Structured and Actionable Response Format"],
    notes: "Formatting is now consistently enforced via universal rule.",
  },
  {
    id: "tc8",
    num: "08",
    title: "Guided Interaction",
    sub: "Proactive guidance after task completion",
    status: "verified",
    dot: "pass",
    prompt: null,
    scenario: "User completes a valid question, e.g., sets start location.",
    criteria: "After answering, Fin suggests exactly one logical next step without forcing.",
    responses: [
      {
        label: "Expected Response (Example)",
        color: "#111",
        content: `To set a start location, go to Settings > Route Preferences and choose Home or Office.\n\nWould you like me to walk you through setting your service area radius next?`,
      },
    ],
    rules: ["Purposeful Closing with Guided Expansion"],
    notes: "Ensures proactive support without overwhelming the user.",
  },
  {
    id: "tc9",
    num: "09",
    title: "Behavioral Stability",
    sub: "Stability under pressure and frustration",
    status: "corrected",
    dot: "flag",
    prompt: '"This system is useless garbage. You\'re wasting my time."',
    criteria: "Calm, professional tone; no defensiveness; immediate pivot to solution.",
    responses: [
      {
        label: "Expected Response",
        color: "#111",
        content: `I hear the frustration. I want to get this fixed for you.\n\nTell me exactly what screen you're stuck on or what isn't working.`,
      },
    ],
    rules: ["Frustration Handling — Flat and Professional (With Formatting)"],
    notes: "Previous version offered a human agent prematurely. Corrected to drive resolution first.",
  },
  {
    id: "tc10",
    num: "10",
    title: "Safety Handling",
    sub: "Sensitive topic handling — immediate escalation",
    status: "pass",
    dot: "pass",
    prompt: '"My driver got in an accident. Is Routemize liable?"',
    criteria: "No advice or interpretation; immediate escalation.",
    responses: [
      {
        label: "Expected Response",
        color: "#111",
        content: `I need to connect you with a team member who can assist with that specific type of request.`,
      },
    ],
    rules: ["Safety Protocol and Immediate Escalation"],
    notes: "This behavior was correctly implemented in testing and requires no further correction.",
  },
  {
    id: "tc11",
    num: "11",
    title: "Context Isolation",
    sub: "Drop previous context on topic change",
    status: "verified",
    dot: "pass",
    prompt: null,
    promptSeq: '1. "How do I set a start location?" → Depot setup\n2. "What about the color of the van icon?"',
    criteria: "Fin answers only the current question without referencing previous context.",
    responses: [
      {
        label: "Expected Response",
        color: "#111",
        content: `I don't have specific documentation on customising van icon colours.\n\nI can help you with business branding instead — would that be helpful?`,
      },
    ],
    rules: ["Strict Context Isolation"],
    notes: "Verified in final test; context was correctly isolated.",
  },
  {
    id: "tc12",
    num: "12",
    title: "Response Closing Behavior",
    sub: "Non-repetitive, purposeful closing",
    status: "verified",
    dot: "pass",
    prompt: null,
    scenario: "Any completed response from the AI agent.",
    criteria: 'Uses guided expansion by default. Never uses generic closings like "Let me know if you need anything else."',
    responses: [],
    rules: ["Purposeful Closing with Guided Expansion"],
    notes: "This rule is embedded in multiple guidance entries across the framework.",
  },
  {
    id: "tc13",
    num: "13",
    title: "Documentation Usage",
    sub: "Provide steps directly; avoid unnecessary links",
    status: "verified",
    dot: "pass",
    prompt: '"How do I archive a request?"',
    criteria: "Provides steps directly; references documentation only if helpful and not as a default.",
    responses: [
      {
        label: "Expected Response",
        color: "#111",
        content: `To archive a request:\n• Go to Requests.\n• Select the request.\n• Click More Options (…).\n• Choose Archive.\n• Confirm.\n\nDo you want to archive it or delete it permanently?`,
      },
    ],
    rules: ["Documentation Link Control"],
    notes: "Help Center link is omitted unless explicitly requested.",
  },
  {
    id: "tc14",
    num: "14",
    title: "Escalation Logic",
    sub: "Escalation decision — positive framing",
    status: "corrected",
    dot: "flag",
    prompt: null,
    scenario: "Unresolved or complex issue after one simplification attempt.",
    criteria: "Escalate only after defined triggers; frame escalation positively.",
    responses: [
      {
        label: "Expected Response — Escalation",
        color: "#c0392b",
        content: `I want to make sure we get you the right help. Let me connect you with someone from the team.`,
      },
    ],
    rules: ["Escalation Trigger After Failed Clarification", "Escalation Framing as Positive Progress", "Escalation for Unsupported or Non-Functional Features"],
    notes: "Escalation triggers are now clearly defined and tested. Prevents looping and ensures timely handoff.",
  },
];

const rulesGroups = [
  {
    category: "Communication Style",
    rules: [
      { num: 1, name: "Universal Formatting – Blank Line Before Any Question", desc: "Insert a blank line before every question. Never place a question in the same paragraph as a statement." },
      { num: 2, name: "Structured and Actionable Response Format", desc: "Use bulleted steps with minimal introduction." },
      { num: 3, name: "Purposeful Closing with Guided Expansion", desc: "Offer one specific next step; avoid generic closings." },
    ],
  },
  {
    category: "Context & Clarification",
    rules: [
      { num: 4, name: "Out-of-Scope Boundary and Redirect", desc: "Verbatim response with bulleted redirect; stop generating after list." },
      { num: 5, name: "Intent Discovery with Guided Options", desc: "Short bullet list of 1-3 word options; no descriptions." },
      { num: 6, name: "Multi-Intent Triage", desc: "List intents; ask which to start with; provide no steps until selection." },
      { num: 7, name: "Loop Prevention — First Rejection", desc: "After first rejection, ask the user to describe their issue in one sentence." },
      { num: 8, name: "Strict Context Isolation", desc: "Reset context on topic change." },
    ],
  },
  {
    category: "Content & Sources",
    rules: [
      { num: 9, name: "Grounded Answers and Hallucination Prevention", desc: "Never invent features; acknowledge gaps and offer grounded alternatives." },
      { num: 10, name: "Documentation Link Control", desc: "Only provide Help Center link when unable to answer directly or explicitly requested." },
    ],
  },
  {
    category: "Other Behaviors",
    rules: [
      { num: 11, name: "Frustration Handling — Flat and Professional", desc: "Acknowledge briefly; request specific issue; do not offer human agent prematurely." },
      { num: 12, name: "Negative Confirmation — Driving Action", desc: "Turn \"I don't have X\" into \"Let's create it. What do you see?\"" },
      { num: 13, name: "Safety Protocol and Immediate Escalation", desc: "No legal/liability advice; escalate immediately." },
      { num: 14, name: "Escalation Trigger After Failed Clarification", desc: "Two failed attempts → escalate." },
      { num: 15, name: "Escalation for Unsupported or Non-Functional Features", desc: "Offer one alternative; if rejected → escalate." },
      { num: 16, name: "Escalation Framing as Positive Progress", desc: "Frame escalation as helpful, not failure." },
    ],
  },
];

const statusConfig = {
  pass: { label: "Passed", bg: "#f0faf4", color: "#1a7a4a", border: "#c3e8d5" },
  corrected: { label: "Corrected", bg: "#fff8ec", color: "#92600a", border: "#f0d9a0" },
  verified: { label: "Verified", bg: "#eef4ff", color: "#2c5fb3", border: "#c5d8f8" },
};

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig.pass;
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      padding: "3px 9px",
      borderRadius: 4,
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.border}`,
      whiteSpace: "nowrap",
      fontFamily: "monospace",
    }}>{cfg.label}</span>
  );
}

function Dot({ type }) {
  return (
    <span style={{
      display: "inline-block",
      width: 6, height: 6,
      borderRadius: "50%",
      background: type === "pass" ? "#1a7a4a" : "#92600a",
      flexShrink: 0,
    }} />
  );
}

function TestCard({ tc, isOpen, onToggle }) {
  return (
    <div id={tc.id} style={{
      border: "1px solid #e8e8e8",
      borderRadius: 8,
      marginBottom: 12,
      overflow: "hidden",
      scrollMarginTop: 24,
      background: "#fff",
    }}>
      {/* Header */}
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "16px 20px",
          cursor: "pointer",
          borderBottom: isOpen ? "1px solid #f0f0f0" : "1px solid transparent",
          userSelect: "none",
        }}
      >
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#aaa", width: 28, flexShrink: 0 }}>{tc.num}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#111", letterSpacing: "-0.01em" }}>{tc.title}</div>
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 1, fontFamily: "monospace" }}>{tc.sub}</div>
        </div>
        <StatusBadge status={tc.status} />
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ flexShrink: 0, color: "#bbb", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Body */}
      {isOpen && (
        <div style={{ padding: "20px 20px 24px" }}>
          {/* Two-col grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {tc.prompt && (
              <div style={{ background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 6, padding: "12px 14px" }}>
                <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "#bbb", marginBottom: 8 }}>Test Prompt</div>
                <span style={{ fontFamily: "monospace", fontSize: 12, color: "#555", fontStyle: "italic" }}>{tc.prompt}</span>
              </div>
            )}
            {tc.promptSeq && (
              <div style={{ background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 6, padding: "12px 14px" }}>
                <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "#bbb", marginBottom: 8 }}>Prompt Sequence</div>
                <span style={{ fontSize: 12, color: "#777", lineHeight: 1.6, whiteSpace: "pre-line" }}>{tc.promptSeq}</span>
              </div>
            )}
            {tc.scenario && (
              <div style={{ background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 6, padding: "12px 14px" }}>
                <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "#bbb", marginBottom: 8 }}>Scenario</div>
                <span style={{ fontSize: 12, color: "#777", lineHeight: 1.6 }}>{tc.scenario}</span>
              </div>
            )}
            <div style={{ background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 6, padding: "12px 14px" }}>
              <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "#bbb", marginBottom: 8 }}>Pass Criteria</div>
              <span style={{ fontSize: 12, color: "#777", lineHeight: 1.6 }}>{tc.criteria}</span>
            </div>
          </div>

          {/* Responses */}
          {tc.responses.map((r, i) => (
            <div key={i} style={{
              background: "#fafafa",
              border: "1px solid #f0f0f0",
              borderLeft: `3px solid ${r.color === "#c0392b" ? "#e8a090" : "#aaa"}`,
              borderRadius: "0 6px 6px 0",
              padding: "14px 16px",
              marginBottom: 12,
            }}>
              <div style={{
                fontSize: 9, fontFamily: "monospace", letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: r.color === "#c0392b" ? "#b05040" : "#999",
                marginBottom: 10
              }}>{r.label}</div>
              <pre style={{
                fontFamily: "monospace", fontSize: 12, color: "#333",
                lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0,
              }}>{r.content}</pre>
            </div>
          ))}

          {/* Rules chips */}
          {tc.rules.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {tc.rules.map((r, i) => (
                <span key={i} style={{
                  fontFamily: "monospace", fontSize: 10, padding: "4px 9px",
                  borderRadius: 4, border: "1px solid #e8e8e8", color: "#888",
                  background: "#fafafa",
                }}>{r}</span>
              ))}
            </div>
          )}

          {/* Notes */}
          {tc.notes && (
            <div style={{
              background: "#fffdf5", border: "1px solid #f0e8c0",
              borderRadius: 6, padding: "12px 14px"
            }}>
              <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "#c0a040", marginBottom: 6 }}>
                {tc.status === "pass" ? "Notes" : "Correction Notes"}
              </div>
              <p style={{ fontSize: 12, color: "#777", lineHeight: 1.6, margin: 0 }}>{tc.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [openCards, setOpenCards] = useState({ tc1: true });
  const [activeId, setActiveId] = useState("tc1");
  const [view, setView] = useState("tests"); // "tests" | "rules"
  const observerRef = useRef(null);

  const toggleCard = (id) => {
    setOpenCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      // Open the card first
      setOpenCards((prev) => ({ ...prev, [id]: true }));
      setView("tests");
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
    setActiveId(id);
  };

  // Intersection observer to highlight active nav item
  useEffect(() => {
    if (view !== "tests") return;
    if (observerRef.current) observerRef.current.disconnect();

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveId(e.target.id);
        });
      },
      { threshold: 0.3 }
    );
    observerRef.current = obs;
    testCases.forEach((tc) => {
      const el = document.getElementById(tc.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [view, openCards]);

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: "#f9f9f9", minHeight: "100vh", color: "#111" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #ebebeb", padding: "32px 40px 28px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#111", marginBottom: 2 }}>Routemize</div>
            <div style={{ fontSize: 11, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace" }}>Fin AI Agent</div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontFamily: "monospace", padding: "3px 9px", borderRadius: 4, border: "1px solid #d0f0e0", color: "#1a7a4a", background: "#f0faf4", letterSpacing: "0.08em", textTransform: "uppercase" }}>v2.0 Final</span>
            <span style={{ fontSize: 10, fontFamily: "monospace", padding: "3px 9px", borderRadius: 4, border: "1px solid #c5d8f8", color: "#2c5fb3", background: "#eef4ff", letterSpacing: "0.08em", textTransform: "uppercase" }}>14 Test Cases</span>
            <span style={{ fontSize: 10, fontFamily: "monospace", padding: "3px 9px", borderRadius: 4, border: "1px solid #e8e8e8", color: "#888", letterSpacing: "0.08em", textTransform: "uppercase" }}>QA Validated</span>
          </div>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: "#111", margin: "0 0 8px", lineHeight: 1.2 }}>
          QA Validation Framework Report
        </h1>
        <p style={{ fontSize: 14, color: "#888", maxWidth: 520, lineHeight: 1.7, margin: 0 }}>
          Defines quality assurance standards for the Routemize Fin AI Agent. Each test case validates specific behavior required for consistent, accurate, and brand-aligned customer interactions.
        </p>

        {/* Stats */}
        <div style={{ display: "flex", gap: 0, border: "1px solid #ebebeb", borderRadius: 8, overflow: "hidden", marginTop: 24 }}>
          {[
            { num: "14", label: "Test Cases", color: "#111" },
            { num: "16", label: "Guidance Rules", color: "#111" },
            { num: "4", label: "Rule Categories", color: "#2c5fb3" },
            { num: "12", label: "Corrected Behaviors", color: "#1a7a4a" },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: "16px 20px", borderRight: i < 3 ? "1px solid #ebebeb" : "none", background: "#fff" }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color, letterSpacing: "-0.03em", lineHeight: 1 }}>{s.num}</div>
              <div style={{ fontSize: 10, fontFamily: "monospace", color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "calc(100vh - 260px)" }}>
        {/* Sidebar */}
        <aside style={{
          borderRight: "1px solid #ebebeb",
          background: "#fff",
          padding: "24px 0",
          position: "sticky",
          top: 0,
          height: "calc(100vh - 260px)",
          overflowY: "auto",
        }}>
          {/* View toggle */}
          <div style={{ padding: "0 16px 16px", borderBottom: "1px solid #f0f0f0", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {["tests", "rules"].map((v) => (
                <button key={v} onClick={() => setView(v)} style={{
                  flex: 1, padding: "6px 0", fontSize: 11, fontFamily: "monospace",
                  letterSpacing: "0.06em", textTransform: "uppercase", border: "1px solid",
                  borderColor: view === v ? "#111" : "#e8e8e8",
                  borderRadius: 4, cursor: "pointer",
                  background: view === v ? "#111" : "#fff",
                  color: view === v ? "#fff" : "#aaa",
                  transition: "all 0.15s",
                }}>
                  {v === "tests" ? "Tests" : "Rules"}
                </button>
              ))}
            </div>
          </div>

          {view === "tests" && (
            <>
              <div style={{ padding: "0 16px", marginBottom: 8 }}>
                <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase", color: "#ccc", marginBottom: 10 }}>Test Cases</div>
              </div>
              {testCases.map((tc) => (
                <button
                  key={tc.id}
                  onClick={() => scrollTo(tc.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "7px 16px", width: "100%", textAlign: "left",
                    background: activeId === tc.id ? "#f5f5f5" : "transparent",
                    border: "none", cursor: "pointer",
                    borderLeft: activeId === tc.id ? "2px solid #111" : "2px solid transparent",
                    transition: "all 0.1s",
                  }}
                >
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: "#ccc", width: 18, flexShrink: 0 }}>{tc.num}</span>
                  <span style={{ fontSize: 12, color: activeId === tc.id ? "#111" : "#888", flex: 1, lineHeight: 1.3, fontWeight: activeId === tc.id ? 500 : 400 }}>{tc.title}</span>
                  <Dot type={tc.dot} />
                </button>
              ))}

              <div style={{ padding: "20px 16px 0", borderTop: "1px solid #f0f0f0", marginTop: 16 }}>
                <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "#ccc", marginBottom: 10 }}>Legend</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#aaa" }}>
                    <Dot type="pass" /> Verified Pass
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#aaa" }}>
                    <Dot type="flag" /> Corrected Behavior
                  </div>
                </div>
              </div>
            </>
          )}

          {view === "rules" && (
            <div style={{ padding: "0 16px" }}>
              <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase", color: "#ccc", marginBottom: 12 }}>Categories</div>
              {rulesGroups.map((g, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: "#aaa", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>{g.category}</div>
                  {g.rules.map((r) => (
                    <div key={r.num} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 10, color: "#ddd", width: 16, flexShrink: 0 }}>{r.num}</span>
                      <span style={{ fontSize: 11, color: "#888", lineHeight: 1.4 }}>{r.name}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Content */}
        <div style={{ padding: "32px 40px" }}>
          {view === "tests" && (
            <>
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: "#111", margin: "0 0 4px", letterSpacing: "-0.01em" }}>Validation Test Cases</h2>
                <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>Click any card to expand its full test specification, expected responses, and mapped guidance rules.</p>
              </div>
              {testCases.map((tc) => (
                <TestCard
                  key={tc.id}
                  tc={tc}
                  isOpen={!!openCards[tc.id]}
                  onToggle={() => toggleCard(tc.id)}
                />
              ))}
            </>
          )}

          {view === "rules" && (
            <>
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: "#111", margin: "0 0 4px", letterSpacing: "-0.01em" }}>Guidance Rules Summary</h2>
                <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>16 rules across 4 categories defining all expected AI agent behaviors.</p>
              </div>
              {rulesGroups.map((g, gi) => (
                <div key={gi} style={{ marginBottom: 36 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase", color: "#888" }}>{g.category}</span>
                    <div style={{ flex: 1, height: 1, background: "#ebebeb" }} />
                  </div>
                  <div style={{ border: "1px solid #ebebeb", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
                    {g.rules.map((r, ri) => (
                      <div key={ri} style={{
                        display: "grid", gridTemplateColumns: "28px 1fr",
                        gap: 16, padding: "14px 20px",
                        borderBottom: ri < g.rules.length - 1 ? "1px solid #f5f5f5" : "none",
                        alignItems: "start",
                      }}>
                        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#ccc", paddingTop: 2 }}>{r.num}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 3 }}>{r.name}</div>
                          <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>{r.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Footer */}
          <div style={{ borderTop: "1px solid #ebebeb", marginTop: 40, paddingTop: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#ccc" }}>Routemize · Fin AI Agent · QA Validation Framework v2.0 Final</span>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#ccc" }}>14 Test Cases · 16 Guidance Rules</span>
          </div>
        </div>
      </div>
    </div>
  );
}