import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import moment from 'moment';
import nokiaPrePostActions from '../../store/actions/nokiaPrePost-actions';
import WebsocketActions from '../../store/actions/websocket-actions';
import AdminManagementActions from '../../store/actions/adminManagement-actions';
import { WebSocketUrls } from '../../utils/url';
import AutoSuggestion from '../../components/FormElements/AutoSuggestion';
import DatePicking from '../../components/FormElements/DatePicking';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import DataTable from '../../components/DataTable';
import ProRulesForm from '../ProRules/ProRulesForm';
import { GET_PRO_RULES_OUTPUT } from '../../store/reducers/nokiaPrePost-reducer';

const COLUMNS = [
    { label: 'Technology', key: 'technology' },
    { label: 'Rule Name',  key: 'rule_name'  },
    { label: 'Detail',     key: '_detail'    },
    { label: 'Issues',     key: '_issues'    },
    { label: 'Actions',    key: '_actions'   },
];

const SiteProRulesOutputPage = () => {
    const dispatch = useDispatch();

    const url         = new URL(window.location.href);
    const params      = new URLSearchParams(url.search);
    const urlUniqueId = params.get('uniqueId');

    const [modalOpen,   setModalOpen]   = useState(false);
    const [modalBody,   setModalBody]   = useState(null);
    const [modalHead,   setModalHead]   = useState('');
    const [socketSent,  setSocketSent]  = useState(false);

    const { register, handleSubmit, setValue, getValues, formState: { errors } } = useForm();

    const uniquePhysicalIdList = useSelector((s) => s?.nokiaPrePost?.uniquePhysicalId);
    const socketData           = useSelector((s) => s?.websocket?.data_from_socket ?? {});
    const rawRules             = useSelector((s) => s?.nokiaPrePost?.proRulesOutput ?? []);

    useEffect(() => {
        dispatch(nokiaPrePostActions.getuniquephysicalid());

        if (urlUniqueId) {
            const yesterday          = moment().subtract(1, 'days');
            const yesterdayFormatted = yesterday.format('YYYY-MM-DD');
            setValue('fr_pre_date', yesterday);
            dispatch(nokiaPrePostActions.ProRulesOutput(
                { fr_phy_id: urlUniqueId, fr_pre_date: yesterdayFormatted },
                true,
                () => {}
            ));
        }
    }, []);

    // Fire WebSocket for each rule once rules arrive
    useEffect(() => {
        if (!socketSent && rawRules.length > 0) {
            setSocketSent(true);
            rawRules.forEach((itm) => {
                dispatch(WebsocketActions.send_to_socket(
                    WebSocketUrls.proRules,
                    { ...itm, Code: itm.technology },
                    itm.technology + '_' + itm.id
                ));
            });
        }
    }, [rawRules, socketSent]);

    const onSubmit = (data) => {
        setSocketSent(false);
        dispatch(GET_PRO_RULES_OUTPUT({ dataAll: [], reset: true }));
        dispatch(nokiaPrePostActions.ProRulesOutput(data, true, () => {}));
    };

    const openEdit = (itm) => {
        dispatch(AdminManagementActions.getUsersList());
        setModalHead('Edit Pro Rule');
        setModalBody(<ProRulesForm isOpen={true} setIsOpen={setModalOpen} resetting={false} formValue={itm} />);
        setModalOpen(true);
    };

    const siteIdSelector = {
        label: 'Select Physical ID',
        name: 'fr_phy_id',
        value: 'Select',
        type: 'text',
        datalist: 'listData',
        defaultValue: urlUniqueId,
        option: uniquePhysicalIdList,
        props: {
            onChange: (e) => {
                if (e.target.value.length >= 2)
                    dispatch(nokiaPrePostActions.getuniquephysicalid(true, 'getData=' + e.target.value));
            },
        },
        required: true,
    };

    const dateSelector = {
        label: 'Date',
        name: 'fr_pre_date',
        type: 'datetime',
        formattype: 'date',
        format: 'yyyy-MM-dd',
        formatop: 'yyyy-MM-DD',
        required: true,
    };

    const renderCell = (row, col) => {
        const socketKey = row.technology + '_' + row.id;
        const entry     = socketData[socketKey];

        if (col.key === '_detail') {
            if (!entry) return <span className="text-slate-400 text-xs italic">Processing…</span>;
            const val   = entry.data?.[0]?.ValueAvg;
            const color = entry.data?.[0]?.Colour || '#374151';
            return (
                <span
                    className="text-xs font-semibold cursor-pointer"
                    style={{ color }}
                    onClick={() => {
                        setModalHead('Detail');
                        setModalBody(<pre className="text-xs p-2">{JSON.stringify(entry, null, 2)}</pre>);
                        setModalOpen(true);
                    }}
                >{val ?? '—'}</span>
            );
        }

        if (col.key === '_issues') {
            if (!entry) return <span className="text-slate-400 text-xs italic">Processing…</span>;
            const val   = entry.data?.[0]?.Issues;
            const color = entry.data?.[0]?.IssuesColor || '#374151';
            return (
                <span
                    className="text-xs font-semibold cursor-pointer"
                    style={{ color }}
                    onClick={() => {
                        setModalHead('Issues');
                        setModalBody(<pre className="text-xs p-2">{JSON.stringify(entry, null, 2)}</pre>);
                        setModalOpen(true);
                    }}
                >{val ?? '—'}</span>
            );
        }

        if (col.key === '_actions') return (
            <button
                onClick={() => openEdit(row)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
            </button>
        );

        const val = row[col.key];
        return <span className="truncate max-w-[200px] block text-slate-700" title={String(val ?? '')}>{val}</span>;
    };

    return (
        <>
            <div
                className="flex flex-col h-[calc(100vh-4rem)] p-5 gap-4"
                style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 50%, #fef3c7 100%)' }}
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0"
                            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                <polyline points="9 22 9 12 15 12 15 22"/>
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 leading-tight">Site Pro Rules</h1>
                            <p className="text-xs text-slate-400 font-medium tracking-wide">Real-time rule output per site</p>
                        </div>
                    </div>

                    {/* ── Form controls ── */}
                    <div className="flex items-end gap-3">
                        <div className="flex flex-col">
                            <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Physical ID</label>
                            <AutoSuggestion itm={siteIdSelector} errors={errors} handleSubmit={handleSubmit} setValue={setValue} getValues={getValues} register={register} />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Date</label>
                            <DatePicking itm={dateSelector} errors={errors} handleSubmit={handleSubmit} setValue={setValue} getValues={getValues} register={register} />
                        </div>
                        <Button onClick={handleSubmit(onSubmit)} name="Run" variant="primary" className="h-9" />
                    </div>
                </div>

                {/* ── DataTable ── */}
                <DataTable
                    columns={COLUMNS}
                    data={rawRules}
                    renderCell={renderCell}
                    emptyMessage="Enter a Physical ID and date, then click Run."
                    searchPlaceholder="Search rules…"
                    countLabel="rule"
                />
            </div>

            <Modal size="form" modalHead={modalHead} isOpen={modalOpen} setIsOpen={setModalOpen}>
                {modalBody}
            </Modal>
        </>
    );
};

export default SiteProRulesOutputPage;
