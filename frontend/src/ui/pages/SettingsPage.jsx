import React, { useMemo, useState } from "react";
import Card from "../components/Card.jsx";
import Badge from "../components/Badge.jsx";
import { BACKEND_URL, getToken } from "../../lib/api.js";

export default function SettingsPage() {
  const [identity, setIdentity] = useState(import.meta.env.VITE_DEFAULT_IDENTITY || "agent@example.com");
  const [workerSid, setWorkerSid] = useState(import.meta.env.VITE_TASKROUTER_WORKER_SID || "");
  const [voiceToken, setVoiceToken] = useState(null);
  const [convToken, setConvToken] = useState(null);
  const [trToken, setTrToken] = useState(null);
  const [error, setError] = useState(null);

  const hints = useMemo(
    () => [
      { label: "Backend", value: BACKEND_URL },
      { label: "Identity", value: identity },
      { label: "Worker SID", value: workerSid || "—" }
    ],
    [identity, workerSid]
  );

  async function generate() {
    setError(null);
    try {
      const v = await getToken("voice", { identity });
      const c = await getToken("conversations", { identity });
      setVoiceToken(v.token);
      setConvToken(c.token);
      if (workerSid) {
        const t = await getToken("taskrouter", { workerSid });
        setTrToken(t.token);
      } else {
        setTrToken(null);
      }
    } catch (e) {
      setError(e.message || "Failed");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-2xl font-semibold">Settings</div>
        <div className="text-sm text-slate-400">Generate client tokens and validate your backend connectivity.</div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {hints.map((h) => (
          <Card key={h.label} title={h.label}>
            <div className="text-sm text-slate-200 break-all">{h.value}</div>
          </Card>
        ))}
      </div>

      <Card title="Token Generator" right={error ? <Badge tone="red">{error}</Badge> : <Badge tone="green">Ready</Badge>}>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Identity">
            <input
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              className="w-full bg-transparent border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-indigo-400/40"
              placeholder="agent@example.com"
            />
          </Field>
          <Field label="TaskRouter Worker SID (optional)">
            <input
              value={workerSid}
              onChange={(e) => setWorkerSid(e.target.value)}
              className="w-full bg-transparent border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-indigo-400/40"
              placeholder="WKxxxxxxxx"
            />
          </Field>
          <div className="flex items-end">
            <button
              onClick={generate}
              className="w-full rounded-xl bg-indigo-500/20 border border-indigo-400/25 hover:bg-indigo-500/25 transition px-4 py-2 font-medium shadow-glow"
            >
              Generate Tokens
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <TokenBox label="Voice Token" token={voiceToken} />
          <TokenBox label="Conversations Token" token={convToken} />
          <TokenBox label="TaskRouter Token" token={trToken} />
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-2">{label}</div>
      {children}
    </div>
  );
}

function TokenBox({ label, token }) {
  return (
    <div className="glass rounded-2xl p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-xs text-slate-300 mt-2 break-all">{token ? token.slice(0, 80) + "…" : "—"}</div>
    </div>
  );
}

