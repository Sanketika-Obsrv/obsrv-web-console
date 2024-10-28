import { useTheme } from '@mui/material/styles';
import { Box, List, ListItemText, ListItem, Typography, LinearProgress, LinearProgressProps } from '@mui/material';
import IconButton from 'components/@extended/IconButton';
import { DropzopType, FilePreviewProps } from 'types/dropzone';
import { DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import { CustomFile } from 'types/dropzone';
import interactIds  from 'data/telemetry/interact.json';

function LinearProgressWithLabel({ value, theme, ...props }: any) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', maxWidth: '22rem', }}>
            <Box sx={{ width: '20rem', mr: 1, color: theme.palette.primary[400], }}>
                <LinearProgress variant="determinate" color="inherit" {...props} />
            </Box>
            <Box sx={{ minWidth: 35 }}>
                <Typography variant="h6" color="text.secondary">{`${Math.round(
                    value,
                )}%`}</Typography>
            </Box>
        </Box>
    );
}

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

export default function FilesPreview({ showList = false, files, onRemove, type }: FilePreviewProps) {
    const theme = useTheme();
    const hasFile = files.length > 0;
    const layoutType = type;

    return (
        <List
            disablePadding
            sx={{
                ...(hasFile && type !== DropzopType.standard && { my: 3 }),
                ...(type === DropzopType.standard && { width: 'calc(100% - 84px)' })
            }}
        >
            {files.map((file, index) => {
                const { key, name, size, preview, type } = getDropzoneData(file, index);

                return (
                    <ListItem
                        key={key}
                        sx={{
                            my: 1,
                            px: 2,
                            py: 0.75,
                            borderRadius: 0.75,
                            border: (theme) => `solid 1px ${theme.palette.divider}`,
                            alignItems: 'center',
                        }}
                    >
                        <FileTextOutlined style={{ width: '30px', fontSize: '1.15rem', marginRight: 4 }} />

                        <ListItemText
                            primary={<Typography textOverflow="ellipsis" overflow="hidden" variant="body1">{typeof file === 'string' ? file : name}</Typography>}
                            primaryTypographyProps={{ variant: 'subtitle2' }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                            sx={{ mr: 2, maxWidth: 250, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                        />

                        <LinearProgressWithLabel value={100} theme={theme} />

                        {onRemove && (
                            <IconButton
                                data-edataid={`${interactIds.file_remove_single}:${key}`}
                                size="small"
                                color="error"
                                shape="rounded"
                                onClick={() => onRemove(file)}
                                sx={{ ml: 'auto' }}
                                edge="end"
                            >
                                <DeleteOutlined style={{ fontSize: '1rem' }} />
                            </IconButton>
                        )}
                    </ListItem>
                );
            })}
        </List>
    );
}
