import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '../utils/common';

// The one row-action button (Edit / Delete / Set as default / View … inside table rows and cards).
// Same size, font, border, radius and icon size everywhere — only the tone changes:
//   neutral — navy tint, the default (Edit, View, Run…)
//   accent  — brand orange tint, for a special action (Set as default, Enable…)
//   danger  — red tint (Delete, Disable…)
// Presets: kind="edit" / kind="delete" bring their own icon, label and tone.
//
//   <ActionButton kind="edit" onClick={…} />
//   <ActionButton kind="delete" onClick={…} />
//   <ActionButton tone="accent" icon={<Star />} onClick={…}>Set as default</ActionButton>
//   <ActionButton kind="edit" iconOnly title="Edit" />   ← square, icon only (dense rows); give it a title
//
// Page-level buttons (Add, Save, Cancel…) are `Button`, not this.

const TONES = {
    neutral: 'border-[#0b1830]/20 text-[#0b1830] bg-[#0b1830]/5 hover:bg-[#0b1830]/10 hover:border-[#0b1830]/30',
    accent: 'border-accent/30 text-accent bg-accent/[0.08] hover:bg-accent/[0.14] hover:border-accent/50',
    danger: 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300',
};

const KINDS = {
    edit: { tone: 'neutral', icon: <Pencil strokeWidth={2.5} />, label: 'Edit' },
    delete: { tone: 'danger', icon: <Trash2 strokeWidth={2.5} />, label: 'Delete' },
};

const ActionButton = ({ kind, tone, icon, iconOnly = false, children, className, type = 'button', ...props }) => {
    const preset = KINDS[kind] ?? {};
    const shownIcon = icon === undefined ? preset.icon : icon;
    const label = children ?? preset.label;
    return (
        <button
            type={type}
            className={cn(
                'inline-flex items-center justify-center gap-1.5 rounded-md border text-ui-small font-semibold whitespace-nowrap transition-colors',
                iconOnly ? 'w-7 h-7 p-0' : 'px-2.5 py-1',
                'disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:w-3 [&_svg]:h-3 [&_svg]:shrink-0',
                TONES[tone ?? preset.tone ?? 'neutral'],
                className,
            )}
            {...props}
        >
            {shownIcon}
            {!iconOnly && label}
        </button>
    );
};

export default ActionButton;
