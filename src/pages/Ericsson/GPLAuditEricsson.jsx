import { useRef, useState } from 'react';
import Button from '../../components/Button';
import Api from '../../utils/api';
import { Urls } from '../../utils/url';

const TABS = [
    { label: 'GPL Audit', key: 'gpl_Audit' },
    { label: 'GPL settings', key: 'gpl_settings' },
];

const CIRCLES = [
    { label: 'DL',   key: 'dl'   },
    { label: 'AP',   key: 'ap'   },
    { label: 'ROTN', key: 'rotn' },
    { label: 'UPW',  key: 'upw'  },
    { label: 'IN',   key: 'in'   },
];

const STEPS = [
    { number: 1, title: 'Select Circle',    subtitle: 'Choose regional coverage'  },
    { number: 2, title: 'Upload File',      subtitle: 'Add configuration file'    },
    { number: 3, title: 'Review & Launch',  subtitle: 'Verify and submit'         },
];

const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

const GPLAuditEricsson = () => {
    const [activeTab,      setActiveTab]      = useState(TABS[0].key);
    const [currentStep,    setCurrentStep]    = useState(1);
    const [selectedCircle, setSelectedCircle] = useState('');
    const [enm_files,           setEnmFiles]           = useState(null);
    const [dragging,       setDragging]       = useState(false);
    const [submitting,     setSubmitting]     = useState(false);
    const [error,          setError]          = useState('');

    const fileInputRef = useRef();

    const isAudit   = activeTab === 'gpl_Audit';
    const acceptExt = isAudit ? '.zip' : '.csv';

    const switchTab = (key) => {
        setActiveTab(key);
        setCurrentStep(1);
        setSelectedCircle('');
        setEnmFiles(null);
        setError('');
    };

    const handleFileChange = (incoming) => {
        if (!incoming) return;
        setEnmFiles(incoming);
        setError('');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) handleFileChange(dropped);
    };

    const handleSubmit = async () => {
        setError('');
        setSubmitting(true);

        const formData = new FormData();
        formData.append('circle', selectedCircle);
        formData.append('enm_file', enm_files);

        const res = await Api.blobFile({
            method:      'POST',
            url:         Urls.gpl_audit_ericsson,
            data:        formData,
            contentType: 'multipart/form-data',
        });

        setSubmitting(false);

        if (res?.status === 200 || res?.status === 201) {
            const ext      = isAudit ? 'zip' : 'csv';
            triggerDownload(res.data, `gpl_${activeTab}_${selectedCircle}.${ext}`);
            setCurrentStep(1);
            setSelectedCircle('');
            setEnmFiles(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
            setError('Submission failed. Please try again.');
        }
    };

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

                {/* Left stepper */}
                <div className="w-48 shrink-0">
                    {STEPS.map((step, idx) => {
                        const done   = currentStep > step.number;
                        const active = currentStep === step.number;
                        return (
                            <div key={step.number} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                    <div className={[
                                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                                        done   ? 'bg-[#EC7D09] text-white'          :
                                        active ? 'bg-[#EC7D09] text-white'          :
                                                 'bg-slate-100 text-slate-400',
                                    ].join(' ')}>
                                        {done ? '✓' : step.number}
                                    </div>
                                    {idx < STEPS.length - 1 && (
                                        <div className={[
                                            'w-0.5 h-10 mt-1',
                                            currentStep > step.number ? 'bg-[#EC7D09]' : 'bg-slate-200',
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
                <div className="flex-1 min-h-[320px]">

                    {/* Step 1 — Select Circle */}
                    {currentStep === 1 && (
                        <div>
                            <h2 className="text-base font-semibold text-slate-700 mb-1">Regional Circle Selection</h2>
                            <p className="text-sm text-slate-400 mb-5">Select the operational circle for this configuration.</p>
                            <div className="mb-8">
                                <label className="block text-sm font-medium text-slate-600 mb-2">Circle</label>
                                <select
                                    value={selectedCircle}
                                    onChange={(e) => setSelectedCircle(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#EC7D09] focus:ring-1 focus:ring-[#EC7D09] bg-white"
                                >
                                    <option value="">-- Select a circle --</option>
                                    {CIRCLES.map((c) => (
                                        <option key={c.key} value={c.key}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                            {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
                            <Button
                                name="Continue to Upload →"
                                variant="primary"
                                onClick={() => {
                                    if (!selectedCircle) { setError('Please select a circle.'); return; }
                                    setError('');
                                    setCurrentStep(2);
                                }}
                            />
                        </div>
                    )}

                    {/* Step 2 — Upload enm_files */}
                    {currentStep === 2 && (
                        <div>
                            <h2 className="text-base font-semibold text-slate-700 mb-1">
                                {isAudit ? 'Upload ENM Dump / Audit Configuration File' : 'Upload Settings Configuration File'}
                            </h2>
                            <p className="text-sm text-slate-400 mb-5">
                                Supported format: <span className="font-medium">{acceptExt}</span>
                            </p>

                            {/* Drop zone */}
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={[
                                    'border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors mb-4',
                                    dragging
                                        ? 'border-[#EC7D09] bg-orange-50'
                                        : 'border-slate-200 hover:border-[#EC7D09] hover:bg-orange-50',
                                ].join(' ')}
                            >
                                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-3 text-[#EC7D09] text-xl">
                                    &#128196;
                                </div>
                                <p className="text-sm font-medium text-slate-600">Drag and drop file here</p>
                                <p className="text-xs text-slate-400 mt-1">Or click to browse from your computer</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={acceptExt}
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e.target.files[0] ?? null)}
                                />
                            </div>

                            {/* Selected enm_files pill */}
                            {enm_files && (
                                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 mb-4">
                                    <span className="text-sm text-slate-700 truncate">{enm_files.name}</span>
                                    <button
                                        onClick={() => { setEnmFiles(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                        className="ml-3 text-slate-400 hover:text-red-500 text-lg leading-none"
                                    >
                                        ×
                                    </button>
                                </div>
                            )}

                            {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

                            <div className="flex gap-3">
                                <Button name="← Back" variant="secondary" onClick={() => { setCurrentStep(1); setError(''); }} />
                                <Button
                                    name="Review Final Settings →"
                                    variant="primary"
                                    onClick={() => {
                                        if (!enm_files) { setError('Please select a file.'); return; }
                                        setError('');
                                        setCurrentStep(3);
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3 — Review & Launch */}
                    {currentStep === 3 && (
                        <div>
                            <h2 className="text-base font-semibold text-slate-700 mb-1">Review & Finalize</h2>
                            <p className="text-sm text-slate-400 mb-5">Confirm your configuration details before submitting.</p>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-400">&#128205;</span>
                                        <div>
                                            <p className="text-xs text-slate-400">Selected Circle</p>
                                            <p className="text-sm font-semibold text-slate-700 uppercase">{selectedCircle}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setCurrentStep(1)} className="text-xs text-[#EC7D09] font-medium hover:underline">Edit</button>
                                </div>

                                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-400">&#128196;</span>
                                        <div>
                                            <p className="text-xs text-slate-400">Config File</p>
                                            <p className="text-sm font-semibold text-slate-700">{enm_files?.name}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setCurrentStep(2)} className="text-xs text-[#EC7D09] font-medium hover:underline">Edit</button>
                                </div>
                            </div>

                            {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

                            <div className="flex gap-3">
                                <Button name="Previous Step" variant="secondary" onClick={() => { setCurrentStep(2); setError(''); }} />
                                <Button
                                    name={submitting ? 'Submitting…' : 'Launch Audit Now'}
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

export default GPLAuditEricsson;
