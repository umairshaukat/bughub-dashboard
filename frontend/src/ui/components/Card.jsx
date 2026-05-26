import React from "react";
import { cn } from "../../lib/cn.js";

export default function Card({ title, right, children, className }) {
  return (
    <div className={cn("glass rounded-2xl shadow-glow p-4", className)}>
      {(title || right) && (
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">{title}</div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

