"use client";

import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";
import Header from "./Header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showChrome = !pathname.startsWith("/api");

  if (!showChrome) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <div className="pb-20">{children}</div>
      <BottomNav />
    </>
  );
}
