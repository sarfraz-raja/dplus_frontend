// STALE — lazy-imported in sidebar_values.jsx but never assigned to any route.
// Superseded by DataPlusAnalytics/SiteProRulesOutputPage.jsx and DataPlusAnalytics/CellProRulesPage.jsx.
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Unicons from '@iconscout/react-unicons';
import { useDispatch, useSelector } from 'react-redux';
import CstmButton from '../../components/CstmButton';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import AdvancedTable from '../../components/AdvancedTable';
import AdminManagementActions from '../../store/actions/adminManagement-actions';
import ToggleButton from '../../components/ToggleButton';
import EditButton from '../../components/EditButton';
import DeleteButton from '../../components/DeleteButton';
import FileUploader from '../../components/FIleUploader';
import { Urls, WebSocketUrls } from '../../utils/url';
import nokiaPrePostActions from '../../store/actions/nokiaPrePost-actions';
import ProRulesForm from './ProRulesForm';
import AutoSuggestion from '../../components/FormElements/AutoSuggestion';
import DatePicking from '../../components/FormElements/DatePicking';
import WebsocketActions from '../../store/actions/websocket-actions';
import TableJson from '../../components/TableJson';
import moment from 'moment';
import { GET_PRO_RULES_OUTPUT } from '../../store/reducers/nokiaPrePost-reducer';



