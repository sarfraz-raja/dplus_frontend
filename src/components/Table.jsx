import React from 'react';

const Table = ({
    headers = [],
    classes = '',
    columns = [],
    commonCols = false,
    children,
    ...props
}) => {
    const headerCellClass = 'px-4 py-3 text-xs font-semibold text-white/80 uppercase tracking-widest whitespace-nowrap';
    const bodyCellClass = 'px-4 py-3 border-b border-slate-100 text-slate-700';
    const rowClassName = (idx) => idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';

    return (
        <table className={`min-w-full text-left text-sm border-separate border-spacing-0 ${classes}`} {...props}>
            {headers.length > 0 && (
                <thead className="sticky top-0 z-10" style={{ background: '#0b1830' }}>
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
                        <tr key={rowIndex} className={rowClassName(rowIndex)}>
                            {commonCols
                                ? row
                                : row.map((cell, cellIndex) => (
                                    <td key={cellIndex} className={bodyCellClass}>
                                        {cell}
                                    </td>
                                ))}
                        </tr>
                    ))}
                </tbody>
            )}
        </table>
    );
};

export default Table;
