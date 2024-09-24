import * as _ from 'lodash';
import { Grid } from '@mui/material';
import { getAllSettings, transformSystemSettingsResponse } from 'services/systemSettings';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addSystemSettings } from 'store/reducers/systemSettings';
import AccordionSection from 'components/AccordionSection';
import SystemSetting from './components/SystemSetting';
import { Typography } from '@mui/material';
import useImpression from 'hooks/useImpression';
import pageIds from 'data/telemetry/pageIds';

const getSectionsConfig = (sections: Record<string, any>) => {
    return _.entries(sections).map((section: any) => {
        const [title, settings] = section;
        return {
            id: title,
            title: title,
            component: <SystemSetting settings={settings}></ SystemSetting>
        }
    })
}

const SystemSettings = () => {
    const dispatch = useDispatch();
    const settings = useSelector((state: any) => _.get(state, 'systemSettings'));
    const formattedSettingsPayload = transformSystemSettingsResponse(settings);
    const sections = getSectionsConfig(formattedSettingsPayload);
    useImpression({ type: "detail", pageid: _.get(pageIds, ['systemSettings', 'list']) });

    const allSettings = async () => {
        const settings = await getAllSettings({});
        dispatch(addSystemSettings(settings));
    }

    useEffect(() => {
        allSettings();
    }, []);

    return (
        <>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Typography variant="h3" color="primary" mr={1}>
                        System Configurations
                    </Typography>
                </Grid>
                <Grid item xs={12}>
                    <AccordionSection sections={sections}></AccordionSection>
                </Grid>
            </Grid>
        </>
    )
};

export default SystemSettings;
