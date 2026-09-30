import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Api from "../../utils/api";
import CreateTicketModal from "./CreateTicketModal";
import ChatModal from "./ChatModal";
import IncidentModal from "./IncidentModal";
import toast, { Toaster } from "react-hot-toast";

// Columns are grouped PHASES, not 1:1 with backend status — the exact status
// (and the real lifecycle transitions between them) live in the ticket detail
// view, not here. Both the legacy manual-ticket vocabulary (OPEN/ASSIGNED/
// RESOLVED — untouched by Assurance, see ticket_management.py) and the new
// Assurance lifecycle (ACKNOWLEDGED/PENDING/VERIFICATION/CLOSED, no RESOLVED)
// coexist in the same `tickets` table, so each column lists every status —
// old or new — that belongs to that phase visually.
const KANBAN_COLUMNS = [
  { id: "open",         label: "Open",         statuses: ["OPEN", "ASSIGNED"],                      headerColor: "#16a34a", headerBg: "#f0fdf4", countBg: "#dcfce7" },
  { id: "inprogress",   label: "In Progress",  statuses: ["ACKNOWLEDGED", "IN_PROGRESS", "PENDING"], headerColor: "#d97706", headerBg: "#fffbeb", countBg: "#fef3c7" },
  { id: "verification", label: "Verification", statuses: ["VERIFICATION", "RESOLVED"],               headerColor: "#7c3aed", headerBg: "#f5f3ff", countBg: "#ede9fe" },
  { id: "closed",       label: "Closed",       statuses: ["CLOSED"],                                 headerColor: "#475569", headerBg: "#f8fafc", countBg: "#e2e8f0" },
];

