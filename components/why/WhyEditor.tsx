"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getWhyText, saveWhyText } from "@/lib/momentum";

export default function WhyEditor({ prompt }: { prompt?: string }) {
  const [value, setValue] = useState(() => getWhyText());

  useEffect(() => {
    if (!value) return;
    saveWhyText(value);
  }, [value]);

  return (
    <main className="min-h-screen bg-black px-5 pb-10 pt-5">
      <div className="mx-auto max-w-lg">
        <div className="mb-5 flex items-center justify-between">
          <Link href="/today" className="text-[12px] tracking-[0.16em] text-white/45">
            BACK
          </Link>
          {prompt === "missed" && (
            <p className="text-[12px] tracking-[0.12em] text-[#ff8d8d]">You missed yesterday. Read this.</p>
          )}
        </div>

        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-h-[70vh] w-full resize-none border-0 bg-transparent text-[22px] leading-10 text-white placeholder:text-white/20"
          placeholder="Write why this matters."
        />
      </div>
    </main>
  );
}
