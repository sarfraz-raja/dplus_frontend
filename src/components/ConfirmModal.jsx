import React from 'react';
import { AlertTriangle } from 'lucide-react';
import FormModal from './FormModal';
import Button from './Button';

/**
 * Lightweight Yes/No confirm dialog built on FormModal — the app's current modal standard
 * (orange header, rounded corners), unlike the older Modal.jsx/SweetAlerts (blue gradient
 * header) that predates it. Use this instead of window.confirm or dispatch(ALERTS(...))
 * wherever a destructive action needs a confirm step, so it looks consistent with every
 * other modal in the app (see e.g. User Management's "New User" form).
 */
export default function ConfirmModal({
    isOpen,
    title = 'Are you sure?',
    message,
    confirmLabel = 'OK',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
}) {
    return (
        <FormModal
            isOpen={isOpen}
            setIsOpen={onCancel}
            title={title}
            icon={<AlertTriangle size={16} className="text-white" />}
            size="form"
            footer={(
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={onCancel}>{cancelLabel}</Button>
                    <Button variant="primary" size="sm" onClick={onConfirm}>{confirmLabel}</Button>
                </div>
            )}
        >
            <p className="text-sm text-slate-700">{message}</p>
        </FormModal>
    );
}
