import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import Button from '../../components/Button';
import isonFormActions from '../../store/actions/isonForm-actions';
import { Urls } from '../../utils/url';
import nokiaPrePostActions from '../../store/actions/nokiaPrePost-actions';

const ORANGE = '#EC7D09';

const inputCls =
    'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-shadow';
const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';
const errorCls = 'text-xs text-red-500 mt-0.5';

const ISONForm = () => {
    const { register, handleSubmit, reset, setValue, getValues, formState: { errors } } = useForm();

    const [Form, setupForm] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const dispatch = useDispatch();

    const isonFormData = useSelector((state) => state?.isonForm?.getisonForm ?? []);

    /* Build the field list once the API data arrives */
    useEffect(() => {
        if (Form.length === 0 && isonFormData.length > 0) {
            const merged = [
                {
                    label: 'Input File',
                    name: 'uploadedFile',
                    type: 'file',
                    required: false,
                    fullWidth: true,
                },
            ];

            isonFormData.forEach((itm) => {
                if (['select', 'checkbox', 'number'].includes(itm.type)) {
                    merged.push({
                        label: itm.label,
                        name: itm.name,
                        type: itm.type,
                        defaultValue: itm.defaultValue,
                        option: itm.value,
                        required: true,
                    });
                    setValue(itm.name, itm.defaultValue);
                }
            });

            setupForm(merged);
        }
    }, [isonFormData]);

    useEffect(() => {
        dispatch(isonFormActions.getIsonFormList());
    }, []);

    const onSubmit = (data) => {
        setSubmitting(true);
        dispatch(
            nokiaPrePostActions.postFileSubmit(Urls.isonForm, data, () => {
                setupForm([]);
                setSubmitting(false);
            })
        );
    };

    const loading = isonFormData.length === 0;

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 min-h-0">
            {/* ── Card ── */}
            <div className="flex flex-col flex-1 min-h-0 w-full bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100">

                {/* Header */}
                <div
                    className="px-5 py-4 flex items-center gap-3"
                    style={{ background: ORANGE }}
                >
                    {/* Icon placeholder */}
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                            fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-white font-semibold text-base leading-tight">iSON Form</h1>
                        <p className="text-white/70 text-xs mt-0.5">Upload file and configure parameters</p>
                    </div>
                </div>

                {/* Body — scrollable */}
                <div className="flex-1 overflow-y-auto p-5 min-h-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 gap-3 text-slate-400 text-sm">
                            <svg className="animate-spin w-5 h-5 text-orange-400" xmlns="http://www.w3.org/2000/svg"
                                fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Loading form…
                        </div>
                    ) : (
                        <form encType="multipart/form-data" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-4">
                            {Form.map((field) => {
                                const colClass = field.fullWidth || field.type === 'file' ? 'col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4' : '';

                                return (
                                    <div key={field.name} className={colClass}>
                                        <label className={labelCls}>
                                            {field.label}
                                            {field.required && <span className="text-red-400 ml-0.5">*</span>}
                                        </label>

                                        {/* File */}
                                        {field.type === 'file' && (
                                            <>
                                                <label
                                                    htmlFor={field.name}
                                                    className="flex items-center gap-3 cursor-pointer w-full border-2 border-dashed border-slate-200 rounded-lg px-4 py-3 bg-slate-50 hover:bg-orange-50 hover:border-orange-300 transition-colors group"
                                                >
                                                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center group-hover:border-orange-300 transition-colors shrink-0">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                                                            fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                            <polyline points="17 8 12 3 7 8" />
                                                            <line x1="12" y1="3" x2="12" y2="15" />
                                                        </svg>
                                                    </div>
                                                    <span className="text-sm text-slate-500 group-hover:text-orange-600 transition-colors">
                                                        Click to choose a file…
                                                    </span>
                                                    <input
                                                        id={field.name}
                                                        type="file"
                                                        {...register(field.name, {
                                                            required: field.required ? 'This field is required' : false,
                                                        })}
                                                        className="sr-only"
                                                    />
                                                </label>
                                                {errors[field.name] && <p className={errorCls}>{errors[field.name].message}</p>}
                                            </>
                                        )}

                                        {/* Select */}
                                        {field.type === 'select' && (
                                            <>
                                                <select
                                                    className={inputCls}
                                                    {...register(field.name, {
                                                        required: field.required ? 'This field is required' : false,
                                                    })}
                                                >
                                                    <option value="">Select…</option>
                                                    {(field.option ?? []).map((opt) => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                                {errors[field.name] && <p className={errorCls}>{errors[field.name].message}</p>}
                                            </>
                                        )}

                                        {/* Number */}
                                        {field.type === 'number' && (
                                            <>
                                                <input
                                                    type="number"
                                                    className={inputCls}
                                                    {...register(field.name, {
                                                        required: field.required ? 'This field is required' : false,
                                                    })}
                                                />
                                                {errors[field.name] && <p className={errorCls}>{errors[field.name].message}</p>}
                                            </>
                                        )}

                                        {/* Checkbox */}
                                        {field.type === 'checkbox' && (
                                            <>
                                                <label className="flex items-center gap-2 cursor-pointer mt-1">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                                                        {...register(field.name, {
                                                            required: field.required ? 'This field is required' : false,
                                                        })}
                                                    />
                                                    <span className="text-sm text-slate-700">Enable</span>
                                                </label>
                                                {errors[field.name] && <p className={errorCls}>{errors[field.name].message}</p>}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </form>
                    )}
                </div>

                {/* Footer */}
                {!loading && (
                    <div className="shrink-0 px-5 py-4 border-t border-slate-100 bg-slate-50/60 flex justify-end gap-3 rounded-b-2xl">
                        <Button
                            variant="secondary"
                            size="md"
                            onClick={() => { setupForm([]); reset({}); }}
                        >
                            Reset
                        </Button>
                        <Button
                            variant="primary"
                            size="md"
                            disabled={submitting}
                            onClick={handleSubmit(onSubmit)}
                        >
                            {submitting ? 'Submitting…' : 'Submit'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ISONForm;
