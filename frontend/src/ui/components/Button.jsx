import React from "react";
import { cn } from "../../lib/cn.js";

export default function Button({ children, className, tone = "indigo", ...props }) {
  const tones = {
    indigo: "bg-indigo-500/20 border-indigo-400/25 hover:bg-indigo-500/25 shadow-glow",
    slate: "bg-white/6 border-white/10 hover:bg-white/8",
    green: "bg-emerald-500/15 border-emerald-400/25 hover:bg-emerald-500/20",
    red: "bg-rose-500/15 border-rose-400/25 hover:bg-rose-500/20"
  };
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
        tones[tone] || tones.indigo,
        className
      )}
    >
      {children}
    </button>
  );
}

