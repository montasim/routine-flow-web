import React from "react";
import { Settings } from "lucide-react";
import { NAV_ITEMS } from "./Sidebar";

export function MobileNav({ nav, setNav, setSelectedCategory }: { nav: string, setNav: (nav: string) => void, setSelectedCategory?: (c: any) => void }) {
  return (
    <div className="mobile-topnav">
      {[...NAV_ITEMS, { id: "settings", label: "Settings", icon: <Settings size={16} /> }].map(n => (
        <button key={n.id} className={'mobile-topnav-btn' + (nav === n.id ? ' active' : '')} onClick={() => { setNav(n.id); if (n.id === 'categories' && setSelectedCategory) setSelectedCategory(null); }}>
          {n.icon}
          {n.label}
        </button>
      ))}
    </div>
  );
}
