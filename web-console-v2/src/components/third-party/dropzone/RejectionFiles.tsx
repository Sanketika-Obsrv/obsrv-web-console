// material-ui
import { alpha } from '@mui/material/styles';
import { Box, Paper, Typography } from '@mui/material';

// third-party
import { FileRejection } from 'react-dropzone';
import { getDropzoneData } from './FilesPreview';
import * as _ from "lodash";

type Props = {
    fileRejections: FileRejection[];
};

export const bytesToMb = (size: number) => Math.ceil(size / Math.pow(1024, 2));

export const dropzoneErrorMapping: any = {
    "file-too-large": "File is larger than allowed size of 5mb",
}

export default function RejectionFiles({ fileRejections }: Props) {
    return (
        <Paper
            variant="outlined"
            sx={{
                py: 1,
                px: 2,
                mt: 1,
                borderColor: 'error.light',
                bgcolor: (theme) => alpha(theme.palette.error.main, 0.08)
            }}
        >
            {fileRejections.map(({ file, errors }) => {
                const { path, size } = getDropzoneData(file);

                return (
                    <Box key={path} sx={{ my: 1 }}>
                        <Typography variant="subtitle2" noWrap>
                            {path}{size ? ` - ${bytesToMb(size)}mb` : ''}
                        </Typography>

                        {errors.map((error) => {
                            const message = _.get(dropzoneErrorMapping, error.code) || error.message;
                            return (
                                <Box key={error.code} component="li" sx={{ typography: 'caption' }}>
                                    {message}
                                </Box>
                            )
                        })}
                    </Box>
                );
            })}
        </Paper>
    );
}
