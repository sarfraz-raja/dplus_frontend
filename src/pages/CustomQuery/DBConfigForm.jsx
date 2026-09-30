// import React, { useEffect, useState } from 'react';
// import CommonForm from '../../components/CommonForm';
// import { useForm } from 'react-hook-form';
// import Table from '../../components/Table';
// import Modal from '../../components/Modal';

// import * as Unicons from '@iconscout/react-unicons';
// import { useDispatch, useSelector } from 'react-redux';
// import CustomQueryActions from '../../store/actions/customQuery-actions';
// import Button from '../../components/Button';
// const DBConfigForm = ({ isOpen, setIsOpen, resetting, formValue = {} }) => {

//     console.log(isOpen, setIsOpen, resetting, formValue, "formValueformValue")

//     const [modalOpen, setmodalOpen] = useState(false)


//     let dispatch = useDispatch()
//     let userList = useSelector((state) => {
//         console.log(state, "state state")
//         return state?.customQuery?.usersList
//     })
//     // let Form = [
//     //     { label: "DB Server", value: "", option: ["Please Select Your DB Server"], type: "select" },
//     //     { label: "Custom Queries", value: "", type: "textarea" }
//     // ]
//     let Form = [
//         { label: "DB Type", name: "dbtype", value: "name", type: "select", option: [{ "label": "MSSQL", "value": "MSSQL" }, { "label": "MySQL", "value": "MySQL" }, { "label": "PostgreSQL", "value": "PostgreSQL" }], props: "", required: true, },
//         { label: "DB Server", name: "dbServer", value: "name", type: "text", props: "", required: true },
//         { label: "DB Name", name: "dbName", value: "name", type: "text", props: "", required: true },
//         { label: "Username", name: "username", value: "name", type: "text", props: "", required: true },
//         { label: "Password", name: "password", value: "name", type: "password", props: "", required: true },
//         { label: "Port", name: "port", value: "name", type: "text", props: "", required: true },
//         {
//             label: "Users",
//             value: "",
//             name: "userId",
//             option: userList,
//             type: "select",
//             required: true,
//             displayValue: "label",
//             props: {
//                 // valueAsNumber: true,
//                 // onChange: ((e) => {
//                 //     setValue("userId",+e.target.value)
//                 // }),
//             },
//             classes: "col-span-1"
//         },
//         // { label: "User", value: "", option: ["User Name"], type: "select" }
//     ]

//     const {
//         register,
//         handleSubmit,
//         watch,
//         reset,
//         setValue,
//         getValues,
//         formState: { errors },
//     } = useForm()

//     const onSubmit = (data) => {
//         console.log(data)
//         // dispatch(AuthActions.signIn(data, () => {
//         //     navigate('/authenticate')
//         // }))

//     }

//     const onTableViewTest = (data) => {
//         console.log(data, "datadata")
//         dispatch(CustomQueryActions.testDBConfig(true, data, () => {
            
//             }))
//         }

//     const onTableViewSubmit = (data) => {
//         console.log(data, "datadata")

//         if (data.uniqueId) {
//             delete data.name
//             dispatch(CustomQueryActions.postDBConfig(true, data, () => {
//                 console.log("CustomQueryActions.postDBConfig")
//                 setIsOpen(false)
//                 dispatch(CustomQueryActions.getDBConfig())
//             }, data.uniqueId))
//         } else {
//             dispatch(CustomQueryActions.postDBConfig(true, data, () => {
//                 console.log("CustomQueryActions.postDBConfig")
//                 setIsOpen(false)
//                 dispatch(CustomQueryActions.getDBConfig())
//             }))
//         }


//     }





//     console.log(Form, "Form 11")



//     useEffect(() => {

//         if (resetting) {
//             reset({})
//             Form.map((fieldName) => {
//                 setValue(fieldName["name"], "");
//             });
//         } else {
//             reset({})
//             Object.keys(formValue).forEach((key) => {
//                 setValue(key, formValue[key]);
//             })
//         }
//     }, [formValue, resetting])
//     return <>


//         <Modal size={"xl"} children={<><CommonForm classes={"grid-cols-1 gap-1"} Form={Form} errors={errors} register={register} setValue={setValue} getValues={getValues} /></>} isOpen={modalOpen} setIsOpen={setmodalOpen} />

//         <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">

