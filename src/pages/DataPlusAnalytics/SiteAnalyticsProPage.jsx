import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import nokiaPrePostActions from '../../store/actions/nokiaPrePost-actions';
import AutoSuggestion from '../../components/FormElements/AutoSuggestion';
import DatePicking from '../../components/FormElements/DatePicking';
import SiteAnalyticsCard from '../../components/SiteAnalyticsCard';
import Button from '../../components/Button';
import { objectToQueryString } from '../../utils/commonFunnction';
import moment from 'moment';

const FILTERS = ['All', '5G', '4G', '3G', '2G', 'PM KPI', 'PCI / PSC / BCCH'];

const SiteAnalyticsProPage = () => {
    const dispatch = useDispatch();

    const [datew, setdatew] = useState(0);
    const [filter, setFilter] = useState('All');

    const url         = new URL(window.location.href);
    const params      = new URLSearchParams(url.search);
    const urlUniqueId = params.get('uniqueId');

    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        formState: { errors },
    } = useForm();

    const AllDataShowing       = useSelector((s) => s?.nokiaPrePost?.networkAnalyticsPro);
    const DataSorter           = useSelector((s) => s?.nokiaPrePost?.networkAnalyticsProSorter);
    const uniquePhysicalIdList = useSelector((s) => s?.nokiaPrePost?.uniquePhysicalId);
    const DataShowCols         = useSelector((s) => s?.nokiaPrePost?.showCols);

    const dataSumitter = (data) => {
        dispatch(nokiaPrePostActions.getnetworkanalyticspro(true, objectToQueryString(data), () => {
            setdatew((prev) => prev + 1);
        }));
    };

    const dataCols = {
        '5G PM KPI Check': [['KPI', 'Pre', 'Post', 'Delta']],
        '4G PM KPI Check': [['KPI', 'Pre', 'Post', 'Delta']],
        '3G PM KPI Check': [['KPI', 'Pre', 'Post', 'Delta']],
        '2G PM KPI Check': [['KPI', 'Pre', 'Post', 'Delta']],
        '5G PCI Check':    [['Site ID', 'Issue', '<1 KM', '1-5 KM', '>5KM']],
        '4G PCI Check':    [['Site ID', 'Issue', '<1 KM', '1-5 KM', '>5KM']],
        '3G PSC Check':    [['Site ID', 'Issue', '<1 KM', '1-5 KM', '>5KM']],
        '2G BCCH Check':   [['Site ID', 'Issue', '<1 KM', '1-5 KM', '>5KM']],
    };

    useEffect(() => {
        if (datew === 0) {
            if (urlUniqueId != null) {
                const twoDaysAgo          = moment().subtract(2, 'days');
                const twoDaysAgoFormatted = twoDaysAgo.format('YYYY-MM-DD');
                const oneDaysAgo          = moment().subtract(1, 'days');
                const oneDaysAgoFormatted = oneDaysAgo.format('YYYY-MM-DD');

                setValue('fr_pre_date',  twoDaysAgo);
                setValue('fr_post_date', oneDaysAgo);

                dispatch(nokiaPrePostActions.getnetworkanalyticspro(true, objectToQueryString({
                    fr_phy_id:    urlUniqueId,
                    fr_pre_date:  twoDaysAgoFormatted,
                    fr_post_date: oneDaysAgoFormatted,
                }), () => {}));
            } else {
                dispatch(nokiaPrePostActions.getnetworkanalyticspro());
            }
            dispatch(nokiaPrePostActions.getuniquephysicalid());
        }
    }, [datew]);

    const idSelector = [
        {
            label: 'Select Site ID',
            name: 'fr_phy_id',
            value: 'Select',
            type: 'text',
            datalist: 'listData',
            defaultValue: urlUniqueId,
            option: uniquePhysicalIdList,
            props: {
                onChange: (e) => {
                    if (e.target.value.length >= 2) {
                        dispatch(nokiaPrePostActions.getuniquephysicalid(true, 'getData=' + e.target.value));
                    }
                },
            },
            required: true,
        },
        { label: 'Pre Date',  name: 'fr_pre_date',  type: 'datetime', formattype: 'date', format: 'yyyy-MM-dd', formatop: 'yyyy-MM-DD', required: true },
        { label: 'Post Date', name: 'fr_post_date', type: 'datetime', formattype: 'date', format: 'yyyy-MM-dd', formatop: 'yyyy-MM-DD', required: true },
    ];

    const allSectionKeys = Object.keys(DataSorter).sort((a, b) => DataSorter[a]['sort'] - DataSorter[b]['sort']);

    const filteredSectionKeys = allSectionKeys.filter((key) => {
        if (filter === 'All')              return true;
        if (filter === 'PM KPI')           return key.includes('PM KPI');
        if (filter === 'PCI / PSC / BCCH') return key.includes('PCI') || key.includes('PSC') || key.includes('BCCH');
        return key.startsWith(filter);
    });

    return (
        <div
            className="flex flex-col h-[calc(100vh-4rem)] p-5 gap-4"
            style={{ background: '#ffffff' }}
        >
            {/* ── Header ── */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0"
                        style={{ background: '#0b1830' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 leading-tight">Site Analytics Pro</h1>
                        <p className="text-xs text-slate-400 font-medium tracking-wide">Pre/post KPI comparison and PCI conflict analysis per site</p>
                    </div>
                </div>

                {/* ── Form controls ── */}
                <div className="flex items-end gap-3">
                    <div className="flex flex-col">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Site ID</label>
                        <AutoSuggestion itm={idSelector[0]} errors={errors} handleSubmit={handleSubmit} setValue={setValue} getValues={getValues} register={register} />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Pre Date</label>
                        <DatePicking itm={idSelector[1]} errors={errors} handleSubmit={handleSubmit} setValue={setValue} getValues={getValues} register={register} />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Post Date</label>
                        <DatePicking itm={idSelector[2]} errors={errors} handleSubmit={handleSubmit} setValue={setValue} getValues={getValues} register={register} />
                    </div>
                    <Button onClick={handleSubmit(dataSumitter)} name="Submit" variant="primary" className="h-9" />
                </div>
            </div>

            {/* ── Filter pills ── */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Filter:</span>
                {FILTERS.map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`py-1 px-3 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${filter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* ── Content sections ── */}
            <div className="flex-1 overflow-auto">
                {filteredSectionKeys.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-16">
                        No data. Select a Site ID and dates, then click Submit.
                    </div>
                ) : (
                    filteredSectionKeys.map((ckeyr) => {
                        const sectionColor = DataSorter[ckeyr]['color'];
                        const sectionKeys  = DataSorter[ckeyr]['data'] || [];

                        return (
                            <div key={ckeyr} className="mb-6 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                <div style={{ background: sectionColor }} className="px-4 py-2">
                                    <h2 className="text-white text-sm font-bold tracking-wide">{ckeyr}</h2>
                                </div>
                                <div className="bg-white p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                                    {sectionKeys.map((ckey) => (
                                        DataShowCols[ckey] && AllDataShowing[ckey] && (
                                            <div
                                                key={ckey}
                                                className="rounded-md overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                                            >
                                                <SiteAnalyticsCard
                                                    ckeyr={ckeyr}
                                                    AllDataShowing={AllDataShowing}
                                                    innerkey="innerkey"
                                                    ckey={ckey}
                                                    headerName={DataShowCols[ckey]?.['name']}
                                                    fetchBackend={true}
                                                    headers={dataCols[ckey]}
                                                    variables={DataShowCols[ckey]}
                                                />
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default SiteAnalyticsProPage;
