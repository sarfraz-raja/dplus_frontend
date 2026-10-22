import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import Button from '../../components/Button';
import Select from '../../components/Select';
import FormPage, {
    FormCard, FormCardHeader, FormPageBody, FormPageHeader,
    formErrorCls, formInputCls, formLabelCls,
} from '../../components/FormPage';
import isonFormActions from '../../store/actions/isonForm-actions';
import { Urls } from '../../utils/url';
import nokiaPrePostActions from '../../store/actions/nokiaPrePost-actions';

const FileIcon = ({ size = 16 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
);

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);

const SlidersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
    </svg>
);

const ISONForm = () => {
    const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm();

    const [submitting, setSubmitting] = useState(false);

    const dispatch = useDispatch();

    const isonFormData = useSelector((state) => state?.isonForm?.getisonForm ?? []);

    // Parameter fields come from the API; only select / checkbox / number are supported.
    const fields = useMemo(
        () => isonFormData
            .filter((itm) => ['select', 'checkbox', 'number'].includes(itm.type))
            .map((itm) => ({
                label: itm.label,
                name: itm.name,
                type: itm.type,
                defaultValue: itm.defaultValue,
                option: itm.value,
                required: true,
            })),
        [isonFormData]
    );

    const defaults = useMemo(
        () => Object.fromEntries(fields.map((f) => [f.name, f.defaultValue])),
        [fields]
    );

    useEffect(() => { reset(defaults); }, [defaults]);

    useEffect(() => {
        dispatch(isonFormActions.getIsonFormList());
    }, []);

    // OLD: dispatch(nokiaPrePostActions.postFileSubmit(...)) — postFileSubmit is not defined in
    // nokiaPrePost-actions, so Submit threw. postSubmit is the multipart upload used by the other pages.
    const onSubmit = async (data) => {
        setSubmitting(true);
        try {
            await dispatch(nokiaPrePostActions.postSubmit(Urls.isonForm, data, () => reset(defaults)));
        } finally {
            setSubmitting(false);
        }
    };

    const loading = isonFormData.length === 0;
    const chosenFile = watch('uploadedFile')?.[0];
    const requiredRule = (field) => ({ required: field.required ? 'This field is required' : false });

    return (
        <FormPage>
            <FormPageHeader
                    icon={<FileIcon />}
                    title="iSON Form"
                    subtitle="Upload a file and configure the run parameters"
                    actions={!loading && (
                        <>
                            <Button variant="secondary" size="sm" disabled={submitting} onClick={() => reset(defaults)}>
                                Reset
                            </Button>
                            <Button variant="primary" size="sm" disabled={submitting} onClick={handleSubmit(onSubmit)}>
                                {submitting ? 'Submitting…' : 'Submit'}
                            </Button>
                        </>
                    )}
                />

            <FormPageBody>
                {loading ? (
                    <FormCard className="flex items-center justify-center py-16 gap-3 text-slate-400 text-xs">
                        <svg className="animate-spin w-5 h-5 text-accent" xmlns="http://www.w3.org/2000/svg"
                            fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading form…
                    </FormCard>
                ) : (
                    <form encType="multipart/form-data" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
                        {/* Input file — one compact row: the picker sits in the card header */}
                        <FormCard>
                            <FormCardHeader
                                icon={<UploadIcon />}
                                title="Input File"
                                subtitle="The file to process (optional)"
                                className="border-b-0"
                                right={
                                    <label
                                        htmlFor="uploadedFile"
                                        className="flex items-center gap-2 min-w-0 max-w-[60%] cursor-pointer border border-dashed border-slate-300 rounded-md px-2.5 py-1 bg-slate-50 hover:bg-accent/[0.06] hover:border-accent/50 focus-within:ring-2 focus-within:ring-accent/40 transition-colors group"
                                    >
                                        <span className="text-accent shrink-0"><UploadIcon /></span>
                                        <span className={`text-xs truncate ${chosenFile ? 'text-slate-700 font-semibold' : 'text-slate-500 group-hover:text-accent'}`}>
                                            {chosenFile ? chosenFile.name : 'Choose a file…'}
                                        </span>
                                        <input
                                            id="uploadedFile"
                                            type="file"
                                            className="sr-only"
                                            {...register('uploadedFile')}
                                        />
                                    </label>
                                }
                            />
                        </FormCard>

                        {/* Parameters */}
                        {fields.length > 0 && (
                            <FormCard>
                                <FormCardHeader icon={<SlidersIcon />} title="Parameters" subtitle="Run settings for this file" />
                                <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-2.5 gap-y-2">
                                    {fields.map((field) => (
                                        <div key={field.name}>
                                            <label className={formLabelCls} htmlFor={field.type === 'select' ? undefined : field.name}>
                                                {field.label}
                                                {field.required && <span className="text-red-400"> *</span>}
                                            </label>

                                            {field.type === 'select' && (
                                                <Controller
                                                    name={field.name}
                                                    control={control}
                                                    rules={requiredRule(field)}
                                                    render={({ field: f }) => (
                                                        <Select
                                                            name={f.name}
                                                            value={f.value ?? ''}
                                                            onChange={(e) => f.onChange(e.target.value)}
                                                            className={formInputCls}
                                                            aria-label={field.label}
                                                        >
                                                            <option value="">Select…</option>
                                                            {(field.option ?? []).map((opt) => (
                                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                            ))}
                                                        </Select>
                                                    )}
                                                />
                                            )}

                                            {field.type === 'number' && (
                                                <input
                                                    id={field.name}
                                                    type="number"
                                                    className={formInputCls}
                                                    {...register(field.name, requiredRule(field))}
                                                />
                                            )}

                                            {field.type === 'checkbox' && (
                                                <label className="flex items-center gap-2 cursor-pointer py-1">
                                                    <input
                                                        id={field.name}
                                                        type="checkbox"
                                                        className="w-3.5 h-3.5 rounded border-slate-300 accent-[#EC7D09]"
                                                        {...register(field.name, requiredRule(field))}
                                                    />
                                                    <span className="text-xs text-slate-700">Enable</span>
                                                </label>
                                            )}

                                            {errors[field.name] && <p className={formErrorCls}>{errors[field.name].message}</p>}
                                        </div>
                                    ))}
                                </div>
                            </FormCard>
                        )}
                    </form>
                )}
            </FormPageBody>
        </FormPage>
    );
};

export default ISONForm;
