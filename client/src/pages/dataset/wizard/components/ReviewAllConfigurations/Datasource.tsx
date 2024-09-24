import React, { useState } from 'react'
import {
    Box, Typography, Alert, Grid, Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import { flattenObject } from 'services/utils';
import MainCard from 'components/MainCard';
import { getKeyAlias } from 'services/keysAlias';
import BasicReactTable from 'components/BasicReactTable';
import * as _ from "lodash"
import { WarningOutlined } from '@ant-design/icons';
import DataIngestCURLCopy from 'data/review/copyDataIngestionCurl';

const Datasource = (props: any) => {
    const { datasetState } = props;
    const dataSourceConfig: any = _.get(datasetState, ['pages', 'dataSource']);
    const [expanded, setExpanded] = useState<string | false>('panel1');
    const datasetId = _.get(datasetState, ["pages", "datasetConfiguration", "state", "config", "dataset_id"]) || ""
    const dataFormatConfig: any = _.get(datasetState, ['pages', 'dataFormat']);

    const dataSourceSection = () => {
        const handleChange =
            (panel: string) => (event: React.SyntheticEvent, newExpanded: boolean) => {
                setExpanded(newExpanded ? panel : false);
            };

        return <>
            {_.map(dataSourceConfig.formFieldSelection, (field: any) => {
                const connectorConfigs = _.get(dataSourceConfig, ["value", field]) || {};
                const filteredConfigs = _.omit(connectorConfigs, ["connector_type", "authenticationMechanism", "id", "prefix", "fileFormat.compressed"])
                const values = flattenObject(filteredConfigs) || [];

                const columns = [
                    {
                        Header: () => null,
                        accessor: 'key',
                        disableFilters: true,
                        Cell: (cell: any) => {
                            const payload = _.get(cell, ["cell", "row", "original"]) || {};
                            const { key, value } = payload;
                            return <Typography variant='body1' fontWeight={500}>{_.capitalize(getKeyAlias(key))}</Typography>
                        }
                    },
                    {
                        Header: () => null,
                        accessor: 'value',
                        disableFilters: true,
                        Cell: (cell: any) => {
                            const payload = _.get(cell, ["cell", "row", "original"]) || {};
                            const { key, value } = payload;
                            return <Typography sx={{ minWidth: "20vw", maxWidth: "25vw" }}>{value}</Typography>
                        }
                    }
                ]

                return <Accordion expanded={expanded === field} onChange={handleChange(field)}>
                    <AccordionSummary aria-controls="panel1d-content" id="panel1d-header">
                        <Typography>{_.toUpper(getKeyAlias(field))}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container>
                            <Grid item xs={12}>
                                <MainCard content={false}>
                                    {field == "api" && <DataIngestCURLCopy datasetId={datasetId} dataFormatConfig={dataFormatConfig} />}
                                    {!_.isEmpty(values) && <BasicReactTable data={values} columns={columns} header={null} />}
                                </MainCard>
                            </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>
            })}
        </>
    }
    if (dataSourceConfig)
        return (
            <>
                {dataSourceSection()}
            </>
        );
    else return (<Alert color="error" icon={<WarningOutlined />}>No information to display</Alert>);
}

export default Datasource