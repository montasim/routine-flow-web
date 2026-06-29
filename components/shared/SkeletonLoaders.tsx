import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function OverviewSkeleton() {
  return (
    <>
      <div className="grid gap-2.5 sm:gap-4 mb-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} style={{ height: 104, width: "100%" }} />)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
        <Skeleton style={{ height: 28, width: 200, marginBottom: 4 }} />
        {[1, 2, 3].map(i => <Skeleton key={i} style={{ height: 72, width: "100%" }} />)}
      </div>
    </>
  );
}

export function RoutinesSkeleton() {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <Skeleton style={{ height: 28, width: 140 }} />
        <Skeleton style={{ height: 38, width: 120, borderRadius: "var(--radius-md)" }} />
      </div>
      <div className="table-wrap" style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)" }}>
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              {[1, 2, 3, 4, 5, 6, 7].map(i => <th key={i}><Skeleton style={{ height: 14, width: "60%" }} /></th>)}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map(i => (
              <tr key={i}>
                <td colSpan={7} style={{ padding: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", padding: "12px 24px", gap: 16 }}>
                     <Skeleton style={{ height: 20, flex: 1 }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function CategoriesSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8 }}>
        <Skeleton style={{ height: 38, width: 140, borderRadius: "var(--radius-md)" }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ background: 'var(--surface-card)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--ring-hairline)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <Skeleton style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
               <Skeleton style={{ height: 20, width: "60%" }} />
               <Skeleton style={{ height: 14, width: "40%" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatisticsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Skeleton style={{ width: "100%", height: 300 }} />
      <div className="grid gap-2.5 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-2">
         {[1, 2, 3, 4].map(i => <Skeleton key={i} style={{ height: 104, width: "100%" }} />)}
      </div>
    </div>
  );
}

export function LogsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 12 }}>
         {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} style={{ height: 34, width: 80, borderRadius: "var(--radius-pill)" }} />)}
      </div>
      <div className="table-wrap" style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)" }}>
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              {[1, 2, 3, 4, 5, 6].map(i => <th key={i}><Skeleton style={{ height: 14, width: "60%" }} /></th>)}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <tr key={i}>
                <td colSpan={6} style={{ padding: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", padding: "12px 24px", gap: 16 }}>
                     <Skeleton style={{ height: 20, flex: 1 }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40, maxWidth: 640 }}>
       {[1, 2, 3, 4].map(section => (
         <div key={section} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
               <Skeleton style={{ height: 20, width: 150, marginBottom: 6 }} />
               <Skeleton style={{ height: 14, width: 250 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
               {[1, 2].map(field => (
                  <div key={field}>
                     <Skeleton style={{ height: 12, width: 80, marginBottom: 8 }} />
                     <Skeleton style={{ height: 42, width: "100%" }} />
                  </div>
               ))}
            </div>
         </div>
       ))}
    </div>
  );
}
