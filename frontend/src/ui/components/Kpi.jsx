import React from "react";
import { cn } from "../../lib/cn.js";

export default function Kpi({ label, value, hint, tone = "indigo" }) {
  const tones = {
    indigo: "from-indigo-500/25 to-indigo-500/5 border-indigo-400/20",
    emerald: "from-emerald-500/25 to-emerald-500/5 border-emerald-400/20",
    amber: "from-amber-500/25 to-amber-500/5 border-amber-400/20",
    rose: "from-rose-500/25 to-rose-500/5 border-rose-400/20"
  };
  return (
    <div className={cn("rounded-2xl border bg-gradient-to-b p-4", tones[tone] || tones.indigo)}>
      <div className="text-xs text-slate-300">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint ? <div className="text-xs text-slate-400 mt-1">{hint}</div> : null}
    </div>
  );
}

