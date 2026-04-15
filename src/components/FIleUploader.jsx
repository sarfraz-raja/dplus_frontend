import React from 'react';
import FormModal from './FormModal';
import CommonForm from './CommonForm';
import { useForm } from 'react-hook-form';
import Button from './Button';

const FileUploader = ({ isOpen, setIsOpen, fileUploadUrl, onTableViewSubmit }) => {

    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        formState: { errors },
    } = useForm();

    const Form = [
        {
            label: "Input File",
            value: "",
            name: "uploadedFile",
            type: "file",
            required: false,
            props: {},
            classes: "col-span-1 flex justify-between items-center"
        }
    ];

    return (
        <FormModal
            title="Upload Bulk File"
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            footer={
                <div className="flex justify-end">
                    <Button
                        classes="w-[100px]"
                        onClick={handleSubmit(onTableViewSubmit)}
                        name="Submit"
                    />
                </div>
            }
        >
            <CommonForm
                classes="grid-cols-1 gap-3"
                Form={Form}
                errors={errors}
                register={register}
                setValue={setValue}
                getValues={getValues}
            />
        </FormModal>
    );
};

export default FileUploader;
