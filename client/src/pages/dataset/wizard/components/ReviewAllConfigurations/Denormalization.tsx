import {
    Table, TableBody,
    TableCell, TableContainer, TableHead,
    TableRow, Alert, Grid, Tooltip
} from '@mui/material';
import { useSelector } from 'react-redux';
import * as _ from "lodash";
import { WarningOutlined } from '@ant-design/icons';
import { getMasterDatasets } from 'pages/dataset/wizard/components/DataDenormalization';
import { OverflowTypography } from 'components/styled/Typography';

const Denormalization = (props: any) => {
    const { datasetState } = props;
    const datasets: any = useSelector((state: any) => _.get(state, 'dataset.data.data') || []);
    const denorms: any = _.get(datasetState, ['pages', 'denorm', 'values']);

    const masterDatasets = getMasterDatasets(datasets)
    const dataset = (value: any) => _.find(masterDatasets, ['dataset_config.cache_config.redis_db', value]);
    const displayColumns: any = {
        "denorm_key": "Dataset Field",
        "denorm_out_field": "New Field Name",
        "dataset_id": "Master Dataset"
    }

    const dedupeOptionTable = (title: string, config: any) =>
        <>
            <TableContainer>
                <Table size="small">
                    <TableHead sx={{ bgcolor: 'unset' }}>
                        <TableRow>
                            {Object.values(displayColumns).map((item: any, index: any) => (
                                <TableCell key={index} sx={{ '&.MuiTableCell-root': { border: '1px solid #D9D9D9', } }}>
                                    {item}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {denorms.map((item: any) => {
                            const masterDataset = _.find(masterDatasets, (dataset: any) => {
                                return _.get(dataset, "dataset_id") === _.get(item, "dataset_id")
                            })
                            const masterDatasetName = _.get(masterDataset, "name")
                            const denormFields = _.omit(item, ["dataset_name"])
                            return <TableRow>
                                {Object.entries(denormFields).map(([key, value]: any) => (
                                    <TableCell key={key} sx={{ '&.MuiTableCell-root': { border: '1px solid #D9D9D9', }, maxWidth: 250 }}>
                                        <Tooltip title={key === "dataset_id" ? dataset(value)?.name : value}>
                                            <OverflowTypography variant="body2" sx={{ maxWidth: "70%" }}>
                                                {key === "dataset_id" ? masterDatasetName : value}
                                            </OverflowTypography>
                                        </Tooltip>
                                    </TableCell>
                                ))}
                            </TableRow>
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </>;

    if (!_.isEmpty(denorms))
        return (
            <>
                <Grid container>
                    {_.size(denorms) > 0 && (
                        <Grid item xs={12} sm={12} md={12} lg={12}>
                            {dedupeOptionTable("Denormalization", denorms)}
                        </Grid>
                    )}
                </Grid>
            </>
        );
    else return (<Alert color="error" icon={<WarningOutlined />}>No information to display</Alert>);
}

export default Denormalization