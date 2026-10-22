// import React, { useEffect, useState } from 'react';
// import CommonForm from '../../components/CommonForm';
// import { useForm } from 'react-hook-form';
// import Table from '../../components/Table';
// import Modal from '../../components/Modal';

// import * as Unicons from '@iconscout/react-unicons';
// import { useDispatch, useSelector } from 'react-redux';
// import CustomQueryActions from '../../store/actions/customQuery-actions';
// import Button from '../../components/Button';
// import AdvancedTable from '../../components/AdvancedTable';
// import DBConfigForm from './DBConfigForm';
// import EditButton from '../../components/EditButton';
// import DeleteButton from '../../components/DeleteButton';
// import { ALERTS } from '../../store/reducers/component-reducer';
// import CommonActions from '../../store/actions/common-actions';
// import { Urls } from '../../utils/url';
// import { reset } from 'ol/transform';
// import CstmButton from '../../components/CstmButton';
// const DBConfig = () => {


//     const [modalOpen, setmodalOpen] = useState(false)
//     const [modalBody, setmodalBody] = useState(false)



//     let dispatch = useDispatch()
//     let userList = useSelector((state) => {
//         console.log(state, "state state")
//         return state?.customQuery?.usersList
//     })



//     let dbConfigTotalCount = useSelector((state) => {
//         let interdata = state?.customQuery?.dbConfigList

//         if(interdata.length>0){
//             return interdata[0]["overall_table_count"]
//         }else{
//             return 0
//         }
//     })
//     let dbConfigList = useSelector((state) => {
//         console.log(state, "state state")
//         let interdata = state?.customQuery?.dbConfigList

//         return interdata.map((itm) => {
//             let updateditm = {
//                 ...itm,
//                 "edit": <CstmButton child={<EditButton name={""} onClick={() => {

//                     console.log(itm, "itm,dsadsadadada")
//                     setmodalOpen(true)
//                     dispatch(CustomQueryActions.getUserList())
//                     setmodalBody(<>
//                         <DBConfigForm isOpen={modalOpen} setIsOpen={setmodalOpen} resetting={false} formValue={itm} />
//                         {/* <div className='mx-3'><Button name={"Submit"} classes={""} onClick={(handleSubmit(onTableViewSubmit))} /></div> */}
//                     </>)
//                 }}></EditButton>}/>,

//                 "delete": <CstmButton child={<DeleteButton name={""} onClick={() => {
//                     let msgdata = {
//                         show: true,
//                         icon: 'warning',
//                         buttons: [
//                             <Button classes='w-15 bg-green-500' onClick={() => {
//                                 dispatch(CommonActions.deleteApiCaller(`${Urls.querybuilder_DBConfig}/${itm.uniqueId}`, () => {
//                                     dispatch(CustomQueryActions.getDBConfig())
//                                     dispatch(ALERTS({ show: false }))
//                                 }))
//                             }} name={"OK"} />,
//                             <Button classes='w-24' onClick={() => {
//                                 dispatch(ALERTS({ show: false }))
//                             }} name={"Cancel"} />
//                         ],
//                         text: "Are you sure you want to Delete?"
//                     }
//                     dispatch(ALERTS(msgdata))
//                 }}></DeleteButton>}/>
//             }
//             return updateditm
//         });
//     })
//     // let Form = [
//     //     { label: "DB Server", value: "", option: ["Please Select Your DB Server"], type: "select" },
//     //     { label: "Custom Queries", value: "", type: "textarea" }
//     // ]

//     const {
//         register,
//         handleSubmit,
//         watch,
//         setValue,
//         setValues,
//         getValues,
//         formState: { errors },
//     } = useForm()

//     let table = {
//         columns: [
//             {
//                 name: "DB Name",
//                 value: "dbName",
//                 style:""
//             },
//             {
//                 name: "DB Server",
//                 value: "dbServer",
//             },
//             {
//                 name: "DB Type",
//                 value: "dbtype",
//             },
//             {
//                 name: "Username",
//                 value: "username",
//             },
//             {
//                 name: "Password",
//                 value: "password",
//             },
//             {
//                 name: "Port",
//                 value: "port",
//             },
//             {
//                 name: "User",
//                 value: "name",
//             },
//             {
//                 name: "Edit",
//                 value: "edit",
//                 style:"min-w-[100px] max-w-[100px]"
//             },
//             {
//                 name: "Delete",
//                 value: "delete",
//                 style:"min-w-[100px] max-w-[100px]"
//             }
//         ],
//         properties: {
//             rpp: [10, 20, 50, 100]
//         },
//         filter: []
//     }
//     const onSubmit = (data) => {
//         let value = data.reseter
//         delete data.reseter
//         dispatch(CustomQueryActions.getDBConfig(value, objectToQueryString(data)))
//     }
    
//     useEffect(() => {
//         dispatch(CustomQueryActions.getDBConfig())
//     }, [])


