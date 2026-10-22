import React from 'react';
import { cn } from '../utils/common';

// The one table look for the app. Table owns every visual (header, rows, cells, stripes, hover,
// empty state); DataTable adds behaviour (search, filters, columns, pagination) on top of it.
// Pages that build their own rows use TableRow / TableCell / TableEmpty so they look the same:
//
//   <Table headers={['Name', 'Status']}>
//     <tbody>
//       {rows.length === 0 ? <TableEmpty colSpan={2}>No records found.</TableEmpty>
//         : rows.map((r, i) => <TableRow key={r.id} index={i}><TableCell>{r.name}</TableCell>…</TableRow>)}
//     </tbody>
//   </Table>
//
// `dense` = compact data-grid rows (query results); default = record-list rows.

// OLD: const headerCellClass = 'px-4 py-3 text-xs font-semibold text-white/80 uppercase tracking-widest whitespace-nowrap';
// const bodyCellClass = 'px-4 py-3 border-b border-slate-100 text-slate-700';
// OLD: const bodyCellClass = 'px-4 py-3 border-b border-line text-content';
// const rowClassName = (idx) => idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
// OLD: const rowClassName = (idx) => idx % 2 === 0 ? 'bg-surface-1' : 'bg-surface-2';
// Sizes: app type scale (CLAUDE.md section 8) — header row 12 uppercase, cells 13, dense grid cells 12.
// OLD (before the scale): header text-xs + tracking-widest, cells text-sm (14px via the table), dense text-xs.
const headerCellClass = 'px-4 py-3 text-ui-small font-semibold text-white/80 uppercase tracking-wider whitespace-nowrap';
// Rows: one thin divider line + hover highlight, no zebra stripes (stripes + lines did the same job twice).
const bodyCellClass = 'px-4 py-2.5 text-ui-body border-b border-line/70 text-content';
const denseCellClass = 'px-4 py-1.5 text-ui-small whitespace-nowrap border-b border-line/70 text-content';
// OLD: const rowClassName = (idx) => cn('transition-colors hover:bg-hoverlay', idx % 2 === 1 && 'bg-surface-2/50');
// eslint-disable-next-line no-unused-vars
const rowClassName = (idx) => 'transition-colors hover:bg-hoverlay';

export const TableRow = ({ index = 0, className, children, ...props }) => (
    <tr className={cn(rowClassName(index), className)} {...props}>{children}</tr>
);

export const TableCell = ({ dense = false, className, children, ...props }) => (
    <td className={cn(dense ? denseCellClass : bodyCellClass, className)} {...props}>{children}</td>
);

/** Full-width "no rows" line. Centred by default; `pinLeft` keeps it at the left edge for very
 *  wide grids (query results) where the centre of the table can be off-screen. */
export const TableEmpty = ({ colSpan, pinLeft = false, children = 'No records found.' }) => (
    <tr>
        {pinLeft ? (
            <td colSpan={colSpan} className="p-0">
                <div className="sticky left-0 w-fit px-4 py-12 text-ui-body text-muted select-none">{children}</div>
            </td>
        ) : (
            <td colSpan={colSpan} className="px-4 py-12 text-center text-ui-body text-muted select-none">{children}</td>
        )}
    </tr>
);

/** Scroll frame for a table: rounded border, scrolls both ways, sticky header stays on top. */
export const tableFrameCls =
    'flex-1 overflow-auto rounded-xl min-h-0 border border-line bg-surface-1 scrollbar scrollbar-w-2 scrollbar-thumb-accent scrollbar-track-transparent scrollbar-thumb-rounded-none';

const Table = ({
    headers = [],
    classes = '',
    className = '',
    columns = [],
    commonCols = false,
    dense = false,
    children,
    ...props
}) => {
    return (
        // OLD: className={`min-w-full text-left text-sm border-separate border-spacing-0 ${classes}`} {...props}
        //      — a `className` prop in ...props replaced these base classes entirely; now they merge.
        <table className={cn('dp-table min-w-full text-left text-ui-body border-separate border-spacing-0 tabular-nums', classes, className)} {...props}>
            {headers.length > 0 && (
                <thead className="sticky top-0 z-10 bg-[#0b1830]">
                    <tr>
                        {headers.map((header, idx) => (
                            <th key={idx} className={headerCellClass}>
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
            )}
            {children ? (
                children
            ) : (
                <tbody>
                    {columns.map((row, rowIndex) => (
                        <TableRow key={rowIndex} index={rowIndex}>
                            {commonCols
                                ? row
                                : row.map((cell, cellIndex) => (
                                    <TableCell key={cellIndex} dense={dense}>
                                        {cell}
                                    </TableCell>
                                ))}
                        </TableRow>
                    ))}
                </tbody>
            )}
        </table>
    );
};

export default Table;
