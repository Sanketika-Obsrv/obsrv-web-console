import { useState } from 'react';
import { Grid } from '@mui/material';
import * as _ from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { IWizard } from 'types/formWizard';
import FieldSection from './FieldSection';
import { sections as allSections } from 'data/wizard';
import { useSearchParams } from 'react-router-dom';
import useImpression from 'hooks/useImpression';
import pageIds from 'data/telemetry/pageIds';
import WizardNavigator from './WizardNavigator';
import { saveDatasetIntermediateState } from 'services/dataset';

const SectionsConfiguration = ({ handleNext, handleBack, index, section, master, edit, generateInteractTelemetry }: any) => {
    const sections = _.get(allSections, section) || [];
    const wizardState: IWizard = useSelector((state: any) => state?.wizard);
    const jsonSchemaData = _.get(wizardState, 'pages.columns.state.schema') || [];
    const [expanded, setExpanded] = useState<string | false>(false);
    const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => { setExpanded(isExpanded ? panel : false) };
    const dispatch = useDispatch();
    const [queryParams] = useSearchParams();

    const pageIdPrefix = _.get(pageIds, [master ? 'masterdataset' : 'dataset', edit ? 'edit' : 'create']);
    const pageIdSuffix = _.get(pageIds, [master ? 'masterdataset' : 'dataset', 'pages', section]);
    useImpression({ type: "view", pageid: `${pageIdPrefix}:${pageIdSuffix}` });

    const predicate = (section: Record<string, any>) => {
        const isMasterFromParam = queryParams.get("master");
        if ('master' in section) {
            const isMaster = section.master;
            if (!isMasterFromParam) {
                if (!isMaster) return true
            }
            if ((!isMaster && isMasterFromParam == "false")) return true;
            return isMaster.toString() === isMasterFromParam;
        }
        return true;
    }

    const renderSection = (sectionData: Record<string, any>, section: any) => {
        return (
            <FieldSection
                expanded={expanded}
                setExpanded={setExpanded}
                handleChange={handleChange}
                {...sectionData}
                data={jsonSchemaData}
                section={section}
                index={index}
                master={master}
                generateInteractTelemetry={generateInteractTelemetry}
            />
        );
    }
    const renderData = sections.filter(predicate);

    const verifyErrorsResolved = () => {
        const currenState: any = _.cloneDeep(wizardState?.pages) || {};
        const sectionIds: any = _.map(renderData, 'id');
        const error = _.map(sectionIds, (sectionId: any) => _.get(currenState[sectionId], 'error'));
        const isResolved = _.every(error, (item) => item === false || item === undefined);
        return isResolved;
    }

    const gotoNextSection = () => {
        saveDatasetIntermediateState({})
        handleNext()
    };
    const gotoPreviousSection = () => {
        handleBack()
    };

    return <>
        <Grid container>
            <Grid item xs={12}>{renderData.map(renderSection)}</Grid>
            <Grid item xs={12}>
                <WizardNavigator
                    showPrevious={true}
                    pageId='section:config'
                    master={master}
                    section={section}
                    gotoNextSection={gotoNextSection}
                    gotoPreviousSection={gotoPreviousSection}
                    nextDisabled={!verifyErrorsResolved()}
                    edit={edit}
                    generateInteractTelemetry={generateInteractTelemetry}
                />
            </Grid>
        </Grid>
    </>;
};

export default SectionsConfiguration;