const PRIORITY_OPTIONS = ["Critical", "High", "Medium", "Low"];
const PRIORITY_STYLES = {
  Critical: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  High:     { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
  Medium:   { bg: "#fefce8", text: "#ca8a04", border: "#fef08a" },
  Low:      { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
};
const TIME_OPTIONS = [
  { value: "all",     label: "All time" },
  { value: "today",   label: "Today" },
  { value: "week",    label: "Last 7 days" },
  { value: "month",   label: "Last 30 days" },
  { value: "quarter", label: "Last 3 months" },
  { value: "year",    label: "Last year" },
];
const TIME_MS = { today: 86400000, week: 604800000, month: 2592000000, quarter: 7776000000, year: 31536000000 };

// Muted professional palette — signals urgency without garish brightness.
// S3 (most common) is teal to keep the page calm; S1 still reads as serious.
// Manual tickets use S1–S4; Assurance-created tickets carry the rule's severity
// (Critical/Major/Minor/Warning) — mapped onto the same four tones.
const SEVERITY_COLORS = {
  S1: "#be123c", S2: "#b45309", S3: "#0f766e", S4: "#166534",
  Critical: "#be123c", Major: "#b45309", Minor: "#0f766e", Warning: "#166534",
};
// Identity colors only — blues/teals/rose/slate.
// Deliberately avoids red, orange, yellow, green (priority/severity) and purple (column/category).
const AVATAR_COLORS = [
  "#1d4ed8",  // cobalt blue
  "#0e7490",  // cyan
  "#0369a1",  // sky blue
  "#0f766e",  // teal
  "#be185d",  // rose  (clearly ≠ red/orange — feels personal)
  "#334155",  // slate (neutral / unassigned feel)
  "#1e3a8a",  // navy
];

const getInitials = (str) => {
  if (!str) return "?";
  return str.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
};
const getAvatarColor = (str) => {
  if (!str) return AVATAR_COLORS[0];
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
};
const timeAgo = (dateStr) => {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const EMPTY_FILTER = { time: "all", search: "", unreadOnly: false };

// Confirmed field: ticketing.tickets.source_alert_id (UUID, set by create_or_update_alert_ticket()
// in ticket_management.py). NOTE: GET /tickets/ticket_list's SELECT list does not currently
// include t.source_alert_id, so this will never be truthy until that's added server-side —
// the other keys below are kept only as a fallback in case the field gets renamed/aliased.
// Assurance-created tickets carry alarm_id (STANDARD/CHILD) or incident_id (MASTER/CHILD) —
// only ever set by the alarm/correlation engine, never by manual creation (API doc §10). Same
// caveat: ticket_list doesn't return them yet, so this only lights up once the backend SELECT does.
// (ticket_source is deliberately not checked — the doc names the column but not its values.)
const isAutoCreatedTicket = (ticket) => {
  if (!ticket) return false;
  if (ticket.alarm_id || ticket.incident_id) return true;
  if (ticket.source_alert_id || ticket.sourceAlertId) return true;
  if (ticket.alert_id || ticket.alertid || ticket.alertId) return true;
  const marker = String(ticket.source ?? ticket.origin ?? ticket.created_via ?? ticket.createdVia ?? "").toLowerCase();
  if (marker === "alert" || marker === "automated" || marker === "system") return true;
  if (ticket.is_auto || ticket.isAuto || ticket.automated) return true;
  return false;
};

export default function TicketsPage() {
  const [tickets, setTickets]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [openModal, setOpenModal]         = useState(false);
  const [chatModal, setChatModal]         = useState({ isOpen: false, ticketId: null });
  const [incidentModal, setIncidentModal] = useState({ isOpen: false, incidentId: null });
  const [updatingField, setUpdatingField] = useState({ id: null, field: null });
  const [filters, setFilters]                 = useState({ ...EMPTY_FILTER });
  const [expandedColumns, setExpandedColumns] = useState({
    open: true, inprogress: true, verification: true, closed: true,
  });

  const fetchTickets = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      // A silent (background) refresh must not raise the app-wide full-page loader — inst: 0 is the
      // no-loader axios instance (utils/api.js). Without it every 30s poll flashed the loader over
      // the whole page, which reads as the page reloading.
      const res = await Api.get({ url: "/tickets/ticket_list", inst: silent ? 0 : 1 });
      setTickets(res?.data?.data || []);
    } catch (err) {
      console.error(err);
      if (!silent) toast.error("Failed to fetch tickets");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // The board loads once and then refreshes after the user's own actions or via the header's
  // Refresh button — no background board-wide poll (each ticket_list call is a user lookup plus a
  // multi-join query). Targeted polling for server-side changes lives with the open ticket below.
  useEffect(() => {
    fetchTickets();
  }, []);

  // Arriving from the Incident List with a ticket picked in an incident's view: open it straight
  // away (the incident's ticket row is the fallback until ticket_list has it). The router state is
  // then cleared so a page refresh doesn't reopen it.
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const incoming = location.state?.openTicket;
    if (!incoming?.id) return;
    setChatModal({ isOpen: true, ticketId: incoming.id, fallback: incoming });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state]);

  const handleFieldUpdate = async (ticketId, field, newValue) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket || ticket[field] === newValue) return;
    try {
      setUpdatingField({ id: ticketId, field });
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, [field]: newValue } : t)));
      const res = await Api.patch({ url: "/tickets/update", data: { ticketId, field, value: newValue } });
      if (res?.status !== 200) throw new Error("Update failed");
      toast.success(`${field} updated`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to update ${field}`);
      fetchTickets();
    } finally {
      setUpdatingField({ id: null, field: null });
    }
  };

  const openChatModal = (ticket) => setChatModal({ isOpen: true, ticketId: ticket.id });

  // Jumping from an incident's ticket list to that ticket's chat — close the incident view and
  // open the ticket instead. ticket_list only returns tickets the current user participates in,
  // so the row from the incident response is kept as a fallback on the modal state itself
  // (not appended to `tickets`, which the 30s poll replaces wholesale — that used to empty the
  // open panel on the next refresh).
  const openTicketFromIncident = (ticket) => {
    setIncidentModal({ isOpen: false, incidentId: null });
    setChatModal({ isOpen: true, ticketId: ticket.id, fallback: ticket });
  };

  // After a lifecycle action: refresh the board, and if the open ticket is only known through
  // its incident (not in ticket_list), re-read it from GET /incidents/<id>/tickets so its
  // status/buttons don't go stale.
  const refreshAfterUpdate = async () => {
    await fetchTickets(true);
    const fallback = chatModal.fallback;
    if (!fallback?.incident_id) return;
    try {
      const res = await Api.get({ url: `/incidents/${fallback.incident_id}/tickets`, inst: 0 });
      const fresh = (res?.data?.data || []).find((t) => t.id === fallback.id);
      if (fresh) setChatModal((prev) => (prev.ticketId === fresh.id ? { ...prev, fallback: fresh } : prev));
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[tickets] incident ticket refresh failed", err);
    }
  };

  const openTicket = tickets.find((t) => t.id === chatModal.ticketId) || chatModal.fallback;

  // While a ticket panel is open (any status), coming back to it — switching back to this browser
  // tab, or focusing this window when two sit side by side — re-reads the ticket, so a change made
  // elsewhere (another tab/user) shows before an out-of-date button can be clicked. The 409
  // re-fetch in ChatModal stays as the safety net for changes that land while you're looking.
  // Tab switches fire both events, so repeats within 2s are skipped.
  const lastReturnRefresh = useRef(0);
  useEffect(() => {
    if (!chatModal.isOpen) return;
    const onReturn = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastReturnRefresh.current < 2000) return;
      lastReturnRefresh.current = now;
      refreshAfterUpdate();
    };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    return () => {
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [chatModal.isOpen, chatModal.ticketId]);

  // API doc Section 9 / Section 16: while a ticket is in VERIFICATION it auto-closes or
  // auto-reopens server-side (60s scheduler), so only then is the open ticket also polled — and
  // only while the browser tab is visible.
  const pollOpenTicket = chatModal.isOpen && openTicket?.status === "VERIFICATION";
  useEffect(() => {
    if (!pollOpenTicket) return;
    const tick = () => { if (document.visibilityState === "visible") refreshAfterUpdate(); };
    const pollId = setInterval(tick, 30000);
    return () => clearInterval(pollId);
  }, [pollOpenTicket, chatModal.ticketId]);

  // ── Column ticket helpers ───────────────────────────────────────────────────
  const ALL_KNOWN_STATUSES = KANBAN_COLUMNS.flatMap((c) => c.statuses);
  const getColTickets = (colId) => {
    const col = KANBAN_COLUMNS.find((c) => c.id === colId);
    if (!col) return [];
    return col.id === "open"
      ? tickets.filter((t) => col.statuses.includes(t.status) || !ALL_KNOWN_STATUSES.includes(t.status))
      : tickets.filter((t) => col.statuses.includes(t.status));
  };

  // ── Board filters — one shared bar above the columns, applied to every column ─
  const setTimeFilter  = (time) => setFilters((prev) => ({ ...prev, time }));
  const setSearch      = (search) => setFilters((prev) => ({ ...prev, search }));
  const toggleUnread   = () => setFilters((prev) => ({ ...prev, unreadOnly: !prev.unreadOnly }));
  const clearFilters   = () => setFilters({ ...EMPTY_FILTER });

  const applyFilters = (list) => {
    const { time, search, unreadOnly } = filters;
    let result = list;
    if (time !== "all") {
      const cutoff = Date.now() - (TIME_MS[time] || 0);
      result = result.filter((t) => new Date(t.last_activity_at || t.create_time).getTime() >= cutoff);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((t) =>
        [t.ticket_id, t.title, t.site_name, t.assigned_team, t.issue_category]
          .some((v) => String(v ?? "").toLowerCase().includes(q))
      );
    }
    if (unreadOnly) result = result.filter((t) => Number(t.unread_count) > 0);
    return result;
  };

  const activeFilterCount =
    (filters.time !== "all" ? 1 : 0) + (filters.search.trim() ? 1 : 0) + (filters.unreadOnly ? 1 : 0);

  const toggleColumn = (colId) =>
    setExpandedColumns((prev) => ({ ...prev, [colId]: !prev[colId] }));

  // No drag-and-drop: status only changes through the Assurance lifecycle endpoints
  // (acknowledge/start/pending/resume/resolve/close/reopen), each of which does more than
  // a status write (e.g. Resolve also sets verification fields atomically) and is gated
  // by the current status — those buttons live in the ticket detail view (ChatModal).

  // ── Kanban Card ─────────────────────────────────────────────────────────────
  const KanbanCard = ({ ticket }) => {
    const sevColor   = SEVERITY_COLORS[ticket.severity] || "#94a3b8";
    // Real assignees are participants_detail — assigned_team is only a free-text label and is empty on
    // Assurance-created tickets. Names the backend couldn't resolve come back as "Unknown" and aren't shown.
    const assigneeNames = (ticket.participants_detail || []).map((p) => p?.name).filter((n) => n && n !== "Unknown");
    const assigneeCount = Number(ticket.participants) || 0;
    const assignLabel = ticket.assigned_team
      || (assigneeNames.length > 2 ? `${assigneeNames.slice(0, 2).join(", ")} +${assigneeNames.length - 2}` : assigneeNames.join(", "))
      || (assigneeCount ? `${assigneeCount} assignee${assigneeCount === 1 ? "" : "s"}` : "");
    const assignTitle = [
      ticket.assigned_team && `Team: ${ticket.assigned_team}`,
      assigneeNames.length > 0 && `Assignees: ${assigneeNames.join(", ")}`,
    ].filter(Boolean).join(" · ");
    const avatarSeed = ticket.assigned_team || assigneeNames[0] || assignLabel;
    const initials   = getInitials(avatarSeed);
    const avatarBg   = getAvatarColor(avatarSeed);
    const isUpdating = updatingField.id === ticket.id && updatingField.field === "status";
    const unread     = Number(ticket.unread_count) || 0;

    return (
      // The whole card opens the ticket (details + lifecycle + chat). A click that ends a text
      // selection is ignored so copying an ID or title from a card doesn't pop the ticket open.
      <div
        role="button"
        tabIndex={0}
        aria-label={`Open ticket ${ticket.ticket_id}`}
        onClick={() => { if (!window.getSelection()?.toString()) openChatModal(ticket); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openChatModal(ticket); } }}
        className={`bg-white rounded-xl border border-gray-200 shadow-sm cursor-pointer transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${isUpdating ? "animate-pulse" : ""}`}
      >
        <div className="p-3">
          {/* Ticket ID + origin badges */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1 min-w-0">
              <span className="font-mono text-[10px] text-gray-400 font-medium tracking-wide truncate">{ticket.ticket_id}</span>
              {isAutoCreatedTicket(ticket) && (
                <span
                  title="Automatically created by an alert or Assurance rule"
                  className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0"
                  style={{ background: "#eef2ff", color: "#4338ca", borderColor: "#c7d2fe" }}
                >
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 2 3 14h7l-1 8 10-12h-7z" />
                  </svg>
                  Auto
                </span>
              )}
              {ticket.ticket_type && ticket.ticket_type !== "STANDARD" && (
                <span
                  title={ticket.ticket_type === "MASTER" ? "Master ticket for a correlated incident" : "Child ticket promoted into a correlated incident"}
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0"
                  style={{ background: "#fff7ed", color: "#c2410c", borderColor: "#fed7aa" }}
                >
                  {ticket.ticket_type}
                </span>
              )}
            </span>
          </div>

          {/* Title */}
          <p className="text-[13px] font-semibold text-gray-800 leading-snug mb-2"
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {ticket.title}
          </p>

          {/* Chips + site name on same row */}
          <div className="flex items-center gap-1 flex-wrap mb-3">
            {ticket.issue_category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 font-medium shrink-0">
                {ticket.issue_category}
              </span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold border leading-none shrink-0"
              style={{ background: `${sevColor}18`, color: sevColor, borderColor: `${sevColor}35` }}>
              {ticket.severity || "—"}
            </span>
            {ticket.site_name && (
              <span className="text-[10px] text-gray-400 truncate min-w-0" title={ticket.site_name}>
                {ticket.site_name}
              </span>
            )}
          </div>

          {/* Avatar + team + time + chat */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 border-2 border-gray-100 shadow-sm"
                style={{ background: avatarBg }}>
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-gray-600 truncate leading-none" title={assignTitle || undefined}>
                  {assignLabel || "Unassigned"}
                </p>
                {ticket.last_activity_at && (
                  <p className="text-[9px] text-gray-400 leading-none mt-0.5">{timeAgo(ticket.last_activity_at)}</p>
                )}
              </div>
            </div>
            {/* Chat indicator — the whole card is the click target now, so this just flags unread messages */}
            <span className="relative p-1 text-gray-400 shrink-0"
              title={unread > 0 ? `${unread} unread message${unread === 1 ? "" : "s"}` : "Open ticket details & chat"}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ── Shared filter bar — rendered in the header on xl+, below the stats otherwise ─
  const showFilterBar = !loading && tickets.length > 0;
  const filterBar = (
    <div className="flex items-center flex-wrap gap-2">
      <div className="relative inline-flex items-center">
        <select
          value={filters.time}
          onChange={(e) => setTimeFilter(e.target.value)}
          className="text-[11px] pl-6 pr-3 h-7 rounded-full border bg-white focus:outline-none appearance-none cursor-pointer transition-all font-semibold leading-none"
          style={filters.time !== "all"
            ? { borderColor: "#EC7D09", color: "#EC7D09", background: "#EC7D0912", boxShadow: "0 0 0 1.5px #EC7D0940" }
            : { borderColor: "#e2e8f0", color: "#94a3b8", background: "white" }
          }
        >
          {TIME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <svg className="absolute left-2 inset-y-0 my-auto w-3 h-3 pointer-events-none"
          style={{ color: filters.time !== "all" ? "#EC7D09" : "#9ca3af" }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <div className="relative inline-flex items-center">
        <svg className="absolute left-2 inset-y-0 my-auto w-3 h-3 pointer-events-none text-slate-400"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
        </svg>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tickets…"
          className="text-[11px] pl-6 pr-2 h-7 w-36 rounded-full border bg-white focus:outline-none focus:border-orange-400 transition-all font-medium placeholder:text-slate-400"
          style={filters.search.trim()
            ? { borderColor: "#EC7D09", boxShadow: "0 0 0 1.5px #EC7D0940" }
            : { borderColor: "#e2e8f0" }}
        />
      </div>

      <button onClick={toggleUnread}
        title="Only tickets with unread chat messages"
        className="text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all duration-100"
        style={filters.unreadOnly
          ? { background: "#EC7D0912", color: "#EC7D09", borderColor: "#EC7D09", boxShadow: "0 0 0 1.5px #EC7D0940" }
          : { background: "white", color: "#94a3b8", borderColor: "#e2e8f0" }}
      >
        Unread
      </button>

      {activeFilterCount > 0 && (
        <button onClick={clearFilters}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 transition-colors">
          Clear filters ✕
        </button>
      )}
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col h-full overflow-hidden p-3 sm:p-5 gap-3 sm:gap-4" style={{ background: "#ffffff" }}>
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shadow-md shrink-0" style={{ background: "#0b1830" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight">Tickets</h1>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium tracking-wide hidden sm:block">Track and manage telecom network issues</p>
          </div>
        </div>

        {/* Board filters — in the header row on xl+ (below the stats on smaller screens) */}
        {showFilterBar && <div className="hidden xl:flex flex-1 justify-center min-w-0 px-4">{filterBar}</div>}

        <div className="flex items-center gap-2">
          <button onClick={() => fetchTickets()} title="Refresh"
            className="p-2 text-slate-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button onClick={() => setOpenModal(true)}
            className="px-3 sm:px-4 py-2 text-white rounded-lg hover:opacity-90 focus:outline-none transition-opacity flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium"
            style={{ background: "#EC7D09" }}>
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Create Ticket</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 shrink-0">
        {[
          { label: "Total",         value: tickets.length,                                          color: "#334155" },
          { label: "Open",          value: getColTickets("open").length,                            color: "#0f766e" },
          { label: "SLA Breached",  value: tickets.filter((t) => t.sla_breached).length,             color: "#be123c" },
          { label: "Pending",       value: tickets.filter((t) => t.status === "PENDING").length,     color: "#d97706" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-2.5 sm:p-3 text-center flex flex-col items-center justify-center gap-0.5 bg-white"
            style={{ border: "1.5px solid #e2e8f0" }}>
            <span style={{ color }} className="text-xl sm:text-2xl font-bold leading-none">{value}</span>
            <span className="text-[9px] sm:text-[10px] uppercase leading-none font-medium mt-0.5 tracking-wide text-slate-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Board filters — below the stats on smaller screens (the header row has room on xl+) */}
      {showFilterBar && <div className="xl:hidden shrink-0">{filterBar}</div>}

      {/* Kanban Board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Loading tickets…</div>
      ) : tickets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500">No tickets yet</p>
          <button onClick={() => setOpenModal(true)} className="px-4 py-2 text-white rounded-lg hover:opacity-90 text-sm font-medium" style={{ background: "#EC7D09" }}>
            Create your first ticket
          </button>
        </div>
      ) : (
        /* On mobile: vertical stack (flex-col + overflow-y scroll).
           On desktop (lg+): 4-col grid with individual column scroll. */
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-4 gap-3 sm:gap-4 overflow-y-auto lg:overflow-hidden">
          {KANBAN_COLUMNS.map((column) => {
            const allColTickets      = getColTickets(column.id);
            const filteredColTickets = applyFilters(allColTickets);
            const isExpanded         = expandedColumns[column.id];

            return (
              <div
                key={column.id}
                className="flex flex-col rounded-xl overflow-hidden shrink-0 lg:shrink"
              >
                {/* ── Column header ── */}
                <div
                  className="shrink-0 flex items-center gap-1.5 px-2.5 py-2"
                  style={{ background: column.headerBg }}
                >
                  {/* Dot + label — left side */}
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: column.headerColor }} />
                  <span className="text-sm font-bold shrink-0" style={{ color: column.headerColor }}>{column.label}</span>

                  {/* Spacer pushes everything else to the right */}
                  <div className="flex-1" />

                  {/* Right side: count + arrow (filters live in the shared bar above the board) */}
                  <div className="flex items-center gap-1 justify-end">
                    {/* Count badge */}
                    <span className="text-[10px] font-bold px-1.5 py-[3px] rounded-full shrink-0"
                      style={{ background: column.countBg, color: column.headerColor }}>
                      {activeFilterCount > 0 ? `${filteredColTickets.length}/${allColTickets.length}` : allColTickets.length}
                    </span>

                    {/* Collapse arrow — mobile only */}
                    <button onClick={() => toggleColumn(column.id)}
                      className="lg:hidden w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 transition-all shrink-0">
                      <svg className="w-3.5 h-3.5 transition-transform duration-200"
                        style={{ color: column.headerColor, transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)" }}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* ── Cards area — always visible on desktop, toggleable on mobile ── */}
                <div className={`overflow-y-auto p-2 space-y-2 transition-colors duration-150
                  max-h-[60vh] lg:max-h-none lg:flex-1
                  ${isExpanded ? "flex flex-col" : "hidden lg:flex lg:flex-col"}
                  bg-slate-50`}
                >
                    {filteredColTickets.length === 0 ? (
                      <div className="h-20 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-gray-300 text-xs gap-1">
                        {activeFilterCount > 0 && allColTickets.length > 0
                          ? <><span className="text-gray-400">No matches</span><span className="text-gray-300">{allColTickets.length} hidden by filters</span></>
                          : "No tickets"
                        }
                      </div>
                    ) : (
                      filteredColTickets.map((ticket) => <KanbanCard key={ticket.id} ticket={ticket} />)
                    )}
                  </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        onSuccess={() => { fetchTickets(); setOpenModal(false); }}
        contained
      />

      {/* Chat + Lifecycle Modal — ticket looked up live from `tickets` so it always
          reflects the latest status, including after a lifecycle action, a manual refresh or the
          VERIFICATION poll */}
      <ChatModal
        isOpen={chatModal.isOpen}
        onClose={() => setChatModal({ isOpen: false, ticketId: null })}
        ticket={openTicket}
        onUpdated={refreshAfterUpdate}
        onViewIncident={(incidentId) => setIncidentModal({ isOpen: true, incidentId })}
      />

      {/* Incident view — read-only, per API doc there's no manual create/close */}
      <IncidentModal
        isOpen={incidentModal.isOpen}
        onClose={() => setIncidentModal({ isOpen: false, incidentId: null })}
        incidentId={incidentModal.incidentId}
        onOpenTicket={openTicketFromIncident}
      />
    </div>
  );
}
