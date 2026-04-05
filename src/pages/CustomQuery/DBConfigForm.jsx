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
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import CustomQueryActions from '../../store/actions/customQuery-actions';

const ORANGE = '#EC7D09';

const inputCls = "w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400";
const labelCls = "block text-xs text-slate-500 uppercase tracking-wide mb-1";
const errorCls = "text-xs text-red-500 mt-0.5";

const DBConfigForm = ({ setIsOpen, resetting, formValue = {} }) => {

    const dispatch = useDispatch()
    const userList = useSelector((state) => state?.customQuery?.usersList)

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm()

    useEffect(() => {
        reset({})
        if (resetting) {
            // new form — clear all
        } else {
            Object.keys(formValue).forEach((key) => {
                setValue(key, formValue[key])
            })
        }
    }, [formValue, resetting])

    const onTableViewTest = (data) => {
        dispatch(CustomQueryActions.testDBConfig(true, data, () => {}))
    }

    const onTableViewSubmit = (data) => {
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

    return (
        <div className="p-5">

            {/* Form header */}
            <div
                style={{ background: ORANGE }}
                className="flex items-center justify-between px-4 py-3 rounded-lg mb-5 shadow-sm"
            >
                <h2 className="text-white font-semibold text-lg">
                    {resetting ? 'Add DB Configuration' : 'Edit DB Configuration'}
                </h2>
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-white/80 hover:text-white text-xl leading-none"
                >
                    ✕
                </button>
            </div>

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

                {/* User — full width */}
                <div className="col-span-2">
                    <label className={labelCls}>Assign User <span className="text-red-400">*</span></label>
                    <select
                        className={inputCls}
                        {...register('userId', { required: 'Required' })}
                    >
                        <option value="">Select user</option>
                        {userList?.map((u) => (
                            <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                    </select>
                    {errors.userId && <p className={errorCls}>{errors.userId.message}</p>}
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
                    style={{ background: ORANGE }}
                    className="px-6 py-2 text-sm font-semibold rounded text-white hover:opacity-90 transition-opacity shadow-sm"
                >
                    {resetting ? 'Add' : 'Save Changes'}
                </button>
            </div>

        </div>
    )
}

export default DBConfigForm;
