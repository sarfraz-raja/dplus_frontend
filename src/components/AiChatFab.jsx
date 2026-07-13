import { useEffect, useRef, useState } from 'react'
import { Bot, X, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import {
    ResponsiveContainer, LineChart, BarChart, Bar, Line,
    XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'

// (chatbot server:port)/ngrok link + /chat/stream
const CHAT_URL = 'http://dyserver:8070/chat/stream'
const ORANGE = '#F26522'

/* ── theme-aware token helper ── */
function tok(isDark, light, dark) { return isDark ? dark : light }

/* ── Bouncing dots typing indicator ── */
const dotStyle = (delay) => ({
    width: 6, height: 6, borderRadius: '50%',
    background: ORANGE, display: 'inline-block',
    animation: `yogi-bounce 1.1s ease-in-out infinite`,
    animationDelay: delay,
})

/* ── Inject keyframes once ── */
if (typeof document !== 'undefined' && !document.getElementById('yogi-styles')) {
    const s = document.createElement('style')
    s.id = 'yogi-styles'
    s.textContent = `
        @keyframes yogi-bounce {
            0%,60%,100% { transform: translateY(0); opacity: .6; }
            30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes yogi-ping {
            0% { transform: scale(1); opacity: .6; }
            70%,100% { transform: scale(1.9); opacity: 0; }
        }
        .yogi-ping { animation: yogi-ping 1.8s ease-out infinite; }

        @keyframes yogi-float {
            0%,100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
        }
        @keyframes yogi-blink {
            0%,90%,100% { transform: scaleY(1); }
            95% { transform: scaleY(0.08); }
        }
        @keyframes yogi-glow-pulse {
            0%,100% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.12); }
        }
        @keyframes yogi-antenna-bob {
            0%,100% { transform: rotate(-8deg); }
            50% { transform: rotate(8deg); }
        }
        @keyframes yogi-eye-glow {
            0%,100% { filter: drop-shadow(0 0 2px #F26522); }
            50% { filter: drop-shadow(0 0 6px #F26522); }
        }
        .yogi-float { animation: yogi-float 3s ease-in-out infinite; }
        .yogi-blink { animation: yogi-blink 3.5s ease-in-out infinite; transform-origin: center center; }
        .yogi-glow-pulse { animation: yogi-glow-pulse 2s ease-in-out infinite; }
        .yogi-antenna-bob { animation: yogi-antenna-bob 1.6s ease-in-out infinite; transform-origin: bottom center; }
        .yogi-eye-glow { animation: yogi-eye-glow 2s ease-in-out infinite; }
    `
    document.head.appendChild(s)
}

/* ── Animated bot character for empty state ── */
function BotCharacter({ isDark }) {
    const headFill = isDark ? '#0f1c38' : '#ffffff'
    const headStroke = '#F26522'
    const eyeFill = '#F26522'
    const cheekFill = isDark ? 'rgba(242,101,34,0.15)' : 'rgba(242,101,34,0.12)'
    const smileStroke = isDark ? 'rgba(255,255,255,0.5)' : '#94a3b8'

    return (
        <div className="flex flex-col items-center gap-1">
            {/* outer glow ring */}
            <div className="relative flex items-center justify-center">
                <div className="yogi-glow-pulse absolute rounded-full" style={{ width: 90, height: 90, background: 'radial-gradient(circle, rgba(242,101,34,0.2) 0%, transparent 70%)' }} />

                {/* floating bot */}
                <div className="yogi-float relative">
                    <svg width="72" height="84" viewBox="0 0 72 84" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* antenna base */}
                        <rect x="34" y="6" width="4" height="14" rx="2" fill={headStroke} opacity="0.7" />
                        {/* antenna tip — bobs */}
                        <g className="yogi-antenna-bob">
                            <circle cx="36" cy="5" r="5" fill={headStroke} />
                            <circle cx="36" cy="5" r="2.5" fill="white" opacity="0.9" />
                        </g>

                        {/* head */}
                        <rect x="8" y="18" width="56" height="48" rx="14" fill={headFill} stroke={headStroke} strokeWidth="2.5" />

                        {/* cheeks */}
                        <ellipse cx="18" cy="50" rx="6" ry="4" fill={cheekFill} />
                        <ellipse cx="54" cy="50" rx="6" ry="4" fill={cheekFill} />

                        {/* left eye */}
                        <g className="yogi-blink yogi-eye-glow" style={{ transformOrigin: '25px 38px' }}>
                            <circle cx="25" cy="38" r="7" fill={eyeFill} opacity="0.15" />
                            <circle cx="25" cy="38" r="4.5" fill={eyeFill} />
                            <circle cx="26.5" cy="36.5" r="1.5" fill="white" opacity="0.9" />
                        </g>

                        {/* right eye */}
                        <g className="yogi-blink yogi-eye-glow" style={{ transformOrigin: '47px 38px', animationDelay: '0.1s' }}>
                            <circle cx="47" cy="38" r="7" fill={eyeFill} opacity="0.15" />
                            <circle cx="47" cy="38" r="4.5" fill={eyeFill} />
                            <circle cx="48.5" cy="36.5" r="1.5" fill="white" opacity="0.9" />
                        </g>

                        {/* smile */}
                        <path d="M24 52 Q36 62 48 52" stroke={smileStroke} strokeWidth="2.5" strokeLinecap="round" fill="none" />

                        {/* bottom panel line */}
                        <rect x="18" y="60" width="36" height="3" rx="1.5" fill={headStroke} opacity="0.2" />

                        {/* ear bolts */}
                        <circle cx="8" cy="38" r="4" fill={headFill} stroke={headStroke} strokeWidth="2" />
                        <circle cx="8" cy="38" r="1.5" fill={headStroke} />
                        <circle cx="64" cy="38" r="4" fill={headFill} stroke={headStroke} strokeWidth="2" />
                        <circle cx="64" cy="38" r="1.5" fill={headStroke} />
                    </svg>
                </div>
            </div>
        </div>
    )
}

/* ── Chart renderer ──
   Receives chartInfo (type/xKey/yKeys) from detectChart and draws the right chart.
   Kept separate from TelecomDataBlock so each component has one job. */
const CHART_COLORS = ['#F26522', '#38bdf8', '#a78bfa', '#34d399']

/* Truncate long axis labels so they don't overlap */
const truncate = (str, n = 10) => typeof str === 'string' && str.length > n ? str.slice(0, n) + '…' : str

function ChartBlock({ td, chartInfo, isDark }) {
    const { type, xKey, yKeys } = chartInfo
    const isHorizontal = type === 'bar-horizontal'
    const data = td.rows.slice(0, isHorizontal ? 15 : 30)
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
    const axisColor = isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8'
    const tooltipStyle = {
        fontSize: 11,
        background: isDark ? '#0C1931' : '#fff',
        border: '1px solid rgba(242,101,34,0.3)',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        color: isDark ? 'rgba(255,255,255,0.85)' : '#1e293b',
    }
    const legendStyle = { fontSize: 10, color: axisColor }

    /* bottom margin grows when we rotate X labels */
    const shared = { data, margin: { top: 12, right: 12, left: -16, bottom: yKeys.length > 1 ? 24 : 16 } }

    if (type === 'line') return (
        <ResponsiveContainer width="100%" height={180}>
            <LineChart {...shared}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                    dataKey={xKey}
                    tick={{ fontSize: 9, fill: axisColor }}
                    tickFormatter={v => truncate(String(v), 8)}
                    angle={-35}
                    textAnchor="end"
                    interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 9, fill: axisColor }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [typeof v === 'number' ? v.toFixed(2) : v]} />
                {yKeys.map((k, i) => (
                    <Line key={k} type="monotone" dataKey={k}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        dot={false} strokeWidth={2}
                        activeDot={{ r: 4, strokeWidth: 0 }} />
                ))}
            </LineChart>
        </ResponsiveContainer>
    )

    /* bar and bar-horizontal use the same BarChart component.
       The only difference is layout="vertical" which flips axes —
       useful for ranked lists where site names are long. */
    return (
        <ResponsiveContainer width="100%" height={isHorizontal ? Math.max(160, data.length * 22) : 180}>
            <BarChart {...shared} layout={isHorizontal ? 'vertical' : 'horizontal'} barSize={isHorizontal ? 10 : 14}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={!isHorizontal} vertical={isHorizontal} />
                <XAxis
                    dataKey={isHorizontal ? undefined : xKey}
                    type={isHorizontal ? 'number' : 'category'}
                    domain={isHorizontal ? [0, 'dataMax'] : undefined}
                    tick={{ fontSize: 9, fill: axisColor }}
                    tickFormatter={isHorizontal ? undefined : v => truncate(String(v), 8)}
                    angle={isHorizontal ? 0 : -35}
                    textAnchor={isHorizontal ? 'middle' : 'end'}
                    interval={isHorizontal ? 'preserveStartEnd' : 0}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    dataKey={isHorizontal ? xKey : undefined}
                    type={isHorizontal ? 'category' : 'number'}
                    tick={{ fontSize: 9, fill: axisColor }}
                    tickFormatter={isHorizontal ? v => truncate(String(v), 12) : undefined}
                    width={isHorizontal ? 90 : 36}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [typeof v === 'number' ? v.toFixed(2) : v]} />
                {yKeys.map((k, i) => (
                    <Bar key={k} dataKey={k}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                        radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                        maxBarSize={isHorizontal ? 12 : 28} />
                ))}
            </BarChart>
        </ResponsiveContainer>
    )
}

