import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../utils/common';

// const ORANGE = '#EC7D09';
// OLD: const ORANGE = 'rgb(var(--accent))'; — the header used to be a solid colored bar (orange by
// default, red on delete dialogs). Now every modal has the same neutral header; the color only tints
// the icon tile (navy by default, red for danger dialogs).
const NAVY = '#0b1830';

// Esc closes only the top-most open modal, and only when nothing inside it (an open Select /
// FloatingPanel list) already handled the key — they call preventDefault.
const openStack = [];

/**
 * FormModal — the app's one modal. Neutral sticky header, scrollable body, optional sticky footer.
 * Modal.jsx is a thin wrapper over this (same look), kept for its older props.
 *
 * Props:
 *   isOpen       {boolean}
 *   setIsOpen    {function}      — called with false to close (backdrop click, ✕, Esc)
 *   title        {string}
 *   subtitle     {string}        — optional line under the title
 *   icon         {ReactNode}     — optional icon, shown in a tile left of the title
 *   headerColor  {string}        — tile color; a red (e.g. '#b91c1c') marks a danger dialog
 *                                  and shows a warning icon when no `icon` is given
 *   size         {string}        — 'form' (default, 560) | 'lg' (720) | 'xl' (820) | 'full'
 *   panelClassName {string}      — overrides the size classes (Modal.jsx's legacy sizes)
 *   children     {ReactNode}     — scrollable body content
 *   footer       {ReactNode}     — optional sticky footer (e.g. action buttons)
 *   hideHeader   {boolean}       — no header row (content draws its own)
 *   keepMounted  {boolean}       — keep children mounted (hidden) while closed, to keep their state
 *   contained    {boolean}       — overlay scoped to the nearest `relative` ancestor
 */
const FormModal = ({
    isOpen,
    setIsOpen,
    title,
    subtitle,
    icon,
    headerColor,
    size = 'form',
    panelClassName,
    children,
    footer,
    hideHeader = false,
    keepMounted = false,
    contained = false,   // true → overlay scoped to nearest `relative` ancestor
}) => {
    // OLD: this ref was created after the `if (!isOpen) return null` below (hook order changed
    // between open and closed renders). Hooks now come first.
    const backdropRef = useRef(false);
    const closeRef = useRef(setIsOpen);
    closeRef.current = setIsOpen;

    useEffect(() => {
        if (!isOpen) return undefined;
        const id = {};
        openStack.push(id);
        const onKey = (e) => {
            if (e.key !== 'Escape' || e.defaultPrevented) return;
            if (openStack[openStack.length - 1] !== id) return;
            closeRef.current?.(false);
        };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            const i = openStack.indexOf(id);
            if (i >= 0) openStack.splice(i, 1);
        };
    }, [isOpen]);

    if (!isOpen && !keepMounted) return null;

    const isDanger = /^#(b91c1c|dc2626|ef4444|991b1b)$/i.test(headerColor ?? '');
    const tileColor = headerColor || NAVY;
    const tileIcon = icon || (isDanger ? <AlertTriangle size={16} /> : null);

    const sizeClass = panelClassName || (
        size === 'full' ? 'w-[92vw] h-[90vh]' :
        size === 'xl'   ? 'w-[88vw] md:w-[820px] max-h-[88vh]' :
        size === 'lg'   ? 'w-[88vw] md:w-[720px] max-h-[88vh]' :
                          'w-[88vw] md:w-[560px] max-h-[88vh]'
    );

    const positionClass = contained ? 'absolute inset-0 z-[400]' : 'fixed inset-0 z-[4000]';

    return (
        <div
            className={cn(positionClass, 'flex justify-center items-center', !isOpen && 'hidden')}
            style={{ background: 'rgba(3, 5, 12, 0.6)', backdropFilter: 'blur(2px)' }}
            onMouseDown={() => { backdropRef.current = true; }}
            onMouseUp={() => { if (backdropRef.current) setIsOpen(false); backdropRef.current = false; }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={typeof title === 'string' ? title : undefined}
                onMouseDown={(e) => { e.stopPropagation(); backdropRef.current = false; }}
                onClick={(e) => e.stopPropagation()}
                className={cn('dp-modal flex flex-col bg-surface-1 text-content rounded-2xl shadow-2xl border border-line', sizeClass)}
            >
                {/* ── Sticky header ── */}
                {!hideHeader && (
                    <div className="flex items-center gap-3 px-5 py-3.5 shrink-0 rounded-t-2xl border-b border-line bg-surface-1">
                        {tileIcon && (
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white [&_svg]:w-4 [&_svg]:h-4"
                                style={{ background: tileColor }}
                                aria-hidden="true"
                            >
                                {tileIcon}
                            </div>
                        )}

                        {/* Title + subtitle */}
                        <div className="flex-1 min-w-0">
                            <h2 className={cn('text-ui-heading font-semibold leading-tight truncate', isDanger ? 'text-red-700' : 'text-content')}>{title}</h2>
                            {subtitle && (
                                <p className="text-ui-small text-muted mt-0.5 truncate">{subtitle}</p>
                            )}
                        </div>

                        {/* Close button */}
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-content hover:bg-hoverlay transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                            aria-label="Close"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* ── Scrollable content ── */}
                <div className={cn('flex-1 overflow-y-auto p-5 min-h-0 text-ui-body text-content', hideHeader && 'rounded-t-2xl', !footer && 'rounded-b-2xl')}>
                    {children}
                </div>

                {/* ── Sticky footer (optional) ── */}
                {footer && (
                    <div className="shrink-0 border-t border-line px-5 py-3 bg-surface-2/60 rounded-b-2xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FormModal;
