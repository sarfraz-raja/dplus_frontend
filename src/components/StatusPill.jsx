import React from 'react';
import { cn } from '../utils/common';

// Tinted status badge (soft background + coloured text) — works in both themes.
const TONES = {
    ok: 'bg-green-500/15 text-green-600 dark:text-green-400',
    warn: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    bad: 'bg-red-500/15 text-red-600 dark:text-red-400',
    info: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    accent: 'bg-accent/15 text-accent',
    grey: 'bg-hoverlay text-muted',
};

// Common status words → tone, so callers can just pass the status text.
const AUTO_TONE = {
    active: 'ok', ok: 'ok', success: 'ok', healthy: 'ok', resolved: 'ok', verified: 'ok', enabled: 'ok', closed: 'grey',
    warning: 'warn', minor: 'warn', major: 'warn', pending: 'warn', medium: 'warn', clearing: 'warn',
    critical: 'bad', failed: 'bad', error: 'bad', breached: 'bad', high: 'bad', inactive: 'grey', disabled: 'grey',
    open: 'info', new: 'info', 'in progress': 'info', running: 'info', low: 'info',
};

const StatusPill = ({ children, tone, className = '' }) => {
    const resolved = tone || AUTO_TONE[String(children ?? '').trim().toLowerCase()] || 'grey';
    return (
        <span className={cn('inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap', TONES[resolved] ?? TONES.grey, className)}>
            {children}
        </span>
    );
};

export default StatusPill;
