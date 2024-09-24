import { useState, ReactNode, useEffect } from 'react';
import { Step, Stepper, StepLabel, Typography, Box, Grid } from '@mui/material';
import DatasetConfiguration from './DatasetConfiguration';
import { useDispatch, useSelector } from 'react-redux';
import { reset, overrideMetadata } from 'store/reducers/wizard';
import ListColumns from './ListColumns';
import * as _ from 'lodash';
import SectionConfiguration from './components/SectionConfiguration';
import { fetchDatasetsThunk } from 'store/middlewares';
import useImpression from 'hooks/useImpression';
import pageIds from 'data/telemetry/pageIds';
import { generateInteractEvent } from 'services/telemetry';
import { IWizard } from 'types/formWizard';
import { useLocation, useParams } from 'react-router';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { DatasetStatus, DatasetType } from 'types/datasets';
import ImportDataset from './ImportDataset';
import ReviewDataset from './components/ReviewDataset';

const steps = ['Schema', 'Input', 'Fields', 'Processing', 'Review'];
const masterSteps = ['Schema', 'Input', 'Fields', 'Review'];

const getStepContent = (step: number, handleNext: () => void, handleBack: () => void, setErrorIndex: (i: number | null) => void, master: boolean, edit: boolean, generateInteractTelemetry: any) => {

    if (master) {
        switch (step) {
            case 0:
                return <ListColumns handleBack={handleBack} handleNext={handleNext} setErrorIndex={setErrorIndex} index={0} edit={edit} master={master} generateInteractTelemetry={generateInteractTelemetry} />;
            case 1:
                return <SectionConfiguration handleBack={handleBack} handleNext={handleNext} setErrorIndex={setErrorIndex} index={1} section="input" edit={edit} master={master} generateInteractTelemetry={generateInteractTelemetry} />
            case 2:
                return <SectionConfiguration handleBack={handleBack} handleNext={handleNext} setErrorIndex={setErrorIndex} index={2} section="field" edit={edit} generateInteractTelemetry={generateInteractTelemetry} />
            case 3:
                return <ReviewDataset handleBack={handleBack} handleNext={handleNext} setErrorIndex={setErrorIndex} index={3} master={master} edit={edit} generateInteractTelemetry={generateInteractTelemetry} />
            default:
                throw new Error('Unknown step');
        }
    } else {
        switch (step) {
            case 0:
                return <ListColumns handleBack={handleBack} handleNext={handleNext} setErrorIndex={setErrorIndex} index={0} edit={edit} generateInteractTelemetry={generateInteractTelemetry} />;
            case 1:
                return <SectionConfiguration handleBack={handleBack} handleNext={handleNext} setErrorIndex={setErrorIndex} index={1} section="input" edit={edit} generateInteractTelemetry={generateInteractTelemetry} />
            case 2:
                return <SectionConfiguration handleBack={handleBack} handleNext={handleNext} setErrorIndex={setErrorIndex} index={2} section="field" edit={edit} generateInteractTelemetry={generateInteractTelemetry} />
            case 3:
                return <SectionConfiguration handleBack={handleBack} handleNext={handleNext} setErrorIndex={setErrorIndex} index={3} section="processing" edit={edit} generateInteractTelemetry={generateInteractTelemetry} />
            case 4:
                return <ReviewDataset handleBack={handleBack} handleNext={handleNext} setErrorIndex={setErrorIndex} index={5} edit={edit} generateInteractTelemetry={generateInteractTelemetry} />
            default:
                throw new Error('Unknown step');
        }
    }
};

