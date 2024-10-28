import {
    Box, Typography, Alert, Grid
} from '@mui/material';
import { useSelector } from 'react-redux';
import * as _ from "lodash";
import { WarningOutlined } from '@ant-design/icons';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';


const Validation = (props: any) => {
    const { datasetState } = props;
    const dataValidation: any = _.get(datasetState, ['pages', 'dataValidation', 'formFieldSelection']);

    const dataValidationBox = () => (
        <Typography variant="h6" display="flex" alignItems="center">
            <FiberManualRecordIcon color={"secondary"} sx={{ fontSize: '1.25rem', mr: 1 }} />
            Data Validation : <Typography variant="h6" fontWeight={400} ml={1}>{dataValidation}</Typography>
        </Typography>
    );
    if (dataValidation)
        return (
            <>
                <Grid container>
                    <Grid item xs={12} display={{ xs: "block", sm: "flex" }}>
                        {dataValidation && <Box mr={2}>
                            {dataValidationBox()}
                        </Box>}
                    </Grid>
                </Grid>
            </>
        );
    else return (<Alert color="error" icon={<WarningOutlined />}>No information to display</Alert>);
}

export default Validation