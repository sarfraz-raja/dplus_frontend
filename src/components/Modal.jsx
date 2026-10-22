// import React from 'react'
// import { UilTimesCircle } from '@iconscout/react-unicons'
// import Button from './Button'
// const Modal = ({ size, modalHead = "", children, isOpen, setIsOpen, closeButton = false }) => {

//     const sizeType = {
//         xl: 'w-[96vw] h-[96vh] md:w-[75vw] md:h-[86vh]',
//         lg: 'w-[94vw] h-[90vh] md:w-[60vw] md:h-[86vh]',
//         sm: 'w-[92vw]  md:w-[36vw]',
//         modal: 'w-[94vw] h-[38vh] md:w-[48vw] h-[28vh]',
//         full: 'w-[98vw] h-[98vh] md:w-[98vw] md:h-[98vh]',
//     }

//     return (
//         <div className={isOpen ? 'z-[4000] flex justify-around place-items-center bg-white fixed rm-scroll overflow-hidden top-0 bottom-0 right-0 left-0' : 'hidden'} style={{ background: 'rgba(6, 6, 6, 0.9)' }} onClick={() => { setIsOpen(prev => !prev) }}>
//             <div onClick={(e) => e.stopPropagation()} className={`relative bg-white  ${sizeType[size]} rounded-md overflow-scroll modal-inner `}>
//                 <div className='sticky bg-primaryLine h-10 top-0 right-0'>

//                     <h1 className='text-white text-lg pt-2 pl-4'>{modalHead}</h1>
//                     <div onClick={() => { setIsOpen(prev => !prev) }} className='absolute ml-auto w-fit top-1 right-3 p-1 hover:bg-main bg-transparent cursor-pointer rounded-md transition-all duration-300 shadow-md'>
//                         <UilTimesCircle className={"text-white"} size="24" />
//                         {/* <svg className='hover:fill-black' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M12.0007 10.5865L16.9504 5.63672L18.3646 7.05093L13.4149 12.0007L18.3646 16.9504L16.9504 18.3646L12.0007 13.4149L7.05093  18.3646L5.63672 16.9504L10.5865 12.0007L5.63672 7.05093L7.05093 5.63672L12.0007 10.5865Z" className='dark:fill-white'></path></svg> */}
//                     </div>
//                 </div>
//                 <div className='bg-white dark:bg-white overflow-x-hidden p-2'>
//                     {children}
//                 </div>
//                 {closeButton &&
//                     <div className='w-24 absolute bottom-4 right-4'>
//                         <Button name={"Close"} onClick={(e)=>{ setIsOpen(prev => !prev) }}/>
//                     </div>
//                 }
//             </div>
//         </div>
//     )
// }

// export default Modal
import React from 'react'
import Button from './Button'
import FormModal from './FormModal'

// Modal is now a thin wrapper over FormModal — one modal look for the whole app (neutral header,
// close button, backdrop + Esc handling). It keeps its older props so no caller changes:
// modalHead → title, showHeader={false} → no header, closeButton → a Close button in the footer,
// and its own size names (below). Like before, the content stays mounted (hidden) while closed.
//
// OLD sizes (fixed heights; `sm` left a blank area under short forms, `md` didn't exist so the
// dialog got no width at all):
//     xl: 'w-[96vw] h-[96vh] md:w-[80vw] md:h-[86vh]',
//     lg: 'w-[92vw] h-[86vh] md:w-[70vw] md:h-[78vh]',
//     sm: 'w-[90vw] md:w-[48vw] h-[70vh]',
//     modal: 'w-[94vw] h-[38vh] md:w-[48vw] h-[28vh]',
//     full: 'w-[98vw] h-[98vh] md:w-[98vw] md:h-[98vh]',
//     form: 'w-[94vw] md:w-[640px] max-h-[90vh]',
const sizeType = {
    xl: 'w-[96vw] h-[96vh] md:w-[80vw] md:h-[86vh]',
    lg: 'w-[92vw] h-[86vh] md:w-[70vw] md:h-[78vh]',
    sm: 'w-[90vw] md:w-[48vw] max-h-[80vh]',
    md: 'w-[90vw] md:w-[560px] max-h-[80vh]',
    modal: 'w-[94vw] h-[38vh] md:w-[48vw] md:h-[28vh]',
    full: 'w-[98vw] h-[98vh] md:w-[98vw] md:h-[98vh]',
    form: 'w-[94vw] md:w-[640px] max-h-[90vh]',
}

const Modal = ({ size, modalHead = "", children, isOpen, setIsOpen, closeButton = false, showHeader = true }) => (
    <FormModal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        title={modalHead}
        hideHeader={!showHeader}
        panelClassName={sizeType[size] ?? sizeType.form}
        keepMounted
        footer={closeButton ? (
            <div className="flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => setIsOpen(false)}>Close</Button>
            </div>
        ) : null}
    >
        {children}
    </FormModal>
)

export default Modal