//             <CommonForm classes={"grid-cols-1 gap-1"} Form={Form} errors={errors} register={register} setValue={setValue} getValues={getValues} />
//             {/* <button></button> */}


//             {/* <button onClick={() => { setmodalOpen(true) }} className='flex bg-primaryLine mt-6 w-42 absolute right-1 top-1 justify-center rounded-md bg-pbutton px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bg-pbutton'>Add DB Type <Unicons.UilPlus /></button> */}
//             {/* <Table headers={["S.No.", "DB Type", "DB Server", "DB Name", "Created By", "Created Date", "Last Modified By", "Last Modified Date", "Actions"]} columns={[["1", "abcd", "ancd", "abcd", "ancd"], ["2", "adsa", "dasdas", "abcd", "ancd"]]} /> */}
//             {/* <button onClick={(handleSubmit(onTableViewSubmit))} className='bg-primaryLine mt-6 w-full justify-center rounded-md bg-pbutton px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bg-pbutton'>Submit</button> */}
//             <div className='flex'>
//                 <Button classes={"mt-2 mr-4"} onClick={(handleSubmit(onTableViewTest))} name="Test" />
//                 <Button classes={"mt-2 ml-4"} onClick={(handleSubmit(onTableViewSubmit))} name="Submit" />
//             </div>

            
//         </div>
//     </>


// };

// export default DBConfigForm;
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import CustomQueryActions from '../../store/actions/customQuery-actions';
import GroupManagementActions from '../../store/actions/groupManagement-actions';
import FormModal from '../../components/FormModal';

const inputCls = "w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400";
const labelCls = "block text-xs text-slate-500 uppercase tracking-wide mb-1";
const errorCls = "text-xs text-red-500 mt-0.5";

const ASSIGNMENT_TYPES = [
    { value: 'SELF', label: 'Self' },
    { value: 'ALL', label: 'All' },
    { value: 'GROUP', label: 'Group' },
    { value: 'USER', label: 'User' },
];

