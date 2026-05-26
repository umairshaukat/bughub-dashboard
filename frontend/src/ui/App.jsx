import React, { useEffect, useMemo, useState } from "react";
import { PhoneCall, Inbox, MessageSquare, Users, Settings, Sparkles } from "lucide-react";
import { cn } from "../lib/cn.js";
import LiveCalls from "./pages/LiveCalls.jsx";
import InboxPage from "./pages/InboxPage.jsx";
import MessagesPage from "./pages/MessagesPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import { realtime } from "../lib/realtime.js";

const NAV = [
  { key: "live", label: "Live Calls", icon: PhoneCall },
  { key: "inbox", label: "Call Inbox", icon: Inbox },
  { key: "messages", label: "Conversations", icon: MessageSquare },
  { key: "agents", label: "Agents", icon: Users, disabled: true },
  { key: "settings", label: "Settings", icon: Settings }
];

export default function App() {
  const [active, setActive] = useState("live");
  const [serverTime, setServerTime] = useState(null);

  useEffect(() => {
    const onHello = (msg) => setServerTime(msg.time);
    realtime.on("server:hello", onHello);
    return () => realtime.off("server:hello", onHello);
  }, []);

  const page = useMemo(() => {
    if (active === "live") return <LiveCalls />;
    if (active === "inbox") return <InboxPage />;
    if (active === "messages") return <MessagesPage />;
    return <SettingsPage />;
  }, [active]);

  return (
    <div className="min-h-screen grid grid-cols-[280px_1fr]">
      <aside className="p-5 border-r border-white/10 bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 shadow-glow grid place-items-center">
            <Sparkles className="h-5 w-5 text-indigo-200" />
          </div>
          <div>
            <div className="font-semibold leading-tight">Omni Dashboard</div>
            <div className="text-xs text-slate-400">Twilio Voice + Conversations</div>
          </div>
        </div>

        <nav className="mt-6 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                disabled={item.disabled}
                onClick={() => setActive(item.key)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition",
                  item.disabled && "opacity-40 cursor-not-allowed",
                  isActive
                    ? "bg-white/8 border border-white/10 shadow-glow"
                    : "hover:bg-white/5 border border-transparent"
                )}
              >
                <Icon className="h-4 w-4 text-slate-200" />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 text-xs text-slate-500">
          {serverTime ? <div>Connected · {new Date(serverTime).toLocaleString()}</div> : <div>Connecting…</div>}
        </div>
      </aside>

      <main className="p-6">{page}</main>
    </div>
  );
}
