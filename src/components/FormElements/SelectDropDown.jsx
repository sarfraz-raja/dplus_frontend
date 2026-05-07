const inputCls = 'w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400';

const SelectDropDown = ({ itm, errors, register }) => (
    <>
        <select
            className={inputCls}
            onChange={itm.onChanging ?? undefined}
            {...register(itm.name, {
                required: itm.required ? 'This field is required' : false,
            })}
        >
            <option value="">Select</option>
            {(itm.option ?? []).map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
        {errors[itm.name] && (
            <p className="text-xs text-red-500 mt-0.5">{errors[itm.name].message}</p>
        )}
    </>
);

export default SelectDropDown;
