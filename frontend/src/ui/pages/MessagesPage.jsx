import React, { useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/Card.jsx";
import Badge from "../components/Badge.jsx";
import Button from "../components/Button.jsx";
import { getJson } from "../../lib/api.js";
import { createConversationsClient } from "../../lib/twilio/conversations.js";
import { loadPrefs, savePrefs } from "../../lib/prefs.js";
import { realtime } from "../../lib/realtime.js";

export default function MessagesPage() {
  const [messages, setMessages] = useState([]);
  const [identity, setIdentity] = useState(() => loadPrefs().identity || import.meta.env.VITE_DEFAULT_IDENTITY || "agent@example.com");
  const [convState, setConvState] = useState("disconnected");
  const [convError, setConvError] = useState(null);
  const clientRef = useRef(null);
  const [conversations, setConversations] = useState([]);
  const [activeSid, setActiveSid] = useState(null);
  const [thread, setThread] = useState([]);
  const [composer, setComposer] = useState("");

  useEffect(() => {
    let mounted = true;
    getJson("/api/messages/recent")
      .then((d) => mounted && setMessages(d.messages || []))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const onInbound = (m) => setMessages((prev) => [{ channel: m.channel, fromNumber: m.from, toNumber: m.to, body: m.body, createdAt: new Date().toISOString() }, ...prev].slice(0, 200));
    realtime.on("message:inbound", onInbound);
    return () => realtime.off("message:inbound", onInbound);
  }, []);

  useEffect(() => {
    savePrefs({ ...loadPrefs(), identity });
  }, [identity]);

  const activeConversation = useMemo(() => conversations.find((c) => c.sid === activeSid) || null, [conversations, activeSid]);

  async function connectConversations() {
    setConvError(null);
    setConvState("connecting");
    try {
      if (clientRef.current) {
        clientRef.current.shutdown();
        clientRef.current = null;
      }
      const client = await createConversationsClient({ identity });
      clientRef.current = client;
      setConvState("ready");

      const paginator = await client.getSubscribedConversations();
      setConversations(paginator.items.map((c) => ({ sid: c.sid, friendlyName: c.friendlyName || c.uniqueName || c.sid, _raw: c })));

      client.on("conversationJoined", (c) => {
        setConversations((prev) => {
          if (prev.some((x) => x.sid === c.sid)) return prev;
          return [{ sid: c.sid, friendlyName: c.friendlyName || c.uniqueName || c.sid, _raw: c }, ...prev];
        });
      });
    } catch (e) {
      setConvError(e.message || "Failed to connect Conversations");
      setConvState("disconnected");
    }
  }

  async function openConversation(sid) {
    setActiveSid(sid);
    setThread([]);
    setComposer("");
    const entry = conversations.find((c) => c.sid === sid);
    const conv = entry?._raw;
    if (!conv) return;

    const page = await conv.getMessages(50);
    setThread(page.items.map((m) => ({ sid: m.sid, author: m.author, body: m.body, dateCreated: m.dateCreated })));

    conv.removeAllListeners("messageAdded");
    conv.on("messageAdded", (m) => {
      setThread((prev) => [...prev, { sid: m.sid, author: m.author, body: m.body, dateCreated: m.dateCreated }]);
    });
  }

  async function sendMessage() {
    const entry = conversations.find((c) => c.sid === activeSid);
    const conv = entry?._raw;
    if (!conv) return;
    const text = composer.trim();
    if (!text) return;
    setComposer("");
    await conv.sendMessage(text);
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-2xl font-semibold">Conversations</div>
        <div className="text-sm text-slate-400">Unified inbox UI for SMS/WhatsApp/chat (wire to Twilio Conversations).</div>
      </div>

      <div className="grid grid-cols-[0.9fr_1.1fr] gap-4">
        <Card
          title="Twilio Conversations"
          right={<Badge tone={convState === "ready" ? "green" : "amber"}>{convState === "ready" ? "Connected" : convState}</Badge>}
          className="min-h-[700px]"
        >
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                className="bg-transparent border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-indigo-400/40"
                placeholder="agent@example.com"
              />
              <Button tone="slate" onClick={connectConversations} disabled={!identity.trim()}>
                Connect
              </Button>
            </div>
            {convError ? <div className="text-xs text-rose-200">{convError}</div> : null}

            <div className="text-xs text-slate-400 mt-2">Subscribed conversations</div>
            <div className="space-y-2">
              {conversations.length === 0 ? (
                <div className="text-sm text-slate-400">
                  None yet. Create/subscribe users in Twilio Conversations, or use the SMS webhook list below.
                </div>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.sid}
                    onClick={() => openConversation(c.sid)}
                    className="w-full text-left p-3 rounded-xl border border-white/10 bg-white/3 hover:bg-white/5 transition"
                  >
                    <div className="font-medium truncate">{c.friendlyName}</div>
                    <div className="text-xs text-slate-400 truncate">{c.sid}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </Card>

        <Card title={activeConversation ? activeConversation.friendlyName : "Thread"} className="min-h-[700px]">
          {!activeConversation ? (
            <div className="space-y-4">
              <div className="text-sm text-slate-400">Select a conversation to read/send messages.</div>
              <div className="border-t border-white/10 pt-4">
                <div className="text-sm font-medium">Incoming SMS webhook (recent)</div>
                <div className="text-xs text-slate-400 mt-1">This list updates from your `/api/twilio/messaging/inbound` webhook.</div>
                <div className="space-y-2 mt-3">
                  {messages.length === 0 ? (
                    <div className="text-sm text-slate-400">No SMS messages yet.</div>
                  ) : (
                    messages.slice(0, 20).map((m, idx) => (
                      <div key={m.messageSid || idx} className="p-3 rounded-xl border border-white/10 bg-white/3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{m.fromNumber || "Unknown sender"}</div>
                            <div className="text-xs text-slate-400 truncate">
                              To {m.toNumber || "—"} · {m.createdAt ? new Date(m.createdAt).toLocaleString() : "—"}
                            </div>
                          </div>
                          <Badge tone="indigo">{m.channel || "sms"}</Badge>
                        </div>
                        <div className="text-sm text-slate-200 mt-2 whitespace-pre-wrap">{m.body}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex-1 space-y-2 overflow-auto pr-1">
                {thread.length === 0 ? (
                  <div className="text-sm text-slate-400">No messages yet.</div>
                ) : (
                  thread.map((m) => (
                    <div key={m.sid} className="p-3 rounded-xl border border-white/10 bg-white/3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">{m.author || "Unknown"}</div>
                        <div className="text-xs text-slate-500">{m.dateCreated ? new Date(m.dateCreated).toLocaleString() : ""}</div>
                      </div>
                      <div className="text-sm text-slate-200 mt-2 whitespace-pre-wrap">{m.body}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                <input
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  onKeyDown={(e) => (e.key === "Enter" ? sendMessage() : null)}
                  className="bg-transparent border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-indigo-400/40"
                  placeholder="Type a message…"
                />
                <Button onClick={sendMessage} disabled={!composer.trim()}>
                  Send
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
