import { Alert, Grid, Stack, Typography } from '@mui/material';
import { renderSections } from 'pages/alertManager/services/utils';
import AdditionSummary from './AdditionsSummary';
import UpdateSummary from './UpdateSummary';
import DeletionSummary from './DeletionSummary';
import AddBoxIcon from '@mui/icons-material/AddBox';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import _ from 'lodash'
import en from 'utils/locales/en.json'

const ReviewDataset = ({ handleBack, master, edit, datasetState, liveDataset = false, diff = {} }: any) => {

    const { additions = [], deletions = [], modifications = [] } = diff;
    const noModifications = _.size(_.flatten([additions, deletions, modifications])) === 0;

    const transform = (data: Record<string, any>[]) => {
        return _.flatten(_.map(data, payload => {
            const { type, items = [], value } = payload;
            return [..._.map(items, item => ({ type, ...item })), ...(value ? [{ type, value }] : [])]
        }))
    };

    const sections = [
        ...(additions?.length ? [
            {
                id: 'additions',
                title: <Stack direction="row" spacing={2}><AddBoxIcon color='info' />  <Typography variant='inherit'>Additions</Typography></Stack>,
                description: 'Lists down all the additions in the configurations',
                component: <AdditionSummary diff={additions} transform={transform} />
            }
        ] : []),
        ...(modifications?.length ? [
            {
                id: 'updates',
                title: <Stack direction="row" spacing={2}><AutoFixHighIcon color='warning' />  <Typography variant='inherit'>Modification</Typography></Stack>,
                description: 'Lists down all the modifications in the configuration along with new and old value',
                component: <UpdateSummary diff={modifications} transform={transform} />
            }
        ] : []),
        ...(deletions?.length ? [
            {
                id: 'deletion',
                title: <Stack direction="row" spacing={2}><RemoveCircleIcon color='error' />  <Typography variant='inherit'>Deletion</Typography></Stack>,
                description: 'Lists down all the deletions in the configurations',
                component: <DeletionSummary diff={deletions} transform={transform} />
            }
        ] : [])
    ];

    if (sections?.length) {
        _.set(sections, '[0].componentType', 'box');
    }

    const render = () => {
        if (noModifications) {
            return <Grid item xs={12}>
                <Alert severity="info">{en['no-summary-modifications']}</Alert>
            </Grid>
        }
        return <Grid item xs={12}>
            {renderSections({ sections: sections })}
            <Alert severity="error">{en['dataset-summary-review-warning']}</Alert>
        </Grid>
    }

    return <>
        <Grid container>
            {render()}
        </Grid>
    </>
}


export default ReviewDataset