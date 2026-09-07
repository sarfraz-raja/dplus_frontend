import React, { useState, useEffect, useRef } from "react";
import Api from "../../utils/api";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";

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

export default function ChatModal({ isOpen, onClose, ticketId, ticketTitle }) {
  const authUser = useSelector((state) => state.auth.user);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

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
      const res = await Api.get({ url: `/tickets/messages/${ticketId}` });
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

  return (
    <div className="absolute inset-0 z-[400] overflow-y-auto">
      <div className="flex items-center justify-center min-h-full px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="absolute inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="flex items-center justify-between px-6 py-4" style={{ background: '#EC7D09' }}>
            <div>
              <h3 className="text-lg font-semibold text-white">Ticket Chat</h3>
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

          <div className="bg-gray-50 px-6 py-4 h-96 overflow-y-auto">
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

          <div className="bg-white px-6 py-4 border-t border-gray-200">
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
      </div>
    </div>
  );
}