import React from 'react'

const VARIANT_STYLES = {
    primary: 'bg-[#EC7D09] text-white hover:opacity-90',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
};

const SIZE_STYLES = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
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
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EC7D09] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:opacity-50',
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