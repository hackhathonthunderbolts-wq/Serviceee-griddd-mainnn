import { useEffect, useMemo, useState } from "react";
import { domainConfig } from "@/lib/domains";
import { AuthProvider, useAuth } from "@/services/auth";
import AuthGate from "@/components/auth/AuthGate";
import { store, useDB } from "@/services/store";
import OpsDashboard from "@/components/OpsDashboard";
import EntityDrawer from "@/components/shell/EntityDrawer";
import NearestTechEta from "@/components/shell/NearestTech";
import type { MapSelection } from "@/components/shell/MapPanel";
import { siteLabel, machineLabel, woForRequest } from "@/components/shell/catalog";
import {
  RequestsTable, EquipmentPage, SitesPage, TechniciansPage, InventoryPage,
  SchedulePage, ExceptionsPage, AuditPage, SimplePage, ReportsPage,
  prioPill, statusPill, fmtWhen,
} from "@/components/shell/ServiceOpsPages";
import "./components/shell/serviceops.css";
import {
  LayoutGrid, ClipboardList, Wrench, Cpu, MapPin, Users, Boxes,
  CalendarDays, ShieldCheck, AlertTriangle, Bell, BarChart3, History, Settings,
} from "lucide-react";
import type { Role } from "@/types";

type Page = "overview" | "requests" | "workorders" | "equipment" | "sites" | "technicians" | "inventory" | "schedule" | "approvals" | "exceptions" | "notifications" | "reports" | "audit" | "settings" | "sla";

const NAV: { id: Page; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "requests", label: "Service Requests", icon: ClipboardList },
  { id: "workorders", label: "Work Orders", icon: Wrench },
  { id: "equipment", label: "Equipment", icon: Cpu },
  { id: "sites", label: "Sites", icon: MapPin },
  { id: "technicians", label: "Technicians", icon: Users },
  { id: "inventory", label: "Resources & Inventory", icon: Boxes },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "approvals", label: "Approvals", icon: ShieldCheck },
  { id: "exceptions", label: "Exceptions", icon: AlertTriangle },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "reports", label: "Reports & Analytics", icon: BarChart3 },
  { id: "audit", label: "Audit History", icon: History },
  { id: "settings", label: "Settings", icon: Settings },
];

const ROLE_PAGES: Record<Role, Page[]> = {
  OPS_MANAGER: NAV.map((n) => n.id),
  ADMIN: NAV.map((n) => n.id),
  TECHNICIAN: ["overview", "schedule", "technicians", "inventory", "notifications", "settings"],
  CUSTOMER: ["overview", "requests", "equipment", "sites", "notifications", "settings"],
};

function PageHead({ kicker, title, sub, onNew }: { kicker: string; title: string; sub: string; onNew?: () => void }) {
  return (
    <div>
      <div className="so-eyebrow"><span>{kicker}</span><span className="so-live">LIVE WORKSPACE</span></div>
      <div className="so-title-row">
        <h1 className="so-h1">{title}</h1>
        <button className="so-primary-btn" onClick={onNew}>＋ New Service Request</button>
      </div>
      <p className="so-sub">{sub}</p>
    </div>
  );
}

