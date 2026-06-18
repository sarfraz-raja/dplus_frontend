import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import AdminManagementActions from '../../../store/actions/adminManagement-actions';
import { ZOOM_CONFIG_DEFAULTS } from '../../../store/reducers/adminManagement-reducer';
import Button from '../../../components/Button';

const SECTOR_MIN = 7;
const SECTOR_MAX = 14;
const MARKER_MIN = 10;
const MARKER_MAX = 16;

const validate = (sector, marker) => {
    const errors = {};
    if (sector < SECTOR_MIN || sector > SECTOR_MAX)
        errors.sectorVisibilityZoom = `Must be between ${SECTOR_MIN} and ${SECTOR_MAX}.`;
    if (marker < MARKER_MIN || marker > MARKER_MAX)
        errors.markerHideZoom = `Must be between ${MARKER_MIN} and ${MARKER_MAX}.`;
    if (!errors.sectorVisibilityZoom && !errors.markerHideZoom && sector >= marker)
        errors.sectorVisibilityZoom = 'Sectors must appear before dots disappear.';
    return errors;
};

const getWarnings = (sector, marker) => {
    const w = [];
    if (sector < 9) w.push('Sectors will appear at very low zoom — may slow down the map on large networks.');
    if (marker - sector < 2) w.push('Dots disappear almost immediately after sectors appear — the transition may feel abrupt.');
    if (sector > 11) w.push('Sectors only appear at high zoom — users may not see them during normal map navigation.');
    return w;
};

const getStatus = (value, defaultValue, error) => {
    if (error) return { label: 'Invalid', color: 'red' };
    if (value === defaultValue) return { label: 'Default', color: 'slate' };
    if (Math.abs(value - defaultValue) <= 1) return { label: 'Optimal', color: 'emerald' };
    return { label: 'Modified', color: 'amber' };
};

const STATUS_COLORS = {
    emerald: 'bg-emerald-100 text-emerald-700',
    amber:   'bg-amber-100 text-amber-700',
    red:     'bg-red-100 text-red-600',
    slate:   'bg-slate-100 text-slate-500',
};

