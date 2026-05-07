const inputCls = 'w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-slate-50 disabled:text-slate-400';

const TextBox = ({ itm, errors, register }) => (
    <>
        <input
            type={itm.type}
            disabled={!!itm.disabled}
            placeholder={itm.placeholder ?? ''}
            className={inputCls}
            {...register(itm.name, {
                required: itm.required ? 'This field is required' : false,
            })}
        />
        {errors[itm.name] && (
            <p className="text-xs text-red-500 mt-0.5">{errors[itm.name].message}</p>
        )}
    </>
);

export default TextBox;
