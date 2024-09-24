import { renderSections } from 'pages/alertManager/services/utils';
import Transformations from './Transformations';
import TimestampField from './TimestampField';
import Datasource from './Datasource';
import DataFormats from './DataFormats';
import Validation from './Validation';
import Deduplication from './Deduplication';
import Datakey from './Datakey';
import Denormalization from './Denormalization';
import * as _ from "lodash";
import IngestionSpec from 'data/review/ingestionSpec';
import { useSelector } from 'react-redux';
import { downloadJSONSchema } from 'services/json-schema';
import { downloadJsonFile } from 'utils/downloadUtils';
import { DownloadOutlined } from '@ant-design/icons';
import { Button, Grid, Stack, Typography } from '@mui/material';

const ReviewAllCongurations = ({ master, datasetState }: any) => {
    const wizardState: any = useSelector((state: any) => state?.wizard);
    const dataset_state = !_.isEmpty(datasetState) ? datasetState : wizardState;

    const jsonSchema = _.get(dataset_state, 'pages.jsonSchema');
    const flattenedData = _.get(dataset_state, ['pages', 'columns', 'state', 'schema']);

    let sections = [
        {
            id: 'datakey',
            title: 'Data key',
            description: 'Details about data key',
            component: <Datakey datasetState={dataset_state}></Datakey>,
            master: true,
            dataset: false,
            componentType: 'box'
        },
        {
            id: 'dataFormat',
            title: 'Data formats',
            description: 'Details about data formats',
            component: <DataFormats datasetState={dataset_state}></DataFormats>,
            master: true,
            dataset: true,
            componentType: 'box'
        },
        {
            id: 'validation',
            title: 'Validation',
            description: 'Details about validation',
            component: <Validation datasetState={dataset_state}></Validation>,
            dataset: true,
            componentType: 'box'
        },
        {
            id: 'timestamp',
            title: 'Timestamp',
            description: 'Details about timestamp filed',
            component: <TimestampField datasetState={dataset_state}></TimestampField>,
            dataset: true,
            componentType: 'box'
        },
        {
            id: 'dedup',
            title: 'Deduplication',
            description: 'Details about deduplication',
            component: <Deduplication datasetState={dataset_state}></Deduplication>,
            dataset: true,
            componentType: 'box'
        },
        {
            id: 'dataSource',
            title: 'Data source',
            description: 'Details about data sources',
            component: <Datasource datasetState={dataset_state}></Datasource>,
            master: true,
            dataset: true,
        },
        {
            id: 'dataschema',
            title: 'Data schema',
            description: 'Details about data schema',
            component: <IngestionSpec datasetState={dataset_state}></IngestionSpec>,
            master: true,
            dataset: true
        },
        {
            id: 'transformations',
            title: 'Transformations',
            description: 'Details about transformations',
            component: <Transformations datasetState={dataset_state}></Transformations>,
            master: true,
            dataset: true,
        },
        {
            id: 'denorm',
            title: 'Denormalization',
            description: 'Details about Denormalization',
            component: <Denormalization datasetState={dataset_state}></Denormalization>,
            dataset: true
        }
    ]

    if (master) {
        sections = _.filter(sections, ['master', true]);
    } else {
        sections = _.filter(sections, ['dataset', true]);
    }

    const handleDownloadButton = () => {
        let data: Record<string, any> = jsonSchema;
        if (flattenedData) {
            data = _.get(downloadJSONSchema(jsonSchema, { schema: flattenedData }), 'schema');
        }
        downloadJsonFile(data, 'json-schema');
    }

    const datasetActions: any = [
        {
            label: "Download Schema",
            value: "downloadSchema",
            onClick: handleDownloadButton,
            icon: <DownloadOutlined />,
            disabled: false,
            display: true
        }
    ]

    const renderDatasetActions = (action: Record<string, any>) => {
        const { label, value, onClick, icon, disabled, display } = action;
        if (!display) return null;
        return <>
            <Button key={value}
                variant="contained" size="large" type="button" onClick={onClick} startIcon={icon} disabled={disabled}>
                <Typography variant="body1">{label}</Typography>
            </Button>
        </>
    }

    return <>
        <Grid container spacing={1}>
            <Grid item xs={12}>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                    {_.map(datasetActions, renderDatasetActions)}
                </Stack>
            </Grid>
            <Grid item xs={12}>
            </Grid>
        </Grid>
        {renderSections({ sections: sections })}
    </>
}

export default ReviewAllCongurations