const AutoSuggestion = ({ itm, errors, handleSubmit, setValue, getValues, register }) => {
    return <>
        <input
            type={itm.type}
            disabled={itm.disabled ? true : false}
            {...register(itm.name, {
                required: itm.required ? "This Field is required" : false,
                onBlur: itm.onBlur ? itm.onBlur : false,
            })}
            autoComplete="off"
            defaultValue={itm.defaultValue ? itm.defaultValue : ""}
            placeholder={itm.placeholder ? itm.placeholder : ""}
            list={itm.datalist ? itm.datalist : ""}
            className="bg-white border-black border block h-8 w-full rounded-md py-1.5 p-2 text-black-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            {...itm.props}
        />

        {itm.datalist && Array.isArray(itm.option) && itm.option.length > 0 && (
            <datalist id={itm.datalist}>
                {itm.option.map((option) => (
                    <option key={option["value"]} value={option["label"]} />
                ))}
            </datalist>
        )}
    </>
};

export default AutoSuggestion;
