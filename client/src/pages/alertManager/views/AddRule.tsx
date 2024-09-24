import { Grid } from '@mui/material';
import _ from 'lodash';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addAlert } from 'services/alerts';
import AlertInfo from '../components/RuleInfo';
import QueryBuilder from '../components/QueryBuilder';
import RuleLabels from '../components/RuleLabels';
import NotificationComponent from '../components/NotificationComponent';
import { useDispatch } from 'react-redux';
import { error, success } from 'services/toaster';
import { validateForm } from '../services/queryBuilder';
import { transformRulePayload, renderSections } from '../services/utils';
import Loader from 'components/Loader';

const AddAlertrules = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [formData, setFormData] = useState<Record<string, any>>({ error: { alertInfo: false, queryBuilder: false } });
    const [loading, setLoading] = useState(false);

    const isFieldEditable = (value: string) => {
        return true;
    };

    const sections = useMemo(() => {
        const commonProps = { formData, setFormData, dispatch, isFieldEditable };
        return [
            {
                id: 'queryBuilder',
                title: 'Query Builder',
                description: 'List down the requirements of your query and set the alert conditions',
                component: <QueryBuilder {...{ ...commonProps, existingState: {}, sectionLabel: 'queryBuilder', isFieldEditable }} />
            },
            {
                id: 'alertInfo',
                title: 'Rule Configuration',
                description: 'Set the basic information for your alert',
                component: (
                    <AlertInfo
                        {...{
                            ...commonProps,
                            existingState: { frequency: '1m', interval: '1m' },
                            sectionLabel: 'alertInfo',
                            isFieldEditable
                        }}
                    />
                )
            },
            {
                id: 'labels',
                title: 'Labels',
                description: 'Attach labels to your alert',
                component: <RuleLabels {...{ ...commonProps, existingState: {}, sectionLabel: 'labels', isFieldEditable }} />
            },
            {
                id: 'notifications',
                title: 'Notification Channel',
                description: 'Configure notification channel for your alert',
                component: <NotificationComponent {...{ ...commonProps, existingState: {}, sectionLabel: 'notifications' }} />
            }
        ];
    }, []);

    const addAlertRule: any = async () => {
        const rulePayload = transformRulePayload({ ...formData, context: { alertType: 'CUSTOM' } });
        return addAlert(rulePayload);
    };

    const createAlertRule = async () => {
        setLoading(true);
        try {
            if (validateForm(_.get(formData, 'error'))) {
                await addAlertRule();
                navigate('/alertRules/custom');
                dispatch(success({ message: 'Alert Rule created successfully' }));
            } else {
                dispatch(error({ message: 'Please fill all required fields' }));
            }
        } catch (err) {
            dispatch(error({ message: "Failed to create alert rule" }));
        } finally {
            setLoading(false)
        }
    };

    return <>
        {loading && <Loader />}
        <Grid>{renderSections({ sections: sections, formData: formData, actionHandler: createAlertRule, actionLabel: "Create Rule" })}</Grid>
    </>
};

export default AddAlertrules;