const ZoomSettingsManager = () => {
    const dispatch = useDispatch();
    const zoomConfig = useSelector((s) => s?.adminManagement?.zoomConfig ?? ZOOM_CONFIG_DEFAULTS);

    const [sector, setSector] = useState(zoomConfig.sectorVisibilityZoom);
    const [marker, setMarker] = useState(zoomConfig.markerHideZoom);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => { dispatch(AdminManagementActions.getZoomConfig()); }, []);

    useEffect(() => {
        setSector(zoomConfig.sectorVisibilityZoom);
        setMarker(zoomConfig.markerHideZoom);
    }, [zoomConfig.sectorVisibilityZoom, zoomConfig.markerHideZoom]);

    const handleSave = () => {
        const errs = validate(sector, marker);
        setErrors(errs);
        if (Object.keys(errs).length) return;
        setSaving(true);
        dispatch(AdminManagementActions.saveZoomConfig(
            { sectorVisibilityZoom: sector, markerHideZoom: marker },
            () => { toast.success('Zoom settings saved'); setSaving(false); },
            (err) => { toast.error(err?.msg || 'Failed to save zoom settings'); setSaving(false); },
        ));
    };

    const handleReset = () => {
        setSector(ZOOM_CONFIG_DEFAULTS.sectorVisibilityZoom);
        setMarker(ZOOM_CONFIG_DEFAULTS.markerHideZoom);
        setErrors({});
    };

    const activeWarnings = getWarnings(sector, marker);
    const isDirty = sector !== zoomConfig.sectorVisibilityZoom || marker !== zoomConfig.markerHideZoom;

    return (
        <div className="flex flex-col bg-white h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-6 xl:px-[10%]">

                {/* Header */}
                <div className="flex items-start justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#0b1830' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Zoom Settings</h1>
                            <p className="text-sm text-slate-500 mt-0.5">Control at which zoom level the map switches between dot markers and sector polygons</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={handleReset} disabled={saving}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50">
                            Reset to Defaults
                        </button>
                        <button type="button" onClick={handleSave} disabled={saving || !isDirty}
                            className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                            style={{ background: '#EC7D09' }}>
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                </div>

                {/* Setting cards */}
                <div className="flex gap-4 shrink-0">
                    <SettingCard
                        label="Sectors Appear At Zoom"
                        hint="Below this zoom, cells show as dot markers. At this zoom and above, sector polygons become visible."
                        value={sector}
                        min={SECTOR_MIN}
                        max={SECTOR_MAX}
                        defaultValue={ZOOM_CONFIG_DEFAULTS.sectorVisibilityZoom}
                        error={errors.sectorVisibilityZoom}
                        accentColor="#059669"
                        visualType="sectorAppear"
                        onChange={(v) => { setSector(v); setErrors({}); }}
                    />
                    <SettingCard
                        label="Dots Disappear At Zoom"
                        hint="Below this zoom, dot markers are still visible alongside sectors. At this zoom and above, only sector polygons remain."
                        value={marker}
                        min={MARKER_MIN}
                        max={MARKER_MAX}
                        defaultValue={ZOOM_CONFIG_DEFAULTS.markerHideZoom}
                        error={errors.markerHideZoom}
                        accentColor="#7c3aed"
                        visualType="dotHide"
                        onChange={(v) => { setMarker(v); setErrors({}); }}
                    />
                </div>

                {/* Warnings */}
                {activeWarnings.length > 0 && (
                    <div className="flex flex-col gap-2 shrink-0">
                        {activeWarnings.map((w, i) => (
                            <div key={i} className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                                <svg className="shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                                </svg>
                                {w}
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-100 pt-3 shrink-0">
                    Changes apply immediately to the map after saving.
                </p>
            </div>
        </div>
    );
};

const ZoomVisual = ({ visualType, accentColor, value }) => {
    const isSectorAppear = visualType === 'sectorAppear';
    const ticks = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 pt-3 pb-4 flex flex-col gap-3">
            {/* zoom bar */}
            <div className="flex items-end gap-0.5">
                {ticks.map((t) => {
                    const active = isSectorAppear ? t >= value : t < value;
                    const isThreshold = t === value;
                    return (
                        <div key={t} className="flex flex-col items-center gap-1 flex-1">
                            <div
                                className="w-full rounded-sm transition-all"
                                style={{
                                    height: isThreshold ? 28 : 18,
                                    background: isThreshold
                                        ? accentColor
                                        : active
                                            ? `${accentColor}50`
                                            : '#e2e8f0',
                                }}
                            />
                            {isThreshold && (
                                <span className="text-[9px] font-bold" style={{ color: accentColor }}>{t}</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* label */}
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: `${accentColor}50` }} />
                <span className="text-xs text-slate-600">
                    {isSectorAppear
                        ? <>Sector polygons visible from zoom <strong>{value}</strong> onwards</>
                        : <>Dot markers hidden from zoom <strong>{value}</strong> onwards</>
                    }
                </span>
            </div>
        </div>
    );
};

const SettingCard = ({ label, hint, value, min, max, defaultValue, error, accentColor, visualType, onChange }) => {
    const status = getStatus(value, defaultValue, error);
    return (
        <div className={`flex-1 bg-white rounded-xl border shadow-sm flex flex-col ${error ? 'border-red-300' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-700">{label}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${STATUS_COLORS[status.color]}`}>
                        {status.label}
                    </span>
                </div>
                <span className="text-xs text-slate-400">default: {defaultValue}</span>
            </div>
            <div className="p-4 flex flex-col gap-4">
                <p className="text-xs text-slate-400 leading-relaxed">{hint}</p>

                <ZoomVisual visualType={visualType} accentColor={accentColor} value={value} />

                <div className="flex items-center gap-3">
                    <input
                        type="number"
                        min={min}
                        max={max}
                        value={value}
                        onChange={(e) => onChange(Number(e.target.value))}
                        className={`w-14 px-2 py-1.5 rounded-lg border text-sm font-bold text-center text-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-0 shrink-0 ${
                            error ? 'border-red-400 bg-red-50 focus:ring-red-200' : 'border-slate-200 bg-slate-50 focus:ring-slate-200'
                        }`}
                    />
                    <div className="flex-1 flex flex-col gap-1">
                        <input
                            type="range"
                            min={min}
                            max={max}
                            value={value}
                            onChange={(e) => onChange(Number(e.target.value))}
                            className="w-full cursor-pointer"
                            style={{ accentColor }}
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                            <span>Min: {min}</span>
                            <span>Max: {max}</span>
                        </div>
                    </div>
                </div>

                {error && (
                    <p className="text-xs text-red-500 flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
};

export default ZoomSettingsManager;
