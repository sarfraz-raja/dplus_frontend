import React, { useState, useEffect, useRef } from "react";
import Api from "../../utils/api";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import ConfirmModal from "../../components/ConfirmModal";
import { getApiErrorMessage } from "../../utils/common";
import { Urls } from "../../utils/url";
import { TELECOM_CONSTANTS } from "./ticketConstants";

// New Assurance ticket-lifecycle endpoints (POST /tickets/<id>/<action>), added
// to the existing ticket_management.py — see ASSURANCE_FRONTEND_API_DOCUMENTATION.md
// Section 9. Each button below is gated to the exact status the backend requires;
// a 409 (status changed elsewhere) re-fetches via onUpdated rather than trusting
// local state. There is no RESOLVED status — Resolve goes straight to VERIFICATION.
const LIFECYCLE_ACTIONS = {
  OPEN:         [{ key: "acknowledge", label: "Acknowledge", variant: "primary" }],
  ACKNOWLEDGED: [{ key: "start",       label: "Start Work",  variant: "primary" }],
  IN_PROGRESS:  [
    { key: "pending", label: "Mark Pending", variant: "secondary" },
    { key: "resolve", label: "Resolve",      variant: "primary" },
  ],
  // Resolve is valid from IN_PROGRESS *or* PENDING (API doc §9 / Status Reference §B)
  PENDING:      [
    { key: "resume",  label: "Resume",  variant: "secondary" },
    { key: "resolve", label: "Resolve", variant: "primary" },
  ],
  VERIFICATION: [{ key: "reopen",  label: "Reopen",  variant: "secondary" }],
  CLOSED:       [{ key: "reopen",  label: "Reopen",  variant: "secondary" }],
};
// Force Close is offered from any non-CLOSED status, alongside whatever's above.
const STATUS_BADGE = {
  OPEN:         { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  ACKNOWLEDGED: { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  IN_PROGRESS:  { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  PENDING:      { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  VERIFICATION: { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" },
  CLOSED:       { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" },
  // Legacy manual-ticket statuses, untouched by Assurance
  ASSIGNED:     { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  RESOLVED:     { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" },
};

// Backend-generated notices. NOTE: create_or_update_alert_ticket() in ticket_management.py
// currently inserts the alert "re-occurred" notice as a normal message_type='TEXT' row with
// sender_id = the alert's creator — it's not actually distinguishable from a real user message
// except by its fixed text prefix, so that's matched here too. message_type SYSTEM / no-sender
// are kept as forward-compatible checks in case the backend later marks these more explicitly.
const isSystemMessage = (msg) =>
  msg.message_type === "SYSTEM" ||
  msg.message_type === "system" ||
  (!msg.sender_id && !msg.username) ||
  (typeof msg.message === "string" && msg.message.startsWith("Issue re-occurred at"));

// Read-only fields: plain text normally; while the section is in edit mode they render as greyed-out,
// disabled inputs so it's obvious they can't be changed here.
function LockedRow({ label, value, editing, span2, children }) {
  return (
    <div className={`min-w-0 ${span2 ? "col-span-2" : ""}`}>
      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
      {editing ? (
        children
          ? <div className="mt-1 opacity-60 cursor-not-allowed" title="Can't be edited here">{children}</div>
          : <input type="text" disabled value={value ?? ""} title="Can't be edited here"
              className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-slate-50 text-slate-400 cursor-not-allowed mt-1" />
      ) : (
        <div className="text-xs text-gray-700 mt-0.5 break-words">{children ?? (value || "—")}</div>
      )}
    </div>
  );
}

// Ticket fields editable in the Details section. PATCH /tickets/update takes every changed field
// in ONE call (multi-field form, keys named as in POST /tickets/create — `apiKey` below), applied
// in one transaction. Row key = ticket_list's column name; apiKey = the update endpoint's key.
// `status` is deliberately not in this map: it changes only through the 7 lifecycle endpoints
// (which also set verification/SLA fields and write the event log). Cells, site and participants
// are also accepted by the endpoint (full-list replace) but have no editor here yet, so they stay
// read-only (LockedRow). `assigned_team` is a free-text label — no id/permissions — and is empty
// on Assurance-created tickets.
const EDITABLE_FIELDS = {
  title:          { label: "Title",         type: "text",     apiKey: "title",         required: true },
  description:    { label: "Description",   type: "textarea", apiKey: "description",   empty: "No description" },
  issue_category: { label: "Category",      type: "select",   apiKey: "issuecategory", options: TELECOM_CONSTANTS.ISSUE_CATEGORIES },
  technology:     { label: "Technology",    type: "select",   apiKey: "technology",    options: TELECOM_CONSTANTS.TECHNOLOGY },
  region:         { label: "Region",        type: "select",   apiKey: "region",        options: TELECOM_CONSTANTS.REGIONS },
  severity:       { label: "Severity",      type: "select",   apiKey: "severity",      options: TELECOM_CONSTANTS.SEVERITIES, required: true },
  priority:       { label: "Priority",      type: "select",   apiKey: "priority",      options: TELECOM_CONSTANTS.PRIORITIES, required: true },
  assigned_team:  { label: "Assigned team", type: "select",   apiKey: "assignedteam",  empty: "Unassigned" }, // options = group names, passed in
};

const editInputCls = "w-full px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400";

// A controlled row: shows the value, or an input while the whole Details section is in edit mode
// (the Edit / Save changes buttons live in the Details header, not on each row).
function FieldRow({ field, value, editing, draft, onDraft, options, disabled, span2 }) {
  const config = EDITABLE_FIELDS[field];
  // `editable: false` in EDITABLE_FIELDS = the backend doesn't accept this field: shown greyed-out
  // and disabled in edit mode, and never sent.
  const locked = config.editable === false;

  // A stored value that isn't in the list (legacy data, a deleted group) stays selectable so it isn't blanked.
  const base = options ?? config.options ?? [];
  const selectOptions = value && !base.includes(value) ? [...base, value] : base;

  return (
    <div className={`min-w-0 ${span2 ? "col-span-2" : ""}`}>
      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
        {config.label}{editing && config.required && !locked && <span className="text-red-400"> *</span>}
      </p>

      {editing && !locked ? (
        config.type === "textarea" ? (
          <textarea rows={3} value={draft ?? ""} onChange={(e) => onDraft(e.target.value)} disabled={disabled} className={`${editInputCls} mt-1`} />
        ) : config.type === "select" ? (
          <select value={draft ?? ""} onChange={(e) => onDraft(e.target.value)} disabled={disabled} className={`${editInputCls} mt-1`}>
            {!config.required && <option value="">{config.empty || "— none —"}</option>}
            {/* A required field with no value yet (e.g. priority on an Assurance-created ticket, which
                the backend creates without one) shows a placeholder instead of silently displaying
                the first option. It can't be re-selected, and saving an empty required field is blocked. */}
            {config.required && !draft && <option value="" disabled>Select…</option>}
            {selectOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input type="text" value={draft ?? ""} onChange={(e) => onDraft(e.target.value)} disabled={disabled} className={`${editInputCls} mt-1`} />
        )
      ) : editing ? (
        config.type === "textarea"
          ? <textarea rows={3} disabled value={value ?? ""} title="Can't be edited here"
              className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-slate-50 text-slate-400 cursor-not-allowed mt-1" />
          : <input type="text" disabled value={value ?? ""} title="Can't be edited here"
              className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-slate-50 text-slate-400 cursor-not-allowed mt-1" />
      ) : (
        <div className="text-xs text-gray-700 mt-0.5 break-words">
          {value
            ? <span className={config.type === "textarea" ? "whitespace-pre-wrap" : ""}>{value}</span>
            : <span className="text-gray-400">{config.empty || "—"}</span>}
        </div>
      )}
    </div>
  );
}

const formatDateTime = (ts) =>
  ts ? new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : null;

// SLA due dates only matter while the ticket is still being worked — once it's in
// VERIFICATION/CLOSED, a past date isn't "overdue" any more (ACK is only checked
// while OPEN; response/resolution while OPEN..PENDING — API doc §11).
const ACTIVE_SLA_STATUSES = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "PENDING"];

export default function ChatModal({ isOpen, onClose, ticket, onUpdated, onViewIncident }) {
  const authUser = useSelector((state) => state.auth.user);
  const ticketId = ticket?.id;
  const ticketTitle = ticket?.ticket_id ? `${ticket.ticket_id} - ${ticket?.title || ""}` : ticket?.title;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const [actionPending, setActionPending] = useState(null); // key of in-flight lifecycle action
  const [pendingReasonOpen, setPendingReasonOpen] = useState(false);
  const [pendingReason, setPendingReason] = useState("");
  const [reopenReasonOpen, setReopenReasonOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  // Whole-section edit mode: `drafts` holds every editable field's in-progress value.
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [savingAll, setSavingAll] = useState(false);
  // Group names for the "Assigned team" editor (same source as the Raise Ticket form's team picker).
  const [groupNames, setGroupNames] = useState([]);
  // id → display name, for the Activity list's "by" (acknowledged_by / resolved_by are user UUIDs).
  const [userNames, setUserNames] = useState({});

  // Reset the inline reason forms whenever a different ticket is opened, so a
  // half-typed reason from a previous ticket never carries over.
  useEffect(() => {
    setPendingReasonOpen(false);
    setPendingReason("");
    setReopenReasonOpen(false);
    setReopenReason("");
    setCloseConfirmOpen(false);
    setEditing(false);
    setDrafts({});
  }, [ticketId]);

  // The pending/reopen reason boxes belong to the status they were opened from — once the status
  // changes (another action, a refresh, a server-side auto-close/reopen) that action no longer
  // applies (e.g. a pending box left open after Resolve would only 409), so close them.
  useEffect(() => {
    setPendingReasonOpen(false);
    setPendingReason("");
    setReopenReasonOpen(false);
    setReopenReason("");
  }, [ticket?.status]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    // inst: 0 = no app-wide loader: this is a background lookup, not something the user is waiting on.
    Api.get({ url: Urls.groups, inst: 0 }).then((res) => {
      if (!cancelled) setGroupNames((res?.data?.data || []).map((g) => g.group_name).filter(Boolean));
    });
    Api.get({ url: Urls.tickets_users, inst: 0 }).then((res) => {
      if (cancelled) return;
      setUserNames(Object.fromEntries((res?.data?.data || []).map((u) => [String(u.id), u.label || u.username])));
    });
    return () => { cancelled = true; };
  }, [isOpen]);

  // One PATCH /tickets/update call per field ({ ticketId, field, value } — the endpoint updates a
  // single field at a time). Only fields in EDITABLE_FIELDS ever go through it — never `status`
  // (that's the lifecycle endpoints' job).
  const startEdit = () => {
    setDrafts(Object.fromEntries(Object.keys(EDITABLE_FIELDS).map((f) => [f, ticket?.[f] ?? ""])));
    setDetailsOpen(true);
    setEditing(true);
  };
  const cancelEdit = () => { setEditing(false); setDrafts({}); };

  // Sends only the fields that actually changed, all in ONE PATCH /tickets/update call (multi-field
  // form, applied in one transaction — all saved or none). On success the section leaves edit mode;
  // on failure it stays open with the drafts intact and the backend's message is shown.
  const saveAll = async () => {
    const changes = Object.keys(EDITABLE_FIELDS)
      .map((field) => ({ field, next: String(drafts[field] ?? "").trim(), current: String(ticket?.[field] ?? "") }))
      .filter((c) => c.next !== c.current);
    if (changes.length === 0) { cancelEdit(); return; }
    const missing = changes.find((c) => EDITABLE_FIELDS[c.field].required && !c.next);
    if (missing) { toast.error(`${EDITABLE_FIELDS[missing.field].label} can't be empty`); return; }

    const data = { ticketId };
    changes.forEach(({ field, next }) => { data[EDITABLE_FIELDS[field].apiKey] = next; });

    setSavingAll(true);
    try {
      const res = await Api.patch({ url: "/tickets/update", data });
      if (res?.status === 200) {
        if (onUpdated) await onUpdated(); // refresh first so the new values show without a flicker
        toast.success(changes.length === 1 ? `${EDITABLE_FIELDS[changes[0].field].label} updated` : `${changes.length} fields updated`);
        cancelEdit();
      } else {
        toast.error(getApiErrorMessage(res));
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[tickets] update failed", err);
      toast.error("Something went wrong, please retry.");
    } finally {
      setSavingAll(false);
    }
  };

  const runLifecycleAction = async (actionKey, data) => {
    setActionPending(actionKey);
    try {
      const res = await Api.post({ url: `/tickets/${ticketId}/${actionKey}`, data });
      if (res?.status === 200) {
        toast.success(res.data?.msg || "Ticket updated");
        onUpdated && onUpdated();
        return true;
      }
      // 409 = status changed elsewhere since this modal opened — re-fetch to reconcile.
      toast.error(getApiErrorMessage(res));
      onUpdated && onUpdated();
      return false;
    } catch (err) {
      console.error(`Error on lifecycle action ${actionKey}:`, err);
      toast.error("Something went wrong, please retry.");
      return false;
    } finally {
      setActionPending(null);
    }
  };

  const handleSimpleAction = (actionKey) => runLifecycleAction(actionKey);

  // Manual refresh of this ticket (status, SLA, verification progress) and its messages — the
  // board isn't polled in the background, so this is how to pick up server-side changes on demand.
  const refreshTicket = async () => {
    setRefreshing(true);
    try {
      await Promise.all([onUpdated ? onUpdated() : null, fetchMessages()]);
    } finally {
      setRefreshing(false);
    }
  };

  const submitPending = async () => {
    if (!pendingReason.trim()) {
      toast.error("A reason is required to mark this ticket pending");
      return;
    }
    const ok = await runLifecycleAction("pending", { pending_reason: pendingReason.trim() });
    if (ok) { setPendingReasonOpen(false); setPendingReason(""); }
  };

  const submitReopen = async () => {
    const ok = await runLifecycleAction("reopen", reopenReason.trim() ? { reason: reopenReason.trim() } : undefined);
    if (ok) { setReopenReasonOpen(false); setReopenReason(""); }
  };

  const confirmClose = async () => {
    const ok = await runLifecycleAction("close");
    if (ok) setCloseConfirmOpen(false);
  };

  const onActionClick = (actionKey) => {
    if (actionKey === "pending") { setPendingReasonOpen(true); return; }
    if (actionKey === "reopen")  { setReopenReasonOpen(true); return; }
    handleSimpleAction(actionKey);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && ticketId) {
      fetchMessages();
    }
  }, [isOpen, ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      // The chat area has its own spinner, so skip the app-wide loader (inst: 0).
      const res = await Api.get({ url: `/tickets/messages/${ticketId}`, inst: 0 });
      setMessages(res?.data?.data || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) {
      toast.error("Please enter a message or select files");
      return;
    }

    try {
      setSending(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("ticketId", ticketId);
      formData.append("message", newMessage.trim() || "");
      
      // Append multiple files
      selectedFiles.forEach((file) => {
        formData.append("files[]", file);
      });

      // Don't set Content-Type header - let browser set it with boundary
      const res = await Api.post({
        url: "/tickets/message",
        data: formData,
        contentType: null,
      });

      if (res?.status === 200) {
        setNewMessage("");
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await fetchMessages();
      }
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    }
  };

  const isImageFile = (fileUrl) => {
    if (!fileUrl) return false;
    return fileUrl.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i);
  };

  const renderMessageContent = (msg) => {
    if (msg.file_url) {
      const isImage = isImageFile(msg.file_url);
      if (isImage) {
        return (
          <div className="mt-2">
            <img
              src={msg.file_url}
              alt="attachment"
              className="max-w-xs max-h-48 rounded-lg cursor-pointer hover:opacity-90 transition-opacity border border-gray-200"
              onClick={() => window.open(msg.file_url, "_blank")}
            />
          </div>
        );
      } else {
        return (
          <div className="mt-2">
            <a
              href={msg.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm text-blue-600">Download File</span>
            </a>
          </div>
        );
      }
    }
    return null;
  };

  if (!isOpen) return null;

  const cells = Array.isArray(ticket?.cells) ? ticket.cells : [];

  // Lifecycle history from the ticket's own timestamp columns (API doc Section 10), oldest first.
  // Each column holds the LATEST time that step happened, so after a reopen an earlier
  // resolve/close is still listed — as history, alongside the reopen that followed it.
  const userName = (id) => (id ? userNames[String(id)] || `user ${String(id).slice(0, 8)}` : null);
  const activity = ticket ? [
    ["Acknowledged", ticket.acknowledged_at, userName(ticket.acknowledged_by)],
    ["Resolved", ticket.resolved_at, userName(ticket.resolved_by)],
    ["Verification started", ticket.verification_started_at],
    ["Verification completed", ticket.verification_completed_at],
    [ticket.closed_without_verification ? "Force-closed (no verification)" : "Closed", ticket.closed_at],
    ["Reopened", ticket.reopened_at, null, ticket.reopen_reason],
  ]
    .filter(([, ts]) => ts)
    .sort((a, b) => new Date(a[1]) - new Date(b[1])) : [];
  // The real assignees are participants_detail (assigned_team is only a free-text label). A name the
  // backend couldn't resolve comes back as "Unknown" — those aren't shown; the count stands in for them.
  const participantNames = (ticket?.participants_detail || []).map((p) => p?.name).filter((n) => n && n !== "Unknown");
  const assigneeCount = Number(ticket?.participants) || 0;
  const participantsText = assigneeCount
    ? `${assigneeCount} assignee${assigneeCount === 1 ? "" : "s"}`
    : "No assignees";

  // Shared props for every editable row in the Details section.
  const rowProps = (field) => ({
    value: ticket?.[field],
    editing,
    draft: drafts[field],
    onDraft: (v) => setDrafts((d) => ({ ...d, [field]: v })),
    disabled: savingAll,
  });

  return (
    // The overlay is a plain centered flex box over the page area, and the card is capped at that
    // area's height (max-h-full) with only the message list flexing/scrolling — the old layout used
    // a fixed 100vh spacer, which made the overlay itself scrollable and pushed the card out of view.
    <div className="absolute inset-0 z-[400] flex items-center justify-center p-3 sm:p-6">
        <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>

        {/* overflow-hidden, not auto: the card itself never scrolls (no outer scrollbar). Instead the
            Details section and the message list are the flexible parts — each shrinks and scrolls
            inside itself when the window is short; the header, status bar and composer keep their size. */}
        <div className="relative flex flex-col w-full sm:max-w-2xl max-h-full overflow-hidden bg-white rounded-lg text-left shadow-xl">
          <div className="shrink-0 flex items-center justify-between px-6 py-4" style={{ background: '#EC7D09' }}>
            <div>
              <h3 className="text-lg font-semibold text-white">Ticket Details</h3>
              <p className="text-sm text-white/75 mt-0.5">
                {ticketTitle || `Ticket #${ticketId}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white focus:outline-none text-xl leading-none"
            >
              ✕
            </button>
          </div>

          {/* Lifecycle bar — status, key metadata, and gated action buttons */}
          {ticket && (
            <div className="shrink-0 px-6 py-3 border-b border-gray-200 bg-white">
              <div className="flex items-center flex-wrap gap-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full border"
                  style={STATUS_BADGE[ticket.status] ? {
                    background: STATUS_BADGE[ticket.status].bg,
                    color: STATUS_BADGE[ticket.status].text,
                    borderColor: STATUS_BADGE[ticket.status].border,
                  } : { background: "#f1f5f9", color: "#64748b", borderColor: "#e2e8f0" }}
                >
                  {ticket.status}
                </span>
                {ticket.priority && <span className="text-xs text-gray-400">{ticket.priority} priority</span>}
                {ticket.severity && <span className="text-xs text-gray-400">· {ticket.severity}</span>}
                {/* Only meaningful while the ticket is actually closed — the backend's reopen leaves
                    closed_without_verification (and closed_at) set from the earlier force-close. */}
                {ticket.status === "CLOSED" && ticket.closed_without_verification && (
                  <span className="text-xs font-semibold text-red-600" title="Force-closed, bypassing verification">
                    Closed without verification
                  </span>
                )}
                {ticket.sla_breached && (
                  <span className="text-xs font-semibold text-red-600">SLA breached</span>
                )}
                {ticket.reopen_count > 0 && (
                  <span className="text-xs text-gray-400">Reopened {ticket.reopen_count}x</span>
                )}
                {ticket.ticket_type && ticket.ticket_type !== "STANDARD" && (
                  <span className="text-xs font-bold text-orange-700">{ticket.ticket_type}</span>
                )}
                {ticket.incident_id && onViewIncident && (
                  <button
                    onClick={() => onViewIncident(ticket.incident_id)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-2"
                  >
                    View Incident
                  </button>
                )}
                <button
                  onClick={refreshTicket}
                  disabled={refreshing}
                  title="Refresh this ticket"
                  aria-label="Refresh this ticket"
                  className="ml-auto p-1 text-slate-400 hover:text-orange-500 rounded transition-colors disabled:opacity-50"
                >
                  <svg className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              {ticket.status === "VERIFICATION" && (
                <p className="text-xs text-gray-500 mt-1.5">
                  Awaiting sustained healthy reads — this closes automatically (or reopens on a re-breach) server-side. This view refreshes about every 30 seconds while the tab is open.
                  {ticket.verification_healthy_read_count != null && ` Healthy reads so far: ${ticket.verification_healthy_read_count}.`}
                </p>
              )}
              {ticket.status === "PENDING" && ticket.pending_reason && (
                <p className="text-xs text-gray-500 mt-1.5">Pending reason: {ticket.pending_reason}</p>
              )}

              {/* SLA — computed once at creation/reopen from the ticket's own snapshot (API doc §11) */}
              {(ticket.ack_due_at || ticket.response_due_at || ticket.resolution_due_at || ticket.escalated_at) && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  {[
                    ["Ack due", ticket.ack_due_at, ticket.status === "OPEN"],
                    ["Response due", ticket.response_due_at, ACTIVE_SLA_STATUSES.includes(ticket.status)],
                    ["Resolution due", ticket.resolution_due_at, ACTIVE_SLA_STATUSES.includes(ticket.status)],
                  ].filter(([, ts]) => ts).map(([label, ts, live]) => (
                    <span key={label} className={live && new Date(ts) < new Date() ? "text-red-600 font-semibold" : ""}>
                      {label}: {formatDateTime(ts)}
                    </span>
                  ))}
                  {ticket.escalated_at && (
                    <span className="text-red-600 font-semibold">Escalated: {formatDateTime(ticket.escalated_at)}</span>
                  )}
                </div>
              )}

              {(ticket.alarm_id || ticket.parent_ticket_id) && (
                <p className="mt-1.5 text-[11px] text-gray-400">
                  {ticket.alarm_id && <span title={ticket.alarm_id}>Alarm {String(ticket.alarm_id).slice(0, 8)}</span>}
                  {ticket.alarm_id && ticket.parent_ticket_id && " · "}
                  {ticket.parent_ticket_id && <span title={ticket.parent_ticket_id}>Child of master {String(ticket.parent_ticket_id).slice(0, 8)}</span>}
                </p>
              )}

              <div className="flex items-center flex-wrap gap-2 mt-2.5">
                {(LIFECYCLE_ACTIONS[ticket.status] || []).map((action) => (
                  <button
                    key={action.key}
                    onClick={() => onActionClick(action.key)}
                    disabled={!!actionPending}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-opacity disabled:opacity-50 ${
                      action.variant === "primary" ? "text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                    style={action.variant === "primary" ? { background: "#EC7D09" } : {}}
                  >
                    {actionPending === action.key ? "Working…" : action.label}
                  </button>
                ))}
                {ticket.status !== "CLOSED" && (
                  <button
                    onClick={() => setCloseConfirmOpen(true)}
                    disabled={!!actionPending}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    Force Close
                  </button>
                )}
              </div>

              {pendingReasonOpen && (
                <div className="mt-2.5 flex items-start gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={pendingReason}
                    onChange={(e) => setPendingReason(e.target.value)}
                    placeholder="Reason for pending (required)"
                    className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                    onKeyDown={(e) => { if (e.key === "Enter") submitPending(); }}
                  />
                  <button onClick={submitPending} disabled={!!actionPending} className="px-2.5 py-1.5 text-xs font-semibold text-white rounded-md disabled:opacity-50" style={{ background: "#EC7D09" }}>Submit</button>
                  <button onClick={() => { setPendingReasonOpen(false); setPendingReason(""); }} className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700">Cancel</button>
                </div>
              )}

              {reopenReasonOpen && (
                <div className="mt-2.5 flex items-start gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    placeholder="Reopen reason (optional — defaults to 'Manual operator reopen')"
                    className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                    onKeyDown={(e) => { if (e.key === "Enter") submitReopen(); }}
                  />
                  <button onClick={submitReopen} disabled={!!actionPending} className="px-2.5 py-1.5 text-xs font-semibold text-white rounded-md disabled:opacity-50" style={{ background: "#EC7D09" }}>Submit</button>
                  <button onClick={() => { setReopenReasonOpen(false); setReopenReason(""); }} className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700">Cancel</button>
                </div>
              )}
            </div>
          )}

          {/* Details — the ticket's own info (description, site, cells, …), all from ticket_list */}
          {ticket && (
            <div className="flex flex-col min-h-0 border-b border-gray-200 bg-white px-6">
              <div className="shrink-0 flex items-center justify-between gap-2 py-2">
                <button
                  type="button"
                  onClick={() => setDetailsOpen((o) => !o)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700"
                >
                  <span>Details</span>
                  <svg className={`w-3.5 h-3.5 transition-transform ${detailsOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* One Edit button for the whole section; Save changes sends everything changed. */}
                {(detailsOpen || editing) && (editing ? (
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={cancelEdit} disabled={savingAll}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50">
                      Cancel
                    </button>
                    <button type="button" onClick={saveAll} disabled={savingAll}
                      className="px-3 py-1 text-[11px] font-semibold text-white rounded-md disabled:opacity-50" style={{ background: "#EC7D09" }}>
                      {savingAll ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={startEdit}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit
                  </button>
                ))}
              </div>
              {detailsOpen && (
                <div
                  className={`pb-3 grid grid-cols-2 gap-x-4 gap-y-2.5 min-h-[6rem] overflow-y-auto ${editing ? "max-h-[45vh]" : "max-h-[30vh]"}`}
                  onKeyDown={(e) => { if (editing && !savingAll && e.key === "Escape") cancelEdit(); }}
                >
                  {editing && <p className="col-span-2 text-[11px] text-gray-400 -mb-1">Greyed-out fields can't be changed here.</p>}
                  <FieldRow field="title" {...rowProps("title")} span2 />
                  <FieldRow field="description" {...rowProps("description")} span2 />
                  <LockedRow label="Site" value={ticket.site_name} editing={editing} />
                  <FieldRow field="issue_category" {...rowProps("issue_category")} />
                  <FieldRow field="technology" {...rowProps("technology")} />
                  <FieldRow field="region" {...rowProps("region")} />
                  <FieldRow field="severity" {...rowProps("severity")} />
                  <FieldRow field="priority" {...rowProps("priority")} />
                  <LockedRow label={`Cells${cells.length ? ` (${cells.length})` : ""}`} editing={editing} span2>
                    {cells.length ? (
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {cells.map((c) => (
                          <span key={c} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[11px]">{c}</span>
                        ))}
                      </div>
                    ) : "—"}
                  </LockedRow>
                  <FieldRow field="assigned_team" {...rowProps("assigned_team")} options={groupNames} />
                  {/* Always shown, so "no incident" is explicit rather than just a missing button.
                      ticket_source / ticket_type / incident_id come from ticket_list (API doc Section 10). */}
                  <LockedRow label="Source" value={ticket.ticket_source} editing={editing} />
                  <LockedRow label="Incident" editing={editing}>
                    {ticket.incident_id ? (
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span>{ticket.ticket_type === "MASTER" ? "Master ticket of an incident" : "Part of an incident"}</span>
                        {onViewIncident && !editing && (
                          <button onClick={() => onViewIncident(ticket.incident_id)}
                            className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2">
                            View incident
                          </button>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400">Not part of an incident</span>
                    )}
                  </LockedRow>
                  <LockedRow label="Raised by" value={ticket.created_by_name} editing={editing} />
                  <LockedRow label="Last activity" value={formatDateTime(ticket.last_activity_at)} editing={editing} />
                  <LockedRow label={`Assignees${participantNames.length ? ` (${participantNames.length})` : ""}`} value={participantsText} editing={editing} span2>
                    {participantNames.length ? (
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {participantNames.map((n, i) => (
                          <span key={`${n}-${i}`} className="px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[11px]">{n}</span>
                        ))}
                      </div>
                    ) : undefined}
                  </LockedRow>
                  {activity.length > 0 && (
                    <LockedRow label="Activity" editing={editing} span2>
                      <ul className="flex flex-col gap-0.5">
                        {activity.map(([label, ts, by, note]) => (
                          <li key={label} className="text-[11px] text-gray-600">
                            <span className="font-semibold text-gray-700">{label}</span>
                            {" · "}{formatDateTime(ts)}
                            {by && <span className="text-gray-400"> · by {by}</span>}
                            {note && <span className="text-gray-400"> · “{note}”</span>}
                          </li>
                        ))}
                      </ul>
                    </LockedRow>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex-[1_1_18rem] min-h-[6rem] bg-gray-50 px-6 py-4 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p>No messages yet</p>
                  <p className="text-sm">Start the conversation</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, index) => {
                  if (isSystemMessage(msg)) {
                    return (
                      <div key={index} className="flex justify-center">
                        <div className="flex items-center gap-1.5 max-w-[85%] text-center text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-3 py-1.5">
                          <svg className="w-3 h-3 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 2 3 14h7l-1 8 10-12h-7z" />
                          </svg>
                          <span>{msg.message}</span>
                          <span className="text-gray-400 shrink-0">· {formatTimestamp(msg.create_time || msg.created_at)}</span>
                        </div>
                      </div>
                    );
                  }
                  const isCurrentUser = msg.sender_id === authUser?.id;
                  return (
                    <div
                      key={index}
                      className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isCurrentUser
                            ? "text-white"
                            : "bg-white border border-gray-200 text-gray-900"
                        }`}
                        style={isCurrentUser ? { background: '#EC7D09' } : {}}
                      >
                        {!isCurrentUser && (
                          <div className="text-xs font-medium mb-1 text-gray-500">
                            {msg.username || "Unknown User"}
                          </div>
                        )}
                        {msg.message && msg.message_type === "TEXT" && (
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                        )}
                        {renderMessageContent(msg)}
                        <div
                          className={`text-xs mt-1 ${
                            isCurrentUser ? "text-white/70" : "text-gray-400"
                          }`}
                        >
                          {formatTimestamp(msg.create_time || msg.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="shrink-0 bg-white px-6 py-4 border-t border-gray-200">
            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="mb-3 space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg">
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="text-sm text-gray-600 flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-gray-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <textarea
                  rows="2"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !sending) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={sending}
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  multiple
                />
                <label
                  htmlFor="file-upload"
                  className={`cursor-pointer p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors ${
                    sending ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </label>
                <button
                  onClick={handleSendMessage}
                  disabled={sending}
                  className="px-4 py-2 text-white rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  style={{ background: '#EC7D09' }}
                >
                  {sending ? (
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

      <ConfirmModal
        isOpen={closeConfirmOpen}
        title="Force Close Ticket"
        message="This bypasses the verification process entirely and cannot be undone through this same action — the ticket can only be reopened afterward as a separate, explicit step. Continue?"
        confirmLabel={actionPending === "close" ? "Closing…" : "Force Close"}
        onConfirm={confirmClose}
        onCancel={() => setCloseConfirmOpen(false)}
      />
    </div>
  );
}