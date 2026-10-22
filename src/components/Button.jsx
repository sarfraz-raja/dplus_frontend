import React from 'react'

// OLD (pre design tokens):
// const VARIANT_STYLES = {
//     primary: 'bg-[#EC7D09] text-white hover:opacity-90',
//     secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
//     danger: 'bg-red-600 text-white hover:bg-red-700',
//     success: 'bg-emerald-600 text-white hover:bg-emerald-700',
//     ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
// };
const VARIANT_STYLES = {
    primary: 'bg-accent text-white border border-accent hover:bg-accent-hover hover:border-accent-hover',
    secondary: 'bg-surface-2 text-content border border-line hover:border-accent',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    ghost: 'bg-transparent text-content hover:bg-hoverlay',
};

// OLD: every size was text-sm (14px) — bigger than the 13px fields next to it.
// const SIZE_STYLES = {
//     sm: 'px-3 py-1.5 text-sm',
//     md: 'px-4 py-2 text-sm',
//     lg: 'px-5 py-2.5 text-sm',
// };
// Text = app body size (text-ui-body, 13px) at every size; only the padding changes.
const SIZE_STYLES = {
    sm: 'px-3 py-1.5 text-ui-body',
    md: 'px-4 py-2 text-ui-body',
    lg: 'px-5 py-2.5 text-ui-body',
};

const Button = ({
    onClick,
    name,
    classes = '',
    className = '',
    icon,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    type = 'button',
    disabled = false,
    children,
    ...props
}) => {
    const extraClasses = `${classes} ${className}`.trim();
    const hasBgClass = /(^|\s)(bg-|bg:|background|bg_)/.test(extraClasses);
    const variantClass = hasBgClass ? '' : VARIANT_STYLES[variant] ?? VARIANT_STYLES.primary;
    const sizeClass = SIZE_STYLES[size] ?? SIZE_STYLES.md;
    const widthClass = fullWidth ? 'w-full' : '';

    const finalClassName = [
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:opacity-50',
        variantClass,
        sizeClass,
        widthClass,
        extraClasses,
    ].filter(Boolean).join(' ');

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={finalClassName}
            {...props}
        >
            {name}
            {children}
            {icon}
        </button>
    );
};

export default Button