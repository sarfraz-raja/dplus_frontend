import { useEffect, useState } from 'react';
import nokiaPrePostActions from '../../store/actions/nokiaPrePost-actions';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import AutoSuggestion from '../../components/FormElements/AutoSuggestion';
import DatePicking from '../../components/FormElements/DatePicking';
import SiteAnalyticsCard from '../../components/SiteAnalyticsCard';
import Button from '../../components/Button';
import { objectToQueryString } from '../../utils/commonFunnction';
import moment from 'moment';


const SiteProRules = () => {

    const dispatch = useDispatch();

    const [datew, setdatew] = useState(0);

    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    const urlUniqueId = params.get('uniqueId');

    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        formState: { errors },
    } = useForm()

    let AllDataShowing = useSelector((state) => {
        return state?.nokiaPrePost?.networkAnalyticsPro
    })

    let DataSorter = useSelector((state) => {
        return state?.nokiaPrePost?.networkAnalyticsProSorter
    })
    let uniquePhysicalIdList = useSelector((state) => {
        return state?.nokiaPrePost?.uniquePhysicalId
    })

    let DataShowCols = useSelector((state) => {
        return state?.nokiaPrePost?.showCols
    })

    const dataSumitter = (data) => {
        console.log(data, "dataSumitterdataSumitter")
        dispatch(nokiaPrePostActions.getnetworkanalyticspro(true, objectToQueryString(data), () => {
            setdatew(prev => prev + 1)
        }))
    }

   useEffect(() => {

        if (datew == 0) {

            if (urlUniqueId != null) {


                const twoDaysAgo = moment().subtract(2, 'days');
                const twoDaysAgoformattedDate = twoDaysAgo.format('YYYY-MM-DD');
            
                const oneDaysAgo = moment().subtract(1, 'days');
                const oneDaysAgoformattedDate = oneDaysAgo.format('YYYY-MM-DD');
            
                console.log(twoDaysAgoformattedDate,"twoDaysAgoformattedDate")
                console.log(oneDaysAgoformattedDate,"oneDaysAgoformattedDate")

                
                setValue("fr_pre_date",twoDaysAgo)
                setValue("fr_post_date",oneDaysAgo)

                let datuewa={
                    fr_phy_id:urlUniqueId,
                    fr_pre_date:twoDaysAgoformattedDate,
                    fr_post_date:oneDaysAgoformattedDate
                }
                dispatch(nokiaPrePostActions.getnetworkanalyticspro(true, objectToQueryString(datuewa), () => {}))
            } else {
                dispatch(nokiaPrePostActions.getnetworkanalyticspro())
            }
            dispatch(nokiaPrePostActions.getuniquephysicalid())
        }

    }, [datew])

    let idSelector = [
        { label: "Select Site ID", name: "fr_phy_id", value: "Select", type: "text", datalist: "listData",defaultValue:urlUniqueId, option: uniquePhysicalIdList, props: "", required: true, },
        { label: "Pre Date", name: "fr_pre_date", type: "datetime", formattype: "date", format: "yyyy-MM-dd", formatop: "yyyy-MM-DD", required: true },
        { label: "Post Date", name: "fr_post_date", type: "datetime", formattype: "date", format: "yyyy-MM-dd", formatop: "yyyy-MM-DD", required: true }
    ]
    return <>
        <div className="w-full min-h-full bg-slate-50">
            <div className="flex flex-col min-h-full" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 50%, #fef3c7 100%)' }}>

                <div className="px-6 py-6">
                    <div className="mx-auto max-w-7xl space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
                                    style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M7 15l5-5 5 5" />
                                        <path d="M12 20V4" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">Site Pro Rules</h1>
                                    <p className="text-sm text-slate-500">Manage site analytics and health checks.</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5">
                            <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(220px,1fr)_auto] gap-4 items-end">
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

                                <div className="flex flex-col">
                                    <label className="text-[10px] text-transparent uppercase tracking-wide mb-1">-</label>
                                    <Button
                                        onClick={handleSubmit(dataSumitter)}
                                        name="Submit"
                                        variant="primary"
                                        className="h-10"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="min-h-0 overflow-auto px-6 pb-6">
                    <div className="mx-auto max-w-7xl rounded-xl border border-slate-200 shadow-lg overflow-hidden backdrop-blur-md bg-white/90 p-6">
                        <div className='' >
                            {
                                DataShowCols && Object.keys(DataSorter).sort((a, b) => DataSorter[a]["sort"] - DataSorter[b]["sort"]).map((ckeyr) => (
                                    <div className='border-2 border-black mx-2 my-4'>
                                        <div style={{ backgroundColor: `${DataSorter[ckeyr]["color"]}` }}>
                                            <h1 className={" flex justify-center p-1 text-white text-sm font-bold"}>{ckeyr}</h1>
                                        </div>
                                        <div className='grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 grid col-span-12 rounded-md'>{
                                            DataSorter[ckeyr]["data"].map((ckey) => (

                                                <>
                                                    {
                                                        DataShowCols[ckey] && AllDataShowing[ckey] &&
                                                        <div className='m-0.5 mt-4 bg-white rounded-sm shadow-lg hover:shadow-2xl shadow-slate-400 shadow-xl'>
                                                            <SiteAnalyticsCard ckeyr={ckeyr} AllDataShowing={AllDataShowing} ckey={ckey} headerName={DataShowCols[ckey]["name"]} variables={DataShowCols[ckey]} />
                                                        </div>
                                                    }
                                                </>
                                            ))

                                        }</div></div>
                                ))

                            }

                        </div>
                    </div>
                </div>
            </div>
        </div>
    </>
};

export default SiteProRules;