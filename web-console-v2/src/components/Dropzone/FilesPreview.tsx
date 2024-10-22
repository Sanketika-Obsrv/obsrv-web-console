import React from 'react';
import { useTheme } from '@mui/material/styles';
import { Box, List, ListItemText, ListItem, Typography, LinearProgress } from '@mui/material';
import { ReactComponent as DeleteIcon } from 'assets/upload/Trash.svg';
import FileTextOutlined from '@mui/icons-material/DescriptionOutlined';
import { IconButton } from '@mui/material';
import { CustomFile, DropzopType, FilePreviewProps } from 'types/dropzone';

const LinearProgressWithLabel = ({ value, theme, ...props }: any) => {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', maxWidth: '22rem' }} mx={2}>
            <Box sx={{ width: '20rem', mr: 1, color: theme.palette.warning.dark }}>
                <LinearProgress
                    variant="determinate"
                    color="inherit"
                    value={value}
                    {...props}
                    sx={{ height: '0.3125rem', borderRadius: '0.625rem' }}
                />
            </Box>
            <Box sx={{ minWidth: 35 }}>
                <Typography
                    variant="h2Secondary"
                    color="text.secondary"
                >{`${Math.round(value)}%`}</Typography>
            </Box>
        </Box>
    );
};

export function getDropzoneData(file: CustomFile | string, index?: number) {
    if (typeof file === 'string') {
        return {
            key: index ? `${file}-${index}` : file,
            preview: file
        };
    }

    return {
        key: index ? `${file.name}-${index}` : file.name,
        name: file.name,
        size: file.size,
        path: file.path,
        type: file.type,
        preview: file.preview,
        lastModified: file.lastModified,
        lastModifiedDate: file.lastModifiedDate
    };
}

export default function FilesPreview({
    showList = true,
    files = [],
    onRemove,
    type
}: FilePreviewProps) {
    const theme = useTheme();
    const hasFile = files.length > 0;

    return (
        <List
            disablePadding
            sx={{
                ...(hasFile && type !== DropzopType.standard && { my: 2 }),
                ...(type === DropzopType.standard && { width: 'calc(100% - 84px)' })
            }}
        >
            {files.map((file, index) => {
                const { key, name } = getDropzoneData(file, index);

                return (
                    <ListItem
                        key={key}
                        sx={{
                            my: 2.5,
                            px: 2,
                            py: 1.3,
                            borderRadius: 0.75,
                            border: (theme) => `1px solid ${theme.palette.divider}`,
                            alignItems: 'center'
                        }}
                    >
                        <FileTextOutlined
                            style={{ width: '1.875rem', fontSize: '1.15rem', marginRight: 4 }}
                        />

                        <ListItemText
                            primary={
                                <Typography
                                    textOverflow="ellipsis"
                                    overflow="hidden"
                                    variant="h2Secondary"
                                >
                                    {typeof file === 'string' ? file : name}
                                </Typography>
                            }
                            primaryTypographyProps={{ variant: 'subtitle2' }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                            sx={{
                                mr: 2,
                                maxWidth: 250,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis'
                            }}
                        />

                        <LinearProgressWithLabel value={100} theme={theme} />

                        {onRemove && (
                            <IconButton
                                sx={{ ml: 'auto', mr: '1rem' }}
                                edge="end"
                                onClick={() => onRemove(file)}
                            >
                                <DeleteIcon />
                            </IconButton>
                        )}
                    </ListItem>
                );
            })}
        </List>
    );
}
