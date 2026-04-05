import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import { useDispatch, useSelector } from 'react-redux';
import CustomQueryActions from '../../store/actions/customQuery-actions';
import DBConfigForm from './DBConfigForm';
import CommonActions from '../../store/actions/common-actions';
import { Urls } from '../../utils/url';

const COLUMNS = [
    { label: 'DB Name',  key: 'dbname' },
    { label: 'Server',   key: 'dbserver' },
    { label: 'Type',     key: 'dbtype' },
    { label: 'Username', key: 'username' },
    { label: 'Port',     key: 'port' },
    { label: 'User',     key: 'name' },
    { label: 'Actions',  key: 'actions' },
]

const TYPE_BADGE = {
    PostgreSQL: 'bg-blue-100 text-blue-700',
    MySQL:      'bg-green-100 text-green-700',
    MSSQL:      'bg-yellow-100 text-yellow-800',
}

const DBConfig = () => {
    const [modalOpen, setmodalOpen] = useState(false)
    const [modalBody, setmodalBody] = useState(null)
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleting, setDeleting] = useState(false)
    const [hiddenCols, setHiddenCols] = useState([])
    const [showColToggle, setShowColToggle] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [rpp, setRpp] = useState(15)
    const [search, setSearch] = useState('')

    const toggleCol = (key) => {
        setHiddenCols(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        )
    }

    const visibleCols = COLUMNS.filter(col => !hiddenCols.includes(col.key))

    const dispatch = useDispatch()

    const dbConfigList = useSelector((state) => state?.customQuery?.dbConfigList ?? [])

    useEffect(() => {
        dispatch(CustomQueryActions.getDBConfig())
    }, [])

    const openEdit = (itm) => {
        setmodalOpen(true)
        dispatch(CustomQueryActions.getUserList())
        setmodalBody(<DBConfigForm setIsOpen={setmodalOpen} resetting={false} formValue={itm} />)
    }

    const openDelete = (itm) => {
        setDeleteTarget(itm)
        setDeleteModalOpen(true)
    }

    const confirmDelete = () => {
        if (!deleteTarget) return
        setDeleting(true)
        dispatch(CommonActions.deleteApiCaller(
            `${Urls.querybuilder_DBConfig}/${deleteTarget.uniqueid}`,
            () => {
                dispatch(CustomQueryActions.getDBConfig())
                setDeleting(false)
                setDeleteModalOpen(false)
                setDeleteTarget(null)
            }
        ))
    }

    const filtered = search.trim()
        ? dbConfigList.filter(itm =>
            Object.values(itm).some(v =>
                String(v ?? '').toLowerCase().includes(search.toLowerCase())
            )
        )
        : dbConfigList

    const total      = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / rpp))
    const startIdx   = (currentPage - 1) * rpp
    const endIdx     = Math.min(startIdx + rpp, total)
    const pageRows   = filtered.slice(startIdx, endIdx)

    const goToPage = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)))

    const renderCell = (itm, col) => {
        if (col.key === 'dbname') return (
            <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <span className="truncate max-w-[140px]" title={itm.dbname}>{itm.dbname}</span>
            </span>
        )
        if (col.key === 'dbtype') {
            const cls = TYPE_BADGE[itm.dbtype] ?? 'bg-slate-100 text-slate-600'
            return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{itm.dbtype}</span>
        }
        if (col.key === 'actions') return (
            <span className="flex items-center gap-2">
                <button
                    onClick={() => openEdit(itm)}
                    title="Edit"
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                </button>
                <button
                    onClick={() => openDelete(itm)}
                    title="Delete"
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                    Delete
                </button>
            </span>
        )
        const val = itm[col.key]
        return (
            <span className="truncate max-w-[180px] block" title={String(val ?? '')}>
                {val}
            </span>
        )
    }

    return <>
        <div className="flex flex-col h-[calc(100vh-4rem)] p-5 gap-4"
            style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 50%, #fef3c7 100%)' }}
        >

            {/* Top header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0"
                        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <ellipse cx="12" cy="5" rx="9" ry="3"/>
                            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 leading-tight">DB Configuration</h1>
                        <p className="text-xs text-slate-400 font-medium tracking-wide">Manage database connections</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 relative">
                    {/* Columns toggle */}
                    <button
                        onClick={() => setShowColToggle(prev => !prev)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
                    >
                        <span>⊞</span> Columns
                    </button>
                    {showColToggle && (
                        <div className="absolute right-36 top-11 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-3 min-w-[160px]">
                            {COLUMNS.map(col => (
                                <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={!hiddenCols.includes(col.key)}
                                        onChange={() => toggleCol(col.key)}
                                    />
                                    {col.label}
                                </label>
                            ))}
                        </div>
                    )}

                    {/* Add connection */}
                    <button
                        onClick={() => {
                            setmodalOpen(true)
                            dispatch(CustomQueryActions.getUserList())
                            setmodalBody(<DBConfigForm setIsOpen={setmodalOpen} resetting={true} formValue={{}} />)
                        }}
                        style={{ background: '#EC7D09' }}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm hover:opacity-90 transition-opacity"
                    >
                        + Add connection
                    </button>
                </div>
            </div>

            {/* Search + count */}
            <div className="flex items-center justify-between shrink-0">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
                    placeholder="Search connections..."
                    className="w-72 px-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-sm"
                />
                <span className="text-sm text-slate-500 font-medium">
                    {total} connection{total !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Table — glass */}
            <div className="flex-1 overflow-auto rounded-xl min-h-0 backdrop-blur-md border border-white/60 shadow-lg"
                style={{ background: 'rgba(255,255,255,0.55)' }}>
                <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0"
                        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
                        <tr>
                            {visibleCols.map(col => (
                                <th key={col.key} className="px-4 py-3 text-xs font-semibold text-blue-100 uppercase tracking-widest whitespace-nowrap">
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.length === 0 ? (
                            <tr>
                                <td colSpan={visibleCols.length} className="text-center text-slate-400 py-12 text-sm">
                                    No connections found.
                                </td>
                            </tr>
                        ) : (
                            pageRows.map((itm, idx) => (
                                <tr key={idx}
                                    className="border-b border-white/40 transition-colors"
                                    style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
                                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)'}
                                >
                                    {visibleCols.map(col => (
                                        <td key={col.key} className="px-4 py-3 text-slate-700">
                                            {renderCell(itm, col)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between shrink-0 text-xs text-slate-500">
                <span>
                    {total === 0
                        ? 'No connections'
                        : `Showing ${Math.min(startIdx + 1, total)}–${endIdx} of ${total}`}
                </span>

                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1">
                        Rows per page:
                        <select
                            value={rpp}
                            onChange={(e) => { setRpp(Number(e.target.value)); setCurrentPage(1) }}
                            className="ml-1 border border-slate-300 rounded px-1 py-0.5 text-xs"
                        >
                            {[15, 30, 45, 100].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </label>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-2 py-0.5 border border-slate-300 rounded disabled:opacity-40 hover:bg-slate-100"
                        >‹</button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                            .reduce((acc, p, i, arr) => {
                                if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
                                acc.push(p)
                                return acc
                            }, [])
                            .map((p, i) =>
                                p === '…'
                                    ? <span key={`ellipsis-${i}`} className="px-1">…</span>
                                    : <button
                                        key={p}
                                        onClick={() => goToPage(p)}
                                        className={`px-2 py-0.5 border rounded ${currentPage === p ? 'bg-[#EC7D09] text-white border-[#EC7D09]' : 'border-slate-300 hover:bg-slate-100'}`}
                                    >{p}</button>
                            )
                        }

                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-2 py-0.5 border border-slate-300 rounded disabled:opacity-40 hover:bg-slate-100"
                        >›</button>
                    </div>
                </div>
            </div>
        </div>

        <Modal size={"form"} showHeader={false} children={modalBody} isOpen={modalOpen} setIsOpen={setmodalOpen} />

        {/* Delete confirmation modal */}
        <Modal size={"form"} showHeader={false} isOpen={deleteModalOpen} setIsOpen={setDeleteModalOpen}>
            <div className="p-5">
                {/* Header */}
                <div
                    className="flex items-center justify-between px-4 py-3 rounded-lg mb-5 shadow-sm"
                    style={{ background: '#b91c1c' }}
                >
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        <h2 className="text-white font-semibold text-lg">Delete Connection</h2>
                    </div>
                    <button type="button" onClick={() => setDeleteModalOpen(false)} className="text-white/80 hover:text-white text-xl leading-none">✕</button>
                </div>

                {/* Body */}
                <div className="flex flex-col items-center gap-3 py-4 px-2 text-center">
                    <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                    </div>
                    <p className="text-slate-700 text-sm font-medium">Are you sure you want to delete this connection?</p>
                    {deleteTarget && (
                        <p className="text-xs text-slate-400">
                            <span className="font-semibold text-slate-600">{deleteTarget.dbname}</span> ({deleteTarget.dbserver})
                        </p>
                    )}
                    <p className="text-xs text-red-400">This action cannot be undone.</p>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 mt-2">
                    <button
                        type="button"
                        onClick={() => setDeleteModalOpen(false)}
                        className="px-5 py-2 text-sm font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={confirmDelete}
                        disabled={deleting}
                        className="px-6 py-2 text-sm font-semibold rounded text-white hover:opacity-90 transition-opacity shadow-sm disabled:opacity-60"
                        style={{ background: '#b91c1c' }}
                    >
                        {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </Modal>
    </>
}

export default DBConfig;
