import { ImageResponse } from "next/og"

import { siteConfig } from "@/lib/seo"

export const alt = "RoutineFlow social preview"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f7f8f3",
          color: "#16181d",
          padding: 72,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 86,
              height: 86,
              borderRadius: 20,
              background: "#2f8f5b",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: 0,
            }}
          >
            RF
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 24 }}>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 800, letterSpacing: 0 }}>
              <span>Routine</span>
              <span style={{ color: "#3e63ff" }}>Flow</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 22, color: "#606874" }}>
              Behavioral routine execution tracking
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 840 }}>
          <div style={{ fontSize: 68, lineHeight: 1.02, fontWeight: 800, letterSpacing: 0 }}>
            Measure routines. Prevent behavioral drift.
          </div>
          <div style={{ marginTop: 28, fontSize: 28, lineHeight: 1.35, color: "#3f4651" }}>
            {siteConfig.description}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 16, height: 16, borderRadius: 16, background: "#2f8f5b" }} />
            <div style={{ marginLeft: 12, fontSize: 22, color: "#3f4651" }}>
              Schedules · Logs · Analytics
            </div>
          </div>
          <div style={{ fontSize: 20, color: "#606874" }}>{siteConfig.url.host}</div>
        </div>
      </div>
    ),
    size
  )
}
