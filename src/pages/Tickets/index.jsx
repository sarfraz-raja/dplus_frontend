import React, { useEffect, useState } from "react";
import Api from "../../utils/api";
import CreateTicketModal from "./CreateTicketModal";
import ChatModal from "./ChatModal";
import toast, { Toaster } from "react-hot-toast";

const KANBAN_COLUMNS = [
  { id: "open",       label: "Open",        statuses: ["OPEN", "ASSIGNED"],   targetStatus: "OPEN",        headerColor: "#16a34a", headerBg: "#f0fdf4", countBg: "#dcfce7" },
  { id: "inprogress", label: "In Progress",  statuses: ["IN_PROGRESS"],        targetStatus: "IN_PROGRESS", headerColor: "#d97706", headerBg: "#fffbeb", countBg: "#fef3c7" },
  { id: "resolved",   label: "Resolved",     statuses: ["RESOLVED", "CLOSED"], targetStatus: "RESOLVED",    headerColor: "#7c3aed", headerBg: "#f5f3ff", countBg: "#ede9fe" },
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
const SEVERITY_COLORS = { S1: "#be123c", S2: "#b45309", S3: "#0f766e", S4: "#166534" };
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

const EMPTY_FILTER = { priorities: [], time: "all" };

export default function TicketsPage() {
  const [tickets, setTickets]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [openModal, setOpenModal]         = useState(false);
  const [chatModal, setChatModal]         = useState({ isOpen: false, ticketId: null, ticketCode: null, ticketTitle: "" });
  const [updatingField, setUpdatingField] = useState({ id: null, field: null });
  const [draggedTicketId, setDraggedTicketId] = useState(null);
  const [dragOverColumn, setDragOverColumn]   = useState(null);
  const [columnFilters, setColumnFilters]     = useState({
    open:       { ...EMPTY_FILTER },
    inprogress: { ...EMPTY_FILTER },
    resolved:   { ...EMPTY_FILTER },
  });
  const [expandedColumns, setExpandedColumns] = useState({
    open: true, inprogress: true, resolved: true,
  });

  const fetchTickets = async () => {
    try {
      const res = await Api.get({ url: "/tickets/ticket_list" });
      setTickets(res?.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);

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

  const openChatModal = (ticket) =>
    setChatModal({ isOpen: true, ticketId: ticket.id, ticketCode: ticket.ticket_id, ticketTitle: ticket.title });

  // ── Column ticket helpers ───────────────────────────────────────────────────
  const ALL_KNOWN_STATUSES = KANBAN_COLUMNS.flatMap((c) => c.statuses);
  const getColTickets = (colId) => {
    const col = KANBAN_COLUMNS.find((c) => c.id === colId);
    if (!col) return [];
    return col.id === "open"
      ? tickets.filter((t) => col.statuses.includes(t.status) || !ALL_KNOWN_STATUSES.includes(t.status))
      : tickets.filter((t) => col.statuses.includes(t.status));
  };

  // ── Per-column filters ──────────────────────────────────────────────────────
  const togglePriority = (colId, priority) =>
    setColumnFilters((prev) => {
      const cur = prev[colId].priorities;
      return { ...prev, [colId]: { ...prev[colId], priorities: cur.includes(priority) ? cur.filter((p) => p !== priority) : [...cur, priority] } };
    });

  const setTimeFilter  = (colId, time) => setColumnFilters((prev) => ({ ...prev, [colId]: { ...prev[colId], time } }));
  const clearFilters   = (colId) => setColumnFilters((prev) => ({ ...prev, [colId]: { ...EMPTY_FILTER } }));

  const applyFilters = (list, colId) => {
    const { priorities, time } = columnFilters[colId] || EMPTY_FILTER;
    let result = list;
    if (priorities.length > 0) result = result.filter((t) => priorities.includes(t.priority));
    if (time !== "all") {
      const cutoff = Date.now() - (TIME_MS[time] || 0);
      result = result.filter((t) => new Date(t.last_activity_at || t.create_time).getTime() >= cutoff);
    }
    return result;
  };

  const activeFilterCount = (colId) => {
    const { priorities, time } = columnFilters[colId] || EMPTY_FILTER;
    return priorities.length + (time !== "all" ? 1 : 0);
  };

  const toggleColumn = (colId) =>
    setExpandedColumns((prev) => ({ ...prev, [colId]: !prev[colId] }));

  // ── Drag-drop ───────────────────────────────────────────────────────────────
  const handleDragStart = (e, ticketId) => { setDraggedTicketId(ticketId); e.dataTransfer.effectAllowed = "move"; };
  const handleDragEnd   = () => { setDraggedTicketId(null); setDragOverColumn(null); };
  const handleDragOver  = (e, colId) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverColumn(colId); };
  const handleDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverColumn(null); };
  const handleDrop      = (e, column) => {
    e.preventDefault();
    if (draggedTicketId) {
      const ticket = tickets.find((t) => t.id === draggedTicketId);
      if (ticket && !column.statuses.includes(ticket.status))
        handleFieldUpdate(draggedTicketId, "status", column.targetStatus);
    }
    setDraggedTicketId(null);
    setDragOverColumn(null);
  };

  // ── Kanban Card ─────────────────────────────────────────────────────────────
  const KanbanCard = ({ ticket }) => {
    const sevColor   = SEVERITY_COLORS[ticket.severity] || "#94a3b8";
    const priStyle   = PRIORITY_STYLES[ticket.priority] || { bg: "#f1f5f9", text: "#64748b", border: "#e2e8f0" };
    const initials   = getInitials(ticket.assigned_team);
    const avatarBg   = getAvatarColor(ticket.assigned_team);
    const isDragging = draggedTicketId === ticket.id;
    const isUpdating = updatingField.id === ticket.id && updatingField.field === "status";

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, ticket.id)}
        onDragEnd={handleDragEnd}
        className={`bg-white rounded-xl border border-gray-200 shadow-sm select-none transition-all duration-150 ${
          isDragging ? "opacity-40 scale-[0.97] cursor-grabbing" : "hover:shadow-md hover:-translate-y-0.5 cursor-grab"
        } ${isUpdating ? "animate-pulse" : ""}`}
      >
        <div className="p-3">
          {/* Ticket ID + priority */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10px] text-gray-400 font-medium tracking-wide">{ticket.ticket_id}</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border leading-none"
              style={{ background: priStyle.bg, color: priStyle.text, borderColor: priStyle.border }}>
              {ticket.priority}
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
              {ticket.severity || "S?"}
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
                <p className="text-[10px] font-medium text-gray-600 truncate leading-none">
                  {ticket.assigned_team || "Unassigned"}
                </p>
                {ticket.last_activity_at && (
                  <p className="text-[9px] text-gray-400 leading-none mt-0.5">{timeAgo(ticket.last_activity_at)}</p>
                )}
              </div>
            </div>
            <button onClick={() => openChatModal(ticket)}
              className="p-1 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors shrink-0" title="Open Chat">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col h-[calc(100vh-4rem)] overflow-hidden p-3 sm:p-5 gap-3 sm:gap-4" style={{ background: "#ffffff" }}>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 shrink-0">
        {[
          { label: "Total",        value: tickets.length,                                             color: "#334155" },
          { label: "Open",         value: getColTickets("open").length,                               color: "#0f766e" },
          { label: "Critical",     value: tickets.filter((t) => t.priority === "Critical").length,    color: "#be123c" },
          { label: "Participants", value: tickets.reduce((acc, t) => acc + (t.participants || 0), 0), color: "#0369a1" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-2.5 sm:p-3 text-center flex flex-col items-center justify-center gap-0.5 bg-white"
            style={{ border: "1.5px solid #e2e8f0" }}>
            <span style={{ color }} className="text-xl sm:text-2xl font-bold leading-none">{value}</span>
            <span className="text-[9px] sm:text-[10px] uppercase leading-none font-medium mt-0.5 tracking-wide text-slate-400">{label}</span>
          </div>
        ))}
      </div>

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
           On desktop (lg+): 3-col grid with individual column scroll. */
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-3 gap-3 sm:gap-4 overflow-y-auto lg:overflow-hidden">
          {KANBAN_COLUMNS.map((column) => {
            const allColTickets      = getColTickets(column.id);
            const filteredColTickets = applyFilters(allColTickets, column.id);
            const activeCount        = activeFilterCount(column.id);
            const isTarget           = dragOverColumn === column.id;
            const isExpanded         = expandedColumns[column.id];
            const filters            = columnFilters[column.id];

            return (
              <div
                key={column.id}
                className={`flex flex-col rounded-xl overflow-hidden border-2 transition-all duration-200 shrink-0 lg:shrink ${
                  isTarget ? "border-dashed" : "border-transparent"
                }`}
                style={isTarget ? { borderColor: column.headerColor, background: `${column.headerColor}08` } : {}}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDrop={(e) => handleDrop(e, column)}
                onDragLeave={handleDragLeave}
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

                  {/* Right side: all filters + count + arrow */}
                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    {/* Priority chips */}
                    {PRIORITY_OPTIONS.map((p) => {
                      const isActive = filters.priorities.includes(p);
                      const s = PRIORITY_STYLES[p];
                      return (
                        <button key={p} onClick={() => togglePriority(column.id, p)}
                          className="text-[9px] font-semibold px-1.5 py-[3px] rounded-full border transition-all duration-100 shrink-0"
                          style={isActive
                            ? { background: s.bg, color: s.text, borderColor: s.border, boxShadow: `0 0 0 1.5px ${s.text}40` }
                            : { background: "white", color: "#94a3b8", borderColor: "#e2e8f0" }
                          }
                        >
                          {p}
                        </button>
                      );
                    })}

                    {/* Time filter — same pill style */}
                    <div className="relative inline-flex items-center shrink-0">
                      <select
                        value={filters.time}
                        onChange={(e) => setTimeFilter(column.id, e.target.value)}
                        className="text-[9px] pl-4 pr-2 h-5 rounded-full border bg-white focus:outline-none appearance-none cursor-pointer transition-all font-semibold leading-none"
                        style={filters.time !== "all"
                          ? { borderColor: column.headerColor, color: column.headerColor, background: `${column.headerColor}12`, boxShadow: `0 0 0 1.5px ${column.headerColor}40` }
                          : { borderColor: "#e2e8f0", color: "#94a3b8", background: "white" }
                        }
                      >
                        {TIME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <svg className="absolute left-1 inset-y-0 my-auto w-2.5 h-2.5 pointer-events-none"
                        style={{ color: filters.time !== "all" ? column.headerColor : "#9ca3af" }}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>

                    {/* Clear badge */}
                    {activeCount > 0 && (
                      <button onClick={() => clearFilters(column.id)}
                        className="text-[9px] font-bold px-1.5 py-[3px] rounded-full border bg-orange-50 text-orange-500 border-orange-200 hover:bg-orange-100 transition-colors shrink-0">
                        ✕ {activeCount}
                      </button>
                    )}

                    {/* Count badge */}
                    <span className="text-[10px] font-bold px-1.5 py-[3px] rounded-full shrink-0"
                      style={{ background: column.countBg, color: column.headerColor }}>
                      {activeCount > 0 ? `${filteredColTickets.length}/${allColTickets.length}` : allColTickets.length}
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
                  ${isTarget ? "bg-white/60" : "bg-slate-50"}`}
                >
                    {filteredColTickets.length === 0 ? (
                      <div className={`h-20 flex flex-col items-center justify-center rounded-lg border-2 border-dashed text-xs gap-1 transition-all ${
                        isTarget ? "border-gray-400 bg-white text-gray-400" : "border-gray-200 text-gray-300"
                      }`}>
                        {activeCount > 0 && allColTickets.length > 0
                          ? <><span className="text-gray-400">No matches</span><span className="text-gray-300">{allColTickets.length} hidden by filters</span></>
                          : "Drop here"
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

      {/* Chat Modal */}
      <ChatModal
        isOpen={chatModal.isOpen}
        onClose={() => setChatModal({ isOpen: false, ticketId: null, ticketCode: null, ticketTitle: "" })}
        ticketId={chatModal.ticketId}
        ticketTitle={chatModal.ticketCode ? `${chatModal.ticketCode} - ${chatModal.ticketTitle}` : chatModal.ticketTitle}
      />
    </div>
  );
}
