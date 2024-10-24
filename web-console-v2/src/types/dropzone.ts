import { Theme } from '@mui/material/styles';
import { SxProps } from '@mui/material';
import { DropzoneOptions } from 'react-dropzone';

export enum DropzopType {
    default = 'DEFAULT',
    standard = 'STANDARD'
}
export interface CustomFile extends File {
    path?: string;
    preview?: string;
    lastModifiedDate?: Date;
}
export interface UploadProps extends DropzoneOptions {
    error?: boolean;
    file: CustomFile[] | null;
    setFieldValue: (field: string, value: any) => void;
    sx?: SxProps<Theme>;
}
export interface UploadMultiFileProps extends DropzoneOptions {
    files?: CustomFile[] | null;
    error?: boolean;
    showList?: boolean;
    type?: DropzopType;
    sx?: SxProps<Theme>;
    onUpload: (files: any) => void;
    maxFileSize?: number;
    onRemove?: (file: File | string) => void;
    onRemoveAll?: VoidFunction;
    setFieldValue: (field: string, value: any) => void;
    onFileRemove: any;
    subscribeErrors?: any;
    isMultiple?: boolean;
}

export interface FilePreviewProps {
    showList?: boolean;
    type?: DropzopType;
    files: (File | string)[];
    onRemove?: (file: File | string) => void;
}
