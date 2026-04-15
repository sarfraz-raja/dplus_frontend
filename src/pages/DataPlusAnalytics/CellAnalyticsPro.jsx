import React, { useEffect, useState } from 'react';
import Table from '../../components/Table';
import DPAOneRow from '../../components/DPAOneRow';
import nokiaPrePostActions from '../../store/actions/nokiaPrePost-actions';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import AutoSuggestion from '../../components/FormElements/AutoSuggestion';
import SelectDropDown from '../../components/FormElements/SelectDropDown';
import DatePicking from '../../components/FormElements/DatePicking';
import WebsocketActions from '../../store/actions/websocket-actions';
import { WebSocketUrls } from '../../utils/url';
import SiteAnalyticsCard from '../../components/SiteAnalyticsCard';
import { cn } from '../../utils/common';
import Button from '../../components/Button';
import { objectToQueryString } from '../../utils/commonFunnction';
import moment from 'moment';


const CellAnalyticsPro = () => {

    const dispatch = useDispatch()

    const [datew, setdatew] = useState(0)



    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    const urlUniqueId = params.get('uniqueId');

    const {
        register,
        handleSubmit,
        watch,
        reset,
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
        return state?.nokiaPrePost?.uniqueCellId
    })




    let DataShowCols = useSelector((state) => {
        return state?.nokiaPrePost?.showCols
    })




    let common_socket = useSelector((state) => {
        return state?.websocket?.socket_setup
    })



    const dataSumitter = (data) => {
        console.log(data, "dataSumitterdataSumitter")
        dispatch(nokiaPrePostActions.getcellnetworkanalyticspro(true, objectToQueryString(data), () => {
            setdatew(prev => prev + 1)
        }))
    }


    let dataCols = {
        "5G PM KPI Check": ["KPI", "Pre", "Post", "Delta"],
        "4G PM KPI Check": ["KPI", "Pre", "Post", "Delta"],
        "3G PM KPI Check": ["KPI", "Pre", "Post", "Delta"],
        "2G PM KPI Check": ["KPI", "Pre", "Post", "Delta"],
        "5G PCI Check": ["Site ID", "Issue", "<1 KM", "1-5 KM", ">5KM"],
        "4G PCI Check": ["Site ID", "Issue", "<1 KM", "1-5 KM", ">5KM"],
        "3G PSC Check": ["Site ID", "Issue", "<1 KM", "1-5 KM", ">5KM"],
        "2G BCCH Check": ["Site ID", "Issue", "<1 KM", "1-5 KM", ">5KM"]
    }




    for (let key in AllDataShowing) {

        // console.log(key, AllDataShowing[key], "keykeykeykey")

        let dataInner = AllDataShowing[key]
        // for (let innerkey in dataInner) {
        //     console.log(innerkey, dataInner[innerkey], "keykeykeykey")
        // }
        // if (AllDataShowing.hasOwnProperty(key)) {
        //     console.log(`${key}: ${AllDataShowing[key]}`,"AllDataShowing");
        // }
    }


    useEffect(() => {

        if (datew == 0) {

            if (urlUniqueId != null) {

                const twoDaysAgo = moment().subtract(2, 'days');
                const twoDaysAgoformattedDate = twoDaysAgo.format('YYYY-MM-DD');

                const oneDaysAgo = moment().subtract(1, 'days');
                const oneDaysAgoformattedDate = oneDaysAgo.format('YYYY-MM-DD');

                console.log(twoDaysAgoformattedDate, "twoDaysAgoformattedDate")
                console.log(oneDaysAgoformattedDate, "oneDaysAgoformattedDate")


                setValue("fr_pre_date",twoDaysAgo)
                setValue("fr_post_date",oneDaysAgo)
                let datuewa = {
                    fr_phy_id: urlUniqueId,
                    fr_pre_date: twoDaysAgoformattedDate,
                    fr_post_date: oneDaysAgoformattedDate
                }

                dispatch(nokiaPrePostActions.getcellnetworkanalyticspro(true, objectToQueryString(datuewa), () => { }));
            } else {
                dispatch(nokiaPrePostActions.getcellnetworkanalyticspro())
            }
        }

    }, [datew])

    let idSelector = [
        { label: "Select Cell ID", name: "fr_phy_id", value: "Select", type: "text", datalist: "listData",defaultValue:urlUniqueId, option: uniquePhysicalIdList, props: {
            onChange: (e) => {
                console.log("Select Cell ID",e.target.value)

                if(e.target.value.length>=5){
                    console.log("Select Cell ID", e.target.value)
                    dispatch(nokiaPrePostActions.getuniquecellid(true,"getData="+e.target.value))
                }

            // dispatch(nokiaPrePostActions.getuniquecellid())
            }
        }, required: true, },
        { label: "Pre Date", name: "fr_pre_date", type: "datetime", formattype: "date", format: "yyyy-MM-dd", formatop: "yyyy-MM-DD", required: true },
        { label: "Post Date", name: "fr_post_date", type: "datetime", formattype: "date", format: "yyyy-MM-dd", formatop: "yyyy-MM-DD", required: true }
    ]
    return <>
    <div className="flex-1 w-full h-full p-2">
        <div className='p-2'>
            {/* <div className=' bg-secLine text-white text-2xl text-center'><h1>Site Analytics</h1></div> */}
            <div className=' text-black text-2xl text-center flex flex-col sm:flex-row'>
                {/* {
                    idSelector
                } */}
                <div className='flex '>

                        <label className="block text-sm font-medium text-black whitespace-nowrap dark:text-black  py-2 pl-1 w-48">{idSelector[0]["label"]}</label>
                        <AutoSuggestion itm={idSelector[0]} errors={errors} handleSubmit={handleSubmit} setValue={setValue} getValues={getValues} register={register} />
                </div>

                <div className='flex '>
                    <label className="block text-sm font-medium text-black whitespace-nowrap dark:text-black  py-2 pl-1 w-48">{idSelector[1]["label"]}</label>
                    <DatePicking itm={idSelector[1]} errors={errors} handleSubmit={handleSubmit} setValue={setValue} getValues={getValues} register={register} />
                </div>
                <div className='flex '>
                    <label className="block text-sm font-medium text-black whitespace-nowrap dark:text-black py-2 pl-1 w-48">{idSelector[2]["label"]}</label>
                    <DatePicking itm={idSelector[2]} errors={errors} handleSubmit={handleSubmit} setValue={setValue} getValues={getValues} register={register} />
                </div>
                <div className='flex '>
                    {/* <label className="block text-sm font-medium text-black whitespace-nowrap dark:text-black py-2 pl-1 w-48">{idSelector[2]["label"]}</label> */}
                    <Button className='ml-8' name='Submit' variant='primary' onClick={handleSubmit(dataSumitter)} />
                </div>
            </div>


            <div class=" bg-white mt-8 rounded-md">
                <div className='' >
                    {
                        Object.keys(DataSorter).sort((a, b) => DataSorter[a]["sort"] - DataSorter[b]["sort"]).map((ckeyr) => {

                            let colorName = `${DataSorter[ckeyr]["color"]}  "flex justify-center p-1 text-white"`

                            return <div className='border-2 border-black mx-2 my-4'>
                                <div style={{ backgroundColor: `${DataSorter[ckeyr]["color"]}` }} className={`${DataSorter[ckeyr]["color"]}`}>
                                    <h1 className={" flex justify-center p-1 text-white text-sm font-bold"}>{ckeyr}</h1>
                                </div>
                                {/* {console.log(DataSorter, ckeyr, "DataShowCols,ckey")} */}
                                <div className='grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 grid col-span-12 rounded-md'>{
                                    DataSorter[ckeyr]["data"].map((ckey) => (

                                        <>
                                            {/* {console.log(DataShowCols, ckey, "DataShowCols,ckey")} */}
                                            {/* <div className='col-span-12 grid grid-cols-1 m-2 mt-4 md:grid-cols-2 xs:grid-cols-1 sm:grid-cols-4' > */}
                                            {/* <div className=''> */}
                                            {
                                                //  ["5G", "4G", "3G", "2G"].map((innerkey) => {
                                                // //     console.log(AllDataShowing,innerkey,ckey,"AllDataShowing")
                                                //     return <>

                                                <div className='m-0.5 mt-4 bg-white rounded-sm shadow-lg hover:shadow-2xl shadow-slate-400 shadow-xl'>
                                                    <SiteAnalyticsCard ckeyr={ckeyr} AllDataShowing={AllDataShowing} innerkey={"innerkey"} ckey={ckey} headerName={DataShowCols[ckey]["name"]} fetchBackend={true} headers={dataCols[ckey]} variables={DataShowCols[ckey]} />
                                                    {/* <SiteAnalyticsCard AllDataShowing={AllDataShowing} innerkey={"innerkey"} ckey={ckey} fetchBackend={false} headers={["Site ID", "Issue", "<1 KM", "1-5 KM",">5KM"]} /> */}
                                                </div>
                                                //     </>
                                                //     })
                                            }
                                            {/* {
                                    ["6G", "4G", "3G", "2G"].map((innerkey) => {
                                        console.log(AllDataShowing,innerkey,ckey,"AllDataShowing")
                                        return <>
                                            <SiteAnalyticsCard AllDataShowing={AllDataShowing} innerkey={innerkey} ckey={ckey} fetchBackend={false}/>
                                        </>
                                    })
                                } */}



                                            {/* </div> */}
                                        </>
                                    ))

                                }</div></div>
                        })

                    }

                </div>




            </div>
        </div>
        </div>
    </>
};

export default CellAnalyticsPro;
