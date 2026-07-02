import { useRef, useState } from 'react';
import Button from '../../components/Button';
import Api from '../../utils/api';
import { Urls } from '../../utils/url';

// --- Constants ---

const TABS = [
    { label: 'Compare Settings', key: 'compare_settings' },
    { label: 'Add Settings',     key: 'add_settings'     },
];

// Each tab has its own step labels — kept separate so they can differ independently.
const ADD_STEPS = [
    { number: 1, title: 'Upload 8',      subtitle: 'Add settings file'     },
    { number: 2, title: 'Review & Launch',  subtitle: 'Verify and upload'     },
];

const COMPARE_STEPS = [
    { number: 1, title: 'Upload Files',     subtitle: 'Old & new ZIP files'   },
    { number: 2, title: 'Review & Compare', subtitle: 'Verify and compare'    },
];

// --- Helpers ---

// Creates a temporary object URL from the API blob response and auto-clicks download.
// URL.revokeObjectURL frees the memory immediately after.
const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

// Reusable drag-and-drop zone — rendered differently per tab but same behaviour.
const DropZone = ({ accept, file, onFile, onClear, label, inputRef, dragging, onDragOver, onDragLeave, onDrop }) => (
    <div>
        <p className="text-sm font-medium text-slate-600 mb-2">{label}</p>
        <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={[
                'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors',
                dragging
                    ? 'border-[#EC7D09] bg-orange-50'
                    : 'border-slate-200 hover:border-[#EC7D09] hover:bg-orange-50',
            ].join(' ')}
        >
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mb-2 text-[#EC7D09] text-lg">
                &#128196;
            </div>
            <p className="text-sm font-medium text-slate-600">Drag and drop file here</p>
            <p className="text-xs text-slate-400 mt-1">Or click to browse</p>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => onFile(e.target.files[0] ?? null)}
            />
        </div>
        {file && (
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 mt-3">
                <span className="text-sm text-slate-700 truncate">{file.name}</span>
                <button
                    onClick={(e) => { e.stopPropagation(); onClear(); }}
                    className="ml-3 text-slate-400 hover:text-red-500 text-lg leading-none"
                >×</button>
            </div>
        )}
    </div>
);

// --- Main Component ---

