import React from 'react';
import { AlertTriangle } from 'lucide-react';
import FormModal from './FormModal';
import Button from './Button';

/**
 * Lightweight Yes/No confirm dialog built on FormModal — the app's one modal (neutral header,
 * rounded corners; Modal.jsx and SweetAlerts now render through it too).
 * OLD note: "(orange header, rounded corners), unlike the older Modal.jsx/SweetAlerts (blue gradient header)". Use this instead of window.confirm or dispatch(ALERTS(...))
 * wherever a destructive action needs a confirm step, so it looks consistent with every
 * other modal in the app (see e.g. User Management's "New User" form).
 *
 * Props:
 *   isOpen, onConfirm, onCancel
 *   title         header text (default "Are you sure?")
 *   message       main line — text or JSX (e.g. <>Delete <strong>{name}</strong>?</>)
 *   detail        optional second line (e.g. "This cannot be undone.")
 *   tone          'default' (navy header icon, orange confirm) | 'danger' (red header, red confirm)
 *   confirmLabel / cancelLabel
 *   busy          true while the action runs: disables both buttons and shows busyLabel
 *   busyLabel     default "Working…"
 */
export default function ConfirmModal({
    isOpen,
    title = 'Are you sure?',
    message,
    detail,
    tone = 'default',
    confirmLabel = 'OK',
    cancelLabel = 'Cancel',
    busy = false,
    busyLabel = 'Working…',
    onConfirm,
    onCancel,
}) {
    const danger = tone === 'danger';
    return (
        <FormModal
            isOpen={isOpen}
            setIsOpen={() => { if (!busy) onCancel?.(); }}
            title={title}
            // danger → red tile + red title + warning icon (FormModal's danger treatment)
            headerColor={danger ? '#b91c1c' : undefined}
            icon={danger ? undefined : <AlertTriangle size={16} className="text-white" />}
            size="form"
            footer={(
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
                    <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm} disabled={busy}>
                        {busy ? busyLabel : confirmLabel}
                    </Button>
                </div>
            )}
        >
            {/* OLD: <p className="text-sm text-content">{message}</p> */}
            <div className="flex flex-col gap-1.5">
                <p className="text-ui-body text-content">{message}</p>
                {detail && <p className={danger ? 'text-ui-small text-red-600' : 'text-ui-small text-muted'}>{detail}</p>}
            </div>
        </FormModal>
    );
}
