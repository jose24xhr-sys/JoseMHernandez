export default function OpsTracker() {
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <iframe
        src="/ops-tracker.html"
        style={{ width: "100%", height: "100%", border: "none" }}
        title="Ops Tracker"
      />
    </div>
  );
}