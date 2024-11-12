import React from 'react';
import { Grid } from '@mui/material';
import MainCard from 'components/MainCard';
import _ from 'lodash';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { editAlert, getAlertDetail } from 'services/alerts';
import AlertInfo from '../components/RuleInfo';
import QueryBuilder from '../components/QueryBuilder';
import RuleLabels from '../components/RuleLabels';
import NotificationComponent from '../components/NotificationComponent';
import { validateForm } from '../services/queryBuilder';
import { transformRulePayload, renderSections } from '../services/utils';
import { getConfiguration } from '../services/configuration';
import { Alert } from '@mui/material';
import { renderSkeleton } from 'services/skeleton';
import { useAlert } from 'contexts/AlertContextProvider';

const EditRule = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const [formData, setFormData] = useState<Record<string, any>>({ error: {} });
    const commonProps = { formData, setFormData, showAlert };
    const [ruleMetadata, setRuleMetadata] = useState({});
    const [loading, setLoading] = useState(false);
    const [configuration, setConfiguration] = useState<Record<string, any>>({});
    const alertType = _.get(ruleMetadata, 'context.alertType');

    const fetchRuleMetadata = async (id: string) => {
        try {
            const metadata = await getAlertDetail({ id });
            setRuleMetadata(metadata);
            setConfiguration(getConfiguration(metadata));
        } catch (err) {
            showAlert("Failed to fetch rule metadata", "error");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (id) {
            setLoading(true);
            fetchRuleMetadata(id);
        }
    }, [id]);

    const isFieldEditable = (id: string) => {
        const editableFields = configuration?.edit?.editableFields || "*";
        if (editableFields === "*") return true;
        return _.includes(editableFields, id);
    }

    const sections = useMemo(() => [
        {
            id: 'notifications',
            title: 'Notification Channel',
            description: 'Configure notification channel for your alert',
            component: <NotificationComponent {...{ ...commonProps, existingState: _.pick(ruleMetadata, 'notification'), sectionLabel: "notifications", isFieldEditable }} />
        },
        {
            id: 'queryBuilder',
            title: 'Query Builder',
            description: 'List down the requirements of your query and set the alert conditions',
            component: <QueryBuilder {...{ ...commonProps, existingState: _.get(ruleMetadata, 'metadata.queryBuilderContext'), sectionLabel: "queryBuilder", isFieldEditable }} />
        },
        {
            id: 'alertInfo',
            title: 'Rule Configuration',
            description: 'Set the basic information for your alert',
            component: <AlertInfo {...{ ...commonProps, existingState: _.pick(ruleMetadata, ['name', 'description', 'interval', 'frequency', 'severity']), sectionLabel: "alertInfo", isFieldEditable }} />
        },
        {
            id: 'labels',
            title: 'Labels',
            description: 'Attach labels to your alert',
            component: <RuleLabels {...{ ...commonProps, existingState: _.pick(ruleMetadata, 'labels'), sectionLabel: "labels", isFieldEditable }} />
        }
    ], [ruleMetadata]);

    const editAlertRule = async () => {
        const rulePayload = await transformRulePayload({ ...formData, context: { alertType: alertType } });
        return editAlert({ id: id, data: rulePayload });
    };

    const updateRule = async () => {
        setLoading(true)
        try {
            if (validateForm(_.get(formData, 'error'))) {
                await editAlertRule();
                navigate(`/alertRules/${_.toLower(alertType)}`);
                showAlert("Alert Rule updated successfully", "success");
            } else {
                showAlert("Please fill all required fields", "error");
            }
        } catch (err) {
            showAlert("Failed to update alert rule", "error");
        } finally {
            setLoading(false);
        }
    }

    const renderWarningMessage = () => {
        const warningMessage = configuration?.edit?.warningMessage;
        if (!warningMessage) return null;
        return <Alert severity="warning">{warningMessage}</Alert>
    }

    return (
        <MainCard content={false}>
            {renderWarningMessage()}
            <Grid>{loading ?
                renderSkeleton({ config: { type: "card", loader: true, height: 80 } }) :
                renderSections({ sections: sections, formData: formData, actionHandler: updateRule, actionLabel: "Update Rule" })
            }</Grid>
        </MainCard>
    );
};

export default EditRule;
