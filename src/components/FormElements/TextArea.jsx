const textareaCls = 'w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none';

const TextArea = ({ itm, errors, register }) => (
    <>
        <textarea
            rows={itm.rows ?? 4}
            placeholder={itm.placeholder ?? ''}
            className={textareaCls}
            {...register(itm.name, {
                required: itm.required ? 'This field is required' : false,
            })}
        />
        {errors[itm.name] && (
            <p className="text-xs text-red-500 mt-0.5">{errors[itm.name].message}</p>
        )}
    </>
);

export default TextArea;
