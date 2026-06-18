import { useEffect, useRef, useState } from 'react'
import { Bot, X, Send, Loader2, Database, ChevronDown, ChevronUp } from 'lucide-react'

const CHAT_URL = 'https://banjo-fasting-snagged.ngrok-free.dev/chat/stream'

function TelecomDataBlock({ td }) {
    const [sqlOpen, setSqlOpen] = useState(false)
    if (!td) return null

    const rows = td.rows || []
    const cols = rows.length > 0
        ? Object.keys(rows[0]).filter(k => !['latitude', 'longitude', 'did'].includes(k))
        : []

    return (
        <div className="mt-2 space-y-2">
            {/* Stats */}
            <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                    {td.row_count} rows
                </span>
                {td.metrics?.query_execution_ms != null && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>
                        {td.metrics.query_execution_ms}ms
                    </span>
                )}
                {td.intent && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(168,85,247,0.1)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.2)' }}>
                        {td.intent}
                    </span>
                )}
            </div>

            {/* Table */}
            {cols.length > 0 && (
                <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid rgba(99,102,241,0.15)' }}>
                    <table className="w-full text-[11px] border-collapse">
                        <thead>
                            <tr style={{ background: 'rgba(99,102,241,0.1)' }}>
                                {cols.map(c => (
                                    <th key={c} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap font-mono" style={{ color: '#818cf8', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
                                        {c}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.slice(0, 10).map((row, i) => (
                                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                    {cols.map(c => {
                                        const v = row[c]
                                        const isNum = typeof v === 'number'
                                        const disp = isNum && !Number.isInteger(v) ? v.toFixed(2) : (v == null ? '—' : String(v))
                                        return (
                                            <td key={c} className="px-2 py-1 max-w-[120px] truncate" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: isNum ? '#cbd5e1' : '#94a3b8', textAlign: isNum ? 'right' : 'left', fontFamily: isNum ? 'monospace' : undefined }}>
                                                {disp}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {rows.length > 10 && (
                        <p className="text-center text-[10px] py-1.5" style={{ color: '#64748b' }}>
                            Showing 10 of {rows.length} rows
                        </p>
                    )}
                </div>
            )}

            {/* SQL collapsible */}
            {td.sql && (
                <div>
                    <button
                        onClick={() => setSqlOpen(v => !v)}
                        className="flex items-center gap-1 text-[10px] transition"
                        style={{ color: '#64748b', fontFamily: 'monospace' }}
                    >
                        {sqlOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        VIEW SQL
                    </button>
                    {sqlOpen && (
                        <pre className="mt-1 px-2.5 py-2 rounded-lg overflow-x-auto text-[11px] leading-relaxed" style={{ background: 'rgba(0,0,0,0.4)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.15)', fontFamily: 'monospace' }}>
                            {td.sql}
                        </pre>
                    )}
                </div>
            )}
        </div>
    )
}

const QUICK_PROMPTS = [
    'Top 10 degraded sites yesterday',
    'Worst cells last 7 days',
    'Vendor comparison',
    'Availability below 95%',
    'Traffic trend last 30 days',
    'Best performing sites',
    'Worst region by CSSR',
    'Highest utilization sites',
    'TCH drop rate by vendor',
    'Sites with low data success rate',
]

function QuickPrompts({ onSelect, disabled }) {
    const railRef = useRef(null)
    const drag = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false })

    const onPointerDown = (e) => {
        const rail = railRef.current
        drag.current = { active: true, startX: e.clientX, scrollLeft: rail.scrollLeft, moved: false, pointerId: e.pointerId }
        rail.style.cursor = 'grabbing'
        // do NOT capture yet — capturing immediately blocks button clicks
    }
    const onPointerMove = (e) => {
        if (!drag.current.active) return
        const dx = e.clientX - drag.current.startX
        if (!drag.current.moved && Math.abs(dx) > 4) {
            drag.current.moved = true
            railRef.current.setPointerCapture(drag.current.pointerId)
        }
        if (drag.current.moved) railRef.current.scrollLeft = drag.current.scrollLeft - dx
    }
    const onPointerUp = (e) => {
        if (drag.current.moved) railRef.current.releasePointerCapture(e.pointerId)
        drag.current.active = false
        railRef.current.style.cursor = 'grab'
    }

    return (
        <div
            ref={railRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="shrink-0 flex gap-1.5 px-3 pt-2 pb-1 overflow-x-auto select-none"
            style={{ borderTop: '1px solid #27365C', scrollbarWidth: 'none', cursor: 'grab' }}
        >
            {QUICK_PROMPTS.map(q => (
                <button
                    key={q}
                    onClick={() => { if (!drag.current.moved) onSelect(q) }}
                    disabled={disabled}
                    className="shrink-0 text-[11px] px-2.5 py-1 rounded-full transition disabled:opacity-40 hover:brightness-125"
                    style={{ background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(79,70,229,0.25)', color: '#818cf8', whiteSpace: 'nowrap', pointerEvents: 'auto' }}
                >
                    {q}
                </button>
            ))}
        </div>
    )
}

function Message({ msg }) {
    if (msg.role === 'user') {
        return (
            <div className="flex justify-end">
                <div className="max-w-[85%] rounded-xl rounded-tr-sm px-3 py-2 text-sm leading-relaxed" style={{ background: 'rgba(79,70,229,0.25)', border: '1px solid rgba(79,70,229,0.35)', color: 'rgba(255,255,255,0.9)' }}>
                    {msg.text}
                </div>
            </div>
        )
    }
    return (
        <div className="flex justify-start">
            <div className="max-w-[95%] rounded-xl rounded-tl-sm px-3 py-2 text-sm leading-relaxed" style={{ background: 'rgba(39,54,92,0.45)', border: '1px solid #27365C', color: msg.error ? '#f87171' : 'rgba(255,255,255,0.85)' }}>
                {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                {msg.thinking && !msg.text && (
                    <span className="inline-flex gap-1 items-center text-white/40 text-xs">
                        <Loader2 size={11} className="animate-spin" /> thinking…
                    </span>
                )}
                {msg.telecomData && <TelecomDataBlock td={msg.telecomData} />}
            </div>
        </div>
    )
}

export default function AiChatFab() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [streaming, setStreaming] = useState(false)
    const bottomRef = useRef(null)
    const inputRef = useRef(null)
    const abortRef = useRef(null)

    useEffect(() => {
        if (isOpen && inputRef.current) inputRef.current.focus()
    }, [isOpen])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto'
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 100) + 'px'
        }
    }, [input])

    const updateLast = (updater) => {
        setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = updater(updated[updated.length - 1])
            return updated
        })
    }

    const sendMessage = async () => {
        const text = input.trim()
        if (!text || streaming) return

        setMessages(prev => [
            ...prev,
            { role: 'user', text },
            { role: 'assistant', text: '', thinking: true },
        ])
        setInput('')
        setStreaming(true)

        try {
            abortRef.current = new AbortController()
            const res = await fetch(CHAT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text }),
                signal: abortRef.current.signal,
            })

            if (!res.ok) throw new Error(`HTTP ${res.status}`)

            const reader = res.body.getReader()
            const decoder = new TextDecoder()

            outer: while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const lines = decoder.decode(value, { stream: true }).split('\n')
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue
                    const data = line.slice(6).trim()
                    if (data === '[DONE]') break outer
                    try {
                        const j = JSON.parse(data)
                        if (j.chunk) {
                            updateLast(msg => ({ ...msg, thinking: false, text: msg.text + j.chunk }))
                        }
                        if (j.telecom_data) {
                            updateLast(msg => ({ ...msg, thinking: false, telecomData: j.telecom_data }))
                        }
                        if (j.error) {
                            updateLast(msg => ({ ...msg, thinking: false, text: j.error, error: true }))
                        }
                    } catch {
                        // ignore malformed lines
                    }
                }
            }
            updateLast(msg => ({ ...msg, thinking: false }))
        } catch (err) {
            if (err.name !== 'AbortError') {
                updateLast(msg => ({ ...msg, thinking: false, text: 'Connection error: ' + err.message, error: true }))
            } else {
                updateLast(msg => ({ ...msg, thinking: false }))
            }
        } finally {
            setStreaming(false)
            abortRef.current = null
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    return (
        <>
            {/* Sliding chat panel */}
            <div
                className={`fixed right-0 z-[1100] flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
                style={{
                    top: 78,
                    bottom: 0,
                    width: 400,
                    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                    background: 'linear-gradient(180deg,#0C1931 0%,#0B1730 100%)',
                    borderLeft: '1px solid #27365C',
                    boxShadow: '-10px 0 28px rgba(3,8,24,0.55)',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid #27365C' }}>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                            <Bot size={14} color="white" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white leading-none">Yogi</p>
                            <p className="text-[10px]" style={{ color: '#818cf8' }}>by DataYog · KPI Analytics</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {streaming && (
                            <button
                                onClick={() => abortRef.current?.abort()}
                                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition"
                                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                            >
                                Stop
                            </button>
                        )}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 transition-colors hover:text-white"
                            style={{ border: '1px solid #27365C' }}
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 8px 24px rgba(79,70,229,0.3)' }}>
                                <Database size={24} color="white" />
                            </div>
                            <div>
                                <p className="text-white/80 text-sm font-semibold">Telecom KPI Analytics</p>
                                <p className="text-white/35 text-xs mt-1">Ask about site performance, KPI trends, vendor comparison, and more.</p>
                            </div>
                        </div>
                    )}
                    {messages.map((msg, i) => <Message key={i} msg={msg} />)}
                    <div ref={bottomRef} />
                </div>

                {/* Quick prompts — draggable scroll strip */}
                <QuickPrompts onSelect={q => { setInput(q); inputRef.current?.focus() }} disabled={streaming} />

                {/* Input */}
                <div className="shrink-0 px-3 py-3">
                    <div className="flex items-end gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(39,54,92,0.35)', border: '1px solid #27365C' }}>
                        <textarea
                            ref={inputRef}
                            rows={1}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about network KPIs…"
                            disabled={streaming}
                            className="flex-1 resize-none bg-transparent text-sm text-white/85 placeholder-white/30 outline-none min-h-[22px] max-h-[100px] leading-relaxed"
                            onInput={e => {
                                e.target.style.height = 'auto'
                                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
                            }}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || streaming}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all disabled:opacity-30"
                            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white' }}
                        >
                            {streaming ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                        </button>
                    </div>
                    <p className="mt-1.5 text-center text-[10px] text-white/20">Enter to send · Shift+Enter for newline</p>
                </div>
            </div>

            {/* FAB */}
            <button
                onClick={() => setIsOpen(v => !v)}
                title="Yogi — AI Assistant"
                className="fixed bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 hover:scale-105"
                style={{
                    zIndex: 1099,
                    background: isOpen ? 'rgba(31,21,26,0.96)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                    border: isOpen ? '1px solid rgba(79,70,229,0.6)' : '1px solid rgba(79,70,229,0.4)',
                    color: 'white',
                    boxShadow: isOpen ? '0 4px 16px rgba(79,70,229,0.3)' : '0 8px 24px rgba(79,70,229,0.4)',
                }}
            >
                {isOpen ? <X size={18} /> : <Bot size={18} />}
            </button>
        </>
    )
}
