"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const tabs = [
  { href: "/today", label: "TODAY", icon: <span className="text-[14px]">□</span> },
  { href: "/chain", label: "CHAIN", icon: <ChainIcon /> },
  { href: "/roadmap", label: "ROADMAP", icon: <RoadmapIcon /> },
  { href: "/gym", label: "GYM", icon: <DumbbellIcon /> },
  { href: "/stats", label: "STATS", icon: <span className="text-[13px]">▲</span> },
];

function ChainIcon() {
  return (
    <svg viewBox="0 0 32 12" className="h-3.5 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="5" cy="6" r="2.5" />
      <circle cx="16" cy="6" r="2.5" />
      <circle cx="27" cy="6" r="2.5" />
      <path d="M7.5 6h6" />
      <path d="M18.5 6h6" />
    </svg>
  );
}

function RoadmapIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 18h4v-4H4z" />
      <path d="M10 14h4v-4h-4z" />
      <path d="M16 10h4V6h-4z" />
      <path d="M8 16h2" />
      <path d="M14 12h2" />
    </svg>
  );
}

function DumbbellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10v4" />
      <path d="M6 8v8" />
      <path d="M18 8v8" />
      <path d="M21 10v4" />
      <path d="M8.5 12h7" />
      <path d="M6 12h1.5" />
      <path d="M16.5 12H18" />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#1a1a1a] bg-[#060606]/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 items-center py-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 px-1 py-1 transition-colors duration-200 ${
                isActive
                  ? "text-[#e5e5e5]"
                  : "text-white/30 hover:text-white/50"
              }`}
            >
              <NavIcon>{tab.icon}</NavIcon>
              <span className="text-[9px] font-medium tracking-[0.08em]">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function NavIcon({ children }: { children: ReactNode }) {
  return <span className="flex h-4 items-center justify-center">{children}</span>;
}