function RequestDetailDark({ requestId, me, back, onSelect }: { requestId: string; me: any; back: () => void; onSelect: (s: MapSelection) => void }) {
  const db = useDB();
  const [tab, setTab] = useState("Overview");
  const [note, setNote] = useState("");
  const r = db.requests.find((x) => x.id === requestId);
  const ranked = useMemo(() => { try { return r ? store.rank(r.id) : []; } catch { return []; } }, [r, db]);
  if (!r) return <div style={{ color: "#8b99b0" }}>Request not found. <button className="so-link" onClick={back}>← Back</button></div>;
  const m = db.machines.find((x) => x.id === r.machineId);
  const site = db.sites.find((s) => s.id === r.siteId);
  const assigns = db.assignments.filter((a) => a.requestId === r.id);
  const logs = db.logs.filter((l) => l.requestId === r.id);
  const audit = db.audit.filter((a) => a.entityId === r.id);
  const slaMs = new Date(r.slaDeadline).getTime() - Date.now();
  const slaTxt = slaMs < 0 ? `BREACHED BY ${Math.abs(Math.round(slaMs / 3600000))}h ${Math.abs(Math.round((slaMs % 3600000) / 60000))}m` : `${Math.floor(slaMs / 3600000)}h ${Math.floor((slaMs % 3600000) / 60000)}m remaining`;
  const activeAssign = assigns.find((a) => a.active);
  const activeTech = activeAssign && db.techs.find((t) => t.id === activeAssign.technicianId);
  return (
    <div>
      <button className="so-ghost-btn" onClick={back} style={{ marginBottom: 12 }}>← All requests</button>
      <div className="so-table-wrap" style={{ padding: 22 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 20, fontWeight: 800 }}>{r.code}</span>
          <span className="so-req-sub">{woForRequest(r.code)}</span>
          {prioPill(r.priority, r.title)} {statusPill(r.status)}
          <span className="so-mono" style={{ marginLeft: "auto", fontSize: 12, color: slaMs < 0 ? "#ff7a7a" : "#3dd68c" }}>SLA: {slaTxt}</span>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, marginTop: 8 }}>
          <span style={{ color: "#8b99b0" }}>Equipment: <button className="so-link" onClick={() => onSelect({ kind: "equipment", id: r.machineId })}>{m ? machineLabel(m) : r.machineId} →</button></span>
          <span style={{ color: "#8b99b0" }}>Site: <button className="so-link" onClick={() => site && onSelect({ kind: "site", id: site.id })}>{site ? siteLabel(site) : r.siteId} →</button></span>
          <span style={{ color: "#8b99b0" }}>Technician: {activeTech ? <button className="so-link" onClick={() => onSelect({ kind: "technician", id: activeTech.id })}>{activeTech.name} →</button> : "Unassigned"}</span>
          <span style={{ color: "#5d6b84" }}>Updated {fmtWhen(r.createdAt)}</span>
        </div>
        <p style={{ fontSize: 13.5, color: "#c3cede", marginTop: 10 }}>{r.description}</p>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {(r.status === "PENDING_APPROVAL" || r.status === "VALIDATED") && <button className="so-ghost-btn solid" onClick={() => { try { store.approve(r.id, me.id); } catch (e) { alert((e as Error).message); } }}>Approve</button>}
          {(r.status === "APPROVED" || r.status === "EXCEPTION") && ranked[0] && <button className="so-ghost-btn solid" onClick={() => { try { store.assign(r.id, ranked[0].tech.id, me.id); } catch (e) { alert((e as Error).message); } }}>Assign {ranked[0].tech.name} ({ranked[0].breakdown.total})</button>}
          {r.status === "ASSIGNED" && <button className="so-ghost-btn solid" onClick={() => { try { store.setStatus(r.id, "IN_PROGRESS", me.id); } catch (e) { alert((e as Error).message); } }}>Start work</button>}
          {r.status === "IN_PROGRESS" && <button className="so-ghost-btn solid" onClick={() => { try { store.setStatus(r.id, "PENDING_VERIFICATION", me.id); } catch (e) { alert((e as Error).message); } }}>Submit for verification</button>}
          {r.status === "PENDING_VERIFICATION" && <button className="so-ghost-btn solid" onClick={() => { try { store.setStatus(r.id, "CLOSED", me.id); } catch (e) { alert((e as Error).message); } }}>Verify & close</button>}
          <button className="so-ghost-btn" onClick={() => store.dropoutTech(r.id, me.id)}>Simulate dropout</button>
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 16, borderBottom: "1px solid #1d2940", paddingBottom: 8, fontSize: 12.5 }}>
          {["Overview", "Validation", "Assignment", "Nearest & ETA", "Execution", "Audit"].map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: 0, cursor: "pointer", color: tab === t ? "#fff" : "#8b99b0", fontWeight: tab === t ? 700 : 500 }}>{t}</button>
          ))}
        </div>
        {tab === "Validation" && <div style={{ marginTop: 12 }}>{r.validationReport?.checks.map((c, i) => <div key={i} style={{ fontSize: 12.5, padding: "6px 0", color: "#c3cede" }}>{c.result === "pass" ? "✓" : "✕"} <b>{c.name}:</b> {c.message}</div>)}<div style={{ fontSize: 12, color: "#8b99b0" }}>Overall: {r.validationReport?.overall}</div></div>}
        {tab === "Assignment" && <div style={{ marginTop: 12 }}>{ranked.slice(0, 3).map(({ tech, breakdown }, i) => <div key={tech.id} style={{ fontSize: 12.5, border: "1px solid #1d2940", borderRadius: 8, padding: 10, marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}><b>#{i + 1} {tech.name}</b><span style={{ color: "#8b99b0" }}>score {breakdown.total} · skill {breakdown.skillMatch} · prox {breakdown.proximity}</span><button className="so-ghost-btn" style={{ marginLeft: "auto" }} onClick={() => { try { store.assign(r.id, tech.id, me.id); } catch (e) { alert((e as Error).message); } }}>Assign</button></div>)}{assigns.map((a) => <div key={a.id} style={{ fontSize: 12, color: "#8b99b0" }}>✔ {db.techs.find((t) => t.id === a.technicianId)?.name} — {a.explanation}</div>)}</div>}
        {tab === "Nearest & ETA" && <NearestTechEta requestId={r.id} meId={me.id} />}
        {tab === "Execution" && <div style={{ marginTop: 12 }}><div style={{ display: "flex", gap: 8 }}><input className="so-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Log work note…" /><button className="so-ghost-btn solid" onClick={() => { if (note.trim()) { store.addLog(r.id, me.id, note); setNote(""); } }}>Add</button></div>{logs.map((l) => <div key={l.id} className="so-timeline-item" style={{ marginTop: 10 }}><b>{l.authorName}</b> <span style={{ color: "#5d6b84" }}>{fmtWhen(l.at)}</span><div style={{ color: "#a9b7cf" }}>{l.text}</div></div>)}</div>}
        {tab === "Audit" && <div style={{ marginTop: 12 }}>{audit.slice(0, 12).map((a) => <div key={a.id} className="so-mono" style={{ fontSize: 11, color: "#8b99b0", padding: "4px 0" }}>{a.hash.slice(0, 8)} ← {a.prevHash.slice(0, 8)} · {a.action} · {a.actor}</div>)}{audit.length === 0 && <div style={{ fontSize: 12, color: "#8b99b0" }}>Entries appear after actions.</div>}</div>}
        {tab === "Overview" && <div style={{ marginTop: 12, fontSize: 12.5, color: "#a9b7cf" }}>Required parts: {r.requiredParts.map((p) => `${p.sku}×${p.qty}`).join(", ") || "—"} · SLA due {fmtWhen(r.slaDeadline)}</div>}
      </div>
    </div>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  const db = useDB();
  const [page, setPage] = useState<Page>("overview");
  const [openId, setOpenId] = useState<string | null>(null);
  const [sel, setSel] = useState<MapSelection | null>(null);
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [nm, setNm] = useState({ machineId: "m-104", title: "Hydraulic pressure loss", desc: "Urgent turbine vibration issue at Houston line.", priority: "P1" as "P1" | "P2" | "P3" | "P4" });

  useEffect(() => { setOpenId(null); }, [page]);
  useEffect(() => { try { store.slaTick("system"); } catch {} }, []);

  if (!user) return <AuthGate />;
  const allowed = ROLE_PAGES[user.role] ?? NAV.map((n) => n.id);
  const nav = NAV.filter((n) => allowed.includes(n.id));
  const dbUser = db.users.find((u) => u.id === user.id) ?? db.users[1];
  const me = { ...dbUser, name: user.name, email: user.email, role: user.role, siteId: user.siteId ?? dbUser.siteId };
  const openExc = db.exceptions.filter((e) => !e.resolved).length;
  const pageTitle = NAV.find((n) => n.id === page)?.label ?? page;
  const open = (id: string) => { setOpenId(id); };

  const createNow = () => {
    try {
      const r = store.createRequest({ machineId: nm.machineId, title: nm.title, description: nm.desc, priority: nm.priority, requiredParts: [{ sku: "BELT-V88", qty: 1 }] }, me.id);
      setShowNew(false); setOpenId(r.id); setPage("requests");
    } catch (e) { alert((e as Error).message); }
  };

  const renderPage = () => {
    if (openId) return <RequestDetailDark requestId={openId} me={me} back={() => setOpenId(null)} onSelect={setSel} />;
    switch (page) {
      case "overview": return <OpsDashboard actorId={me.id} onOpen={open} goto={(p) => setPage(p as Page)} onSelect={setSel} destinationSel={sel} />;
      case "requests": return <RequestsTable me={me} onOpen={open} title="Service Requests" />;
      case "workorders": return <RequestsTable me={me} onOpen={open} title="Work Orders" filter={(r) => ["ASSIGNED", "IN_PROGRESS", "PENDING_VERIFICATION"].includes(r.status)} />;
      case "approvals": return <RequestsTable me={me} onOpen={open} title="Approvals" filter={(r) => r.status === "PENDING_APPROVAL"} />;
      case "sla": return <RequestsTable me={me} onOpen={open} title="SLA Monitor" />;
      case "equipment": return <EquipmentPage onSelect={setSel} onOpenRequest={open} destinationSel={sel} />;
      case "sites": return <SitesPage onSelect={setSel} onOpenRequest={open} destinationSel={sel} />;
      case "technicians": return <TechniciansPage onSelect={setSel} onOpenRequest={open} destinationSel={sel} />;
      case "inventory": return <InventoryPage />;
      case "schedule": return <SchedulePage />;
      case "exceptions": return <ExceptionsPage onOpen={open} />;
      case "audit": return <AuditPage />;
      case "notifications": return (
        <div className="so-table-wrap" style={{ padding: 6 }}>
          {db.notifications.slice(0, 20).map((n) => {
            const code = (n.title + " " + n.body).match(/SR-\d+/)?.[0];
            const req = code && db.requests.find((r) => r.code === code);
            return (
              <div key={n.id} className="so-exrow" style={{ cursor: req ? "pointer" : "default" }} onClick={() => req && open(req.id)}>
                <div className="so-exbody">
                  <div className="so-ex-title" style={{ margin: 0 }}>{n.title}</div>
                  <div className="so-ex-desc">{n.body}</div>
                  <div className="so-ex-owner">{fmtWhen(n.at)}{req ? " · linked record " + req.code + " →" : ""}</div>
                </div>
              </div>
            );
          })}
          {db.notifications.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "#8b99b0" }}>No notifications.</div>}
        </div>
      );
      case "reports": return <ReportsPage />;
      case "settings": return <SimplePage title="Settings">Workspace: Demo workspace · Role: {me.role} · Site: {me.siteId}. SLA rules (demo): EMERGENCY 2h · HIGH 4h · MEDIUM 12h · LOW 48h — editable by admin in production deploy.</SimplePage>;
      default: return <OpsDashboard actorId={me.id} onOpen={open} goto={(p) => setPage(p as Page)} onSelect={setSel} destinationSel={sel} />;
    }
  };

  const showHead = !openId && ["overview", "requests", "workorders", "equipment", "sites", "technicians", "inventory", "schedule", "approvals", "exceptions"].includes(page);
  const heads: Record<string, { k: string; t: string; s: string }> = {
    overview: { k: "INDUSTRIAL SERVICE OPERATIONS", t: "Operations Command Center", s: "Real-time visibility across equipment service operations" },
    requests: { k: "INDUSTRIAL SERVICE OPERATIONS", t: "Service Requests", s: "Connected records, clear accountability, traceable actions." },
    workorders: { k: "INDUSTRIAL SERVICE OPERATIONS", t: "Work Orders", s: "Connected records, clear accountability, traceable actions." },
    equipment: { k: "INDUSTRIAL SERVICE OPERATIONS", t: "Equipment", s: "Connected records, clear accountability, traceable actions." },
    sites: { k: "INDUSTRIAL SERVICE OPERATIONS", t: "Sites", s: "Connected records, clear accountability, traceable actions." },
    technicians: { k: "INDUSTRIAL SERVICE OPERATIONS", t: "Technicians", s: "Connected records, clear accountability, traceable actions." },
    inventory: { k: "INDUSTRIAL SERVICE OPERATIONS", t: "Resources & Inventory", s: "Connected records, clear accountability, traceable actions." },
    schedule: { k: "INDUSTRIAL SERVICE OPERATIONS", t: "Schedule", s: "Connected records, clear accountability, traceable actions." },
    approvals: { k: "INDUSTRIAL SERVICE OPERATIONS", t: "Approvals", s: "Connected records, clear accountability, traceable actions." },
    exceptions: { k: "INDUSTRIAL SERVICE OPERATIONS", t: "Exceptions", s: "Connected records, clear accountability, traceable actions." },
  };

  return (
    <div className="so-shell">
      <aside className="so-side">
        <div className="so-logo">
          <div className="so-logo-mark">∿</div>
          <div><div className="so-logo-name">service<span>grid</span></div><div className="so-logo-sub">INDUSTRIAL INTELLIGENCE</div></div>
        </div>
        <div className="so-side-label"><span>WORKSPACE</span><span className="so-dq">DQ 3.0</span></div>
        <nav className="so-nav">
          {nav.map((n) => (
            <button key={n.id} className={`so-nav-item${page === n.id && !openId ? " active" : ""}`} onClick={() => setPage(n.id)}>
              <n.icon />{n.label}{n.id === "exceptions" && openExc > 0 && <span className="so-nav-badge">{openExc}</span>}
            </button>
          ))}
        </nav>
        <div style={{ marginTop: "auto", padding: "12px 12px 0", display: "flex", gap: 8 }}>
          <button className="so-ghost-btn" style={{ flex: 1 }} onClick={() => { if (confirm("Reset demo data?")) store.reset(); }}>Reset demo</button>
          <button className="so-ghost-btn" style={{ flex: 1 }} onClick={logout}>Logout</button>
        </div>
      </aside>

      <div className="so-main">
        <div className="so-top">
          <span className="so-crumb">Workspace &nbsp;/&nbsp; <b>{openId ? "Request detail" : pageTitle}</b></span>
          <div className="so-search">⌕<input placeholder="Search across operations..." value={q} onChange={(e) => setQ(e.target.value)} /><span className="so-kbd">⌘ K</span></div>
          <button className="so-sites">All Sites ▾</button>
          <button className="so-bell">🔔<span className="so-bell-dot">{Math.min(9, db.notifications.length) || 3}</span></button>
          <div className="so-user"><div className="so-avatar">AM</div><div><div className="so-user-name">Demo workspace</div><div className="so-user-role">{user.role === "OPS_MANAGER" ? "Service Manager" : domainConfig[user.domain].name}</div></div><span style={{ color: "#5d6b84" }}>▾</span></div>
        </div>

        <div className="so-page">
          {showHead && heads[page] && <PageHead kicker={heads[page].k} title={heads[page].t} sub={heads[page].s} onNew={() => setShowNew(true)} />}
          {renderPage()}
          <div className="so-foot"><span>〰 Meridian service network</span><span>DataQuest 3.0 · Connected operations, from request to resolution</span></div>
        </div>
      </div>

      <EntityDrawer sel={sel} meId={me.id} onClose={() => setSel(null)} onOpenRequest={open} onSelect={setSel} />

      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }} onClick={() => setShowNew(false)}>
          <div className="so-panel" style={{ width: 520, maxWidth: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div className="so-panel-title" style={{ marginBottom: 4 }}>＋ Create Service Request</div>
            <div style={{ color: "#8b99b0", fontSize: 12, marginBottom: 14 }}>Validation → approval → dispatch runs automatically on submit.</div>
            <label className="so-label">Machine</label>
            <select className="so-select" style={{ width: "100%", marginBottom: 10 }} value={nm.machineId} onChange={(e) => setNm({ ...nm, machineId: e.target.value })}>
              {db.machines.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
            </select>
            <label className="so-label">Issue title</label>
            <input className="so-input" style={{ marginBottom: 10 }} value={nm.title} onChange={(e) => setNm({ ...nm, title: e.target.value })} />
            <label className="so-label">Description</label>
            <textarea className="so-textarea" rows={3} style={{ marginBottom: 10 }} value={nm.desc} onChange={(e) => setNm({ ...nm, desc: e.target.value })} />
            <label className="so-label">Priority (EMERGENCY → 2h SLA demo)</label>
            <select className="so-select" style={{ width: "100%", marginBottom: 14 }} value={nm.priority} onChange={(e) => setNm({ ...nm, priority: e.target.value as any })}>
              <option value="P1">EMERGENCY / Critical</option><option value="P2">HIGH</option><option value="P3">MEDIUM</option><option value="P4">LOW</option>
            </select>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="so-ghost-btn" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="so-ghost-btn solid" onClick={createNow}>Submit request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