/* ── Chart type detector ──
   Looks at the backend payload and returns what kind of chart to draw.
   Returns null when no chart makes sense (e.g. pure text columns). */
function detectChart(td) {
    if (!td?.rows?.length) return null
    const cols = Object.keys(td.rows[0]).filter(k => !['latitude', 'longitude', 'did'].includes(k))
    const intent = td.intent?.toLowerCase() || ''
    const dateCol = cols.find(c => /date|day|week|month|hour|time/i.test(c))
    const numCols = cols.filter(c => {
        if (typeof td.rows[0][c] !== 'number') return false
        // reject columns where every sampled value is 0 or null — nothing to chart
        return td.rows.slice(0, 10).some(r => r[c] != null && r[c] !== 0)
    })
    if (!numCols.length) return null
    if (dateCol || intent.includes('trend'))
        return { type: 'line', xKey: dateCol || cols[0], yKeys: numCols }
    if (intent.includes('rank') || intent.includes('top') || intent.includes('worst'))
        return { type: 'bar-horizontal', xKey: cols[0], yKeys: [numCols[0]] }
    return { type: 'bar', xKey: cols[0], yKeys: numCols }
}

/* ── Telecom data table / SQL block ── */
function TelecomDataBlock({ td, isDark }) {
    const [sqlOpen, setSqlOpen] = useState(false)
    if (!td) return null
    const rows = td.rows || []
    const cols = rows.length > 0
        ? Object.keys(rows[0]).filter(k => !['latitude', 'longitude', 'did'].includes(k))
        : []
    const chartInfo = detectChart(td)

    const border = tok(isDark, 'rgba(242,101,34,0.2)', 'rgba(242,101,34,0.15)')
    const thColor = ORANGE
    const tdColor = tok(isDark, '#475569', '#94a3b8')
    const numColor = tok(isDark, '#1e293b', '#cbd5e1')
    const rowAlt = tok(isDark, 'rgba(0,0,0,0.03)', 'rgba(255,255,255,0.02)')

    return (
        <div className="mt-2 space-y-2">
            {/* stats badges */}
            <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: `rgba(242,101,34,0.1)`, color: ORANGE, border: `1px solid rgba(242,101,34,0.25)` }}>
                    {td.row_count} rows
                </span>
                {td.metrics?.query_execution_ms != null && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                        {td.metrics.query_execution_ms}ms
                    </span>
                )}
                {td.intent && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' }}>
                        {td.intent}
                    </span>
                )}
            </div>

            {chartInfo && <ChartBlock td={td} chartInfo={chartInfo} isDark={isDark} />}

            {cols.length > 0 && (
                <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${border}` }}>
                    <table className="w-full text-[11px] border-collapse">
                        <thead>
                            <tr style={{ background: `rgba(242,101,34,0.07)` }}>
                                {cols.map(c => (
                                    <th key={c} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap font-mono" style={{ color: thColor, borderBottom: `1px solid ${border}` }}>{c}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.slice(0, 10).map((row, i) => (
                                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : rowAlt }}>
                                    {cols.map(c => {
                                        const v = row[c]
                                        const isNum = typeof v === 'number'
                                        const disp = isNum && !Number.isInteger(v) ? v.toFixed(2) : (v == null ? '—' : String(v))
                                        return (
                                            <td key={c} className="px-2 py-1 max-w-[120px] truncate" style={{ borderBottom: `1px solid ${border}`, color: isNum ? numColor : tdColor, textAlign: isNum ? 'right' : 'left', fontFamily: isNum ? 'monospace' : undefined }}>
                                                {disp}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {rows.length > 10 && (
                        <p className="text-center text-[10px] py-1.5" style={{ color: tok(isDark, '#64748b', '#64748b') }}>
                            Showing 10 of {rows.length} rows
                        </p>
                    )}
                </div>
            )}

            {td.sql && (
                <div>
                    <button onClick={() => setSqlOpen(v => !v)} className="flex items-center gap-1 text-[10px] transition" style={{ color: tok(isDark, '#94a3b8', '#64748b'), fontFamily: 'monospace' }}>
                        {sqlOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />} VIEW SQL
                    </button>
                    {sqlOpen && (
                        <pre className="mt-1 px-2.5 py-2 rounded-lg overflow-x-auto text-[11px] leading-relaxed" style={{ background: tok(isDark, '#f1f5f9', 'rgba(0,0,0,0.4)'), color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', fontFamily: 'monospace' }}>
                            {td.sql}
                        </pre>
                    )}
                </div>
            )}
        </div>
    )
}

/* ── Quick prompts draggable strip ── */
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

function QuickPrompts({ onSelect, disabled, isDark }) {
    const railRef = useRef(null)
    const drag = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false, pointerId: null })

    const onPointerDown = (e) => {
        const rail = railRef.current
        drag.current = { active: true, startX: e.clientX, scrollLeft: rail.scrollLeft, moved: false, pointerId: e.pointerId }
        rail.style.cursor = 'grabbing'
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

    const borderTop = tok(isDark, '1px solid #e2e8f0', '1px solid #27365C')

    return (
        <div
            ref={railRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="shrink-0 flex gap-1.5 px-3 pt-2 pb-1.5 overflow-x-auto select-none"
            style={{ borderTop, scrollbarWidth: 'none', cursor: 'grab' }}
        >
            {QUICK_PROMPTS.map(q => (
                <button
                    key={q}
                    onClick={() => { if (!drag.current.moved) onSelect(q) }}
                    disabled={disabled}
                    className="shrink-0 text-[11px] px-2.5 py-1 rounded-full transition-all disabled:opacity-40"
                    style={{
                        background: tok(isDark, 'rgba(242,101,34,0.07)', 'rgba(242,101,34,0.1)'),
                        border: `1px solid rgba(242,101,34,${isDark ? '0.25' : '0.3'})`,
                        color: tok(isDark, ORANGE, '#fb923c'),
                        whiteSpace: 'nowrap',
                        pointerEvents: 'auto',
                    }}
                >
                    {q}
                </button>
            ))}
        </div>
    )
}

/* ── Bot avatar ── */
function BotAvatar() {
    return (
        <div className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center self-start mt-0.5" style={{ background: `linear-gradient(135deg,${ORANGE},#f97316)`, boxShadow: `0 2px 8px rgba(242,101,34,0.35)` }}>
            <Bot size={12} color="white" />
        </div>
    )
}

/* ── Single message ── */
function Message({ msg, isDark }) {
    if (msg.role === 'user') {
        return (
            <div className="flex justify-end">
                <div className="max-w-[82%] rounded-2xl rounded-tr-sm px-3 py-2 text-sm leading-relaxed" style={{
                    background: tok(isDark, 'rgba(242,101,34,0.1)', 'rgba(242,101,34,0.18)'),
                    border: `1px solid rgba(242,101,34,${isDark ? '0.3' : '0.25'})`,
                    color: tok(isDark, '#1e293b', 'rgba(255,255,255,0.9)'),
                }}>
                    {msg.text}
                </div>
            </div>
        )
    }

    return (
        <div className="flex justify-start gap-2">
            <BotAvatar />
            <div className="max-w-[88%] rounded-2xl rounded-tl-sm px-3 py-2 text-sm leading-relaxed" style={{
                background: tok(isDark, '#f1f5f9', 'rgba(39,54,92,0.45)'),
                border: `1px solid ${tok(isDark, '#e2e8f0', '#27365C')}`,
                color: msg.error ? '#ef4444' : tok(isDark, '#334155', 'rgba(255,255,255,0.85)'),
            }}>
                {msg.thinking && !msg.text ? (
                    <span className="flex gap-1.5 items-center py-0.5">
                        <span style={dotStyle('0s')} />
                        <span style={dotStyle('0.18s')} />
                        <span style={dotStyle('0.36s')} />
                    </span>
                ) : (
                    <>
                        {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                        {msg.telecomData && <TelecomDataBlock td={msg.telecomData} isDark={isDark} />}
                    </>
                )}
            </div>
        </div>
    )
}

/* ── Main component ── */
export default function AiChatFab() {
    const [isDark, setIsDark] = useState(() => document.documentElement.dataset.theme === 'dark')
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [streaming, setStreaming] = useState(false)
    const bottomRef = useRef(null)
    const inputRef = useRef(null)
    const abortRef = useRef(null)
    const [fabPos, setFabPos] = useState(() => {
        try { return JSON.parse(localStorage.getItem('yogiFabPos')) } catch { return null }
    })
    const fabDrag = useRef({ active: false, moved: false, startX: 0, startY: 0, origX: 0, origY: 0, pointerId: null })

    /* observe theme changes */
    useEffect(() => {
        const obs = new MutationObserver(() =>
            setIsDark(document.documentElement.dataset.theme === 'dark')
        )
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
        return () => obs.disconnect()
    }, [])

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
        setMessages(prev => [...prev, { role: 'user', text }, { role: 'assistant', text: '', thinking: true }])
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
                        if (j.chunk) updateLast(m => ({ ...m, thinking: false, text: m.text + j.chunk }))
                        if (j.telecom_data) updateLast(m => ({ ...m, thinking: false, telecomData: j.telecom_data }))
                        if (j.error) updateLast(m => ({ ...m, thinking: false, text: j.error, error: true }))
                    } catch { /* ignore */ }
                }
            }
            updateLast(m => ({ ...m, thinking: false }))
        } catch (err) {
            if (err.name !== 'AbortError') {
                updateLast(m => ({ ...m, thinking: false, text: 'Connection error: ' + err.message, error: true }))
            } else {
                updateLast(m => ({ ...m, thinking: false }))
            }
        } finally {
            setStreaming(false)
            abortRef.current = null
        }
    }

    const FAB_SIZE = 48
    const onFabPointerDown = (e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        fabDrag.current = {
            active: true, moved: false,
            startX: e.clientX, startY: e.clientY,
            origX: rect.left, origY: rect.top,
            pointerId: e.pointerId,
        }
    }
    const onFabPointerMove = (e) => {
        const d = fabDrag.current
        if (!d.active) return
        const dx = e.clientX - d.startX
        const dy = e.clientY - d.startY
        if (!d.moved && Math.hypot(dx, dy) > 4) {
            d.moved = true
            e.currentTarget.setPointerCapture(d.pointerId)
        }
        if (d.moved) {
            const maxX = window.innerWidth - FAB_SIZE
            const maxY = window.innerHeight - FAB_SIZE
            const left = Math.min(Math.max(d.origX + dx, 0), maxX)
            const top = Math.min(Math.max(d.origY + dy, 0), maxY)
            setFabPos({ left, top })
        }
    }
    const onFabPointerUp = (e) => {
        const d = fabDrag.current
        if (d.moved) {
            e.currentTarget.releasePointerCapture(d.pointerId)
            setFabPos(prev => {
                if (prev) localStorage.setItem('yogiFabPos', JSON.stringify(prev))
                return prev
            })
        }
        fabDrag.current.active = false
    }

    /* tokens */
    const panelBg = tok(isDark, '#ffffff', 'linear-gradient(180deg,#0C1931 0%,#0B1730 100%)')
    const panelBorder = tok(isDark, '#e2e8f0', '#27365C')
    const headerBg = tok(isDark, '#f8fafc', 'rgba(12,25,49,0.97)')
    const panelShadow = tok(isDark, '-6px 0 24px rgba(0,0,0,0.1)', '-10px 0 28px rgba(3,8,24,0.55)')
    const titleColor = tok(isDark, '#0f172a', '#ffffff')
    const subtitleColor = tok(isDark, '#64748b', 'rgba(255,255,255,0.45)')
    const inputBg = tok(isDark, '#f8fafc', 'rgba(39,54,92,0.35)')
    const inputBorder = tok(isDark, '#e2e8f0', '#27365C')
    const inputText = tok(isDark, '#0f172a', 'rgba(255,255,255,0.85)')
    const inputPlaceholder = tok(isDark, '#94a3b8', 'rgba(255,255,255,0.3)')
    const hintColor = tok(isDark, '#cbd5e1', 'rgba(255,255,255,0.2)')

    return (
        <>
            {/* ── Panel ── */}
            <div
                className={`fixed right-0 z-[1100] flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
                style={{
                    top: 78, bottom: 0, width: 400,
                    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                    background: panelBg,
                    borderLeft: `1px solid ${panelBorder}`,
                    boxShadow: panelShadow,
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: headerBg, borderBottom: `1px solid ${panelBorder}` }}>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg,${ORANGE},#f97316)`, boxShadow: `0 3px 10px rgba(242,101,34,0.4)` }}>
                            <Bot size={16} color="white" />
                        </div>
                        <div>
                            <p className="text-sm font-bold leading-none" style={{ color: titleColor }}>Yogi</p>
                            <p className="text-[10px] mt-0.5" style={{ color: subtitleColor }}>by DataYog · KPI Analytics</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {streaming && (
                            <button
                                onClick={() => abortRef.current?.abort()}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition"
                                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                            >
                                Stop
                            </button>
                        )}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                            style={{ border: `1px solid ${panelBorder}`, color: tok(isDark, '#64748b', 'rgba(255,255,255,0.4)') }}
                            onMouseEnter={e => e.currentTarget.style.color = ORANGE}
                            onMouseLeave={e => e.currentTarget.style.color = tok(isDark, '#64748b', 'rgba(255,255,255,0.4)')}
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: `rgba(242,101,34,0.3) transparent` }}>
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                            <BotCharacter isDark={isDark} />
                            <div>
                                <p className="font-bold text-base" style={{ color: titleColor }}>Hi, I'm Yogi!</p>
                                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: subtitleColor }}>Your AI assistant for telecom KPI analytics.<br />Ask me anything about your network data.</p>
                            </div>
                        </div>
                    )}
                    {messages.map((msg, i) => <Message key={i} msg={msg} isDark={isDark} />)}
                    <div ref={bottomRef} />
                </div>

                {/* Quick prompts */}
                <QuickPrompts onSelect={q => { setInput(q); inputRef.current?.focus() }} disabled={streaming} isDark={isDark} />

                {/* Input */}
                <div className="shrink-0 px-3 py-3" style={{ borderTop: `1px solid ${panelBorder}` }}>
                    <div className="flex items-end gap-2 rounded-xl px-3 py-2" style={{ background: inputBg, border: `1px solid ${inputBorder}` }}>
                        <textarea
                            ref={inputRef}
                            rows={1}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                            placeholder="Ask about network KPIs…"
                            disabled={streaming}
                            className="yogi-textarea flex-1 resize-none bg-transparent text-sm outline-none min-h-[22px] max-h-[100px] leading-relaxed"
                            style={{ color: inputText, caretColor: ORANGE }}
                            onInput={e => {
                                e.target.style.height = 'auto'
                                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
                            }}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || streaming}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all disabled:opacity-30 hover:brightness-110"
                            style={{ background: ORANGE, color: 'white', boxShadow: `0 2px 8px rgba(242,101,34,0.4)` }}
                        >
                            {streaming ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                        </button>
                    </div>
                    <p className="mt-1.5 text-center text-[10px]" style={{ color: hintColor }}>Enter to send · Shift+Enter for newline</p>
                </div>
            </div>

            {/* ── FAB ── */}
            <div
                className={fabPos ? 'fixed' : 'fixed bottom-6 right-6'}
                style={{ zIndex: 1099, ...(fabPos ? { left: fabPos.left, top: fabPos.top } : {}) }}
                onPointerDown={!isOpen ? onFabPointerDown : undefined}
                onPointerMove={!isOpen ? onFabPointerMove : undefined}
                onPointerUp={!isOpen ? onFabPointerUp : undefined}
                onPointerCancel={!isOpen ? onFabPointerUp : undefined}
            >
                {/* ping ring when closed */}
                {!isOpen && (
                    <span className="yogi-ping absolute inset-0 rounded-full" style={{ background: `rgba(242,101,34,0.35)` }} />
                )}
                <button
                    onClick={() => { if (!fabDrag.current.moved) setIsOpen(v => !v) }}
                    title="Yogi — AI Assistant"
                    className="relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 hover:scale-105"
                    style={{
                        background: isOpen ? tok(isDark, '#f1f5f9', '#0f1c38') : `linear-gradient(135deg,${ORANGE},#f97316)`,
                        border: isOpen ? `1px solid rgba(242,101,34,0.4)` : 'none',
                        color: isOpen ? ORANGE : 'white',
                        boxShadow: isOpen ? `0 4px 16px rgba(242,101,34,0.2)` : `0 6px 20px rgba(242,101,34,0.45)`,
                        cursor: isOpen ? 'pointer' : (fabDrag.current.active ? 'grabbing' : 'grab'),
                        touchAction: 'none',
                    }}
                >
                    {isOpen ? <X size={18} /> : <Bot size={18} />}
                </button>
            </div>
        </>
    )
}
