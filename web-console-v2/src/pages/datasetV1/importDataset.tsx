import { Grid } from '@mui/material';
import * as _ from 'lodash';
import ImportDatasetOnboardingWizard from './wizard';

const ImportExistingDataset = ({ master = false }) => {
    return (
        <Grid container rowSpacing={4.5} columnSpacing={3}>
            <Grid item xs={12}>
                <ImportDatasetOnboardingWizard master={master} isImport={true} />
            </Grid>
        </Grid>
    )
};

export default ImportExistingDataset;
