import {
    Grid
} from '@mui/material';
import NewDatasetOnboardingWizard from './wizard';
import { useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import { useEffect, useState } from 'react';
import { datasetRead, getDatasetState } from 'services/dataset';
import * as _ from 'lodash';
import { restore } from 'store/reducers/wizard';
import { error } from 'services/toaster';
import { useSearchParams } from 'react-router-dom';
import Loader from 'components/Loader';
import { DatasetStatus } from 'types/datasets';

const EditDataset = (props: any) => {
    const dispatch = useDispatch();
    const params = useParams();
    const [loading, setLoading] = useState(false)
    const { datasetId } = params;
    const [searchParams] = useSearchParams();
    const master = searchParams.get("master") || "false";
    const page = searchParams.get("page");
    const navigate = useNavigate();

    const restoreClientState = (restoreData: any) => {
        const dataset_id = _.get(restoreData, 'pages.datasetConfiguration.state.config.dataset_id')
        const activeWizardPage: any = sessionStorage.getItem(`${dataset_id}_activePage` || "")
        _.set(restoreData, `metadata.${dataset_id}_activePage`, parseInt(activeWizardPage))
        dispatch(restore(restoreData));
    }

    const fetchDatasetDetails = async () => {
        try {
            const datasetState = await getDatasetState(datasetId!, DatasetStatus.Draft);
            restoreClientState(datasetState);
        } catch (err) {
            dispatch(error({ message: 'Dataset does not exists' }));
            navigate('/');
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        setLoading(true)
        fetchDatasetDetails();
    }, [datasetId]);

    return (
        <>
            {loading && <Loader />}
            <Grid container rowSpacing={4.5} columnSpacing={3}>
                <Grid item xs={12}>
                    <NewDatasetOnboardingWizard edit={true} master={master == "true"} page={page} />
                </Grid>
            </Grid>
        </>
    )
};

export default EditDataset;