const CompareEricsson = () => {
    const [activeTab,   setActiveTab]   = useState(TABS[0].key);
    const [currentStep, setCurrentStep] = useState(1);

    // Separate file state per tab so switching tabs doesn't clear the other tab's file.
    const [file,    setFile]    = useState(null); // Add Settings
    const [oldFile, setOldFile] = useState(null); // Compare — old zip
    const [newFile, setNewFile] = useState(null); // Compare — new zip

    const [draggingAdd,    setDraggingAdd]    = useState(false);
    const [draggingOld,    setDraggingOld]    = useState(false);
    const [draggingNew,    setDraggingNew]    = useState(false);
    const [submitting,     setSubmitting]     = useState(false);
    const [error,          setError]          = useState('');

    const fileRef    = useRef();
    const oldFileRef = useRef();
    const newFileRef = useRef();

    const isAdd    = activeTab === 'add_settings';
    const steps    = isAdd ? ADD_STEPS : COMPARE_STEPS;

    const switchTab = (key) => {
        setActiveTab(key);
        setCurrentStep(1);
        setError('');
        // intentionally keep file state so switching back doesn't lose selection
    };

    const clearRef = (ref) => { if (ref.current) ref.current.value = ''; };

    const handleSubmit = async () => {
        setError('');
        setSubmitting(true);

        const formData = new FormData();

        if (isAdd) {
            formData.append('settings_file', file);
        } else {
            formData.append('old_file', oldFile);
            formData.append('new_file', newFile);
        }

        const res = await Api.blobFile({
            method:      'POST',
            url:         Urls.compare_ericsson,
            data:        formData,
            contentType: 'multipart/form-data',
        });

        setSubmitting(false);

        if (res?.status === 200 || res?.status === 201) {
            const filename = isAdd
                ? `settings_result_${file.name}`
                : `compare_result_${oldFile.name}_vs_${newFile.name}`;
            triggerDownload(res.data, filename);
            // reset after successful download
            setCurrentStep(1);
            setFile(null);    setOldFile(null);    setNewFile(null);
            clearRef(fileRef); clearRef(oldFileRef); clearRef(newFileRef);
        } else {
            setError('Submission failed. Please try again.');
        }
    };

    // Shared drag handlers — each zone gets its own dragging state
    const dragHandlers = (setDragging, onFile) => ({
        onDragOver:  (e) => { e.preventDefault(); setDragging(true); },
        onDragLeave: ()  => setDragging(false),
        onDrop:      (e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) onFile(f);
        },
    });

    return (
        <div className="p-6 max-w-4xl mx-auto">

            {/* Tab bar */}
            <div className="flex border-b border-slate-200 mb-8">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => switchTab(tab.key)}
                        className={[
                            'px-6 py-3 text-sm font-semibold transition-colors',
                            activeTab === tab.key
                                ? 'border-b-2 border-[#EC7D09] text-[#EC7D09]'
                                : 'text-slate-500 hover:text-slate-700',
                        ].join(' ')}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex gap-8">

                {/* Left stepper — driven by `steps` which switches per active tab */}
                <div className="w-48 shrink-0">
                    {steps.map((step, idx) => {
                        const done   = currentStep > step.number;
                        const active = currentStep === step.number;
                        return (
                            <div key={step.number} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                    <div className={[
                                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                                        done || active
                                            ? 'bg-[#EC7D09] text-white'
                                            : 'bg-slate-100 text-slate-400',
                                    ].join(' ')}>
                                        {done ? '✓' : step.number}
                                    </div>
                                    {idx < steps.length - 1 && (
                                        <div className={[
                                            'w-0.5 h-10 mt-1',
                                            done ? 'bg-[#EC7D09]' : 'bg-slate-200',
                                        ].join(' ')} />
                                    )}
                                </div>
                                <div className="pb-10">
                                    <p className={`text-sm font-semibold ${active ? 'text-[#EC7D09]' : done ? 'text-slate-700' : 'text-slate-400'}`}>
                                        {step.title}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5">{step.subtitle}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Right content */}
                <div className="flex-1 min-h-[300px]">

                    {/* ── ADD SETTINGS ── */}

                    {isAdd && currentStep === 1 && (
                        <div>
                            <h2 className="text-base font-semibold text-slate-700 mb-1">Upload Settings File</h2>
                            <p className="text-sm text-slate-400 mb-5">Supported formats: <span className="font-medium">.csv, .xlsx</span></p>
                            <DropZone
                                label="Settings File (CSV / XLSX)"
                                accept=".csv,.xlsx"
                                file={file}
                                inputRef={fileRef}
                                dragging={draggingAdd}
                                onFile={setFile}
                                onClear={() => { setFile(null); clearRef(fileRef); }}
                                {...dragHandlers(setDraggingAdd, setFile)}
                            />
                            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
                            <div className="mt-5">
                                <Button
                                    name="Review & Continue →"
                                    variant="primary"
                                    onClick={() => {
                                        if (!file) { setError('Please select a file.'); return; }
                                        setError('');
                                        setCurrentStep(2);
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {isAdd && currentStep === 2 && (
                        <div>
                            <h2 className="text-base font-semibold text-slate-700 mb-1">Review & Finalize</h2>
                            <p className="text-sm text-slate-400 mb-5">Confirm before uploading.</p>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <span className="text-slate-400">&#128196;</span>
                                    <div>
                                        <p className="text-xs text-slate-400">Settings File</p>
                                        <p className="text-sm font-semibold text-slate-700">{file?.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setCurrentStep(1)} className="text-xs text-[#EC7D09] font-medium hover:underline">Edit</button>
                            </div>
                            {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
                            <div className="flex gap-3">
                                <Button name="← Back" variant="secondary" onClick={() => { setCurrentStep(1); setError(''); }} />
                                <Button
                                    name={submitting ? 'Uploading…' : 'Upload Settings'}
                                    variant="primary"
                                    disabled={submitting}
                                    onClick={handleSubmit}
                                />
                            </div>
                        </div>
                    )}

                    {/* ── COMPARE SETTINGS ── */}

                    {!isAdd && currentStep === 1 && (
                        <div>
                            <h2 className="text-base font-semibold text-slate-700 mb-1">Upload ZIP Files</h2>
                            <p className="text-sm text-slate-400 mb-5">Upload the old and new configuration ZIP files to compare.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <DropZone
                                    label="Old ZIP"
                                    accept=".zip"
                                    file={oldFile}
                                    inputRef={oldFileRef}
                                    dragging={draggingOld}
                                    onFile={setOldFile}
                                    onClear={() => { setOldFile(null); clearRef(oldFileRef); }}
                                    {...dragHandlers(setDraggingOld, setOldFile)}
                                />
                                <DropZone
                                    label="New ZIP"
                                    accept=".zip"
                                    file={newFile}
                                    inputRef={newFileRef}
                                    dragging={draggingNew}
                                    onFile={setNewFile}
                                    onClear={() => { setNewFile(null); clearRef(newFileRef); }}
                                    {...dragHandlers(setDraggingNew, setNewFile)}
                                />
                            </div>
                            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
                            <div className="mt-5">
                                <Button
                                    name="Review & Continue →"
                                    variant="primary"
                                    onClick={() => {
                                        if (!oldFile || !newFile) { setError('Please select both ZIP files.'); return; }
                                        setError('');
                                        setCurrentStep(2);
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {!isAdd && currentStep === 2 && (
                        <div>
                            <h2 className="text-base font-semibold text-slate-700 mb-1">Review & Finalize</h2>
                            <p className="text-sm text-slate-400 mb-5">Confirm before comparing.</p>
                            <div className="space-y-3 mb-6">
                                {[
                                    { label: 'Old ZIP', value: oldFile?.name },
                                    { label: 'New ZIP', value: newFile?.name },
                                ].map((row) => (
                                    <div key={row.label} className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-400">&#128196;</span>
                                            <div>
                                                <p className="text-xs text-slate-400">{row.label}</p>
                                                <p className="text-sm font-semibold text-slate-700">{row.value}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setCurrentStep(1)} className="text-xs text-[#EC7D09] font-medium hover:underline">Edit</button>
                                    </div>
                                ))}
                            </div>
                            {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
                            <div className="flex gap-3">
                                <Button name="← Back" variant="secondary" onClick={() => { setCurrentStep(1); setError(''); }} />
                                <Button
                                    name={submitting ? 'Comparing…' : 'Compare Now'}
                                    variant="primary"
                                    disabled={submitting}
                                    onClick={handleSubmit}
                                />
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default CompareEricsson;
