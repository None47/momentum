"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/today", label: "TASKS" },
  { href: "/gym", label: "GYM" },
  { href: "/roadmap", label: "ROADMAP" },
] as const;

export default function SimpleTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-5 grid grid-cols-3 gap-2 rounded-[24px] border border-white/10 bg-[#090909] p-2">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex min-h-11 items-center justify-center rounded-[18px] px-3 py-3 text-[11px] font-semibold tracking-[0.12em] ${
              active ? "bg-white text-black" : "bg-black/20 text-white/65"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
