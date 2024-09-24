import {
    Box, Typography, Alert, Grid
} from '@mui/material';
import * as _ from "lodash";
import { WarningOutlined } from '@ant-design/icons';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

const Deduplication = (props: any) => {
    const { datasetState } = props;
    const dedupeKey: any = _.get(datasetState, ['pages', 'dedupe', 'optionSelection', 'dedupeKey']);

    const dedupeBox = () => (
        <Typography variant="h6" display="flex" alignItems="center">
            <FiberManualRecordIcon color={"secondary"} sx={{ fontSize: '1.25rem', mr: 1 }} />
            Dedup Field : <Typography variant="h6" fontWeight={400} ml={1}>{dedupeKey}</Typography>
        </Typography>
    );

    if (dedupeKey)
        return (
            <>
                <Grid container >
                    <Grid item xs={12} display={{ xs: "block", sm: "flex" }}>
                        {dedupeKey && <Box mr={2}>
                            {dedupeBox()}
                        </Box>}
                    </Grid>
                </Grid>
            </>
        );
    else return (<Alert color="error" icon={<WarningOutlined />}>No information to display</Alert>);
}

export default Deduplication