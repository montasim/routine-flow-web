import React from "react";
import { User } from "@/types";

export function Topbar({ user, pageTitle }: { user: User, pageTitle: string }) {
  return (
    <div className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>{pageTitle}</h2>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }} className="hidden sm:block">
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, lineHeight: 1.2 }}>{user.name}</div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{user.email}</div>
          </div>
          {user.image ? (
            <img src={user.image} alt={user.name} style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid var(--surface-card)", boxShadow: "var(--shadow-sm)" }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--interactive)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: "var(--text-sm)", border: "2px solid var(--surface-card)" }}>
              {user.name.substring(0, 1).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
