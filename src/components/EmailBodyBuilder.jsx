import { useState, useEffect, useRef } from 'react';
import ColorPicker from './MapsUsingDeckgl/ColorPicker';

const BLOCK_TYPES = [
    { type: 'heading',   label: '+ Heading' },
    { type: 'paragraph', label: '+ Paragraph' },
    { type: 'link',      label: '+ Link / Button' },
    { type: 'value',     label: '+ Colored Value' },
    { type: 'divider',   label: '+ Divider' },
    { type: 'spacer',    label: '+ Spacer' },
];

const defaultProps = (type) => {
    switch (type) {
        case 'heading':   return { text: 'Alert Heading', color: '#1d4ed8', size: 22, align: 'center' };
        case 'paragraph': return { text: 'Describe the alert here...', color: '#334155', size: 14, align: 'left' };
        case 'link':      return { text: 'View Dashboard', url: 'https://', color: '#7c3aed' };
        case 'value':     return { label: 'Metric Value', value: '95%', color: '#ff0000' };
        case 'divider':   return { color: '#e2e8f0' };
        case 'spacer':    return { height: 12 };
        default:          return {};
    }
};

const blockToHtml = ({ type, props }) => {
    switch (type) {
        case 'heading':
            return `<p style="color:${props.color}; font-weight:bold; font-size:${props.size}px; text-align:${props.align}; margin:0 0 6px 0;">${props.text}</p>`;
        case 'paragraph':
            return `<p style="color:${props.color}; font-size:${props.size}px; text-align:${props.align}; margin:0 0 6px 0;">${props.text}</p>`;
        case 'link':
            return `<a href="${props.url}" target="_blank" style="color:${props.color}; font-weight:bold; text-decoration:none;">${props.text}</a>`;
        case 'value':
            return `<p style="margin:0 0 6px 0;">${props.label}: <span style="color:${props.color}; font-weight:bold;">${props.value}</span></p>`;
        case 'divider':
            return `<hr style="border:none; border-top:1px solid ${props.color}; margin:8px 0;" />`;
        case 'spacer':
            return `<div style="height:${props.height}px;"></div>`;
        default:
            return '';
    }
};

const blocksToHtml = (blocks) => blocks.map(blockToHtml).join('\n');

const fieldCls = "w-full border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400";

const BlockEditor = ({ block, onChange, onRemove, onMove, isFirst, isLast, dragHandleProps, isDragOver }) => {
    const setProp = (key, val) => onChange({ ...block, props: { ...block.props, [key]: val } });

    return (
        <div
            {...dragHandleProps}
            className={`border rounded-md p-2.5 bg-slate-50 transition-colors ${isDragOver ? 'border-orange-400 bg-orange-50' : 'border-slate-200'}`}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <span className="cursor-grab active:cursor-grabbing text-slate-400 select-none" title="Drag to reorder">⠿</span>
                    {block.type}
                </span>
                <div className="flex items-center gap-1">
                    <button type="button" disabled={isFirst} onClick={() => onMove(-1)} className="text-xs px-1.5 py-0.5 rounded border border-slate-300 disabled:opacity-30 hover:bg-slate-100">↑</button>
                    <button type="button" disabled={isLast} onClick={() => onMove(1)} className="text-xs px-1.5 py-0.5 rounded border border-slate-300 disabled:opacity-30 hover:bg-slate-100">↓</button>
                    <button type="button" onClick={onRemove} className="text-xs px-1.5 py-0.5 rounded border border-red-200 text-red-500 hover:bg-red-50">✕</button>
                </div>
            </div>

            {(block.type === 'heading' || block.type === 'paragraph') && (
                <div className="flex flex-col gap-1.5">
                    <input className={fieldCls} value={block.props.text} onChange={(e) => setProp('text', e.target.value)} placeholder="Text" />
                    <div className="flex items-center gap-2">
                        <ColorPicker value={block.props.color} onChange={(c) => setProp('color', c)} />
                        <input type="number" className={fieldCls} style={{ width: 60 }} value={block.props.size} onChange={(e) => setProp('size', Number(e.target.value))} />
                        <select className={fieldCls} value={block.props.align} onChange={(e) => setProp('align', e.target.value)}>
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                        </select>
                    </div>
                </div>
            )}

            {block.type === 'link' && (
                <div className="flex flex-col gap-1.5">
                    <input className={fieldCls} value={block.props.text} onChange={(e) => setProp('text', e.target.value)} placeholder="Link text" />
                    <input className={fieldCls} value={block.props.url} onChange={(e) => setProp('url', e.target.value)} placeholder="URL" />
                    <ColorPicker value={block.props.color} onChange={(c) => setProp('color', c)} />
                </div>
            )}

            {block.type === 'value' && (
                <div className="flex flex-col gap-1.5">
                    <input className={fieldCls} value={block.props.label} onChange={(e) => setProp('label', e.target.value)} placeholder="Label" />
                    <input className={fieldCls} value={block.props.value} onChange={(e) => setProp('value', e.target.value)} placeholder="Value" />
                    <ColorPicker value={block.props.color} onChange={(c) => setProp('color', c)} />
                </div>
            )}

            {block.type === 'divider' && (
                <ColorPicker value={block.props.color} onChange={(c) => setProp('color', c)} />
            )}

            {block.type === 'spacer' && (
                <input type="number" className={fieldCls} value={block.props.height} onChange={(e) => setProp('height', Number(e.target.value))} placeholder="Height (px)" />
            )}
        </div>
    );
};

