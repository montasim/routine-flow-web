import React from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function MetricTile({ label, value, unit = "", tone = "default", delta, deltaDirection }: any) {
  const colors: any = {
    default: "var(--text-primary)",
    completed: "var(--completed-600)",
    missed: "var(--missed-600)",
    signal: "var(--signal-500)"
  };
  return (
    <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: 10, boxShadow: "var(--ring-hairline)" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-caps)", color: "var(--text-secondary)", fontWeight: 500 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-4xl)", fontWeight: 700, letterSpacing: "-0.02em", color: colors[tone] }}>{value}</span>
        {unit && <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-muted)" }}>{unit}</span>}
      </div>
      {delta && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "var(--text-xs)", fontWeight: 500, color: deltaDirection === "up" ? "var(--completed-600)" : "var(--missed-600)" }}>
          {deltaDirection === "up" ? "↑" : "↓"} {delta}
        </div>
      )}
    </div>
  );
}

function OccurrenceRow({ id, time, title, category, status, delay, onComplete, onSkip }: any) {
  const isPast = new Date() > new Date(); // Simplified for now

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", background: "var(--surface-card)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-md)", fontWeight: 600, color: "var(--text-secondary)", width: 60 }}>{time}</div>
        <div>
          <div style={{ fontSize: "var(--text-md)", fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-muted)" }} />
              {category}
            </span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {status === "Pending" ? (
          <>
            <Button variant="outline" size="sm" onClick={() => onSkip(id)} className="h-9 px-4 hover:bg-[var(--missed-100)] hover:text-[var(--missed-600)] hover:border-[var(--missed-200)]">
              Skip
            </Button>
            <Button size="sm" onClick={() => onComplete(id)} className="h-9 px-4 bg-[var(--completed-600)] hover:bg-[var(--completed-700)] text-white">
              <Check className="w-4 h-4 mr-1.5" />
              Complete
            </Button>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: "var(--radius-pill)", background: status === "Completed" ? "var(--completed-100)" : status === "Missed" ? "var(--missed-100)" : "var(--surface-sunken)", color: status === "Completed" ? "var(--completed-700)" : status === "Missed" ? "var(--missed-700)" : "var(--text-secondary)", fontSize: "var(--text-xs)", fontWeight: 600, fontFamily: "var(--font-mono)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase" }}>
            {status === "Completed" ? <Check size={14} /> : status === "Missed" ? <X size={14} /> : null}
            {status}
            {delay != null && delay > 0 && <span style={{ opacity: 0.8, marginLeft: 4 }}>+{delay}m</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export function OverviewView({ analytics: D, occurrences, routines, handleCompleteOccurrence, handleSkipOccurrence }: any) {
  return (
    <>
      <div className="grid gap-2.5 sm:gap-4 mb-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Completion rate" value={D?.metrics?.daily?.completion || 0} unit="%" />
        <MetricTile label="Missed" value={D?.metrics?.daily?.missed || 0} tone="missed" />
        <MetricTile label="Avg delay" value={D?.metrics?.daily?.avgDelay || 0} unit="min" tone="completed" />
        <MetricTile label="Best routine" value={D?.metrics?.daily?.bestRoutine || "—"} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, marginBottom: 4 }}>Today's occurrences</div>
        {occurrences?.length === 0 ? (
          <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "32px", textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
            NO OCCURRENCES SCHEDULED TODAY. NEXT OCCURRENCES GENERATE AT 23:00.
          </div>
        ) : (
          occurrences?.map((o: any) => {
            const r = routines?.find((x: any) => x.id === o.routineId);
            return (
              <OccurrenceRow
                key={o.id}
                id={o.id}
                time={o.scheduledTime}
                title={r ? r.title : "Unknown Routine"}
                category={r ? r.category : ""}
                status={o.status}
                delay={o.delay}
                onComplete={handleCompleteOccurrence}
                onSkip={handleSkipOccurrence}
              />
            );
          })
        )}
      </div>
    </>
  );
}
