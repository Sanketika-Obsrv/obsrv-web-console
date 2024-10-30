import React from "react";
import {
    Table, TableBody,
    TableCell, TableContainer, TableHead,
    TableRow, Alert, Grid, Tooltip
} from '@mui/material';
import * as _ from "lodash";
import { WarningOutlined } from '@ant-design/icons';
import { OverflowTypography } from 'components/Styled/Typography';
import { useEffect, useState } from 'react';
import { fetchDatasets } from 'services/datasetV1';
import { DatasetStatus, DatasetType } from 'types/datasets';

export const getMasterDatasets = (datasets: Array<any>) => {
    return _.filter(datasets, (dataset: Record<string, any>) => _.get(dataset, 'type') === DatasetType.MasterDataset && [DatasetStatus.Live,].includes(_.get(dataset, 'status')));
}
const Denormalization = (props: any) => {
    const { datasetState } = props;
    const [datasets, setDatasets] = useState<any>([])
    const denorms: any = _.get(datasetState, ['pages', 'denorm', 'values']);

    const masterDatasets = getMasterDatasets(datasets)
    const dataset = (value: any) => _.find(masterDatasets, ['dataset_config.cache_config.redis_db', value]);
    const displayColumns: any = {
        "denorm_key": "Dataset Field",
        "dataset_id": "Master Dataset",
        "denorm_out_field": "New Field Name"
    }

    const fetchDatasetsList = async () => {
        try {
            const datasets = await fetchDatasets({})
            setDatasets(_.get(datasets, "data"))
        } catch (error) {
            setDatasets([])
        }
    }

    useEffect(() => {
        fetchDatasetsList()
    }, [])

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
                        {denorms.map((item: any, i:any) => {
                            item = {
                                denorm_key: item?.denorm_key,
                                dataset_id: item?.dataset_id,
                                denorm_out_field: item?.denorm_out_field
                            }
                            const masterDataset = _.find(masterDatasets, (dataset: any) => {
                                return _.get(dataset, "dataset_id") === _.get(item, "dataset_id")
                            })
                            const masterDatasetName = _.get(masterDataset, "name")
                            return <TableRow key={i}>
                                {Object.entries(item).map(([key, value]: any) => (
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