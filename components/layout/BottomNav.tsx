"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/today", label: "TODAY", icon: "☐" },
  { href: "/chain", label: "CHAIN", icon: "⛓" },
  { href: "/roadmap", label: "ROADMAP", icon: "🗺" },
  { href: "/gym", label: "GYM", icon: "🏋" },
  { href: "/stats", label: "STATS", icon: "◈" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#1a1a1a] bg-[#060606]/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-lg mx-auto grid grid-cols-5 items-center py-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 px-1 py-1 transition-colors duration-200 ${
                isActive
                  ? "text-[#e5e5e5]"
                  : "text-[#525252] hover:text-[#737373]"
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="text-[8px] tracking-[0.12em] font-medium">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
