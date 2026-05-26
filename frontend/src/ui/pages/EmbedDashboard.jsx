import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  PhoneCall, PhoneIncoming, PhoneOff, PhoneMissed,
  Bug, Clock, Star, UserCheck, Wifi, WifiOff,
  TrendingUp, AlertCircle, CheckCircle2,
  MapPin, Calendar, Activity, User, Hash,
  Tag, Zap, Shield, ThumbsUp, RotateCcw, XCircle, BarChart2,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend,
} from "recharts";
import { cn } from "../../lib/cn.js";
import { getJson } from "../../lib/api.js";
import { createVoiceDevice } from "../../lib/twilio/voice.js";
import { loadPrefs, savePrefs } from "../../lib/prefs.js";
import { realtime } from "../../lib/realtime.js";

const AUX_CODES = ["Ready","On Inspection","Route Follow-Up","Treatment Callback","Team Briefing","Break","End of Shift"];
const PALETTE = { indigo:"#6366f1", emerald:"#10b981", amber:"#f59e0b", rose:"#f43f5e", sky:"#0ea5e9", violet:"#8b5cf6", teal:"#14b8a6", orange:"#f97316" };
const STATUS_COLORS = ["#10b981","#6366f1","#f43f5e","#f59e0b","#94a3b8"];
const TT = { backgroundColor:"#0f172a", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#e2e8f0", fontSize:11 };

export default function EmbedDashboard() {
  const [calls, setCalls]       = useState([]);
  const [wsOk,  setWsOk]        = useState(false);
  const [aux,   setAux]         = useState("Ready");

  // voice
  const [identity,     setIdentity]     = useState(() => loadPrefs().identity || import.meta.env.VITE_DEFAULT_IDENTITY || "agent@bughub.com");
  const [deviceState,  setDeviceState]  = useState("disconnected");
  const [deviceError,  setDeviceError]  = useState(null);
  const [dialTo,       setDialTo]       = useState("");
  const [incoming,     setIncoming]     = useState(null);
  const [activeCall,   setActiveCall]   = useState(null);
  const [contact,      setContact]      = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [quickDisp,    setQuickDisp]    = useState(null);
  const deviceRef     = useRef(null);
  const activeConnRef = useRef(null);
  const timerRef      = useRef(null);

  useEffect(() => {
    let ok = true;
    getJson("/api/calls/recent").then((d) => ok && setCalls(d.calls || [])).catch(() => {});
    return () => { ok = false; };
  }, []);

  useEffect(() => { savePrefs({ ...loadPrefs(), identity }); }, [identity]);

  useEffect(() => {
    const onHello  = () => setWsOk(true);
    const onCreate = (c) => setCalls((p) => [{ callSid:c.callSid, fromNumber:c.from, toNumber:c.to, status:c.status, startedAt:new Date().toISOString(), direction:"inbound" }, ...p].slice(0,100));
    const onStatus = (u) => setCalls((p) => p.map((c) => c.callSid===u.callSid ? {...c,status:u.status||c.status} : c));
    realtime.on("server:hello", onHello);
    realtime.on("call:created", onCreate);
    realtime.on("call:status",  onStatus);
    return () => { realtime.off("server:hello",onHello); realtime.off("call:created",onCreate); realtime.off("call:status",onStatus); };
  }, []);

  useEffect(() => {
    if (activeCall?.status === "in-progress") {
      setCallDuration(0);
      timerRef.current = setInterval(() => setCallDuration((s) => s+1), 1000);
    } else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [activeCall?.status]);

  async function connectVoice() {
    setDeviceError(null); setDeviceState("connecting");
    try {
      deviceRef.current?.destroy(); deviceRef.current = null;
      const dev = await createVoiceDevice({ identity, onEvent:(type,payload) => {
        if (type==="registered")   setDeviceState("ready");
        if (type==="unregistered"||type==="destroyed") setDeviceState("disconnected");
        if (type==="error")  setDeviceError(payload?.message||"Voice error");
        if (type==="incoming") setIncoming(payload);
      }});
      deviceRef.current = dev; setDeviceState("ready");
    } catch(e) { setDeviceError(e.message||"Failed"); setDeviceState("disconnected"); }
  }

  function disconnectVoice() {
    activeConnRef.current?.disconnect(); activeConnRef.current=null;
    deviceRef.current?.destroy(); deviceRef.current=null;
    setIncoming(null); setActiveCall(null); setDeviceState("disconnected");
  }

  async function acceptIncoming() {
    if (!incoming) return;
    const conn = incoming.accept();
    activeConnRef.current = conn;
    setActiveCall({ direction:"inbound", from:incoming.parameters?.From, to:incoming.parameters?.To, status:"in-progress" });
    setIncoming(null); lookupContact(incoming.parameters?.From); wireConn(conn);
  }
  function rejectIncoming() { incoming?.reject(); setIncoming(null); }

  async function startOutbound() {
    if (!deviceRef.current || deviceState!=="ready" || !dialTo.trim()) return;
    setDeviceError(null);
    const conn = await deviceRef.current.connect({ params:{ To:dialTo.trim() } });
    activeConnRef.current = conn;
    setActiveCall({ direction:"outbound", from:identity, to:dialTo.trim(), status:"in-progress" });
    setContact(null); wireConn(conn);
  }

  function hangup() { activeConnRef.current?.disconnect(); }

  function wireConn(conn) {
    conn.on("disconnect",()=>{ setActiveCall((c)=>c?{...c,status:"completed"}:c); activeConnRef.current=null; });
    conn.on("cancel",()=>{ setActiveCall(null); activeConnRef.current=null; });
    conn.on("error",(e)=>setDeviceError(e?.message||"Call error"));
  }

  async function lookupContact(phone) {
    if (!phone) return setContact(null);
    try { const r = await getJson(`/api/contacts/lookup?phone=${encodeURIComponent(phone)}`); setContact(r.contact||null); }
    catch { setContact(null); }
  }

  const stats = useMemo(() => {
    const scored = calls.filter((c)=>c.score!=null);
    const durCalls = calls.filter((c)=>c.durationSeconds);
    const today = calls.filter((c)=>c.startedAt && new Date(c.startedAt).toDateString()===new Date().toDateString());
    return {
      queued:      calls.filter((c)=>/queued|ring/i.test(c.status||"")).length,
      inProgress:  calls.filter((c)=>/in-progress/i.test(c.status||"")).length,
      completed:   calls.filter((c)=>/completed/i.test(c.status||"")).length,
      noAnswer:    calls.filter((c)=>/no-answer|busy|failed/i.test(c.status||"")).length,
      avgScore:    scored.length ? Math.round(scored.reduce((s,c)=>s+c.score,0)/scored.length) : null,
      avgDuration: durCalls.length ? Math.round(durCalls.reduce((s,c)=>s+c.durationSeconds,0)/durCalls.length) : null,
      inbound:     calls.filter((c)=>c.direction==="inbound").length,
      outbound:    calls.filter((c)=>c.direction==="outbound").length,
      todayHandled: today.filter((c)=>/completed/i.test(c.status||"")).length,
      todayTalk:    today.reduce((s,c)=>s+(c.durationSeconds||0),0),
    };
  }, [calls]);

  // Analytics data
  const statusData = useMemo(() => {
    const g={};
    calls.forEach((c)=>{ const s=String(c.status||"").toLowerCase();
      const k=s.includes("completed")?"Completed":s.includes("in-progress")?"In Progress":s.includes("no-answer")?"No Answer":s.includes("queued")?"Queued":"Other";
      g[k]=(g[k]||0)+1; });
    return Object.entries(g).map(([name,value])=>({name,value}));
  },[calls]);

  const dispositionData = useMemo(() => {
    const g={};
    calls.forEach((c)=>{ if(!c.disposition)return; const k=c.disposition.replace(/_/g," "); g[k]=(g[k]||0)+1; });
    return Object.entries(g).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  },[calls]);

  const hourlyData = useMemo(() => {
    const b=Array.from({length:12},(_,i)=>({hour:`${8+i}:00`,calls:0}));
    calls.forEach((c)=>{ if(!c.startedAt)return; const h=new Date(c.startedAt).getHours(); const i=h-8; if(i>=0&&i<12)b[i].calls+=1; });
    return b;
  },[calls]);

  const scoreData = useMemo(() =>
    calls.filter((c)=>c.score!=null).map((c,i)=>({ name:`#${i+1}`, score:c.score, from:c.fromNumber?.slice(-7)||"—" }))
  ,[calls]);

  const fmt=(s)=>`${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;

  const DISPOSITIONS = [
    {label:"Scheduled", icon:<Calendar className="h-3 w-3"/>, color:"emerald"},
    {label:"Inspection", icon:<Shield className="h-3 w-3"/>, color:"indigo"},
    {label:"Follow-Up",  icon:<RotateCcw className="h-3 w-3"/>, color:"sky"},
    {label:"Resolved",   icon:<ThumbsUp className="h-3 w-3"/>, color:"violet"},
    {label:"No Answer",  icon:<XCircle className="h-3 w-3"/>, color:"rose"},
    {label:"Callback",   icon:<Zap className="h-3 w-3"/>, color:"amber"},
  ];
  const dispColors={
    emerald:"border-emerald-400/25 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20",
    indigo: "border-indigo-400/25 text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20",
    sky:    "border-sky-400/25 text-sky-300 bg-sky-500/10 hover:bg-sky-500/20",
    violet: "border-violet-400/25 text-violet-300 bg-violet-500/10 hover:bg-violet-500/20",
    rose:   "border-rose-400/25 text-rose-300 bg-rose-500/10 hover:bg-rose-500/20",
    amber:  "border-amber-400/25 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20",
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden" style={{fontFamily:"system-ui,sans-serif"}}>

      {/* ── Header ── */}
      <header className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/80 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/20 border border-emerald-400/30 grid place-items-center">
            <Bug className="h-4 w-4 text-emerald-400"/>
          </div>
          <span className="font-semibold text-sm">BugHub Live Dashboard</span>
          <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border",
            wsOk?"border-emerald-400/30 text-emerald-300 bg-emerald-500/10":"border-amber-400/30 text-amber-300 bg-amber-500/10"
          )}>
            {wsOk?<Wifi className="h-3 w-3"/>:<WifiOff className="h-3 w-3"/>}
            {wsOk?"Live":"Connecting…"}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/60 border border-white/10 rounded-xl px-3 py-1.5">
          <UserCheck className="h-3.5 w-3.5 text-slate-400"/>
          <select value={aux} onChange={(e)=>setAux(e.target.value)} className="bg-transparent text-xs outline-none">
            {AUX_CODES.map((c)=><option key={c} value={c} className="bg-slate-900">{c}</option>)}
          </select>
          <span className={cn("text-xs px-1.5 py-0.5 rounded-md font-medium",
            aux==="Ready"?"text-emerald-300 bg-emerald-500/15":"text-amber-300 bg-amber-500/15"
          )}>{aux==="Ready"?"Receiving":"Not Ready"}</span>
        </div>
      </header>

      {/* ── KPI Row ── */}
      <div className="shrink-0 grid grid-cols-6 gap-2.5 px-4 py-2.5 border-b border-white/10">
        <KpiCard label="Queued / Ringing" value={stats.queued}     icon={<PhoneIncoming className="h-4 w-4"/>} color="amber"  />
        <KpiCard label="In Progress"      value={stats.inProgress} icon={<PhoneCall className="h-4 w-4"/>}     color="indigo" />
        <KpiCard label="Completed"        value={stats.completed}  icon={<CheckCircle2 className="h-4 w-4"/>}  color="emerald"/>
        <KpiCard label="No Answer"        value={stats.noAnswer}   icon={<PhoneMissed className="h-4 w-4"/>}   color="rose"   />
        <KpiCard label="Avg Score"        value={stats.avgScore!=null?`${stats.avgScore}`:"—"} icon={<Star className="h-4 w-4"/>} color="violet"/>
        <KpiCard label="Avg Duration"     value={stats.avgDuration!=null?`${stats.avgDuration}s`:"—"} icon={<Clock className="h-4 w-4"/>} color="sky"/>
      </div>

      {/* ── Main 3-column grid ── */}
      <div className="flex-1 grid grid-cols-[1fr_1fr_300px] overflow-hidden min-h-0">

        {/* ══ COL 1: Live Calls ══ */}
        <div className="flex flex-col overflow-hidden border-r border-white/10">
          <div className="px-4 pt-3 pb-2 flex items-center gap-2 shrink-0">
            <Activity className="h-3.5 w-3.5 text-slate-400"/>
            <span className="text-xs font-medium text-slate-300">Recent & Live Calls</span>
            <span className="ml-auto text-xs text-slate-500">{calls.length} total</span>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
            {calls.length===0 ? (
              <div className="text-sm text-slate-500 mt-10 text-center">No calls yet. Waiting for activity…</div>
            ) : calls.slice(0,30).map((c)=>(
              <div key={c.callSid}
                className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/3 hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("h-8 w-8 rounded-full grid place-items-center shrink-0",
                    c.direction==="outbound"?"bg-indigo-500/20":"bg-emerald-500/20"
                  )}>
                    {c.direction==="outbound"
                      ?<PhoneCall className="h-3.5 w-3.5 text-indigo-300"/>
                      :<PhoneIncoming className="h-3.5 w-3.5 text-emerald-300"/>}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{c.fromNumber||"Unknown caller"}</div>
                    <div className="text-xs text-slate-400 truncate">
                      {c.startedAt?new Date(c.startedAt).toLocaleTimeString():"—"} · {c.direction||"inbound"}
                      {c.durationSeconds?` · ${c.durationSeconds}s`:""}
                    </div>
                    {c.aiSummary&&<div className="text-xs text-slate-400 truncate mt-0.5">{c.aiSummary}</div>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                  <StatusBadge status={c.status}/>
                  {c.score!=null&&<span className="text-xs text-violet-300 bg-violet-500/10 border border-violet-400/20 px-1.5 py-0.5 rounded-md">★ {c.score}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ COL 2: Analytics ══ */}
        <div className="flex flex-col overflow-hidden border-r border-white/10">
          <div className="px-3 pt-3 pb-2 flex items-center gap-2 shrink-0">
            <BarChart2 className="h-3.5 w-3.5 text-slate-400"/>
            <span className="text-xs font-medium text-slate-300">Analytics</span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">

            {/* Call Volume */}
            <ChartCard title="Call Volume by Hour">
              <ResponsiveContainer width="100%" height={110}>
                <AreaChart data={hourlyData} margin={{top:4,right:4,left:-28,bottom:0}}>
                  <defs>
                    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={PALETTE.indigo} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={PALETTE.indigo} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" tick={{fill:"#64748b",fontSize:9}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:"#64748b",fontSize:9}} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <Tooltip contentStyle={TT}/>
                  <Area type="monotone" dataKey="calls" stroke={PALETTE.indigo} fill="url(#cg)" strokeWidth={2} dot={{r:2,fill:PALETTE.indigo}}/>
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Status donut */}
            <ChartCard title="Call Status">
              <ResponsiveContainer width="100%" height={110}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={30} outerRadius={48}
                    dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {statusData.map((_,i)=><Cell key={i} fill={STATUS_COLORS[i%STATUS_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={TT}/>
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:10,color:"#94a3b8"}}/>
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Disposition bars */}
            <ChartCard title="Disposition Breakdown">
              {dispositionData.length===0
                ?<div className="text-xs text-slate-500 py-2">No dispositions yet.</div>
                :dispositionData.map((d,i)=>{
                  const pct=calls.length?Math.round((d.value/calls.length)*100):0;
                  const cols=[PALETTE.emerald,PALETTE.indigo,PALETTE.sky,PALETTE.amber,PALETTE.violet,PALETTE.orange];
                  const col=cols[i%cols.length];
                  return(
                    <div key={d.name} className="mb-2.5">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 capitalize truncate max-w-[120px]">{d.name}</span>
                        <span style={{color:col}}>{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800">
                        <div className="h-full rounded-full" style={{width:`${pct}%`,backgroundColor:col}}/>
                      </div>
                    </div>
                  );
                })
              }
            </ChartCard>

            {/* Score bars */}
            <ChartCard title="Quality Scores">
              {scoreData.length===0
                ?<div className="text-xs text-slate-500 py-2">No scored calls yet.</div>
                :<ResponsiveContainer width="100%" height={100}>
                  <BarChart data={scoreData} margin={{top:4,right:4,left:-28,bottom:0}}>
                    <defs>
                      <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PALETTE.violet} stopOpacity={0.9}/>
                        <stop offset="100%" stopColor={PALETTE.violet} stopOpacity={0.4}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="from" tick={{fill:"#64748b",fontSize:8}} axisLine={false} tickLine={false}/>
                    <YAxis domain={[0,100]} tick={{fill:"#64748b",fontSize:9}} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={TT} formatter={(v)=>[`${v}`,"Score"]}/>
                    <Bar dataKey="score" fill="url(#sg)" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              }
            </ChartCard>

            {/* Performance summary */}
            <ChartCard title="Performance">
              <div className="space-y-2 mt-1">
                <StatRow label="Total Calls"   value={calls.length}          color={PALETTE.sky}    />
                <StatRow label="Answer Rate"   value={calls.length?`${Math.round((stats.completed/calls.length)*100)}%`:"—"} color={PALETTE.emerald}/>
                <StatRow label="Inbound"       value={stats.inbound}         color={PALETTE.emerald}/>
                <StatRow label="Outbound"      value={stats.outbound}        color={PALETTE.indigo} />
                <StatRow label="Avg Duration"  value={stats.avgDuration!=null?`${stats.avgDuration}s`:"—"} color={PALETTE.sky}/>
                <StatRow label="Avg Score"     value={stats.avgScore!=null?`${stats.avgScore}/100`:"—"} color={PALETTE.violet}/>
              </div>
            </ChartCard>
          </div>
        </div>

        {/* ══ COL 3: Agent Console ══ */}
        <div className="flex flex-col overflow-hidden">
          <div className="px-3 pt-3 pb-2 flex items-center gap-2 shrink-0">
            <User className="h-3.5 w-3.5 text-slate-400"/>
            <span className="text-xs font-medium text-slate-300">Agent Console</span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">

            {/* Agent card */}
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-indigo-500/20 border border-indigo-400/25 grid place-items-center shrink-0">
                  <User className="h-4 w-4 text-indigo-300"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{identity}</div>
                  <div className={cn("text-xs",deviceState==="ready"?"text-emerald-400":"text-amber-400")}>
                    ● {deviceState==="ready"?"Online & Receiving":deviceState}
                  </div>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-lg border font-medium",
                  deviceState==="ready"?"border-emerald-400/25 text-emerald-300 bg-emerald-500/10":"border-amber-400/25 text-amber-300 bg-amber-500/10"
                )}>{deviceState==="ready"?"Ready":"Offline"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t border-white/8">
                <div className="text-center">
                  <div className="text-base font-bold text-emerald-300">{stats.todayHandled}</div>
                  <div className="text-[10px] text-slate-500">Handled</div>
                </div>
                <div className="text-center border-x border-white/8">
                  <div className="text-base font-bold text-sky-300">{stats.todayTalk>0?`${Math.round(stats.todayTalk/60)}m`:"0m"}</div>
                  <div className="text-[10px] text-slate-500">Talk Time</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-bold text-violet-300">{calls.length}</div>
                  <div className="text-[10px] text-slate-500">Total</div>
                </div>
              </div>
              <div className="mt-2.5 space-y-2">
                <input value={identity} onChange={(e)=>setIdentity(e.target.value)}
                  className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-indigo-400/40"/>
                <div className="flex gap-2">
                  <Btn color="slate" onClick={connectVoice} disabled={!identity.trim()} className="flex-1 text-xs">
                    <Wifi className="h-3 w-3"/>Connect
                  </Btn>
                  <Btn color="red" onClick={disconnectVoice} disabled={deviceState==="disconnected"} className="flex-1 text-xs">
                    <WifiOff className="h-3 w-3"/>Disconnect
                  </Btn>
                </div>
                {deviceError&&(
                  <div className="flex items-start gap-1.5 text-xs text-rose-300 bg-rose-500/10 border border-rose-400/20 rounded-lg px-2 py-1.5">
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0"/>{deviceError}
                  </div>
                )}
              </div>
            </div>

            {/* Dial */}
            <Panel>
              <div className="flex items-center gap-1.5 mb-2">
                <PhoneCall className="h-3.5 w-3.5 text-slate-400"/>
                <span className="text-xs font-medium text-slate-300">Outbound Dial</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-800/60 border border-white/10 rounded-xl px-2.5">
                  <Hash className="h-3 w-3 text-slate-500 shrink-0"/>
                  <input value={dialTo} onChange={(e)=>setDialTo(e.target.value)} placeholder="+15551234567"
                    className="flex-1 bg-transparent py-1.5 text-xs outline-none"/>
                </div>
                <Btn color="indigo" onClick={startOutbound} disabled={deviceState!=="ready"||!dialTo.trim()}>
                  <PhoneCall className="h-3.5 w-3.5"/>
                </Btn>
                <Btn color="red" onClick={hangup} disabled={!activeConnRef.current}>
                  <PhoneOff className="h-3.5 w-3.5"/>
                </Btn>
              </div>
            </Panel>

            {/* Active call card */}
            <div className={cn("rounded-xl border p-3 transition-all",
              activeCall?.status==="in-progress"
                ?"border-emerald-400/30 bg-gradient-to-b from-emerald-500/10 to-emerald-500/3"
                :"border-white/10 bg-slate-900/50"
            )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className={cn("h-2 w-2 rounded-full",activeCall?.status==="in-progress"?"bg-emerald-400 animate-pulse":"bg-slate-600")}/>
                  <span className="text-xs font-medium text-slate-300">
                    {activeCall?.status==="in-progress"?"Active Call":"Last Caller"}
                  </span>
                </div>
                {activeCall?.status==="in-progress"&&(
                  <div className="flex items-center gap-1 text-emerald-300 text-xs font-mono bg-emerald-500/10 border border-emerald-400/20 px-2 py-0.5 rounded-lg">
                    <Clock className="h-3 w-3"/>{fmt(callDuration)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-slate-700/60 border border-white/10 grid place-items-center shrink-0">
                  <User className="h-4 w-4 text-slate-400"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm leading-tight">
                    {contact?.name||(activeCall?(activeCall.direction==="inbound"?activeCall.from:activeCall.to):"No active call")}
                  </div>
                  <div className="text-xs text-slate-400">{activeCall?.direction==="inbound"?activeCall?.from:activeCall?.to||"—"}</div>
                </div>
              </div>
              {contact&&(
                <div className="mt-2 space-y-1 pt-2 border-t border-white/8">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <MapPin className="h-3 w-3 text-slate-500 shrink-0"/>
                    <span className="truncate">{contact.address||"No address"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-indigo-300">
                    <Tag className="h-3 w-3 shrink-0"/>PestPac #{contact.pestpacLocationNumber||"—"}
                  </div>
                </div>
              )}
              {!activeCall&&!contact&&<div className="mt-1 text-xs text-slate-500">No active or recent call.</div>}
            </div>

            {/* Quick disposition */}
            <Panel>
              <div className="flex items-center gap-1.5 mb-2">
                <Tag className="h-3.5 w-3.5 text-slate-400"/>
                <span className="text-xs font-medium text-slate-300">Quick Disposition</span>
                {quickDisp&&<span className="ml-auto text-[10px] text-white bg-slate-700 px-1.5 py-0.5 rounded-md">{quickDisp}</span>}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {DISPOSITIONS.map((d)=>(
                  <button key={d.label} onClick={()=>setQuickDisp(d.label===quickDisp?null:d.label)}
                    className={cn("flex items-center justify-center gap-1 text-[11px] px-1.5 py-1.5 rounded-lg border transition font-medium",
                      quickDisp===d.label
                        ?dispColors[d.color]+" ring-1 ring-inset ring-white/20"
                        :"border-white/10 text-slate-400 bg-slate-800/40 hover:bg-slate-700/40"
                    )}
                  >{d.icon}{d.label}</button>
                ))}
              </div>
            </Panel>

            {/* AI Summary */}
            {(()=>{ const last=calls.find((c)=>c.aiSummary); return last?(
              <div className="rounded-xl border border-indigo-400/15 bg-indigo-500/5 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="h-3.5 w-3.5 text-indigo-400"/>
                  <span className="text-xs font-medium text-indigo-300">AI Summary — Last Call</span>
                </div>
                <div className="text-xs text-slate-200 leading-relaxed">{last.aiSummary}</div>
                <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-white/8">
                  {last.disposition&&<span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-400/20 text-indigo-300 capitalize">{last.disposition.replace(/_/g," ")}</span>}
                  {last.score!=null&&<span className="text-xs px-2 py-0.5 rounded-md bg-violet-500/15 border border-violet-400/20 text-violet-300">★ {last.score}/100</span>}
                  {last.durationSeconds&&<span className="text-xs text-slate-500 ml-auto flex items-center gap-1"><Clock className="h-3 w-3"/>{last.durationSeconds}s</span>}
                </div>
              </div>
            ):null; })()}
          </div>
        </div>
      </div>

      {/* ── Incoming modal ── */}
      {incoming&&(
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm grid place-items-center p-6 z-50">
          <div className="bg-slate-900 border border-emerald-400/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-400/30 grid place-items-center animate-pulse">
                <PhoneIncoming className="h-5 w-5 text-emerald-300"/>
              </div>
              <div>
                <div className="text-xs text-slate-400">Incoming Call</div>
                <div className="text-lg font-semibold">{incoming.parameters?.From||"Unknown"}</div>
              </div>
            </div>
            <div className="flex gap-3">
              <Btn color="green" onClick={acceptIncoming} className="flex-1"><PhoneCall className="h-4 w-4"/>Accept</Btn>
              <Btn color="red"   onClick={rejectIncoming} className="flex-1"><PhoneOff className="h-4 w-4"/>Decline</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── UI Primitives ─────────────────────────────────────────────────────────────
function TabBtn({active,onClick,icon,label}) {
  return(
    <button onClick={onClick} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition",
      active?"bg-white/10 text-white":"text-slate-400 hover:text-slate-200")}>
      {icon}{label}
    </button>
  );
}

function KpiCard({label,value,icon,color}) {
  const colors={
    amber:  "from-amber-500/20 to-amber-500/5 border-amber-400/20 text-amber-300",
    indigo: "from-indigo-500/20 to-indigo-500/5 border-indigo-400/20 text-indigo-300",
    emerald:"from-emerald-500/20 to-emerald-500/5 border-emerald-400/20 text-emerald-300",
    rose:   "from-rose-500/20 to-rose-500/5 border-rose-400/20 text-rose-300",
    violet: "from-violet-500/20 to-violet-500/5 border-violet-400/20 text-violet-300",
    sky:    "from-sky-500/20 to-sky-500/5 border-sky-400/20 text-sky-300",
  };
  return(
    <div className={cn("rounded-xl border bg-gradient-to-b p-2.5 flex items-start gap-2",colors[color])}>
      <div className="mt-0.5 opacity-70">{icon}</div>
      <div>
        <div className="text-xl font-bold leading-none">{value}</div>
        <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">{label}</div>
      </div>
    </div>
  );
}

function ChartCard({title,children}) {
  return(
    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-3">
      <div className="text-xs font-medium text-slate-300 mb-2">{title}</div>
      {children}
    </div>
  );
}

function Panel({children,className}) {
  return <div className={cn("bg-slate-900/50 border border-white/10 rounded-xl p-3",className)}>{children}</div>;
}

function Mini({label,value,small}) {
  return(
    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-2.5">
      <div className={cn("text-slate-400",small?"text-[10px]":"text-xs")}>{label}</div>
      <div className={cn("font-medium mt-0.5 truncate",small?"text-xs":"text-sm")}>{value}</div>
    </div>
  );
}

function StatRow({label,value,color}) {
  return(
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-semibold" style={{color}}>{value}</span>
    </div>
  );
}

function Btn({children,color="slate",onClick,disabled,className}) {
  const colors={
    slate: "bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800",
    red:   "bg-rose-700 hover:bg-rose-600 disabled:bg-slate-800",
    indigo:"bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800",
    green: "bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800",
  };
  return(
    <button onClick={onClick} disabled={disabled} className={cn(
      "px-3 py-2 rounded-xl text-sm font-medium text-white transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5",
      colors[color],className
    )}>{children}</button>
  );
}

function StatusBadge({status,small}) {
  const s=String(status||"").toLowerCase();
  let cls="bg-slate-800/60 border-white/10 text-slate-300";
  if(s.includes("completed"))        cls="bg-emerald-500/15 border-emerald-400/25 text-emerald-300";
  else if(s.includes("in-progress")) cls="bg-indigo-500/15 border-indigo-400/25 text-indigo-300";
  else if(s.includes("queued")||s.includes("ring")) cls="bg-amber-500/15 border-amber-400/25 text-amber-300";
  else if(s.includes("failed")||s.includes("busy")||s.includes("no-answer")) cls="bg-rose-500/15 border-rose-400/25 text-rose-300";
  return(
    <span className={cn("inline-flex items-center rounded-lg border shrink-0",cls,
      small?"px-1.5 py-0.5 text-[10px]":"px-2 py-0.5 text-xs"
    )}>{status||"unknown"}</span>
  );
}
