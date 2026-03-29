"use client";

import type { AIBrief } from "@/lib/types";

interface AIBriefCardProps {
  brief: AIBrief | null;
  loading: boolean;
  onRefresh: () => void;
}

export default function AIBriefCard({ brief, loading, onRefresh }: AIBriefCardProps) {
  return (
    <div className="relative border border-[#1a3a5c] bg-gradient-to-br from-[#0d1521] to-[#0d0d0d] rounded-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] tracking-[0.2em] text-[#3b82f6]/60 uppercase">
          Morning Brief
        </span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-[9px] text-[#525252] hover:text-[#737373] transition-colors disabled:opacity-30"
        >
          {loading ? "..." : "↻"}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-3 ai-shimmer rounded w-full" />
          <div className="h-3 ai-shimmer rounded w-4/5" />
          <div className="h-3 ai-shimmer rounded w-3/5" />
        </div>
      ) : brief ? (
        <p className="text-[12px] leading-relaxed text-[#a0b4c8]">
          {brief.brief_text}
        </p>
      ) : (
        <p className="text-[11px] text-[#525252] italic">
          No brief yet today. Tap refresh to generate.
        </p>
      )}
    </div>
  );
}