const ProRulesQueryOutput = () => {


    const [modalOpen, setmodalOpen] = useState(false)
    const [modalFullOpen, setmodalFullOpen] = useState(false)
    const [fileOpen, setFileOpen] = useState(false)
    const [modalBody, setmodalBody] = useState(<></>)
    const [modalHead, setmodalHead] = useState(<></>)
    const [datalist, setDatalist] = useState([])
    const [socketSent, setSocketSent] = useState(false)


    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    const urlUniqueId = params.get('uniqueId');

    let data_from_socket = useSelector((state) => {
        // console.log(state, "statedsadsadsadsadasdsada")
        let interdata = state?.websocket?.data_from_socket
        return interdata
    })



    let dispatch = useDispatch()

    let dbConfigList = useSelector((state) => {
        console.log(state, "state state")


        let interdata = state?.nokiaPrePost?.proRulesOutput || []

        return interdata.map((itm) => {
            let updateditm = {
                ...itm,


                "status": <CstmButton child={<ToggleButton onChange={(e) => {

                    console.log(e.target.checked, "e.target.checked")

                    let data = {
                        "enabled": e.target.checked ? 1 : 0
                    }
                    dispatch(AlertConfigurationActions.patchAlertConfig(true, data, () => {
                        // alert(e.target.checked)
                        e.target.checked = e.target.checked
                    }, itm.id))

                    // if(itm.enabled==0){
                    //     itm.enabled=1
                    // }else{
                    //     itm.enabled=0
                    // }
                    // itm.enabled=itm.enabled==0?1:0

                    console.log(itm.enabled, "itm.enabled")




                }} defaultChecked={itm.enabled == 1 ? true : false}></ToggleButton>} />,
                "detail": data_from_socket[itm.technology + "_" + itm.id] ? <p onClick={()=>{
                    setmodalFullOpen(true)
                    setmodalBody(<TableJson headers={data_from_socket[itm.technology + "_" + itm.id]["columns"]} columns={data_from_socket[itm.technology + "_" + itm.id]["data"]}/>)
                    
                }} style={{color:data_from_socket[itm.technology + "_" + itm.id]["data"][0]?.["Colour"]}}>{data_from_socket[itm.technology + "_" + itm.id]["data"][0]?.["ValueAvg"]}</p>  : "Processing......",
                "issues": data_from_socket[itm.technology + "_" + itm.id] ? <p onClick={()=>{
                    setmodalFullOpen(true)
                    setmodalBody(<TableJson headers={data_from_socket[itm.technology + "_" + itm.id]["columns"]} columns={data_from_socket[itm.technology + "_" + itm.id]["data"]}/>)
                }} style={{color:data_from_socket[itm.technology + "_" + itm.id]["data"][0]?.["IssuesColor"]}}>{data_from_socket[itm.technology + "_" + itm.id]["data"][0]?.["Issues"]}</p>  : "Processing......",
                "edit": <CstmButton child={<EditButton name={""} onClick={() => {

                    console.log(itm, "itm,dsadsadadada")
                    setmodalOpen(true)
                    dispatch(AdminManagementActions.getUsersList())
                    setmodalHead("Edit Pro Rules")
                    setmodalBody(<>
                        <ProRulesForm isOpen={modalOpen} setIsOpen={setmodalOpen} resetting={false} formValue={itm} />
                        {/* <div className='mx-3'><Button name={"Submit"} classes={""} onClick={(handleSubmit(onTableViewSubmit))} /></div> */}
                    </>)
                }}></EditButton>} />,


                "delete": <CstmButton child={<DeleteButton name={""} onClick={() => {
                    let msgdata = {
                        show: true,
                        icon: 'warning',
                        buttons: [
                            <Button classes='w-15 bg-green-500' onClick={() => {
                                dispatch(CommonActions.deleteApiCaller(`${Urls.alertConfiguration_configureAlert}/${itm.uniqueId}`, () => {
                                    dispatch(CustomQueryActions.getDBConfig())
                                    dispatch(ALERTS({ show: false }))
                                }))
                            }} name={"OK"} />,
                            <Button classes='w-24' onClick={() => {
                                dispatch(ALERTS({ show: false }))
                            }} name={"Cancel"} />
                        ],
                        text: "Are you sure you want to Delete?"
                    }
                    dispatch(ALERTS(msgdata))
                }}></DeleteButton>} />
            }
            return updateditm
        });

    })



    let dbConfigTotalCount = useSelector((state) => {
        let interdata = state?.nokiaPrePost?.proRulesOutput

        if (interdata && interdata.length > 0) {
            return interdata[0]["overall_table_count"]
        } else {
            return 0
        }
    })

    useEffect(() => {
        if (!socketSent && dbConfigList && dbConfigList.length > 0) {
            setSocketSent(true)
            dbConfigList.forEach((itm) => {
                dispatch(WebsocketActions.send_to_socket(WebSocketUrls.proRules, {
                    ...itm,
                    Code: itm.technology
                }, itm.technology + "_" + itm.id))
            })
        }
    }, [dbConfigList, socketSent, dispatch])

    // let Form = [
    //     { label: "DB Server", value: "", option: ["Please Select Your DB Server"], type: "select" },
    //     { label: "Custom Queries", value: "", type: "textarea" }
    // ]

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        setValues,
        getValues,
        formState: { errors },
    } = useForm()

    let table = {
        columns: [
            {
                name: "Technology",
                value: "technology",
                style: "min-w-[250px] max-w-[250px]"
            },
            {
                name: "Rule Name",
                value: "rule_name",
                style: "min-w-[250px] max-w-[250px]"
            },
            {
                name: "Detail",
                value: "detail",
                style: "min-w-[250px] max-w-[250px]"
            },
            {
                name: "Issues",
                value: "issues",
                style: "min-w-[250px] max-w-[250px]"
            }
        ],
        properties: {
            rpp: [10, 20, 50, 100]
        },
        filter: [
            // {
            //     label: "Role",
            //     type: "select",
            //     name: "rolename",
            //     option: roleList,
            //     props: {

            //     }
            // }
        ]
    }


    const onSubmit = (data) => {
        let value = data.reseter
        delete data.reseter
        dispatch(nokiaPrePostActions.getProRules(value, objectToQueryString(data)))
    }


    let uniquePhysicalIdList = useSelector((state) => {
        return state?.nokiaPrePost?.uniquePhysicalId
    })


    const hitDatatoGetOutput = (data) => {
        console.log(data, "hitDatatoGetOutputdatadata")

        dispatch(GET_PRO_RULES_OUTPUT({ dataAll: [], reset: true }));
        dispatch(nokiaPrePostActions.ProRulesOutput(data, true, () => {
            // Keep modal closed on submit; table is rendered directly below.
            setmodalOpen(false)
        }))
    }
    const onTableViewSubmit = (data) => {
        console.log(data, "datadata")




        // dasdsadsadasdas
        dispatch(nokiaPrePostActions.postSubmit(Urls.PrePostBulkUpload, data, () => {
            setFileOpen(false)

            dispatch(nokiaPrePostActions.getnokiaprepost())
        }))



    }


    let dsadsa = 0

    useEffect(() => {

        if(urlUniqueId!=null){
            const twoDaysAgo = moment().subtract(2, 'days');
            const twoDaysAgoformattedDate = twoDaysAgo.format('YYYY-MM-DD');

            const oneDaysAgo = moment().subtract(1, 'days');
            const oneDaysAgoformattedDate = oneDaysAgo.format('YYYY-MM-DD');

            console.log(twoDaysAgoformattedDate, "twoDaysAgoformattedDate")
            console.log(oneDaysAgoformattedDate, "oneDaysAgoformattedDate")

            setValue("fr_pre_date",oneDaysAgo)
            let datuewa = {
                fr_phy_id: urlUniqueId,
                fr_pre_date: oneDaysAgoformattedDate
            }

            dispatch(nokiaPrePostActions.ProRulesOutput(datuewa, true, () => {}))
        }
        dispatch(nokiaPrePostActions.getuniquephysicalid())
    }, [dsadsa])


    let idSelector = [
        { label: "Select Physical ID", name: "fr_phy_id", value: "Select", type: "text", datalist: "listData",defaultValue:urlUniqueId, option: uniquePhysicalIdList, props: "", required: true, },
        { label: "Date", name: "fr_pre_date", type: "datetime", formattype: "date", format: "yyyy-MM-dd", formatop: "yyyy-MM-DD", required: true },
        { label: "Post Date", name: "fr_post_date", type: "datetime", formattype: "date", format: "yyyy-MM-dd", formatop: "yyyy-MM-DD", required: true }
    ]


    console.log(datalist, "dbConfigListdbConfigList")

    return (
        <div className="w-full min-h-full bg-slate-50">
            <div className="flex flex-col min-h-full" style={{ background: '#ffffff' }}>
                <div className="px-6 py-6">
                    <div className="mx-auto max-w-7xl space-y-6">
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M7 15l5-5 5 5" />
                                            <path d="M12 20V4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-slate-900">Site Pro Rules</h1>
                                        <p className="text-sm text-slate-500">Query site rule outputs with the same clean page layout used by Cell Pro Rules.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5">
                                <div className="grid grid-cols-1 md:grid-cols-[minmax(240px,1fr)_minmax(240px,1fr)_minmax(240px,1fr)_auto] gap-4 items-end">
                                    <div className="flex flex-col min-w-0">
                                        <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">{idSelector[0].label}</label>
                                        <AutoSuggestion itm={idSelector[0]} errors={errors} handleSubmit={handleSubmit} setValue={setValue} getValues={getValues} register={register} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">{idSelector[1].label}</label>
                                        <DatePicking itm={idSelector[1]} errors={errors} handleSubmit={handleSubmit} setValue={setValue} getValues={getValues} register={register} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">{idSelector[2].label}</label>
                                        <DatePicking itm={idSelector[2]} errors={errors} handleSubmit={handleSubmit} setValue={setValue} getValues={getValues} register={register} />
                                    </div>
                                    <div className="flex items-end justify-end min-w-0">
                                        <Button classes="w-full md:w-auto" name={dbConfigList && dbConfigList.length > 0 ? "Submit" : "Filter"} onClick={handleSubmit(hitDatatoGetOutput)} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {dbConfigList && dbConfigList.length > 0 && (
                            <div className="min-h-0 overflow-auto px-0 pb-0">
                                <div className="mx-auto max-w-7xl rounded-xl border border-slate-200 shadow-lg overflow-hidden backdrop-blur-md bg-white/90 p-6">
                                    <AdvancedTable
                                        showHeaderRight={false}
                                        headerRightButton={<></>}
                                        headerButton={<></>}
                                        table={table}
                                        filterAfter={onSubmit}
                                        tableName={"UserListTable"}
                                        handleSubmit={handleSubmit}
                                        data={dbConfigList}
                                        errors={errors}
                                        register={register}
                                        setValue={setValue}
                                        getValues={getValues}
                                        totalCount={dbConfigTotalCount}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <FileUploader fileUploadUrl={Urls.PrePostBulkUpload} isOpen={fileOpen} onTableViewSubmit={onTableViewSubmit} setIsOpen={setFileOpen} />
            <Modal size={"xl"} modalHead={modalHead} children={modalBody} isOpen={modalOpen} setIsOpen={setmodalOpen} />
            <Modal size={"xl"} modalHead={modalHead} children={modalBody} isOpen={modalFullOpen} setIsOpen={setmodalFullOpen} />
        </div>
    );
};

export default ProRulesQueryOutput;
