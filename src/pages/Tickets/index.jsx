import React, { useEffect, useState, useRef } from "react";
import Api from "../../utils/api";
import CreateTicketModal from "./CreateTicketModal";
import ChatModal from "./ChatModal";
import toast, { Toaster } from "react-hot-toast";

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  // Updated chat modal state to store both UUID and display ticket code
  const [chatModal, setChatModal] = useState({ 
    isOpen: false, 
    ticketId: null,        // This will store the UUID (for API calls)
    ticketCode: null,      // This will store the display ticket_id (for UI)
    ticketTitle: "" 
  });
  const [updatingField, setUpdatingField] = useState({ id: null, field: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [rpp, setRpp] = useState(15);

  // Options for dropdowns
  const severityOptions = ["S1", "S2", "S3", "S4"];
  const priorityOptions = ["Critical", "High", "Medium", "Low"];
  const statusOptions = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  const cellOptions = ["Cell-001", "Cell-002", "Cell-003", "Cell-004", "Cell-005"];
  const participantOptions = ["John Doe", "Jane Smith", "Bob Johnson", "Alice Brown", "Charlie Wilson"];

  const fetchTickets = async () => {
    try {
      const res = await Api.get({ url: "/tickets/ticket_list" });
      setTickets(res?.data?.data || []);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Handle inline edits for severity/priority/status
  const handleFieldUpdate = async (ticketId, field, newValue) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket || ticket[field] === newValue) return;

    try {
      setUpdatingField({ id: ticketId, field });
      
      // Optimistic update
      setTickets(prevTickets =>
        prevTickets.map(ticket =>
          ticket.id === ticketId ? { ...ticket, [field]: newValue } : ticket
        )
      );

      const res = await Api.patch({
        url: "/tickets/update",
        data: {
          ticketId,          // This should be UUID
          field,
          value: newValue
        }
      });

      if (!res.data?.success) {
        throw new Error("Update failed");
      }
      
      toast.success(`${field} updated successfully`);
    } catch (err) {
      console.error(`Error updating ${field}:`, err);
      toast.error(`Failed to update ${field}`);
      
      // Revert on error
      fetchTickets();
    } finally {
      setUpdatingField({ id: null, field: null });
    }
  };

  // Multi-select handlers
  const handleCellsChange = (ticketId, newCells) => {
    setTickets(prevTickets =>
      prevTickets.map(ticket =>
        ticket.id === ticketId ? { ...ticket, cells: newCells } : ticket
      )
    );
    // In a real app, you'd want to persist this change via API
  };

  const handleParticipantsChange = (ticketId, newParticipants) => {
    setTickets(prevTickets =>
      prevTickets.map(ticket =>
        ticket.id === ticketId ? { ...ticket, participants: newParticipants.length } : ticket
      )
    );
  };

  // Updated function to open chat modal with correct UUID
  const openChatModal = (ticket) => {
    setChatModal({
      isOpen: true,
      ticketId: ticket.id,              // UUID - used for API calls
      ticketCode: ticket.ticket_id,      // Display code - used for UI
      ticketTitle: ticket.title
    });
  };

  // Helper function to get status badge color
  const getStatusBadge = (status) => {
    const statusMap = {
      'OPEN': 'bg-green-100 text-green-800',
      'ASSIGNED': 'bg-blue-100 text-blue-800',
      'IN_PROGRESS': 'bg-yellow-100 text-yellow-800',
      'RESOLVED': 'bg-purple-100 text-purple-800',
      'CLOSED': 'bg-gray-100 text-gray-800'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
  };

  // Helper function to get priority badge color
  const getPriorityBadge = (priority) => {
    const priorityMap = {
      'Critical': 'bg-red-100 text-red-800',
      'High': 'bg-orange-100 text-orange-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'Low': 'bg-green-100 text-green-800'
    };
    return priorityMap[priority] || 'bg-gray-100 text-gray-800';
  };

  // Helper function to get severity badge
  const getSeverityBadge = (severity) => {
    const severityMap = {
      'S1': 'bg-red-100 text-red-800',
      'S2': 'bg-orange-100 text-orange-800',
      'S3': 'bg-yellow-100 text-yellow-800',
      'S4': 'bg-green-100 text-green-800'
    };
    return severityMap[severity] || 'bg-gray-100 text-gray-800';
  };

  // Editable Dropdown Component (inline)
  const EditableDropdown = ({ ticketId, field, currentValue, options, getBadgeClass }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isUpdating = updatingField.id === ticketId && updatingField.field === field;

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isUpdating}
          className={`${getBadgeClass(currentValue)} px-2 py-1 text-xs rounded-full flex items-center gap-1 hover:opacity-80 transition-opacity ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span>{currentValue}</span>
          {isUpdating ? (
            <div className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent"></div>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  handleFieldUpdate(ticketId, field, opt);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                  opt === currentValue ? 'bg-orange-50 text-orange-700 font-medium' : 'text-gray-700'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // MultiSelect Dropdown Component
  const MultiSelectDropdown = ({ options, selectedValues, onChange, placeholder, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => 
      opt.toLowerCase().includes(search.toLowerCase())
    );

    const handleToggle = (value) => {
      const newValues = selectedValues.includes(value)
        ? selectedValues.filter(v => v !== value)
        : [...selectedValues, value];
      onChange(newValues);
    };

    const handleRemove = (valueToRemove, e) => {
      e.stopPropagation();
      onChange(selectedValues.filter(v => v !== valueToRemove));
    };

    return (
      <div className="relative" ref={dropdownRef}>
        <div className="text-xs text-gray-500 mb-1">{label}</div>
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="min-h-[38px] p-1 border border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
        >
          <div className="flex flex-wrap gap-1">
            {selectedValues.map(value => (
              <span
                key={value}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs border border-orange-200"
              >
                {value}
                <button
                  onClick={(e) => handleRemove(value, e)}
                  className="hover:text-blue-900"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            {selectedValues.length === 0 && (
              <span className="text-gray-400 text-sm px-2 py-0.5">{placeholder}</span>
            )}
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-400"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map(opt => (
                  <label
                    key={opt}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(opt)}
                      onChange={() => handleToggle(opt)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{opt}</span>
                  </label>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500">No options found</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const totalPages = Math.max(1, Math.ceil(tickets.length / rpp));
  const startIdx = (currentPage - 1) * rpp;
  const paginatedTickets = tickets.slice(startIdx, Math.min(startIdx + rpp, tickets.length));

  return (
    <div className="flex flex-col h-full overflow-hidden p-6" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 50%, #fef3c7 100%)' }}>
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Tickets</h1>
          <p className="text-sm text-gray-500">
            Track and manage telecom network issues
          </p>
        </div>

        <button
          onClick={() => setOpenModal(true)}
          className="px-4 py-2 text-white rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 transition-opacity flex items-center gap-2"
          style={{ background: '#EC7D09' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Ticket
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 shrink-0">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Tickets</div>
          <div className="text-2xl font-semibold mt-1">{tickets.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Open Tickets</div>
          <div className="text-2xl font-semibold mt-1">
            {tickets.filter(t => t.status === 'OPEN').length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Critical Priority</div>
          <div className="text-2xl font-semibold mt-1">
            {tickets.filter(t => t.priority === 'Critical').length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Participants</div>
          <div className="text-2xl font-semibold mt-1">
            {tickets.reduce((acc, t) => acc + (t.participants || 0), 0)}
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="flex-1 overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
            <p className="mt-2 text-gray-500">Loading tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-lg">No tickets found</p>
            <p className="text-gray-400 text-sm mt-1">Create your first ticket to get started</p>
            <button
              onClick={() => setOpenModal(true)}
              className="mt-4 px-4 py-2 text-white rounded-lg hover:opacity-90 inline-flex items-center gap-2"
              style={{ background: '#EC7D09' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Ticket
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-gray-200" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-blue-100 uppercase tracking-widest whitespace-nowrap">Ticket ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-blue-100 uppercase tracking-widest whitespace-nowrap">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-blue-100 uppercase tracking-widest whitespace-nowrap">Site</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-blue-100 uppercase tracking-widest whitespace-nowrap">Cells</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-blue-100 uppercase tracking-widest whitespace-nowrap">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-blue-100 uppercase tracking-widest whitespace-nowrap">Team</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-blue-100 uppercase tracking-widest whitespace-nowrap">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-blue-100 uppercase tracking-widest whitespace-nowrap">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-blue-100 uppercase tracking-widest whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-blue-100 uppercase tracking-widest whitespace-nowrap">Region</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-blue-100 uppercase tracking-widest whitespace-nowrap">Participants</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-blue-100 uppercase tracking-widest whitespace-nowrap">Last Activity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-blue-100 uppercase tracking-widest whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {ticket.ticket_id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{ticket.title}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">
                        {ticket.description}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">{ticket.site_name || '-'}</span>
                      <div className="text-xs text-gray-500">{ticket.dataset_type}</div>
                    </td>
                    <td className="px-4 py-3">
                      <MultiSelectDropdown
                        options={cellOptions}
                        selectedValues={ticket.cells || []}
                        onChange={(newCells) => handleCellsChange(ticket.id, newCells)}
                        placeholder="Select cells"
                        label=""
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        {ticket.issue_category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">{ticket.assigned_team || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <EditableDropdown
                        ticketId={ticket.id}
                        field="severity"
                        currentValue={ticket.severity || 'S3'}
                        options={severityOptions}
                        getBadgeClass={getSeverityBadge}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <EditableDropdown
                        ticketId={ticket.id}
                        field="priority"
                        currentValue={ticket.priority}
                        options={priorityOptions}
                        getBadgeClass={getPriorityBadge}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <EditableDropdown
                        ticketId={ticket.id}
                        field="status"
                        currentValue={ticket.status || 'OPEN'}
                        options={statusOptions}
                        getBadgeClass={getStatusBadge}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">{ticket.region || 'Unassigned'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <MultiSelectDropdown
                        options={participantOptions}
                        selectedValues={[]} // You'd need to store actual participant names
                        onChange={(newParticipants) => handleParticipantsChange(ticket.id, newParticipants)}
                        placeholder="Select participants"
                        label=""
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {ticket.participants || 0} selected
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {ticket.last_activity_at ? new Date(ticket.last_activity_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openChatModal(ticket)}
                        className="p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Open Chat"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {!loading && tickets.length > 0 && (
          <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
            <span>
              {tickets.length === 0
                ? 'No tickets'
                : `Showing ${Math.min(startIdx + 1, tickets.length)}–${Math.min(startIdx + rpp, tickets.length)} of ${tickets.length}`}
            </span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1">
                Rows per page:
                <select
                  value={rpp}
                  onChange={(e) => { setRpp(Number(e.target.value)); setCurrentPage(1); }}
                  className="ml-1 border border-slate-300 rounded px-1 py-0.5 text-xs"
                >
                  {[10, 15, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-0.5 border border-slate-300 rounded disabled:opacity-40 hover:bg-slate-100"
                >‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '…'
                      ? <span key={`e-${i}`} className="px-1">…</span>
                      : <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`px-2 py-0.5 border rounded ${currentPage === p ? 'text-white border-[#EC7D09]' : 'border-slate-300 hover:bg-slate-100'}`}
                          style={currentPage === p ? { background: '#EC7D09' } : {}}
                        >{p}</button>
                  )}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-0.5 border border-slate-300 rounded disabled:opacity-40 hover:bg-slate-100"
                >›</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        onSuccess={() => {
          fetchTickets();
          setOpenModal(false);
        }}
      />

      {/* Chat Modal - Using UUID (ticketId) for API calls */}
      <ChatModal
        isOpen={chatModal.isOpen}
        onClose={() => setChatModal({ isOpen: false, ticketId: null, ticketCode: null, ticketTitle: "" })}
        ticketId={chatModal.ticketId}        // This is the UUID - used for API calls
        ticketTitle={chatModal.ticketCode ? `${chatModal.ticketCode} - ${chatModal.ticketTitle}` : chatModal.ticketTitle} // Display ticket code + title
      />
    </div>
  );
}