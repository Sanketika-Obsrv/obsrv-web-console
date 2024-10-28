import {
     Typography, Alert
} from '@mui/material';
import { DEFAULT_TIMESTAMP } from 'services/dataset';
import * as _ from "lodash"
import { WarningOutlined } from '@ant-design/icons';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

const TimestampField = (props: any) => {
    const { datasetState } = props;
    const indexCol: any = _.get(datasetState, ['pages', 'timestamp', 'indexCol']);
    const timestampCol: string = indexCol == DEFAULT_TIMESTAMP.indexValue ? "Event Arrival Time" : indexCol

    const timestampField = () => (
        <Typography variant="h6" display="flex" alignItems="center">
            <FiberManualRecordIcon color={"secondary"} sx={{ fontSize: '1.25rem', mr: 1 }} />
            Timestamp Field : <Typography variant="h6" fontWeight={400} ml={1}>{timestampCol}</Typography>
        </Typography>
    )

    if (timestampCol)
        return (
            <>
                {timestampCol && timestampField()}
            </>
        );
    else return (<Alert color="error" icon={<WarningOutlined />}>No information to display</Alert>);
}

export default TimestampField