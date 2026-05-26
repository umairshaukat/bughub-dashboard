import React from "react";
import { cn } from "../../lib/cn.js";

export default function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-800/60 border-white/10 text-slate-200",
    green: "bg-emerald-500/15 border-emerald-400/25 text-emerald-200",
    amber: "bg-amber-500/15 border-amber-400/25 text-amber-200",
    red: "bg-rose-500/15 border-rose-400/25 text-rose-200",
    indigo: "bg-indigo-500/15 border-indigo-400/25 text-indigo-200"
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-lg border text-xs", tones[tone] || tones.slate)}>
      {children}
    </span>
  );
}

