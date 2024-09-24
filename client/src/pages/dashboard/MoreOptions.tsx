import { Tooltip, Menu, MenuItem, Box } from '@mui/material';
import { DatabaseOutlined, ExportOutlined, StopOutlined, EditOutlined } from '@ant-design/icons';
import PostAddIcon from '@mui/icons-material/PostAdd';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { IconButton } from '@mui/material';
import { useState } from 'react';

const MoreOptions = (props: any) => {
    const {
        row,
        handleEdit,
        handleDownloadButton,
        handleRetire,
        navigateToPath,
        interactIds,
        DatasetType,
        fileName,
        setExecuteAction,
        DatasetActions } = props;
    const [open, setOpen] = useState<any>({});
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleButtonMenuClose = () => {
        setOpen(false)
        setAnchorEl(null)
    };
    return (
        <Box >
            <IconButton
                color="primary"
                size="large"
                id={`demo-positioned-button-${row?.dataset_id}`}
                aria-controls={open[row?.dataset_id] ? 'demo-positioned-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open[row?.dataset_id] ? 'true' : undefined}
                onClick={(event: any) => {
                    setAnchorEl(event.currentTarget);
                    setOpen(() => ({
                        [row?.dataset_id]: true
                    }));
                }}
            >
                <MoreVertIcon />
            </IconButton>
            <Menu
                id={`demo-positioned-button-${row?.dataset_id}`}
                aria-labelledby="demo-positioned-button"
                anchorEl={anchorEl}
                open={open[row?.dataset_id]}
                onClose={handleButtonMenuClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
            >
                <Box sx={{ display: "flex" }}>
                    <MenuItem onClick={handleButtonMenuClose}>
                        <Tooltip title="Create Events" onClick={(e: any) => navigateToPath(`/datasets/addEvents/${row?.dataset_id}`)}>
                            <IconButton
                                data-edataid={interactIds.push_dataset_events}
                                data-objectid={row?.dataset_id}
                                data-objecttype="dataset"
                                color="primary"
                                size="large"
                            >
                                <DatabaseOutlined />
                            </IconButton>
                        </Tooltip>
                    </MenuItem>
                    <MenuItem onClick={handleButtonMenuClose}>
                        <Tooltip title="Edit Dataset">
                            <IconButton
                                data-edataid={interactIds.edit_dataset}
                                data-objectid={row?.id}
                                data-objecttype={row?.type === DatasetType.MasterDataset ? 'masterDataset' : 'dataset'}
                                color="primary"
                                size="large"
                                onClick={() => {
                                    setExecuteAction(DatasetActions.Edit)
                                    handleEdit(row)
                                }}>
                                <EditOutlined />
                            </IconButton>
                        </Tooltip>
                    </MenuItem>
                    {/* <MenuItem onClick={handleButtonMenuClose}>
                        <Tooltip title="Rollup Management">
                            <IconButton
                                color="primary"
                                size="large"
                                data-edataid={interactIds.add_dataset_rollup}
                                data-objectid={row?.dataset_id}
                                data-objecttype={row?.type === DatasetType.MasterDataset ? 'masterDataset' : 'dataset'}
                                disabled={row?.type === DatasetType.MasterDataset}
                                onClick={(e: any) => {
                                    setExecuteAction(DatasetActions.AddRollup)
                                    handleEdit(row)
                                }}
                            >
                                <PostAddIcon />
                            </IconButton>
                        </Tooltip>
                    </MenuItem> */}
                    <MenuItem onClick={handleButtonMenuClose}>
                        <Tooltip title="Export Dataset">
                            <IconButton
                                color="primary"
                                size="large"
                                onClick={(e: any) => handleDownloadButton(row?.dataset_id, row?.data_version, row?.status, fileName)}
                                data-objectid={row?.dataset_id}
                                data-objecttype={row?.type === DatasetType.MasterDataset ? 'masterDataset' : 'dataset'}
                            >
                                <ExportOutlined />
                            </IconButton>
                        </Tooltip>
                    </MenuItem>
                    <MenuItem onClick={handleButtonMenuClose}>
                        <Tooltip title="Retire Dataset">
                            <IconButton
                                color="error"
                                size="large"
                                onClick={(e: any) => {
                                    setExecuteAction(DatasetActions.Retire)
                                    handleRetire(row)
                                }}
                                data-objectid={row?.dataset_id}
                                data-objecttype={row?.type === DatasetType.MasterDataset ? 'masterDataset' : 'dataset'}
                            >
                                <StopOutlined />
                            </IconButton>
                        </Tooltip>
                    </MenuItem>
                </Box>
            </Menu>
        </Box>
    )
}

export default MoreOptions