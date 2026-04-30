import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import moment from 'moment';

const inputCls = 'border border-slate-300 rounded-lg px-3 text-sm h-9 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400';

const DatePicking = ({ itm, errors, handleSubmit, setValue, getValues, register }) => {
    const [, forceUpdate] = useState(0);

    /* Pure date — use native input for the clean built-in calendar icon */
    if (itm.formattype === 'date') {
        return <>
            <input
                type="date"
                value={getValues(itm.name) || ''}
                onChange={(e) => { setValue(itm.name, e.target.value); forceUpdate(n => n + 1); }}
                className={inputCls}
            />
            <p className='text-xs text-red-700'>{errors[itm.name]?.message}</p>
        </>;
    }

    /* Time / datetime — keep react-datepicker */
    return <>
        <DatePicker
            selected={getValues(itm.name) ? moment(getValues(itm.name), itm?.formatop).toDate() : null}
            onChange={(date) => {
                setValue(itm.name, moment(date).format(itm?.formatop));
                forceUpdate(n => n + 1);
            }}
            showTimeSelect={true}
            showTimeSelectOnly={itm.formattype === 'time'}
            dateFormat={itm?.format}
            timeIntervals={itm?.interval}
            timeFormat="HH:mm"
            className={inputCls}
        />
        <p className='text-xs text-red-700'>{errors[itm.name]?.message}</p>
    </>;
};

export default DatePicking;
