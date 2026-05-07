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

    const sizeClass =
        size === 'full' ? 'w-[98vw] h-[96vh]' :
        size === 'xl'   ? 'w-[94vw] md:w-[1000px] max-h-[90vh]' :
        size === 'lg'   ? 'w-[94vw] md:w-[860px]  max-h-[90vh]' :
                          'w-[94vw] md:w-[640px]   max-h-[90vh]';

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
                className={`flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/10 ${sizeClass}`}
            >
                {/* ── Sticky header ── */}
                <div
                    className="flex items-center gap-3 px-5 py-4 shrink-0"
                    style={{ background: headerColor }}
                >
                    {/* Optional icon */}
                    {icon && (
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                            {icon}
                        </div>
                    )}

                    {/* Title + subtitle */}
                    <div className="flex-1 min-w-0">
                        <h2 className="text-white font-semibold text-base leading-tight truncate">{title}</h2>
                        {subtitle && (
                            <p className="text-white/70 text-xs mt-0.5 truncate">{subtitle}</p>
                        )}
                    </div>

                    {/* Close button */}
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/25 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                        aria-label="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* ── Scrollable content ── */}
                <div className="flex-1 overflow-y-auto p-5 min-h-0">
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
