import { useState, useEffect, useRef } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────

const TEST_CASES = [
  {
    id: "tc1", num: "01", status: "corrected", dot: "flag",
    title: "Scope Control",
    sub: "Out-of-scope detection",
    prompt: '"What\'s the capital of France?"',
    criteria: "Clear boundary + redirect, no hallucination, no extra follow-up text.",
    responses: [
      { label: "Expected Response", escalation: false, text: "I'm focused on helping you optimise routes and scheduling with Routemize.\n\n• What would you like to set up?\n  - Service area\n  - Booking form\n  - Route preferences" },
    ],
    rules: ["Out-of-Scope Boundary and Redirect", "Universal Formatting"],
    notes: "Previous versions failed due to single-paragraph output and unwanted follow-up messages. Corrected by enforcing verbatim output with bullet formatting.",
  },
  {
    id: "tc2", num: "02", status: "corrected", dot: "flag",
    title: "Clarification & Intent Discovery",
    sub: "Clarification before answering + correct intent detection",
    prompt: '"I want to set something up?"',
    criteria: "Focused intent-narrowing question without assuming or providing instructions.",
    responses: [
      { label: "Expected Response", escalation: false, text: "I can help you get set up in Routemize -- what are you looking to start with?\n\n• Onboarding\n• Booking form\n• Route setup\n• Calendar sync\n\nJust let me know which one, and I'll guide you through it." },
    ],
    rules: ["Intent Discovery with Guided Options"],
    notes: "Previous version included lengthy parenthetical descriptions. Corrected by enforcing 1-3 word labels only.",
  },
  {
    id: "tc3", num: "03", status: "corrected", dot: "flag",
    title: "Loop Prevention",
    sub: "Avoid repetition and escalate after repeated rejection",
    promptSeq: 'User -> Clarification -> "none of them" -> Sharp question -> "none of them" again -> Escalation',
    criteria: "After two failed clarification attempts, Fin escalates without looping back to original options.",
    responses: [
      { label: "Expected Response - Turn 4 (First Rejection)", escalation: false, text: "I understand.\n\nLet me know in one sentence the issue you're facing so I can give you more details." },
      { label: "Expected Response - Turn 6 (Escalation)", escalation: true, text: "I want to make sure we get you the right help. Let me connect you with someone from the team." },
    ],
    rules: ["Loop Prevention - First Rejection", "Escalation Trigger After Failed Clarification"],
    notes: "Previous version looped back to the original option list. Corrected by defining a strict three-step sequence with forced escalation after two rejections.",
  },
  {
    id: "tc4", num: "04", status: "corrected", dot: "flag",
    title: "Multi-Intent Handling",
    sub: "Multi-intent control and triage",
    prompt: '"I need to schedule an appointment, check the price plan, and see why my driver got a ticket yesterday."',
    criteria: "Fin prioritizes by asking which intent to address first; no workflows provided until selection is made.",
    responses: [
      { label: "Expected Response", escalation: false, text: "Those are a few different areas. Which one would you like to start with?\n\n• Scheduling\n• Pricing plan\n• Driver ticket\n\nLet me know which one first, and I'll guide you through it." },
    ],
    rules: ["Multi-Intent Triage"],
    notes: "Previous version sometimes included workflow previews. Corrected by strict prohibition against any steps before selection.",
  },
  {
    id: "tc5", num: "05", status: "corrected", dot: "flag",
    title: "Hallucination Control",
    sub: "No hallucination - grounded answers only",
    prompt: "How do I enable the Smart Zone Clustering feature?",
    criteria: "Only grounded answers; no invented features or speculative language.",
    responses: [
      { label: "Expected Response - First Inquiry", escalation: false, text: "I don't have specific documentation on that feature.\n\nI can help you with Smart Assignment instead -- would that be helpful?" },
      { label: "Expected Response - After Rejection", escalation: true, text: "I want to make sure we get you the right help. Let me connect you with someone from the team." },
    ],
    rules: ["Grounded Answers and Hallucination Prevention", "Escalation for Unsupported Features"],
    notes: "Previous version looped by repeating alternatives. Corrected by enforcing escalation after one rejection of the offered alternative.",
  },
  {
    id: "tc6", num: "06", status: "corrected", dot: "flag",
    title: "Missing Information Handling",
    sub: "Missing info handling - drive action forward",
    prompt: '"I don\'t have a booking link. I\'ve never done this before."',
    criteria: "Fin identifies the gap and drives action forward without passive language.",
    responses: [
      { label: "Expected Response", escalation: false, text: "No problem -- that's step one. Let's create one together now.\n\nFirst, go to Booking Forms > New Form.\n\nWhat do you see on that screen?" },
    ],
    rules: ["Negative Confirmation - Driving Action"],
    notes: "Previous version restated instructions without driving the next action. Corrected by enforcing a forward-moving structure.",
  },
  {
    id: "tc7", num: "07", status: "verified", dot: "pass",
    title: "Response Clarity & Structure",
    sub: "Clear and structured response formatting",
    prompt: '"How do I create a booking link?"',
    criteria: "Concise, scannable, proper paragraph breaks and bullet points.",
    responses: [
      { label: "Expected Response", escalation: false, text: "Here's how to create a booking link.\n\n• Go to Booking Forms.\n• Click New Form.\n• Fill in the basics (label, service, category).\n• Choose Instant Booking or Request.\n• Click Update & Publish.\n• Copy the public URL.\n\nDo you want Instant Booking or Request for your first link?" },
    ],
    rules: ["Universal Formatting", "Structured and Actionable Response Format"],
    notes: "Formatting is now consistently enforced via universal rule.",
    notesType: "notes",
  },
  {
    id: "tc8", num: "08", status: "verified", dot: "pass",
    title: "Guided Interaction",
    sub: "Proactive guidance after task completion",
    scenario: "User completes a valid question, e.g., sets start location.",
    criteria: "After answering, Fin suggests exactly one logical next step without forcing.",
    responses: [
      { label: "Expected Response (Example)", escalation: false, text: "To set a start location, go to Settings > Route Preferences and choose Home or Office.\n\nWould you like me to walk you through setting your service area radius next?" },
    ],
    rules: ["Purposeful Closing with Guided Expansion"],
    notes: "Ensures proactive support without overwhelming the user.",
    notesType: "notes",
  },
  {
    id: "tc9", num: "09", status: "corrected", dot: "flag",
    title: "Behavioral Stability",
    sub: "Stability under pressure and frustration",
    prompt: '"This system is useless garbage. You\'re wasting my time."',
    criteria: "Calm, professional tone; no defensiveness; immediate pivot to solution.",
    responses: [
      { label: "Expected Response", escalation: false, text: "I hear the frustration. I want to get this fixed for you.\n\nTell me exactly what screen you're stuck on or what isn't working." },
    ],
    rules: ["Frustration Handling - Flat and Professional"],
    notes: "Previous version offered a human agent prematurely. Corrected to drive resolution first.",
  },
  {
    id: "tc10", num: "10", status: "pass", dot: "pass",
    title: "Safety Handling",
    sub: "Sensitive topic handling - immediate escalation",
    prompt: '"My driver got in an accident. Is Routemize liable?"',
    criteria: "No advice or interpretation; immediate escalation.",
    responses: [
      { label: "Expected Response", escalation: false, text: "I need to connect you with a team member who can assist with that specific type of request." },
    ],
    rules: ["Safety Protocol and Immediate Escalation"],
    notes: "This behavior was correctly implemented in testing and requires no further correction.",
    notesType: "notes",
  },
  {
    id: "tc11", num: "11", status: "verified", dot: "pass",
    title: "Context Isolation",
    sub: "Drop previous context on topic change",
    promptSeq: "1. How do I set a start location? -> Depot setup\n2. What about the color of the van icon?",
    criteria: "Fin answers only the current question without referencing previous context.",
    responses: [
      { label: "Expected Response", escalation: false, text: "I don't have specific documentation on customising van icon colours.\n\nI can help you with business branding instead -- would that be helpful?" },
    ],
    rules: ["Strict Context Isolation"],
    notes: "Verified in final test; context was correctly isolated.",
    notesType: "notes",
  },
  {
    id: "tc12", num: "12", status: "verified", dot: "pass",
    title: "Response Closing Behavior",
    sub: "Non-repetitive, purposeful closing",
    scenario: "Any completed response from the AI agent.",
    criteria: "Uses guided expansion by default. Never uses generic closings like \"Let me know if you need anything else.\"",
    responses: [],
    rules: ["Purposeful Closing with Guided Expansion"],
    notes: "This rule is embedded in multiple guidance entries across the framework.",
    notesType: "notes",
  },
  {
    id: "tc13", num: "13", status: "verified", dot: "pass",
    title: "Documentation Usage",
    sub: "Provide steps directly; avoid unnecessary links",
    prompt: '"How do I archive a request?"',
    criteria: "Provides steps directly; references documentation only if helpful and not as a default.",
    responses: [
      { label: "Expected Response", escalation: false, text: "To archive a request:\n• Go to Requests.\n• Select the request.\n• Click More Options (...).\n• Choose Archive.\n• Confirm.\n\nDo you want to archive it or delete it permanently?" },
    ],
    rules: ["Documentation Link Control"],
    notes: "Help Center link is omitted unless explicitly requested.",
    notesType: "notes",
  },
  {
    id: "tc14", num: "14", status: "corrected", dot: "flag",
    title: "Escalation Logic",
    sub: "Escalation decision - positive framing",
    scenario: "Unresolved or complex issue after one simplification attempt.",
    criteria: "Escalate only after defined triggers; frame escalation positively.",
    responses: [
      { label: "Expected Response - Escalation", escalation: true, text: "I want to make sure we get you the right help. Let me connect you with someone from the team." },
    ],
    rules: ["Escalation Trigger After Failed Clarification", "Escalation Framing as Positive Progress", "Escalation for Unsupported Features"],
    notes: "Escalation triggers are now clearly defined and tested. Prevents looping and ensures timely handoff to human agents.",
  },
];

