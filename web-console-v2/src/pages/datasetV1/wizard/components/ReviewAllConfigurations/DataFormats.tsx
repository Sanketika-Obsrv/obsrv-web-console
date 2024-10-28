import {
    Box, Typography, Alert, Grid, Checkbox
} from '@mui/material';
import * as _ from "lodash";
import { WarningOutlined } from '@ant-design/icons';
import { Stack } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

const DataFormats = (props: any) => {
    const { datasetState } = props;
    const dataFormatConfig: any = _.get(datasetState, ['pages', 'dataFormat']);

    const displayBatchColumns = [
        { id: 'extractionKey', label: 'Extraction Key' },
        { id: 'batchId', label: 'Batch ID' },
        { id: 'dedupeRequired', label: 'Dedup Required' },
        { id: 'dedupePeriod', label: 'Dedup Period' },
    ];

    const dataFormatSection = () => <>
        <Grid container display={"flex"} flexDirection={"column"}>
            <Grid item xs={4}>
                <Box display="flex" alignItems="center">
                    <Checkbox checked={true} onChange={() => { }} />
                    <Typography variant="h6" fontWeight={400}>
                        {"Individual Events"}
                    </Typography>
                </Box>
            </Grid>
            {_.lowerCase(dataFormatConfig.value.type) === "yes" &&
                <>
                    <Grid item xs={8}>
                        <Grid container display={"flex"} flexDirection={"column"}>
                            <Grid item xs={3}>
                                <Box display="flex" alignItems="center">
                                    <Checkbox checked={true} onChange={() => { }} />
                                    <Typography variant="h6" fontWeight={400}>
                                        {"Batch Mode"}
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} pl={4.4}>
                                <Stack direction="column" spacing={1}>
                                    <Typography variant="body1" display="flex" alignItems="center">
                                        <FiberManualRecordIcon color={"secondary"} sx={{ fontSize: '1.25rem', mr: 1 }} />
                                        Extraction Key : <Typography variant="body1" ml={1}>{dataFormatConfig.value[displayBatchColumns[0].id]}</Typography>
                                    </Typography>
                                    <Typography variant="body1" display="flex" alignItems="center">
                                        <FiberManualRecordIcon color={"secondary"} sx={{ fontSize: '1.25rem', mr: 1 }} />
                                        Batch Identifier : <Typography variant="body1" ml={1}>{dataFormatConfig.value[displayBatchColumns[1].id]}</Typography>
                                    </Typography>
                                </Stack>
                            </Grid>
                        </Grid>
                    </Grid>
                </>
            }
        </Grid>
    </>;
    if (dataFormatConfig)
        return (
            <>
                {dataFormatSection()}
            </>
        );
    else return (<Alert color="error" icon={<WarningOutlined />}>No information to display</Alert>);
}

export default DataFormats