//     return <>
//         <AdvancedTable 
//             filterAfter={onSubmit}
//             tableName={"DBConfigList"}
//             headerButton={<><Button onClick={(e) => {
//                 setmodalOpen(prev => !prev)
//                 dispatch(CustomQueryActions.getUserList())
//                 setmodalBody(<DBConfigForm isOpen={modalOpen} setIsOpen={setmodalOpen} resetting={true} formValue={{}} />)
//             }} name={"Add New"}></Button></>} 
//             table={table} 
//             data={dbConfigList} 
//             handleSubmit={handleSubmit}
//             errors={errors} 
//             register={register} 
//             setValue={setValue} 
//             getValues={getValues} 
//             totalCount={dbConfigTotalCount}
//         />

//         <Modal size={"xl"} children={modalBody} isOpen={modalOpen} setIsOpen={setmodalOpen} />

//         {/* <CommonForm/> */}
//     </>


// };

// export default DBConfig;
import { useEffect, useState } from 'react';
import FormModal from '../../components/FormModal';
import ConfirmModal from '../../components/ConfirmModal';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import { useDispatch, useSelector } from 'react-redux';
import CustomQueryActions from '../../store/actions/customQuery-actions';
import DBConfigForm from './DBConfigForm';
import CommonActions from '../../store/actions/common-actions';
import { Urls } from '../../utils/url';
import Api from '../../utils/api';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../../utils/common';
import { PageTitle } from '../../components/FormPage';
import ActionButton from '../../components/ActionButton';

const COLUMNS = [
    { label: 'DB Name',  key: 'dbname' },
    { label: 'Server',   key: 'dbserver' },
    { label: 'Type',     key: 'dbtype' },
    { label: 'Username', key: 'username' },
    { label: 'Port',     key: 'port' },
    { label: 'User',     key: 'name' },
    { label: 'Created',  key: 'create_time' },
    { label: 'Actions',  key: 'actions' },
]

const safeParse = (raw) => {
    if (!raw) return null
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw } catch { return null }
}

