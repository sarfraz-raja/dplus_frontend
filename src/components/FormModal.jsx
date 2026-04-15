const ORANGE = '#EC7D09';

/**
 * FormModal — self-contained modal with sticky header, scrollable body, optional sticky footer.
 *
 * Props:
 *   isOpen       {boolean}
 *   setIsOpen    {function}
 *   title        {string}
 *   headerColor  {string}    — CSS color, defaults to brand orange
 *   size         {string}    — 'form' (default) | 'lg'
 *   children     {ReactNode} — scrollable body content
 *   footer       {ReactNode} — optional sticky footer (e.g. action buttons)
 */
const FormModal = ({ isOpen, setIsOpen, title, headerColor = ORANGE, size = 'form', children, footer }) => {
    if (!isOpen) return null;

    const sizeClass = size === 'lg'
        ? 'w-[94vw] md:w-[860px] max-h-[90vh]'
        : 'w-[94vw] md:w-[640px] max-h-[90vh]';

    return (
        <div
            className="z-[4000] flex justify-center items-center fixed inset-0"
            style={{ background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)' }}
            onClick={() => setIsOpen(false)}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className={`bg-white rounded-2xl shadow-2xl flex flex-col ${sizeClass}`}
            >
                {/* ── Sticky header ── */}
                <div
                    className="flex items-center justify-between px-5 py-3 rounded-t-2xl shrink-0"
                    style={{ background: headerColor }}
                >
                    <h2 className="text-white font-semibold text-lg">{title}</h2>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="text-white/80 hover:text-white text-xl leading-none"
                    >
                        ✕
                    </button>
                </div>

                {/* ── Scrollable content ── */}
                <div className="flex-1 overflow-y-auto p-5">
                    {children}
                </div>

                {/* ── Sticky footer (optional) ── */}
                {footer && (
                    <div className="shrink-0 border-t border-slate-100 px-5 py-3 bg-white rounded-b-2xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FormModal;
