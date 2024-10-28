import {
    Box, Typography, Alert, Grid
} from '@mui/material';
import * as _ from "lodash";
import { WarningOutlined } from '@ant-design/icons';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

const Datakey = (props: any) => {
    const { datasetState } = props;
    const denormDataKey: any = _.get(datasetState, ['pages', 'dataKey']);

    const denormDataKeySection = () => <>
        <Grid container>
            <Grid item xs={4}>
                <Box display="flex" alignItems="center">
                    <Typography variant="body1" display="flex" alignItems="center">
                        <FiberManualRecordIcon color={"secondary"} sx={{ fontSize: '1.25rem', mr: 1 }} />
                        Data Key : <Typography variant="body1" ml={1}>{_.get(denormDataKey, "dataKey")}</Typography>
                    </Typography>
                </Box>
            </Grid>
        </Grid>
    </>

    if (denormDataKey)
        return (
            <>
                {denormDataKey && denormDataKeySection()}
            </>
        );
    else return (<Alert color="error" icon={<WarningOutlined />}>No information to display</Alert>);
}

export default Datakey