const DatasetOnboarding = ({ edit = false, master = false, key = Math.random(), isImport = false, page }: any) => {
    const [showWizard, setShowWizard] = useState(false);
    const [errorIndex, setErrorIndex] = useState<number | null>(null);
    const { state } = useLocation();
    const navigate = useNavigate();
    const { datasetId } = useParams();
    const wizardState: IWizard = useSelector((state: any) => state?.wizard);
    const dataset_id = _.get(wizardState, 'pages.datasetConfiguration.state.config.dataset_id')
    const activeStepFromStore = +page || _.get(wizardState, ['metadata', `${dataset_id}_activePage`]) || 0;
    const [activeStep, setActiveStep] = useState(activeStepFromStore);
    useImpression({ type: "view", pageid: _.get(pageIds, [master ? 'masterdataset' : 'dataset', edit ? 'edit' : 'create']) });

    const dispatch = useDispatch();

    const pageIdPrefix = _.get(pageIds, [master ? 'masterdataset' : 'dataset', edit ? 'edit' : 'create']);
    const datasetType = master ? 'masterDataset' : 'dataset';

    const generateInteractTelemetry = ({ edata: { id } }: any) => {
        const datasetId = _.get(wizardState, 'pages.datasetConfiguration.state.config.dataset_id')
        generateInteractEvent({
            object: datasetId ? { id: datasetId, type: datasetType, version: "1.0.0" } : {},
            edata: { id: `${pageIdPrefix}:${id}`, type: 'CLICK' }
        });
    }

    const saveActivePage = async (pageNumber?: number) => {
        dispatch(overrideMetadata({ id: `${dataset_id}_activePage`, value: pageNumber }));
    }

    const handleNext = () => {
        setActiveStep((prevState: any) => {
            const page = prevState + 1;
            saveActivePage(page);
            sessionStorage.setItem(`${dataset_id}_activePage` || "", page);
            return page;
        });
        setErrorIndex(null);
    };

    const handleBack = () => {
        if (activeStep === 0) setShowWizard(false);
        else setActiveStep((prevState: any) => {
            const page: any = prevState - 1;
            saveActivePage(page);
            sessionStorage.setItem(`${dataset_id}_activePage` || "", page);
            return page;
        });
    };

    useEffect(() => {
        dispatch(fetchDatasetsThunk({ data: { filters: { status: [DatasetStatus.Live, DatasetStatus.Retired] } } }));
        if (edit) { setShowWizard(true) }
        return () => {
            dispatch(reset({}));
        }
    }, []);

    useEffect(() => {
        if (activeStepFromStore && activeStepFromStore !== activeStep)
            setActiveStep(activeStepFromStore);
    }, [activeStepFromStore]);

    useEffect(() => {
        if (((state && state.refreshMaster) || master) && !edit) {
            setActiveStep(0);
            navigate({
                pathname: "/dataset/new/master",
                search: createSearchParams({
                    master: "true"
                }).toString(),
            });
            master = true;
        }
    }, [state]);

    const stepsRenderer = (label: string, index: number) => {
        const labelProps: { error?: boolean; optional?: ReactNode } = {};
        if (index === errorIndex) {
            labelProps.optional = (
                <Typography variant="caption" color="error">
                    Error
                </Typography>
            );
            labelProps.error = true;
        }
        return (
            <Step key={Math.random()}>
                <StepLabel {...labelProps}>{label}</StepLabel>
            </Step>
        );
    }

    const stepper = () => (
        <Stepper activeStep={activeStep} sx={{ py: 2 }}>
            {master && masterSteps.map(stepsRenderer)}
            {!master && steps.map(stepsRenderer)}
        </Stepper>
    );

    return (
        <>
            <Box>
                <>
                    {showWizard && stepper()}
                    {(!showWizard && !isImport) && (
                        <DatasetConfiguration
                            key={key}
                            setShowWizard={setShowWizard}
                            datasetType={master ? DatasetType.MasterDataset : DatasetType.Dataset}
                            generateInteractTelemetry={generateInteractTelemetry}
                        />
                    )}
                    {(isImport && !showWizard) && (
                        <ImportDataset
                            key={key}
                            setShowWizard={setShowWizard}
                            datasetType={master ? DatasetType.MasterDataset : DatasetType.Dataset}
                            generateInteractTelemetry={generateInteractTelemetry}
                        />
                    )}
                    {showWizard &&
                        getStepContent(activeStep, handleNext, handleBack, setErrorIndex, master, edit, generateInteractTelemetry)}
                </>
            </Box>
        </>
    );
};

export default DatasetOnboarding;