const DBConfigForm = ({ setIsOpen, resetting, formValue = {} }) => {

    const dispatch = useDispatch()
    const userList = useSelector((state) => state?.customQuery?.usersList)
    // state.auth.user may be the object or its JSON string (same handling as Navigation.jsx).
    const authUser = useSelector((state) => state?.auth?.user)
    const currentUser = (() => {
        const parse = (raw) => { try { return typeof raw === 'string' ? JSON.parse(raw) : raw } catch { return null } }
        return parse(authUser) ?? parse(localStorage.getItem('user'))
    })()
    const currentUserId = currentUser?.id ?? null
    const isAdmin = String(currentUser?.rolename ?? '').toLowerCase() === 'admin'
    // Editing the connection that is currently the global default (set on the DB Config page).
    const isDefaultDb = !resetting && !!formValue?.is_default
    const [confirmBlankPassword, setConfirmBlankPassword] = useState(null)
    const [assignType, setAssignType] = useState('SELF') // SELF | ALL | GROUP | USER
    const [groupId, setGroupId] = useState('')
    const [userId, setUserId] = useState('')
    const [groupList, setGroupList] = useState([])

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm()

    useEffect(() => {
        dispatch(GroupManagementActions.getGroups((data) => {
            setGroupList((data ?? []).map((g) => ({ value: g.id, label: g.group_name })))
        }))
    }, [])

    useEffect(() => {
        reset({})
        setAssignType('SELF')
        setGroupId('')
        setUserId('')
        if (!resetting) {
            Object.keys(formValue).forEach((key) => {
                if (key === 'password') return
                setValue(key, formValue[key])
            })
            // API never returns the real password (masked as "********"), so leave it blank on edit
            setValue('password', '')
            // Visibility follows the same SELF/ALL/GROUP/USER scheme as the Alert Scheduler,
            // so a server assigned to a group/all is still selectable by every member — not
            // just the single owner who created it. Fall back to the legacy single userId
            // field (still USER-scoped) for records saved before this rework.
            const incomingType = (formValue.assignment_type || '').toUpperCase()
            const legacyUserId = formValue.userId ?? formValue.userid ?? formValue.user_id
            if (incomingType === 'USER' && formValue.assigned_user_id) {
                setAssignType('USER')
                setUserId(formValue.assigned_user_id)
            } else if (incomingType === 'GROUP' && formValue.group_id) {
                setAssignType('GROUP')
                setGroupId(formValue.group_id)
            } else if (incomingType === 'ALL') {
                setAssignType('ALL')
            } else if (incomingType === 'SELF') {
                setAssignType('SELF')
            } else if (formValue.group_id) {
                setAssignType('GROUP')
                setGroupId(formValue.group_id)
            } else if (legacyUserId) {
                setAssignType('USER')
                setUserId(legacyUserId)
            } else if (formValue.name && userList?.length) {
                const match = userList.find((u) => u.label === formValue.name)
                if (match) {
                    setAssignType('USER')
                    setUserId(match.value)
                }
            }
        }
    }, [formValue, resetting, userList])

    const applyAssignment = (data) => {
        // The edit form is filled from the list row, so read-only columns the list returns would be
        // sent back on save. The backend writes every key it receives into web.dbConfig, so
        // create_time (a display string) crashed the update with a 500; is_default is only ever
        // changed through the /default endpoint.
        delete data.create_time
        delete data.is_default
        data.assignment_type = assignType
        data.group_id = assignType === 'GROUP' ? groupId : null
        data.assigned_user_id = assignType === 'USER' ? userId : null
        // userId is the connection's owner, and both backend list queries INNER JOIN web.Users on it —
        // a connection saved with userId = null drops out of the DB Config list AND every database
        // dropdown. So it is never sent as null:
        //   USER          → the chosen user (keeps legacy single-owner consumers working)
        //   everything else, new connection → the current user (the backend only fills it for SELF)
        //   everything else, edit           → not sent, so the existing owner is left untouched
        if (assignType === 'USER') {
            data.userId = userId
        } else if (resetting && currentUserId) {
            data.userId = currentUserId
        } else {
            delete data.userId
        }
        return data
    }

    const onTableViewTest = (data) => {
        dispatch(CustomQueryActions.testDBConfig(true, applyAssignment(data), () => {}))
    }

    const submitConfig = (data) => {
        data = applyAssignment(data)
        if (data.uniqueid) {
            delete data.name
            dispatch(CustomQueryActions.postDBConfig(true, data, () => {
                setIsOpen(false)
                dispatch(CustomQueryActions.getDBConfig())
            }, data.uniqueid))
        } else {
            dispatch(CustomQueryActions.postDBConfig(true, data, () => {
                setIsOpen(false)
                dispatch(CustomQueryActions.getDBConfig())
            }))
        }
    }

    const onTableViewSubmit = (data) => {
        if (data.uniqueid && !data.password) {
            setConfirmBlankPassword(data)
            return
        }
        submitConfig(data)
    }

    return (
        <>

            {/* 2-column field grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">

                {/* DB Type */}
                <div>
                    <label className={labelCls}>DB Type <span className="text-red-400">*</span></label>
                    <select
                        className={inputCls}
                        {...register('dbtype', { required: 'Required' })}
                    >
                        <option value="">Select</option>
                        <option value="MSSQL">MSSQL</option>
                        <option value="MySQL">MySQL</option>
                        <option value="PostgreSQL">PostgreSQL</option>
                    </select>
                    {errors.dbtype && <p className={errorCls}>{errors.dbtype.message}</p>}
                </div>

                {/* DB Server */}
                <div>
                    <label className={labelCls}>DB Server <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        className={inputCls}
                        placeholder="e.g. 192.168.1.10"
                        {...register('dbserver', { required: 'Required' })}
                    />
                    {errors.dbserver && <p className={errorCls}>{errors.dbserver.message}</p>}
                </div>

                {/* DB Name */}
                <div>
                    <label className={labelCls}>DB Name <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        className={inputCls}
                        placeholder="e.g. my_database"
                        {...register('dbname', { required: 'Required' })}
                    />
                    {errors.dbname && <p className={errorCls}>{errors.dbname.message}</p>}
                </div>

                {/* Port */}
                <div>
                    <label className={labelCls}>Port <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        className={inputCls}
                        placeholder="e.g. 5432"
                        {...register('port', { required: 'Required' })}
                    />
                    {errors.port && <p className={errorCls}>{errors.port.message}</p>}
                </div>

                {/* Username */}
                <div>
                    <label className={labelCls}>Username <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        className={inputCls}
                        placeholder="DB username"
                        {...register('username', { required: 'Required' })}
                    />
                    {errors.username && <p className={errorCls}>{errors.username.message}</p>}
                </div>

                {/* Password */}
                <div>
                    <label className={labelCls}>Password <span className="text-red-400">*</span></label>
                    <input
                        type="password"
                        className={inputCls}
                        placeholder="DB password"
                        {...register('password', { required: 'Required' })}
                    />
                    {errors.password && <p className={errorCls}>{errors.password.message}</p>}
                </div>

                {/* Visible To — SELF/ALL/GROUP/USER, same scheme as the Alert Scheduler */}
                <div className="col-span-2">
                    <label className={labelCls}>Visible To <span className="text-red-400">*</span></label>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
                        {ASSIGNMENT_TYPES.map((t) => (
                            <label key={t.value} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                                <input
                                    type="radio"
                                    name="assignType"
                                    value={t.value}
                                    checked={assignType === t.value}
                                    onChange={() => setAssignType(t.value)}
                                    className="accent-orange-500"
                                />
                                {t.label}
                            </label>
                        ))}
                    </div>

                    {/* Default-database hint. Only a connection visible to All can be the default,
                        and only an Admin can set it (from the Actions column on the list). The
                        current default must stay on All — the backend rejects the save otherwise. */}
                    {isDefaultDb && assignType !== 'ALL' ? (
                        <p className="mb-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                            <span className="font-bold" aria-hidden="true">!</span>
                            <span>This is the <span className="font-semibold">default database</span> — it must stay visible to <span className="font-semibold">All</span>. Remove it as default first if you need to change this.</span>
                        </p>
                    ) : isDefaultDb ? (
                        <p className="mb-2 flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
                            <span aria-hidden="true">★</span>
                            <span>This is the <span className="font-semibold">default database</span> for all users.</span>
                        </p>
                    ) : isAdmin && (
                        <p className="mb-2 flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
                            <span aria-hidden="true">★</span>
                            {assignType === 'ALL'
                                ? <span>Visible to <span className="font-semibold">All</span> — after saving, this connection can be made the default database with <span className="font-semibold">Set as default</span> in the list.</span>
                                : <span>To make this the <span className="font-semibold">default database</span>, select <span className="font-semibold">All</span> here. Only a connection visible to All can be the default.</span>}
                        </p>
                    )}

                    {assignType === 'GROUP' && (
                        <select className={inputCls} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                            <option value="">Select group</option>
                            {groupList.map((g) => (
                                <option key={g.value} value={g.value}>{g.label}</option>
                            ))}
                        </select>
                    )}
                    {assignType === 'USER' && (
                        <select className={inputCls} value={userId} onChange={(e) => setUserId(e.target.value)}>
                            <option value="">Select user</option>
                            {userList?.map((u) => (
                                <option key={u.value} value={u.value}>{u.label}</option>
                            ))}
                        </select>
                    )}
                </div>

            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 mt-6">
                <button
                    type="button"
                    onClick={handleSubmit(onTableViewTest)}
                    className="px-5 py-2 text-sm font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                    Test Connection
                </button>
                <button
                    type="button"
                    onClick={handleSubmit(onTableViewSubmit)}
                    style={{ background: '#EC7D09' }}
                    className="px-6 py-2 text-sm font-semibold rounded text-white hover:opacity-90 transition-opacity shadow-sm"
                >
                    {resetting ? 'Add' : 'Save Changes'}
                </button>
            </div>

            <FormModal
                title="Password not entered"
                headerColor="#b91c1c"
                isOpen={!!confirmBlankPassword}
                setIsOpen={() => setConfirmBlankPassword(null)}
            >
                <div className="flex flex-col items-center gap-3 py-4 px-2 text-center">
                    <p className="text-slate-700 text-sm font-medium">
                        You haven't entered a password for this connection.
                    </p>
                    <p className="text-xs text-slate-400">
                        Saving without a password may leave this connection unable to authenticate. Continue anyway?
                    </p>
                </div>
                <div className="flex justify-end gap-3 mt-2">
                    <button
                        type="button"
                        onClick={() => setConfirmBlankPassword(null)}
                        className="px-5 py-2 text-sm font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const data = confirmBlankPassword
                            setConfirmBlankPassword(null)
                            submitConfig(data)
                        }}
                        className="px-6 py-2 text-sm font-semibold rounded text-white hover:opacity-90 transition-opacity shadow-sm"
                        style={{ background: '#b91c1c' }}
                    >
                        Save Anyway
                    </button>
                </div>
            </FormModal>

        </>
    )
}

export default DBConfigForm;