const formatDate = (ts) => {
    if (!ts) return '—'
    const d = new Date(ts)
    return Number.isNaN(d.getTime()) ? String(ts) : d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

const TYPE_BADGE = {
    PostgreSQL: 'bg-blue-100 text-blue-700',
    MySQL:      'bg-green-100 text-green-700',
    MSSQL:      'bg-yellow-100 text-yellow-800',
}

const DBConfig = () => {
    const [modalOpen, setmodalOpen] = useState(false)
    const [modalBody, setmodalBody] = useState(null)
    const [modalTitle, setModalTitle] = useState('')
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleting, setDeleting] = useState(false)
    // Search, Columns toggle, count and pagination come from DataTable (this page used to carry its own copy).

    const dispatch = useDispatch()

    const dbConfigList = useSelector((state) => state?.customQuery?.dbConfigList ?? [])

    // Global default database: one DB at a time, Admin-only to set/remove, and the default DB's
    // row is read-only for everyone else (the backend enforces the same — 403 otherwise).
    const authUser = useSelector((state) => state?.auth?.user)
    const rolename = (safeParse(authUser) ?? safeParse(localStorage.getItem('user')))?.rolename
    const isAdmin = String(rolename ?? '').toLowerCase() === 'admin'
    const [defaultBusyId, setDefaultBusyId] = useState(null)

    useEffect(() => {
        dispatch(CustomQueryActions.getDBConfig())
    }, [])

    // POST = set as default (replaces the current one), DELETE = remove default.
    // Every failure (403 not Admin / 404 gone / 400 not assigned to ALL / 409 changed elsewhere)
    // carries a message from the backend, shown as-is; the list is reloaded either way so the
    // page reflects whatever the default is now.
    const changeDefault = async (itm, makeDefault) => {
        if (defaultBusyId) return
        setDefaultBusyId(itm.uniqueid)
        try {
            const url = `${Urls.querybuilder_DBConfig}/${itm.uniqueid}/default`
            const res = makeDefault ? await Api.post({ url, data: {} }) : await Api.delete({ url })
            if (res?.status === 200) {
                toast.success(makeDefault ? `${itm.dbname} is now the default database` : 'Default database removed')
            } else {
                toast.error(getApiErrorMessage(res))
            }
        } catch (err) {
            if (import.meta.env.DEV) console.warn('[db-config] default change failed', err)
            toast.error('Something went wrong, please retry.')
        } finally {
            setDefaultBusyId(null)
            dispatch(CustomQueryActions.getDBConfig())
        }
    }

    const openEdit = (itm) => {
        setmodalOpen(true)
        setModalTitle('Edit DB Configuration')
        dispatch(CustomQueryActions.getUserList())
        setmodalBody(<DBConfigForm setIsOpen={setmodalOpen} resetting={false} formValue={itm} />)
    }

    const openDelete = (itm) => {
        setDeleteTarget(itm)
        setDeleteModalOpen(true)
    }

    // Called directly (not via CommonActions.deleteApiCaller, which returns silently on a rejected
    // delete and would leave this modal stuck on "Deleting…") so a refusal — e.g. 403 "Only Admin
    // can delete the default database" — is shown.
    const confirmDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            const res = await Api.delete({ url: `${Urls.querybuilder_DBConfig}/${deleteTarget.uniqueid}` })
            if ([200, 201, 204].includes(res?.status)) {
                setDeleteModalOpen(false)
                setDeleteTarget(null)
            } else {
                toast.error(getApiErrorMessage(res))
            }
        } catch (err) {
            if (import.meta.env.DEV) console.warn('[db-config] delete failed', err)
            toast.error('Something went wrong, please retry.')
        } finally {
            setDeleting(false)
            dispatch(CustomQueryActions.getDBConfig())
        }
    }

    const renderCell = (itm, col) => {
        if (col.key === 'dbname') return (
            <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <span className="truncate max-w-[140px]" title={itm.dbname}>{itm.dbname}</span>
                {itm.is_default && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200 shrink-0"
                        title="Pre-selected in database dropdowns for all users">
                        DEFAULT
                    </span>
                )}
            </span>
        )
        if (col.key === 'create_time') return <span className="whitespace-nowrap">{formatDate(itm.create_time)}</span>
        if (col.key === 'dbtype') {
            const cls = TYPE_BADGE[itm.dbtype] ?? 'bg-slate-100 text-slate-600'
            return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{itm.dbtype}</span>
        }
        if (col.key === 'actions') {
            // Non-Admin users can't edit or delete the default DB (backend returns 403).
            const lockedForUser = itm.is_default && !isAdmin
            // Admin only; "Set as default" only for DBs assigned to ALL (backend returns 400 otherwise).
            const canSetDefault = isAdmin && !itm.is_default && String(itm.assignment_type ?? '').toUpperCase() === 'ALL'
            const canRemoveDefault = isAdmin && itm.is_default
            const busy = defaultBusyId === itm.uniqueid
            return (
            <span className="flex items-center gap-2">
                {lockedForUser && <span className="text-xs text-slate-400">Read-only (default database)</span>}
                {(canSetDefault || canRemoveDefault) && (
                    <ActionButton tone="accent" onClick={() => changeDefault(itm, canSetDefault)} disabled={!!defaultBusyId}>{busy ? 'Saving…' : canSetDefault ? 'Set as default' : 'Remove default'}</ActionButton>
                )}
                {!lockedForUser && <>
                <ActionButton kind="edit" onClick={() => openEdit(itm)} title="Edit" />
                <ActionButton kind="delete" onClick={() => openDelete(itm)} title="Delete" />
                </>}
            </span>
            )
        }
        const val = itm[col.key]
        return (
            <span className="truncate max-w-[180px] block" title={String(val ?? '')}>
                {val}
            </span>
        )
    }

    return <>
        {/* OLD: h-[calc(100vh-4rem)] — a guessed header height; h-full fits Layout's wrapper exactly (CLAUDE.md §8) */}
        <div className="flex flex-col h-full p-5 gap-4 bg-white overflow-hidden">

            {/* Top header */}
            <div className="flex items-center justify-between shrink-0">
                <PageTitle
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"> <ellipse cx="12" cy="5" rx="9" ry="3"/> <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/> <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/> </svg>}
                    title="DB Configuration"
                    subtitle="Manage database connections"
                />

                <div className="flex items-center gap-2">
                    {/* Add connection */}
                    <Button
                        onClick={() => {
                            setmodalOpen(true)
                            setModalTitle('Add DB Configuration')
                            dispatch(CustomQueryActions.getUserList())
                            setmodalBody(<DBConfigForm setIsOpen={setmodalOpen} resetting={true} formValue={{}} />)
                        }}
                        variant="primary"
                        className="flex items-center gap-2"
                    >
                        + Add connection
                    </Button>
                </div>
            </div>

            {/* Search, Columns, count, table and pagination */}
            <DataTable
                columns={COLUMNS}
                data={dbConfigList}
                renderCell={renderCell}
                rowKey="uniqueid"
                searchPlaceholder="Search connections..."
                countLabel="connection"
                emptyMessage="No connections found."
                rppOptions={[15, 30, 45, 100]}
            />
        </div>

        <FormModal title={modalTitle} isOpen={modalOpen} setIsOpen={setmodalOpen}>
            {modalBody}
        </FormModal>

        {/* Delete confirmation modal */}
        <ConfirmModal
            isOpen={deleteModalOpen}
            tone="danger"
            title="Delete Connection"
            message={<>Delete connection <strong>{deleteTarget?.dbname}</strong>{deleteTarget?.dbserver ? ` (${deleteTarget.dbserver})` : ''}?</>}
            detail="This action cannot be undone."
            confirmLabel="Delete"
            busy={deleting}
            busyLabel="Deleting…"
            onConfirm={confirmDelete}
            onCancel={() => setDeleteModalOpen(false)}
        />
    </>
}

export default DBConfig;
