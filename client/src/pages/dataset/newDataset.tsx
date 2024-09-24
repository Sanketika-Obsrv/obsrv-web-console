import { Grid } from '@mui/material';
import * as _ from 'lodash';
import NewDatasetOnboardingWizard from './wizard';

const NewDataset = ({ master = false }) => {
    return (
        <Grid container rowSpacing={4.5} columnSpacing={3}>
            <Grid item xs={12}>
                <NewDatasetOnboardingWizard master={master} />
            </Grid>
        </Grid>
    )
};

export default NewDataset;
