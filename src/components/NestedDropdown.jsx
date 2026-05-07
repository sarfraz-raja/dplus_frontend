import { useState } from 'react';

const ChevronDown = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const NestedDropdown = ({ SetgOpen, gopen, setDataValue, dataValue, itm, size = 0, ns = 0, parentation = {} }) => {
    const [open, setOpen] = useState(false);

    const isGroupChecked = !!dataValue[itm.link];
    const isChildChecked = (parentLink, childLink) =>
        dataValue[parentLink] ? dataValue[parentLink].includes(childLink) : false;

    const onCheckGroup = (checked) => {
        if (checked) {
            SetgOpen(prev => [...prev, itm.link]);
            setDataValue(prev => ({
                ...prev,
                [itm.link]: itm.subMenu.map(i => i.link),
            }));
            itm.subMenu.forEach(child => {
                if (child.subMenu?.length > 0) {
                    onCheckSubGroup(child, checked);
                }
            });
        } else {
            SetgOpen(prev => prev.filter(i => i !== itm.link));
            setDataValue(prev => {
                const { [itm.link]: _, ...rest } = prev;
                return rest;
            });
            itm.subMenu.forEach(child => {
                if (child.subMenu?.length > 0) {
                    onCheckSubGroup(child, checked);
                }
            });
        }
    };

    const onCheckSubGroup = (subItm, checked) => {
        if (checked) {
            setDataValue(prev => ({
                ...prev,
                [subItm.link]: subItm.subMenu.map(i => i.link),
            }));
        } else {
            setDataValue(prev => {
                const { [subItm.link]: _, ...rest } = prev;
                return rest;
            });
        }
    };

    const onCheckChild = (parentLink, childLink, checked) => {
        if (checked) {
            setDataValue(prev => ({
                ...prev,
                [parentLink]: prev[parentLink] ? [...prev[parentLink], childLink] : [childLink],
            }));
        } else {
            setDataValue(prev => {
                const updated = (prev[parentLink] ?? []).filter(l => l !== childLink);
                if (updated.length === 0) {
                    const { [parentLink]: _, ...rest } = prev;
                    return rest;
                }
                return { ...prev, [parentLink]: updated };
            });
        }
    };

    const hasChildren = itm?.subMenu?.length > 0;

    if (!hasChildren) {
        const parentLink = ns === 1 ? parentation.link : itm.link;
        return (
            <label className="flex items-center gap-2 py-2 border-b border-slate-100 cursor-pointer text-sm text-slate-700 hover:bg-slate-50">
                <input
                    type="checkbox"
                    className="accent-orange-500 w-3.5 h-3.5 shrink-0"
                    checked={isChildChecked(parentLink, itm.link)}
                    onChange={(e) => onCheckChild(parentLink, itm.link, e.target.checked)}
                />
                {itm.name}
            </label>
        );
    }

    return (
        <div className="flex flex-col">
            {/* Group header row */}
            <div
                className="flex items-center gap-2 py-2 border-b border-slate-100 cursor-pointer select-none group"
                onClick={() => setOpen(p => !p)}
            >
                <input
                    type="checkbox"
                    className="accent-orange-500 w-3.5 h-3.5 shrink-0"
                    checked={isGroupChecked}
                    onChange={(e) => onCheckGroup(e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                />
                <span className="flex-1 text-sm font-medium text-slate-700 group-hover:text-slate-900 truncate">
                    {itm.name}
                </span>
                <span className={`text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
                    <ChevronDown />
                </span>
            </div>

            {/* Children */}
            {open && (
                <div className="flex flex-col pl-5 py-1 gap-0.5">
                    {itm.subMenu.map((child, i) => (
                        <NestedDropdown
                            key={i}
                            SetgOpen={SetgOpen}
                            gopen={gopen}
                            setDataValue={setDataValue}
                            dataValue={dataValue}
                            itm={child}
                            value={20}
                            size={size + 1}
                            ns={1}
                            parentation={itm}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default NestedDropdown;
