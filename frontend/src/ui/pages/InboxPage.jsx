import React, { useEffect, useState } from "react";
import Card from "../components/Card.jsx";
import Badge from "../components/Badge.jsx";
import { getJson } from "../../lib/api.js";

export default function InboxPage() {
  const [calls, setCalls] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let mounted = true;
    getJson("/api/calls/recent")
      .then((d) => mounted && setCalls(d.calls || []))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const detail = selected ? calls.find((c) => c.callSid === selected) : null;

  return (
    <div className="space-y-5">
      <div>
        <div className="text-2xl font-semibold">Call Inbox</div>
        <div className="text-sm text-slate-400">Completed calls live here with summary + transcript + dispositions.</div>
      </div>

      <div className="grid grid-cols-[0.95fr_1.05fr] gap-4">
        <Card title="Calls" className="min-h-[620px]">
          <div className="space-y-2">
            {calls.length === 0 ? (
              <div className="text-sm text-slate-400">No call history yet.</div>
            ) : (
              calls.slice(0, 50).map((c) => (
                <button
                  key={c.callSid}
                  onClick={() => setSelected(c.callSid)}
                  className="w-full text-left p-3 rounded-xl border border-white/10 bg-white/3 hover:bg-white/5 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.fromNumber || "Unknown caller"}</div>
                      <div className="text-xs text-slate-400 truncate">{c.startedAt ? new Date(c.startedAt).toLocaleString() : "—"}</div>
                    </div>
                    <Badge>{String(c.status || "unknown")}</Badge>
                  </div>
                  {c.aiSummary ? <div className="text-xs text-slate-300 mt-2 line-clamp-2">{c.aiSummary}</div> : null}
                </button>
              ))
            )}
          </div>
        </Card>

        <Card title="Details" className="min-h-[620px]">
          {!detail ? (
            <div className="text-sm text-slate-400">Select a call to view details.</div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-white/10 bg-gradient-to-b from-slate-800/30 to-transparent">
                <div className="text-xs text-slate-400">From</div>
                <div className="text-lg font-semibold">{detail.fromNumber}</div>
                <div className="text-xs text-slate-400 mt-1">CallSid: {detail.callSid}</div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Mini label="Answered By" value={detail.answeredBy || "—"} />
                <Mini label="Duration" value={detail.durationSeconds ? `${detail.durationSeconds}s` : "—"} />
                <Mini label="Score" value={detail.score ?? "—"} />
              </div>
              <Section title="Disposition" body={detail.disposition || "—"} />
              <Section title="AI Summary" body={detail.aiSummary || "Not generated yet."} />
              <Section title="Transcript" body={detail.transcriptText || "Not available yet."} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="font-medium mt-1">{value}</div>
    </div>
  );
}

function Section({ title, body }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="text-xs text-slate-400">{title}</div>
      <div className="text-sm text-slate-200 mt-1 whitespace-pre-wrap">{body}</div>
    </div>
  );
}

