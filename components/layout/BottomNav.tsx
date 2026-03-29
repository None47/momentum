"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/today", label: "TODAY", icon: "☐" },
  { href: "/chain", label: "CHAIN", icon: "⛓" },
  { href: "/stats", label: "STATS", icon: "◈" },
  { href: "/roadmap", label: "MAP", icon: "🗺" },
  { href: "/journal", label: "LOG", icon: "▤" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#1a1a1a] bg-[#060606]/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-lg mx-auto flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 px-3 py-1 transition-colors duration-200 ${
                isActive
                  ? "text-[#e5e5e5]"
                  : "text-[#525252] hover:text-[#737373]"
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="text-[9px] tracking-[0.15em] font-medium">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
