import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Table from './Table';
import DPAOneRow from './DPAOneRow';
import WebsocketActions from '../store/actions/websocket-actions';
import { WebSocketUrls } from '../utils/url';

const SiteAnalyticsCard = ({ AllDataShowing, ckey, variables, headerName, ckeyr }) => {

    const dispatch = useDispatch()

    const items = AllDataShowing[ckey] || []

    // Send each KPI to the websocket once when the data for this card changes
    useEffect(() => {
        items.forEach((item) => {
            dispatch(WebsocketActions.send_to_socket(WebSocketUrls.siteAnalytics, item))
        })
    }, [ckey, items.length])

    if (!variables?.["header"]) return null

    const headerGroups = variables["header"]
    const chunkSize = headerGroups.length > 0 ? Math.ceil(items.length / headerGroups.length) : items.length

    return <>
        <div className='w-full bg-secLine text-white rounded-t-sm text-center shadow-md shadow-slate-400'>{headerName}</div>

        <div className='border-[0.5px] border-t-0 rounded-b-sm border-black'>
            {
                headerGroups.map((headerRow, index) => {
                    const slice = items.slice(index * chunkSize, (index + 1) * chunkSize)
                    return <Table key={index} classes={"m-0.1"} commonCols={true} headers={headerRow} columns={
                        slice.map((item) => (
                            <DPAOneRow
                                key={item["code"] + "_" + item["id"]}
                                ckeyr={ckeyr}
                                name={item["kpi_name"]}
                                id={item["code"] + "_" + item["id"]}
                                variables={variables}
                            />
                        ))
                    } />
                })
            }
        </div>
    </>
};

export default SiteAnalyticsCard;
