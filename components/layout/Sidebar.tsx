import React from "react";
import { LayoutDashboard, Folder, BarChart3, Repeat, List, Download, Settings } from "lucide-react";

export const MARK_SVG = (
  <svg width="100%" height="100%" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="RoutineFlow mark" style={{ display: "block" }}>
    <rect width="96" height="96" rx="22" fill="#16181D" />
    <rect x="22" y="58" width="9" height="16" rx="3" fill="#6A6E78" />
    <rect x="35" y="48" width="9" height="26" rx="3" fill="#8B909B" />
    <rect x="48" y="36" width="9" height="38" rx="3" fill="#25B36B" />
    <rect x="61" y="24" width="9" height="50" rx="3" fill="#3E63FF" />
    <circle cx="65.5" cy="20" r="6" fill="#3E63FF" />
  </svg>
);

export const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
  { id: "categories", label: "Categories", icon: <Folder size={18} /> },
  { id: "statistics", label: "Statistics", icon: <BarChart3 size={18} /> },
  { id: "routines", label: "Routines", icon: <Repeat size={18} /> },
  { id: "logs", label: "Logs", icon: <List size={18} /> },
  { id: "exports", label: "Exports", icon: <Download size={18} /> }
];

export function Sidebar({ nav, setNav, setSelectedCategory }: { nav: string, setNav: (nav: string) => void, setSelectedCategory?: (c: any) => void }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div style={{ width: 30, height: 30, flexShrink: 0, overflow: "hidden", borderRadius: 7, lineHeight: 0 }}>
          {MARK_SVG}
        </div>
        <span className="brand-name">Routine<span className="brand-flow">Flow</span></span>
      </div>
      {NAV_ITEMS.map(n => (
        <button key={n.id} className={'nav-btn' + (nav === n.id ? ' active' : '')} onClick={() => { setNav(n.id); if (n.id === 'categories' && setSelectedCategory) setSelectedCategory(null); }}>
          {n.icon}
          {n.label}
        </button>
      ))}
      <div className="nav-foot">
        <button className={'nav-btn' + (nav === 'settings' ? ' active' : '')} onClick={() => setNav("settings")}>
          <Settings size={18} />Settings
        </button>
      </div>
    </aside>
  );
}
