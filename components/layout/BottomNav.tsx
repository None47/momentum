"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const tabs = [
  { href: "/today", label: "TODAY", icon: <span className="text-[14px]">□</span> },
  { href: "/chain", label: "CHAIN", icon: <ChainIcon /> },
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

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#1a1a1a] bg-[#060606]/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-lg mx-auto grid grid-cols-3 items-center py-2">
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
              <span className="text-[10px] tracking-[0.12em] font-medium">
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
