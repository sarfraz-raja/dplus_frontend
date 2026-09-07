import React from 'react';

const ORANGE = '#EC7D09';

/**
 * FormModal — self-contained modal with sticky header, scrollable body, optional sticky footer.
 *
 * Props:
 *   isOpen       {boolean}
 *   setIsOpen    {function}
 *   title        {string}
 *   subtitle     {string}        — optional line under the title
 *   icon         {ReactNode}     — optional icon shown left of the title
 *   headerColor  {string}        — CSS color, defaults to brand orange
 *   size         {string}        — 'form' (default) | 'lg' | 'xl' | 'full'
 *   children     {ReactNode}     — scrollable body content
 *   footer       {ReactNode}     — optional sticky footer (e.g. action buttons)
 */
const FormModal = ({
    isOpen,
    setIsOpen,
    title,
    subtitle,
    icon,
    headerColor = ORANGE,
    size = 'form',
    children,
    footer,
    contained = false,   // true → overlay scoped to nearest `relative` ancestor
}) => {
    if (!isOpen) return null;

    const isLight = (() => {
        if (!/^#([0-9a-f]{6})$/i.test(headerColor)) return false;
        const r = parseInt(headerColor.slice(1, 3), 16);
        const g = parseInt(headerColor.slice(3, 5), 16);
        const b = parseInt(headerColor.slice(5, 7), 16);
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return lum > 0.6;
    })();

    const sizeClass =
        size === 'full' ? 'w-[92vw] h-[90vh]' :
        size === 'xl'   ? 'w-[88vw] md:w-[820px] max-h-[88vh]' :
        size === 'lg'   ? 'w-[88vw] md:w-[720px] max-h-[88vh]' :
                          'w-[88vw] md:w-[560px] max-h-[88vh]';

    const positionClass = contained ? 'absolute inset-0 z-[400]' : 'fixed inset-0 z-[4000]';

    const backdropRef = React.useRef(false);

    return (
        <div
            className={`${positionClass} flex justify-center items-center`}
            style={{ background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)' }}
            onMouseDown={() => { backdropRef.current = true; }}
            onMouseUp={() => { if (backdropRef.current) setIsOpen(false); backdropRef.current = false; }}
        >
            <div
                onMouseDown={(e) => { e.stopPropagation(); backdropRef.current = false; }}
                onClick={(e) => e.stopPropagation()}
                className={`flex flex-col bg-white rounded-2xl shadow-2xl border border-white/10 ${sizeClass}`}
            >
                {/* ── Sticky header ── */}
                <div
                    className={`flex items-center gap-3 px-5 py-4 shrink-0 rounded-t-2xl overflow-hidden ${isLight ? 'border-b border-slate-100' : ''}`}
                    style={{ background: headerColor }}
                >
                    {/* Optional icon */}
                    {icon && (
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isLight ? 'bg-orange-50 text-orange-500' : 'bg-white/20 text-white'}`}>
                            {icon}
                        </div>
                    )}

                    {/* Title + subtitle */}
                    <div className="flex-1 min-w-0">
                        <h2 className={`font-semibold text-base leading-tight truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>{title}</h2>
                        {subtitle && (
                            <p className={`text-xs mt-0.5 truncate ${isLight ? 'text-slate-500' : 'text-white/70'}`}>{subtitle}</p>
                        )}
                    </div>

                    {/* Close button */}
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 focus:ring-slate-300' : 'bg-white/10 hover:bg-white/25 text-white focus:ring-white/50'}`}
                        aria-label="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* ── Scrollable content ── */}
                <div className="flex-1 overflow-y-auto p-5 min-h-0 text-slate-900">
                    {children}
                </div>

                {/* ── Sticky footer (optional) ── */}
                {footer && (
                    <div className="shrink-0 border-t border-slate-100 px-5 py-3 bg-slate-50/60 rounded-b-2xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FormModal;
