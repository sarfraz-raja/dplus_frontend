import React from 'react';
import { cn } from '../utils/common';

// Shared layout for "Single-form / config" pages (CLAUDE.md §5): Zoom Settings, New/Edit Report
// Scheduler, Query Workbench header, iSON. One page shell, one title row, one card look and one
// set of field classes, so these pages share the same fonts, sizes, spacing, icons and colors.
// Don't restyle these per page — change them here so every page follows.
//
//   <FormPage>
//     <FormPageHeader icon={<svg/>} title="…" subtitle="…" actions={<Button size="sm">…</Button>} />
//     <FormPageBody>
//       <FormCard><FormCardHeader icon={<svg/>} title="…" subtitle="…" /> <div className="p-2.5">…</div></FormCard>
//     </FormPageBody>
//     {overlays such as slide-in panels go here, outside the scroll area}
//   </FormPage>
//
// The title row sits outside the scroll area, so it (and its Save/Submit actions) stays in view;
// only the body scrolls. Icons: pass any svg — the tile sets its size (16px page / 12px card) and
// color (white via currentColor), so icons look the same on every page.

// Sizes come from the app type scale (text-ui-*, CLAUDE.md section 8). OLD: text-xs inputs, text-[10px] labels/errors.
export const formInputCls =
    'w-full border border-slate-200 rounded-md px-2 py-1 sm:px-2.5 sm:py-1.5 lg:px-2 lg:py-1 text-ui-body text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent';
export const formLabelCls = 'block text-ui-micro font-semibold text-slate-500 uppercase tracking-wide mb-0.5';
export const formErrorCls = 'text-ui-micro text-red-500 mt-0.5';

/** Side padding of the page. Centred for forms (a 10% margin each side on xl); wide for tools
 *  (editor + results, resizable panels — Query Workbench) that need the full width. Pick one via `wide`. */
export const FORM_PAGE_X = 'px-3 sm:px-4 xl:px-[10%]';
export const FORM_PAGE_X_WIDE = 'px-3 sm:px-4';

const ICON_TILE = 'flex items-center justify-center shrink-0 bg-[#0b1830] text-white [&_svg]:shrink-0';

/** Page root — fills Layout's scroll wrapper exactly (h-full), no outer scrollbar. */
const FormPage = ({ children, className }) => (
    <div className={cn('flex flex-col bg-white h-full overflow-hidden', className)}>{children}</div>
);

/** The scrolling content column. */
export const FormPageBody = ({ children, className, wide = false }) => (
    <div className={cn('flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 pt-1 pb-6', wide ? FORM_PAGE_X_WIDE : FORM_PAGE_X, className)}>
        {children}
    </div>
);

/** The page's icon + title + subtitle — the one page-title look for every page (form pages via
 *  FormPageHeader, list pages directly inside their own header row). No outer padding. */
export const PageTitle = ({ icon, title, subtitle, leading }) => (
    <div className="flex items-center gap-3 min-w-0">
        {leading}
        {icon && <div className={cn(ICON_TILE, 'w-9 h-9 rounded-lg [&_svg]:w-4 [&_svg]:h-4')} aria-hidden="true">{icon}</div>}
        <div className="min-w-0">
            <h1 className="text-ui-title font-bold text-slate-800 leading-tight">{title}</h1>
            {subtitle && <p className="text-ui-small text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
    </div>
);

/** Title row: PageTitle on the left, page actions on the right. Fixed above the body.
 *  `wide` = full-width tool page; use the same value on the page's body. */
export const FormPageHeader = ({ icon, title, subtitle, actions, leading, className, wide = false }) => (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0 pt-4 lg:pt-6 pb-3', wide ? FORM_PAGE_X_WIDE : FORM_PAGE_X, className)}>
        <PageTitle icon={icon} title={title} subtitle={subtitle} leading={leading} />
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
);

export const FormCard = ({ children, className }) => (
    <div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm', className)}>{children}</div>
);

export const FORM_CARD_HEADER_HEIGHT = 'min-h-[38px] lg:min-h-[34px]';

/** Card header: icon tile + title (+ optional badge) / subtitle, optional content on the right. */
export const FormCardHeader = ({ icon, title, badge, subtitle, right, className }) => (
    <div className={cn('flex items-center gap-2 px-3 py-2 lg:py-1.5 border-b border-slate-100 shrink-0 box-border', FORM_CARD_HEADER_HEIGHT, className)}>
        {icon && <div className={cn(ICON_TILE, 'w-6 h-6 rounded-md [&_svg]:w-3 [&_svg]:h-3')} aria-hidden="true">{icon}</div>}
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
                <p className="text-ui-small font-semibold text-slate-700 leading-none">{title}</p>
                {badge}
            </div>
            {subtitle && <p className="text-ui-micro text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {right}
    </div>
);

export default FormPage;
