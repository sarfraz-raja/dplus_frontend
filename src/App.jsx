import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
const Login = lazy(() => import('./pages/Login'))
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import Navigation from './Navigation'
import SweetAlerts from './components/SweetAlerts'
import Loaders from './components/Loaders'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import WebSocketClient from './components/WebSocketClient'
import AuthActions from './store/actions/auth-actions'
import InsightsEngineActions from './store/actions/insightsEngine-actions'
import { Toaster } from 'react-hot-toast'
import AiChatFab from './components/AiChatFab'

class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }
    componentDidCatch(error, info) {
        console.error('[ErrorBoundary] caught:', error, info)
    }
    render() {
        if (this.state.hasError) {
            const isDark = (localStorage.getItem('dy3-theme') || 'light') === 'dark';
            const styles = isDark
                ? { wrap: { background: '#09001A', color: '#fff' }, sub: { color: '#aaa' }, btn: { background: '#F26522', color: '#fff', border: 'none' } }
                : { wrap: { background: '#f8fafc', color: '#1e293b' }, sub: { color: '#64748b' }, btn: { background: '#F26522', color: '#fff', border: 'none' } };
            return (
                <div style={{ padding: '2rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', ...styles.wrap }}>
                    <h2 style={{ color: '#F26522', margin: 0 }}>Something went wrong</h2>
                    <p style={{ fontSize: '0.85rem', margin: 0, ...styles.sub }}>{String(this.state.error)}</p>
                    <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/home'; }} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', borderRadius: '8px', cursor: 'pointer', ...styles.btn }}>Reload</button>
                </div>
            )
        }
        return this.props.children
    }
}

function App() {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const locdata = useLocation()
    const [sidebarOpen, setsidebarOpenn] = useState(true)
    const [isMobileViewport, setIsMobileViewport] = useState(false)
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
    const isLoginRoute = locdata.pathname === '/' || locdata.pathname === '/login'

    useEffect(() => {
        const checkAuth = localStorage.getItem('auth')

        if (!isLoginRoute && checkAuth !== 'true') {
            localStorage.setItem('auth', 'false')
            navigate('/login', { replace: true })
        }
    }, [isLoginRoute, navigate])

    useEffect(() => {
        const syncViewport = () => {
            const isMobile = window.innerWidth < 1024
            setIsMobileViewport(isMobile)
            if (!isMobile) {
                setMobileSidebarOpen(false)
            }
        }
        syncViewport()
        window.addEventListener('resize', syncViewport)
        return () => window.removeEventListener('resize', syncViewport)
    }, [])

    useEffect(() => {
        setMobileSidebarOpen(false)
    }, [locdata.pathname])

    /** Role-based sidebar from Flask `GET /me` (dplus-apis); refreshes after login / full reload */
    useEffect(() => {
        if (isLoginRoute) return
        if (localStorage.getItem('auth') !== 'true') return
        dispatch(AuthActions.fetchMe())
        dispatch(InsightsEngineActions.getDashboardList())
    }, [isLoginRoute, dispatch])

    const handleSidebarToggle = () => {
        if (isMobileViewport) {
            setMobileSidebarOpen((value) => !value)
            return
        }
        setsidebarOpenn((value) => !value)
    }

    const effectiveSidebarOpen = isMobileViewport ? mobileSidebarOpen : sidebarOpen

    // ── Fullscreen ────────────────────────────────────────────────────────────
    const [isFullscreen, setIsFullscreen] = useState(false)
    const mainRef = useRef(null)

    useEffect(() => {
        const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
        document.addEventListener('fullscreenchange', onFsChange)
        return () => document.removeEventListener('fullscreenchange', onFsChange)
    }, [])

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            mainRef.current?.requestFullscreen?.().catch(() => {})
        } else {
            document.exitFullscreen?.()
        }
    }, [])

    if (isLoginRoute) {
        return (
            <>
                <Routes>
                    <Route path='/' element={<Navigate to='/login' replace />} />
                    <Route path='/login' element={<Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#02030a]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" /></div>}><Login /></Suspense>} />
                    <Route path='*' element={<Navigate to='/login' replace />} />
                </Routes>
                <Loaders />
                <SweetAlerts />
            </>
        )
    }

    return (
        <ErrorBoundary>
            <main ref={mainRef} data-dy3-shell className='flex h-screen overflow-hidden bg-white'>
                <WebSocketClient />

                <div className="flex flex-1 flex-col min-w-0">
                    {!isFullscreen && (
                        <TopBar
                            isSidebarOpen={effectiveSidebarOpen}
                            isMobileViewport={isMobileViewport}
                            onSidebarToggle={handleSidebarToggle}
                            isFullscreen={isFullscreen}
                            onToggleFullscreen={toggleFullscreen}
                        />
                    )}
                    <div className="relative flex min-h-0 flex-1 flex-row">
                        {!isFullscreen && (
                            <div className="relative z-[25] w-0 shrink-0 self-stretch min-h-0 lg:w-[88px]">
                                <ErrorBoundary>
                                    <Sidebar
                                        sidebarOpen={sidebarOpen}
                                        isMobileViewport={isMobileViewport}
                                        mobileVisible={mobileSidebarOpen}
                                        onMobileClose={() => setMobileSidebarOpen(false)}
                                        onOpen={() => setsidebarOpenn(true)}
                                    />
                                </ErrorBoundary>
                            </div>
                        )}
                        <div
                            className={`flex min-h-0 min-w-0 flex-1 flex-col ${
                                !isFullscreen && sidebarOpen ? 'lg:pl-[202px]' : 'lg:pl-0'
                            }`}
                        >
                            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                                <Navigation sidebarOpen={sidebarOpen} />
                                <Loaders />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating exit icon — visible only in fullscreen */}
                {isFullscreen && (
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        title="Exit fullscreen (Esc)"
                        style={{ zIndex: 200000 }}
                        className="fixed top-3 right-4 inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-white/20 bg-black/40 text-white/80 backdrop-blur-sm transition-all hover:bg-black/65 hover:text-white"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
                    </button>
                )}

                {!isFullscreen && <AiChatFab />}
                <SweetAlerts />
                <Toaster
                    position="bottom-center"
                    toastOptions={{
                        duration: 3000,
                        style: {
                            background: '#09090b',
                            color: '#fafafa',
                            border: '1px solid #27272a',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            fontSize: '13px',
                            fontWeight: '500',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            maxWidth: '360px',
                        },
                        error: {
                            style: {
                                background: '#09090b',
                                color: '#fafafa',
                                border: '1px solid #7f1d1d',
                            },
                            iconTheme: {
                                primary: '#ef4444',
                                secondary: '#09090b',
                            },
                        },
                        success: {
                            style: {
                                background: '#09090b',
                                color: '#fafafa',
                                border: '1px solid #14532d',
                            },
                            iconTheme: {
                                primary: '#22c55e',
                                secondary: '#09090b',
                            },
                        },
                    }}
                />
            </main>
        </ErrorBoundary>
    )
}

export default App