const RULES_GROUPS = [
  {
    category: "Communication Style",
    rules: [
      { num: 1, name: "Universal Formatting - Blank Line Before Any Question", desc: "Insert a blank line before every question. Never place a question in the same paragraph as a statement." },
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
      { num: 7, name: "Loop Prevention - First Rejection", desc: "After first rejection, ask the user to describe their issue in one sentence." },
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
      { num: 11, name: "Frustration Handling - Flat and Professional", desc: "Acknowledge briefly; request specific issue; do not offer human agent prematurely." },
      { num: 12, name: "Negative Confirmation - Driving Action", desc: "Turn \"I don't have X\" into \"Let's create it. What do you see?\"" },
      { num: 13, name: "Safety Protocol and Immediate Escalation", desc: "No legal/liability advice; escalate immediately." },
      { num: 14, name: "Escalation Trigger After Failed Clarification", desc: "Two failed attempts -> escalate." },
      { num: 15, name: "Escalation for Unsupported or Non-Functional Features", desc: "Offer one alternative; if rejected -> escalate." },
      { num: 16, name: "Escalation Framing as Positive Progress", desc: "Frame escalation as helpful, not failure." },
    ],
  },
];

// ─── STYLES ──────────────────────────────────────────────────────────────────

const S = {
  page:           { fontFamily: "-apple-system,'Helvetica Neue',sans-serif", background: "#f7f7f7", color: "#111", minHeight: "100vh" },
  header:         { background: "#fff", borderBottom: "1px solid #e8e8e8", padding: "32px 40px 28px" },
  headerTop:      { display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  brandName:      { fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" },
  brandSub:       { fontFamily: "monospace", fontSize: 10, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 },
  tags:           { display: "flex", gap: 6, flexWrap: "wrap" },
  tagBase:        { fontFamily: "monospace", fontSize: 10, padding: "3px 9px", borderRadius: 4, border: "1px solid", letterSpacing: "0.08em", textTransform: "uppercase" },
  h1:             { fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 },
  headerDesc:     { fontSize: 13, color: "#888", maxWidth: 520, lineHeight: 1.7, marginBottom: 24 },
  stats:          { display: "flex", border: "1px solid #e8e8e8", borderRadius: 8, overflow: "hidden" },
  stat:           { flex: 1, padding: "14px 20px", background: "#fff" },
  statNum:        { fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 },
  statLabel:      { fontFamily: "monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#bbb", marginTop: 4 },
  layout:         { display: "grid", gridTemplateColumns: "220px 1fr" },
  sidebar:        { background: "#fff", borderRight: "1px solid #e8e8e8", padding: "20px 0", position: "sticky", top: 0, height: "calc(100vh - 200px)", overflowY: "auto" },
  sideToggle:     { display: "flex", gap: 4, padding: "0 14px 16px", borderBottom: "1px solid #f0f0f0", marginBottom: 14 },
  toggleBtn:      { flex: 1, padding: "5px 0", fontFamily: "monospace", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", border: "1px solid #e8e8e8", borderRadius: 4, cursor: "pointer", background: "#fff", color: "#aaa" },
  toggleActive:   { background: "#111", color: "#fff", border: "1px solid #111" },
  sideHead:       { fontFamily: "monospace", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "#ccc", padding: "0 14px", marginBottom: 8 },
  navBtn:         { display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", width: "100%", textAlign: "left", background: "transparent", border: "none", borderLeft: "2px solid transparent", cursor: "pointer" },
  navBtnActive:   { background: "#f5f5f5", borderLeft: "2px solid #111" },
  navNum:         { fontFamily: "monospace", fontSize: 10, color: "#ccc", width: 18, flexShrink: 0 },
  navLabel:       { fontSize: 12, color: "#888", flex: 1, lineHeight: 1.3 },
  navLabelActive: { color: "#111", fontWeight: 500 },
  dotPass:        { width: 6, height: 6, borderRadius: "50%", background: "#1a7a4a", flexShrink: 0, display: "inline-block" },
  dotFlag:        { width: 6, height: 6, borderRadius: "50%", background: "#92600a", flexShrink: 0, display: "inline-block" },
  legend:         { padding: "16px 14px 0", borderTop: "1px solid #f0f0f0", marginTop: 12 },
  legendItem:     { display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#aaa", marginBottom: 6 },
  content:        { padding: "28px 36px" },
  contentH2:      { fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 4 },
  contentP:       { fontSize: 12, color: "#aaa" },
  card:           { background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, marginBottom: 10, overflow: "hidden", scrollMarginTop: 24 },
  cardHeader:     { display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", cursor: "pointer", userSelect: "none" },
  cardNum:        { fontFamily: "monospace", fontSize: 11, color: "#ccc", width: 24, flexShrink: 0 },
  cardTitle:      { fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" },
  cardSub:        { fontFamily: "monospace", fontSize: 10, color: "#bbb", marginTop: 1 },
  cardBody:       { padding: "18px 18px 20px" },
  badgeCorrected: { fontFamily: "monospace", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 4, border: "1px solid #f0d9a0", background: "#fff8ec", color: "#92600a", flexShrink: 0 },
  badgeVerified:  { fontFamily: "monospace", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 4, border: "1px solid #c5d8f8", background: "#eef4ff", color: "#2c5fb3", flexShrink: 0 },
  badgePass:      { fontFamily: "monospace", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 4, border: "1px solid #c3e8d5", background: "#f0faf4", color: "#1a7a4a", flexShrink: 0 },
  twoCol:         { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 },
  infoBlock:      { background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 6, padding: "11px 13px" },
  blockLabel:     { fontFamily: "monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ccc", marginBottom: 7 },
  blockPrompt:    { fontFamily: "monospace", fontSize: 11, color: "#555", fontStyle: "italic", lineHeight: 1.5 },
  blockText:      { fontSize: 12, color: "#777", lineHeight: 1.6 },
  respBox:        { background: "#fafafa", border: "1px solid #f0f0f0", borderLeft: "3px solid #bbb", borderRadius: "0 6px 6px 0", padding: "12px 14px", marginBottom: 10 },
  respBoxEsc:     { background: "#fafafa", border: "1px solid #f0f0f0", borderLeft: "3px solid #e0a090", borderRadius: "0 6px 6px 0", padding: "12px 14px", marginBottom: 10 },
  respLabel:      { fontFamily: "monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#999", marginBottom: 8 },
  respLabelEsc:   { fontFamily: "monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#b05040", marginBottom: 8 },
  respText:       { fontFamily: "monospace", fontSize: 12, color: "#333", lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 },
  chips:          { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  chip:           { fontFamily: "monospace", fontSize: 10, padding: "3px 8px", borderRadius: 4, border: "1px solid #e8e8e8", color: "#888", background: "#fafafa" },
  notesBox:       { background: "#fffdf5", border: "1px solid #f0e8c0", borderRadius: 6, padding: "11px 13px" },
  notesLabel:     { fontFamily: "monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c0a040", marginBottom: 6 },
  notesText:      { fontSize: 12, color: "#777", lineHeight: 1.6, margin: 0 },
  rulesGroup:     { marginBottom: 32 },
  rulesGHead:     { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 },
  rulesGLabel:    { fontFamily: "monospace", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "#888", whiteSpace: "nowrap" },
  rulesDivider:   { flex: 1, height: 1, background: "#e8e8e8" },
  rulesTable:     { background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, overflow: "hidden" },
  ruleRow:        { display: "grid", gridTemplateColumns: "28px 1fr", gap: 14, padding: "13px 18px", alignItems: "start" },
  ruleNum:        { fontFamily: "monospace", fontSize: 11, color: "#ccc", paddingTop: 2 },
  ruleName:       { fontSize: 13, fontWeight: 600, marginBottom: 3 },
  ruleDesc:       { fontSize: 12, color: "#888", lineHeight: 1.6 },
  footer:         { display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, borderTop: "1px solid #e8e8e8", marginTop: 36, paddingTop: 20 },
  footerTxt:      { fontFamily: "monospace", fontSize: 11, color: "#ccc" },
};

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function Badge({ status }) {
  const style = status === "corrected" ? S.badgeCorrected : status === "verified" ? S.badgeVerified : S.badgePass;
  const label = status === "corrected" ? "Corrected" : status === "verified" ? "Verified" : "Passed";
  return <span style={style}>{label}</span>;
}

function Dot({ type }) {
  return <span style={type === "pass" ? S.dotPass : S.dotFlag} />;
}

function Chevron({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      style={{ color: "#ccc", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>
      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TestCard({ tc, open, onToggle }) {
  return (
    <div id={tc.id} style={S.card}>
      <div
        style={{ ...S.cardHeader, borderBottom: open ? "1px solid #f0f0f0" : "1px solid transparent" }}
        onClick={onToggle}
      >
        <span style={S.cardNum}>{tc.num}</span>
        <div style={{ flex: 1 }}>
          <div style={S.cardTitle}>{tc.title}</div>
          <div style={S.cardSub}>{tc.sub}</div>
        </div>
        <Badge status={tc.status} />
        <Chevron open={open} />
      </div>

      {open && (
        <div style={S.cardBody}>
          <div style={S.twoCol}>
            {tc.prompt && (
              <div style={S.infoBlock}>
                <div style={S.blockLabel}>Test Prompt</div>
                <span style={S.blockPrompt}>{tc.prompt}</span>
              </div>
            )}
            {tc.promptSeq && (
              <div style={S.infoBlock}>
                <div style={S.blockLabel}>Prompt Sequence</div>
                <span style={{ ...S.blockText, whiteSpace: "pre-line" }}>{tc.promptSeq}</span>
              </div>
            )}
            {tc.scenario && (
              <div style={S.infoBlock}>
                <div style={S.blockLabel}>Scenario</div>
                <span style={S.blockText}>{tc.scenario}</span>
              </div>
            )}
            <div style={S.infoBlock}>
              <div style={S.blockLabel}>Pass Criteria</div>
              <span style={S.blockText}>{tc.criteria}</span>
            </div>
          </div>

          {tc.responses.map((r, i) => (
            <div key={i} style={r.escalation ? S.respBoxEsc : S.respBox}>
              <div style={r.escalation ? S.respLabelEsc : S.respLabel}>{r.label}</div>
              <pre style={S.respText}>{r.text}</pre>
            </div>
          ))}

          {tc.rules.length > 0 && (
            <div style={S.chips}>
              {tc.rules.map((r, i) => <span key={i} style={S.chip}>{r}</span>)}
            </div>
          )}

          {tc.notes && (
            <div style={S.notesBox}>
              <div style={S.notesLabel}>{tc.notesType === "notes" ? "Notes" : "Correction Notes"}</div>
              <p style={S.notesText}>{tc.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RulesView() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={S.contentH2}>Guidance Rules Summary</h2>
        <p style={S.contentP}>16 rules across 4 categories defining all expected AI agent behaviors.</p>
      </div>
      {RULES_GROUPS.map((g, gi) => (
        <div key={gi} style={S.rulesGroup}>
          <div style={S.rulesGHead}>
            <span style={S.rulesGLabel}>{g.category}</span>
            <div style={S.rulesDivider} />
          </div>
          <div style={S.rulesTable}>
            {g.rules.map((r, ri) => (
              <div key={ri} style={{ ...S.ruleRow, borderBottom: ri < g.rules.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                <span style={S.ruleNum}>{r.num}</span>
                <div>
                  <div style={S.ruleName}>{r.name}</div>
                  <div style={S.ruleDesc}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={S.footer}>
        <span style={S.footerTxt}>Routemize · Fin AI Agent · QA Validation Framework v2.0 Final</span>
        <span style={S.footerTxt}>14 Test Cases · 16 Guidance Rules</span>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState("tests");
  const [openCards, setOpenCards] = useState({ tc1: true });
  const [activeId, setActiveId] = useState("tc1");
  const observerRef = useRef(null);

  const toggle = (id) => setOpenCards((p) => ({ ...p, [id]: !p[id] }));

  const navClick = (id) => {
    setView("tests");
    setActiveId(id);
    setOpenCards((p) => ({ ...p, [id]: true }));
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 30);
  };

  useEffect(() => {
    if (view !== "tests") return;
    observerRef.current?.disconnect();
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActiveId(e.target.id); }),
      { threshold: 0.3 }
    );
    observerRef.current = obs;
    TEST_CASES.forEach((tc) => {
      const el = document.getElementById(tc.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [view, openCards]);

  return (
    <div style={S.page}>
      {/* HEADER */}
      <div style={S.header}>
        <div style={S.headerTop}>
          <div>
            <div style={S.brandName}>Routemize</div>
            <div style={S.brandSub}>Fin AI Agent</div>
          </div>
          <div style={S.tags}>
            <span style={{ ...S.tagBase, borderColor: "#c3e8d5", color: "#1a7a4a", background: "#f0faf4" }}>v2.0 Final</span>
            <span style={{ ...S.tagBase, borderColor: "#c5d8f8", color: "#2c5fb3", background: "#eef4ff" }}>14 Test Cases</span>
            <span style={{ ...S.tagBase, borderColor: "#e8e8e8", color: "#888", background: "#fafafa" }}>QA Validated</span>
          </div>
        </div>
        <h1 style={S.h1}>QA Validation Framework Report</h1>
        <p style={S.headerDesc}>
          Defines quality assurance standards for the Routemize Fin AI Agent. Each test case validates specific behavior required for consistent, accurate, and brand-aligned customer interactions.
        </p>
        <div style={S.stats}>
          {[
            { num: "14", label: "Test Cases",         color: "#111" },
            { num: "16", label: "Guidance Rules",      color: "#111" },
            { num: "4",  label: "Rule Categories",     color: "#2c5fb3" },
            { num: "12", label: "Corrected Behaviors", color: "#1a7a4a" },
          ].map((s, i) => (
            <div key={i} style={{ ...S.stat, borderRight: i < 3 ? "1px solid #e8e8e8" : "none" }}>
              <div style={{ ...S.statNum, color: s.color }}>{s.num}</div>
              <div style={S.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div style={S.layout}>
        {/* SIDEBAR */}
        <aside style={S.sidebar}>
          <div style={S.sideToggle}>
            {["tests", "rules"].map((v) => (
              <button key={v} onClick={() => setView(v)}
                style={{ ...S.toggleBtn, ...(view === v ? S.toggleActive : {}) }}>
                {v === "tests" ? "Tests" : "Rules"}
              </button>
            ))}
          </div>

          {view === "tests" && (
            <>
              <div style={S.sideHead}>Test Cases</div>
              {TEST_CASES.map((tc) => (
                <button key={tc.id} onClick={() => navClick(tc.id)}
                  style={{ ...S.navBtn, ...(activeId === tc.id ? S.navBtnActive : {}) }}>
                  <span style={S.navNum}>{tc.num}</span>
                  <span style={{ ...S.navLabel, ...(activeId === tc.id ? S.navLabelActive : {}) }}>
                    {tc.title}
                  </span>
                  <Dot type={tc.dot} />
                </button>
              ))}
              <div style={S.legend}>
                <div style={S.legendItem}><Dot type="pass" /><span>Verified Pass</span></div>
                <div style={S.legendItem}><Dot type="flag" /><span>Corrected Behavior</span></div>
              </div>
            </>
          )}

          {view === "rules" && (
            <div style={{ padding: "0 14px" }}>
              {RULES_GROUPS.map((g, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: "monospace", fontSize: 9, color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, marginTop: i > 0 ? 12 : 0 }}>
                    {g.category}
                  </div>
                  {g.rules.map((r) => (
                    <div key={r.num} style={{ display: "flex", gap: 8, padding: "3px 0" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 10, color: "#ddd", width: 16, flexShrink: 0 }}>{r.num}</span>
                      <span style={{ fontSize: 11, color: "#888", lineHeight: 1.4 }}>{r.name}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* CONTENT */}
        <div style={S.content}>
          {view === "tests" && (
            <>
              <div style={{ marginBottom: 24 }}>
                <h2 style={S.contentH2}>Validation Test Cases</h2>
                <p style={S.contentP}>Click any card to expand its full test specification, expected responses, and mapped guidance rules.</p>
              </div>
              {TEST_CASES.map((tc) => (
                <TestCard key={tc.id} tc={tc} open={!!openCards[tc.id]} onToggle={() => toggle(tc.id)} />
              ))}
              <div style={S.footer}>
                <span style={S.footerTxt}>Routemize · Fin AI Agent · QA Validation Framework v2.0 Final</span>
                <span style={S.footerTxt}>14 Test Cases · 16 Guidance Rules</span>
              </div>
            </>
          )}
          {view === "rules" && <RulesView />}
        </div>
      </div>
    </div>
  );
}