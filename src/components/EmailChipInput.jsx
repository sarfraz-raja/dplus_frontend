import { useState, useRef, useEffect } from 'react';

const EmailChipInput = ({ value, onChange, placeholder }) => {
    const [chips, setChips] = useState([]);
    const [inputVal, setInputVal] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        const incoming = (value || '').trim();
        const currentJoined = chips.join(',');
        if (incoming !== currentJoined) {
            setChips(incoming ? incoming.split(/[,;:]/).map(e => e.trim()).filter(Boolean) : []);
        }
    }, [value]);

    const commit = (raw) => {
        const emails = raw.split(/[,;:]/).map(e => e.trim()).filter(Boolean);
        if (!emails.length) return;
        const next = [...chips, ...emails];
        setChips(next);
        onChange(next.join(','));
        setInputVal('');
    };

    const removeChip = (i) => {
        const next = chips.filter((_, idx) => idx !== i);
        setChips(next);
        onChange(next.join(','));
    };

    const handleKeyDown = (e) => {
        if ([',', ';', ':'].includes(e.key) || e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            if (inputVal.trim()) commit(inputVal);
        } else if (e.key === 'Backspace' && inputVal === '' && chips.length > 0) {
            removeChip(chips.length - 1);
        }
    };

    const handleChange = (e) => {
        const val = e.target.value;
        if (/[,;:]/.test(val)) {
            commit(val);
        } else {
            setInputVal(val);
        }
    };

    const handleBlur = () => {
        if (inputVal.trim()) commit(inputVal);
    };

    return (
        <div
            className="flex flex-wrap gap-1.5 items-center self-start w-full border border-slate-300 rounded px-2 py-1.5 bg-white focus-within:ring-2 focus-within:ring-orange-400 cursor-text min-h-[38px]"
            onClick={() => inputRef.current?.focus()}
        >
            {chips.map((chip, i) => (
                <span key={i} className="flex items-center gap-1 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full border border-orange-200">
                    {chip}
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => removeChip(i)}
                        className="text-orange-400 hover:text-orange-600 font-bold leading-none"
                    >×</button>
                </span>
            ))}
            <input
                ref={inputRef}
                type="email"
                value={inputVal}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                placeholder={chips.length === 0 ? placeholder : ''}
                className="flex-1 min-w-[160px] text-sm text-slate-900 outline-none bg-transparent py-0.5"
            />
        </div>
    );
};

export default EmailChipInput;
