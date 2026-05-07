import { useState } from 'react';
import { UilEye, UilEyeSlash } from '@iconscout/react-unicons';

const inputCls = 'w-full border border-slate-300 rounded px-3 py-2 pr-10 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400';

const Password = ({ itm, errors, register }) => {
    const [show, setShow] = useState(false);

    return (
        <>
            <div className="relative">
                <input
                    type={show ? 'text' : 'password'}
                    disabled={!!itm.disabled}
                    placeholder={itm.placeholder ?? ''}
                    className={inputCls}
                    {...register(itm.name, {
                        required: itm.required ? 'This field is required' : false,
                    })}
                />
                <button
                    type="button"
                    onClick={() => setShow(p => !p)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                >
                    {show ? <UilEyeSlash size={18} /> : <UilEye size={18} />}
                </button>
            </div>
            {errors[itm.name] && (
                <p className="text-xs text-red-500 mt-0.5">{errors[itm.name].message}</p>
            )}
        </>
    );
};

export default Password;