// Reusable block-based HTML email builder with live preview.
// Manages its own block list; emits the assembled HTML string via onChange.
const EmailBodyBuilder = ({ onChange }) => {
    const [blocks, setBlocks] = useState(() => ([
        { id: 'b1', type: 'heading', props: defaultProps('heading') },
        { id: 'b2', type: 'value',   props: defaultProps('value') },
    ]));
    const uidRef = useRef(2);
    const dragIdRef = useRef(null);
    const [dragOverId, setDragOverId] = useState(null);

    useEffect(() => {
        onChange?.(blocksToHtml(blocks));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blocks]);

    const addBlock = (type) => {
        uidRef.current += 1;
        setBlocks((b) => [...b, { id: `b${uidRef.current}`, type, props: defaultProps(type) }]);
    };
    const updateBlock = (id, next) => setBlocks((b) => b.map(x => x.id === id ? next : x));
    const removeBlock = (id) => setBlocks((b) => b.filter(x => x.id !== id));
    const moveBlock = (id, dir) => setBlocks((b) => {
        const i = b.findIndex(x => x.id === id);
        const j = i + dir;
        if (j < 0 || j >= b.length) return b;
        const copy = [...b];
        [copy[i], copy[j]] = [copy[j], copy[i]];
        return copy;
    });

    const reorderBlock = (draggedId, targetId) => {
        if (!draggedId || draggedId === targetId) return;
        setBlocks((b) => {
            const from = b.findIndex(x => x.id === draggedId);
            const to = b.findIndex(x => x.id === targetId);
            if (from === -1 || to === -1) return b;
            const copy = [...b];
            const [moved] = copy.splice(from, 1);
            copy.splice(to, 0, moved);
            return copy;
        });
    };

    return (
        <div className="grid grid-cols-2 gap-3">
            {/* Editor */}
            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1.5">
                    {BLOCK_TYPES.map(bt => (
                        <button key={bt.type} type="button" onClick={() => addBlock(bt.type)}
                            className="text-[11px] px-2 py-1 rounded border border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100">
                            {bt.label}
                        </button>
                    ))}
                </div>
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                    {blocks.map((block, idx) => (
                        <BlockEditor
                            key={block.id}
                            block={block}
                            onChange={(next) => updateBlock(block.id, next)}
                            onRemove={() => removeBlock(block.id)}
                            onMove={(dir) => moveBlock(block.id, dir)}
                            isFirst={idx === 0}
                            isLast={idx === blocks.length - 1}
                            isDragOver={dragOverId === block.id}
                            dragHandleProps={{
                                draggable: true,
                                onDragStart: () => { dragIdRef.current = block.id; },
                                onDragOver: (e) => { e.preventDefault(); setDragOverId(block.id); },
                                onDragLeave: () => setDragOverId((cur) => cur === block.id ? null : cur),
                                onDrop: (e) => {
                                    e.preventDefault();
                                    reorderBlock(dragIdRef.current, block.id);
                                    dragIdRef.current = null;
                                    setDragOverId(null);
                                },
                                onDragEnd: () => { dragIdRef.current = null; setDragOverId(null); },
                            }}
                        />
                    ))}
                    {blocks.length === 0 && <p className="text-xs text-slate-400">No blocks yet — add one above.</p>}
                </div>
            </div>

            {/* Preview */}
            <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Preview</span>
                <div
                    className="border border-slate-200 rounded-md p-3 bg-white max-h-64 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: blocksToHtml(blocks) }}
                />
            </div>
        </div>
    );
};

export default EmailBodyBuilder;
