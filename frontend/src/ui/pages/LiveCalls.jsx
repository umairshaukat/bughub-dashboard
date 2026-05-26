import React, { useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/Card.jsx";
import Kpi from "../components/Kpi.jsx";
import Badge from "../components/Badge.jsx";
import Button from "../components/Button.jsx";
import { getJson } from "../../lib/api.js";
import { createVoiceDevice } from "../../lib/twilio/voice.js";
import { loadPrefs, savePrefs } from "../../lib/prefs.js";
import { realtime } from "../../lib/realtime.js";

const AUX_CODES = ["Ready", "On Inspection", "Route Follow-Up", "Treatment Callback", "Team Briefing", "Break", "End of Shift"];

export default function LiveCalls() {
  const [recentCalls, setRecentCalls] = useState([]);
  const [aux, setAux] = useState("Ready");
  const [identity, setIdentity] = useState(() => loadPrefs().identity || import.meta.env.VITE_DEFAULT_IDENTITY || "agent@example.com");
  const [deviceState, setDeviceState] = useState("disconnected");
  const [deviceError, setDeviceError] = useState(null);
  const [dialTo, setDialTo] = useState("");
  const deviceRef = useRef(null);
  const activeConnRef = useRef(null);
  const [incoming, setIncoming] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [contact, setContact] = useState(null);

  useEffect(() => {
    let mounted = true;
    getJson("/api/calls/recent")
      .then((d) => mounted && setRecentCalls(d.calls || []))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    savePrefs({ ...loadPrefs(), identity });
  }, [identity]);

  async function connectVoice() {
    setDeviceError(null);
    setDeviceState("connecting");
    try {
      if (deviceRef.current) {
        deviceRef.current.destroy();
        deviceRef.current = null;
      }
      const device = await createVoiceDevice({
        identity,
        onEvent: (type, payload) => {
          if (type === "registered") setDeviceState("ready");
          if (type === "unregistered") setDeviceState("disconnected");
          if (type === "destroyed") setDeviceState("disconnected");
          if (type === "error") setDeviceError(payload?.message || "Voice error");
          if (type === "incoming") setIncoming(payload);
        }
      });
      deviceRef.current = device;
      setDeviceState("ready");
    } catch (e) {
      setDeviceError(e.message || "Failed to connect Voice");
      setDeviceState("disconnected");
    }
  }

  function disconnectVoice() {
    if (activeConnRef.current) {
      activeConnRef.current.disconnect();
      activeConnRef.current = null;
    }
    if (deviceRef.current) {
      deviceRef.current.destroy();
      deviceRef.current = null;
    }
    setIncoming(null);
    setActiveCall(null);
    setDeviceState("disconnected");
  }

  async function acceptIncoming() {
    if (!incoming) return;
    setIncoming(null);
    const conn = incoming.accept();
    activeConnRef.current = conn;
    setActiveCall({ direction: "inbound", from: incoming.parameters?.From, to: incoming.parameters?.To, status: "in-progress" });
    await lookupContact(incoming.parameters?.From);
    wireConn(conn);
  }

  function rejectIncoming() {
    if (!incoming) return;
    incoming.reject();
    setIncoming(null);
  }

  async function startOutbound() {
    if (!deviceRef.current || deviceState !== "ready") return;
    if (!dialTo.trim()) return;
    setDeviceError(null);
    const conn = await deviceRef.current.connect({ params: { To: dialTo.trim() } });
    activeConnRef.current = conn;
    setActiveCall({ direction: "outbound", from: identity, to: dialTo.trim(), status: "in-progress" });
    setContact(null);
    wireConn(conn);
  }

  function hangup() {
    if (activeConnRef.current) activeConnRef.current.disconnect();
  }

  function wireConn(conn) {
    conn.on("disconnect", () => {
      setActiveCall((c) => (c ? { ...c, status: "completed" } : c));
      activeConnRef.current = null;
    });
    conn.on("cancel", () => {
      setActiveCall(null);
      activeConnRef.current = null;
    });
    conn.on("error", (e) => setDeviceError(e?.message || "Call error"));
  }

  async function lookupContact(phone) {
    if (!phone) return setContact(null);
    try {
      const res = await getJson(`/api/contacts/lookup?phone=${encodeURIComponent(phone)}`);
      setContact(res.contact || null);
    } catch {
      setContact(null);
    }
  }

  useEffect(() => {
    const onCreated = (c) => setRecentCalls((prev) => [{ callSid: c.callSid, fromNumber: c.from, toNumber: c.to, status: c.status }, ...prev].slice(0, 100));
    const onStatus = (u) =>
      setRecentCalls((prev) =>
        prev.map((c) => (c.callSid === u.callSid ? { ...c, status: u.status || c.status } : c))
      );
    realtime.on("call:created", onCreated);
    realtime.on("call:status", onStatus);
    return () => {
      realtime.off("call:created", onCreated);
      realtime.off("call:status", onStatus);
    };
  }, []);

  const stats = useMemo(() => {
    const queued = recentCalls.filter((c) => String(c.status).includes("queued") || String(c.status).includes("ring")).length;
    const inProgress = recentCalls.filter((c) => String(c.status).includes("in-progress")).length;
    const completed = recentCalls.filter((c) => String(c.status).includes("completed")).length;
    return { queued, inProgress, completed };
  }, [recentCalls]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-semibold">Live Calls</div>
          <div className="text-sm text-slate-400">Real-time visibility into inbound calls and outcomes.</div>
        </div>
        <div className="glass rounded-2xl p-2 flex items-center gap-2">
          <div className="text-xs text-slate-400 pl-2">Aux</div>
          <select
            value={aux}
            onChange={(e) => setAux(e.target.value)}
            className="bg-transparent text-sm outline-none px-2 py-1 rounded-xl border border-white/10"
          >
            {AUX_CODES.map((c) => (
              <option key={c} value={c} className="bg-slate-900">
                {c}
              </option>
            ))}
          </select>
          <Badge tone={aux === "Ready" ? "green" : "amber"}>{aux === "Ready" ? "Receiving" : "Not Ready"}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Kpi label="Queued / Ringing" value={stats.queued} hint="Waiting for pickup" tone="amber" />
        <Kpi label="In Progress" value={stats.inProgress} hint="Active calls" tone="indigo" />
        <Kpi label="Completed" value={stats.completed} hint="Finished today (recent)" tone="emerald" />
        <Kpi label="Quality Score" value="—" hint="Enable scoring pipeline" tone="rose" />
      </div>

      <div className="grid grid-cols-[1.2fr_0.8fr] gap-4">
        <Card
          title="Incoming & Recent"
          right={<div className="text-xs text-slate-400">Updates via webhooks</div>}
          className="min-h-[520px]"
        >
          <div className="space-y-2">
            {recentCalls.length === 0 ? (
              <div className="text-sm text-slate-400">No calls yet. Configure your Twilio number/TwiML App to hit the inbound webhook.</div>
            ) : (
              recentCalls.slice(0, 20).map((c) => (
                <div key={c.callSid} className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.fromNumber || "Unknown caller"}</div>
                    <div className="text-xs text-slate-400 truncate">To {c.toNumber || "—"} · {c.callSid}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={toneForStatus(c.status)}>{String(c.status || "unknown")}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Call Screen" className="min-h-[520px]">
          <div className="space-y-3">
            <div className="glass rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Voice Device</div>
                  <div className="font-medium mt-0.5">{deviceState === "ready" ? "Connected" : deviceState}</div>
                </div>
                <Badge tone={deviceState === "ready" ? "green" : "amber"}>{deviceState === "ready" ? "Online" : "Offline"}</Badge>
              </div>
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 mt-3">
                <input
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  className="bg-transparent border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-indigo-400/40"
                  placeholder="agent@example.com"
                />
                <Button tone="slate" onClick={connectVoice} disabled={!identity.trim()}>
                  Connect
                </Button>
                <Button tone="red" onClick={disconnectVoice} disabled={deviceState === "disconnected"}>
                  Disconnect
                </Button>
              </div>
              {deviceError ? <div className="text-xs text-rose-200 mt-2">{deviceError}</div> : null}
            </div>

            <div className="glass rounded-xl p-3">
              <div className="text-xs text-slate-400">Outbound Dial</div>
              <div className="flex gap-2 mt-2">
                <input
                  value={dialTo}
                  onChange={(e) => setDialTo(e.target.value)}
                  className="flex-1 bg-transparent border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-indigo-400/40"
                  placeholder="+15551234567"
                />
                <Button onClick={startOutbound} disabled={deviceState !== "ready" || !dialTo.trim()}>
                  Call
                </Button>
                <Button tone="red" onClick={hangup} disabled={!activeConnRef.current}>
                  Hang up
                </Button>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-white/10 bg-gradient-to-b from-indigo-500/15 to-transparent">
              <div className="text-xs text-slate-300">Name / Phone Number</div>
              <div className="text-lg font-semibold">
                {contact?.name || (activeCall?.direction === "inbound" ? activeCall?.from : "—")}
              </div>
              <div className="text-xs text-slate-400">
                {contact?.pestpacLocationNumber ? `PestPac #${contact.pestpacLocationNumber}` : "PestPac location # —"} ·{" "}
                {contact?.address || "Address —"}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="glass rounded-xl p-3">
                <div className="text-xs text-slate-400">Answered By</div>
                <div className="font-medium">{activeCall?.direction === "inbound" ? identity : "—"}</div>
              </div>
              <div className="glass rounded-xl p-3">
                <div className="text-xs text-slate-400">Duration</div>
                <div className="font-medium">—</div>
              </div>
            </div>
            <div className="glass rounded-xl p-3">
              <div className="text-xs text-slate-400">AI Summary</div>
              <div className="text-sm text-slate-200 mt-1">Hook your transcription + summary pipeline here.</div>
            </div>
            <div className="glass rounded-xl p-3">
              <div className="text-xs text-slate-400">Transcript</div>
              <div className="text-sm text-slate-500 mt-1">Live transcript can stream in; full transcript attaches after call ends.</div>
            </div>
          </div>
        </Card>
      </div>

      {incoming ? (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm grid place-items-center p-6">
          <div className="glass rounded-3xl p-5 w-full max-w-lg shadow-glow border border-indigo-400/15">
            <div className="text-xs text-slate-400">Incoming call</div>
            <div className="text-2xl font-semibold mt-1">{incoming.parameters?.From || "Unknown"}</div>
            <div className="text-sm text-slate-400 mt-1">To {incoming.parameters?.To || "—"}</div>
            <div className="flex gap-3 mt-5">
              <Button tone="green" onClick={acceptIncoming} className="flex-1">
                Accept
              </Button>
              <Button tone="red" onClick={rejectIncoming} className="flex-1">
                Decline
              </Button>
            </div>
            <div className="text-xs text-slate-500 mt-3">
              Tip: TaskRouter should dequeue to `client:{identity}` so this rings in the browser.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function toneForStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("completed")) return "green";
  if (s.includes("in-progress")) return "indigo";
  if (s.includes("failed") || s.includes("busy") || s.includes("no-answer")) return "red";
  if (s.includes("queued") || s.includes("ring")) return "amber";
  return "slate";
}
