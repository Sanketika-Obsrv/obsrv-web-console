import _ from 'lodash';
import { Button, Grid } from '@mui/material';
import MUIForm from 'components/form';
import { useEffect, useRef, useState } from 'react';
import * as yup from 'yup';
import { getMetricsGroupedByComponents, queryOperators } from '../services/queryBuilder';
import { PlayArrowOutlined } from '@mui/icons-material';
import RunQuery from './RunQuery';
import Loader from 'components/Loader';
import en from 'utils/locales/en.json'
import { validateFormValues } from 'services/utils';

const QueryBuilder = (props: any) => {
    const { setFormData, existingState, sectionLabel, isFieldEditable } = props;
    const [value, subscribe] = useState<any>(() => {
        if (!_.isEmpty(existingState)) {
            const operatorType = _.get(existingState, "operator")
            const thresholdValue = _.get(existingState, "threshold")
            if (_.includes(["within_range", "outside_range"], operatorType)) {
                return { ..._.omit(existingState, ["threshold"]), threshold_from: _.get(thresholdValue, 0), threshold_to: _.get(thresholdValue, 1) }
            }
            return { ..._.omit(existingState, ["threshold_from", "threshold_to"]), threshold: _.get(thresholdValue, 0) }
        }
        return {}
    });
    const onSubmission = (value: any) => { };
    const formikRef = useRef(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(existingState?.category);
    const [loading, setLoading] = useState(false);

    const [runQuery, setRunQuery] = useState(false);
    const [validQuery, setValidQuery] = useState(false);
    const [components, setComponents] = useState<any>({});

    const shouldRenderField = (field: Record<string, any>, dependsOn: string, values: any) => {
        const currentValue = _.get(value, dependsOn);
        if (!currentValue) return null;
        if (!values || _.includes(values, currentValue)) {
            return field;
        }
    };

    const shouldRenderSubComponentField = (field: Record<string, any>, dependsOn: string) => {
        const currentValue = _.get(value, dependsOn);
        if (!currentValue) return null;
        const components = getSubComponentForSelectedComponent();
        if (_.size(components) == 0) return null;
        return field;
    };

    useEffect(() => {
        const { category } = value || {};
        if (selectedCategory !== category) {
            subscribe({ category });
            setRunQuery(false);
            setSelectedCategory(category);
        }
    }, [value?.category]);

    const getMetricsForSelectedComponent = () => {
        const selectedComponent = _.get(value, 'category');
        const selectedSubComponent = _.get(value, 'subComponent') || null;
        const supportedMetrics = _.get(components, selectedComponent) || [];
        _.groupBy(supportedMetrics, 'subComponent');

        if (selectedSubComponent) {
            const filteredMetrics = _.filter(supportedMetrics, (supportedMetric) => supportedMetric.subComponent == selectedSubComponent);
            return _.map(filteredMetrics, (supportedMetric) => {
                const { alias, metric } = supportedMetric;
                return {
                    label: alias,
                    value: metric
                };
            });
        }
        return _.map(supportedMetrics, (supportedMetric) => {
            const { alias, metric } = supportedMetric;
            return {
                label: alias,
                value: metric
            };
        });
    };

    const getSubComponentForSelectedComponent = () => {
        const selectedComponent = _.get(value, 'category');
        const supportedMetrics = _.get(components, selectedComponent) || [];
        const subComponents = _.groupBy(supportedMetrics, 'subComponent');
        _.unset(subComponents, 'null');
        return _.map(_.keys(subComponents), (subComponent) => {
            return {
                label: subComponent,
                value: subComponent
            };
        });
    };

    const fields = _.flatten(_.compact([
        {
            name: 'category',
            label: 'Component',
            type: 'select',
            required: true,
            disabled: !isFieldEditable('category'),
            selectOptions: _.map(_.keys(components), (component) => ({ label: _.capitalize(component), value: component })),
            tooltip: 'Select the rule category'
        },
        shouldRenderSubComponentField(
            {
                name: 'subComponent',
                label: 'Subcomponent',
                type: 'select',
                required: true,
                disabled: !isFieldEditable('subComponent'),
                selectOptions: getSubComponentForSelectedComponent(),
                tooltip: 'Select the rule subcategory'
            },
            'category'
        ),
        shouldRenderField(
            {
                name: 'metric',
                label: 'Metric',
                type: 'select',
                required: true,
                disabled: !isFieldEditable('metric'),
                selectOptions: getMetricsForSelectedComponent(),
                tooltip: 'Please configure the prometheus metric'
            },
            'category',
            null
        ),
        shouldRenderField(
            {
                name: 'operator',
                label: 'Operator',
                type: 'select',
                required: true,
                selectOptions: queryOperators,
                disabled: !isFieldEditable('operator'),
                tooltip: 'Operator'
            },
            'metric',
            null
        ),
        shouldRenderField(
            {
                name: 'threshold',
                label: 'Threshold',
                type: 'number',
                required: true,
                disabled: !isFieldEditable('threshold'),
                tooltip: 'Threshold value to evaluate against the metric'
            },
            'operator',
            ['gt', 'lt']
        ),
        shouldRenderField(
            [{
                name: 'threshold_from',
                label: 'Threshold - From',
                type: 'number',
                required: true,
                disabled: !isFieldEditable('category'),
                tooltip: 'Select the Threshold - from value'
            }, {
                name: 'threshold_to',
                label: 'Threshold - To',
                type: 'number',
                required: true,
                disabled: !isFieldEditable('category'),
                tooltip: 'Select the Threshold - to value'

            }],
            'operator',
            ['within_range', 'outside_range']
        )
    ]));


    const validationSchema = yup.object().shape({
        category: yup.string().required(en.isRequired),
        metric: yup.string().required(en.isRequired),
        operator: yup.string().required(en.isRequired),
        threshold: yup.number().when('operator', {
            is: (operator: any) => !_.includes(["within_range", "outside_range"], operator),
            then: yup.number().required(en.isRequired)
        }),
        threshold_from: yup.number().when('operator', {
            is: (operator: any) => _.includes(["within_range", "outside_range"], operator),
            then: yup.number().required(en.isRequired).min(0)
        }),
        threshold_to: yup.number().when('operator', {
            is: (operator: any) => _.includes(["within_range", "outside_range"], operator),
            then: yup.number().required(en.isRequired).min(0)
                .test('Greater threshold_to', 'Value must be greater than Threshold - From.', (testValue: any) => testValue > _.get(value, "threshold_from"))
        })
    });

    const validateForm = async () => {
        return validateFormValues(formikRef, value);
    };

    const subscribeToFormChanges = async () => {
        const isValid = await validateForm();
        setValidQuery(isValid);
        setFormData((preState: Record<string, any>) => {
            const error = _.get(preState, 'error');
            const { category, metric, metricAlias } = value;
            const metricMetadata = _.find(getMetricsForSelectedComponent(), (metricPayload) => metricPayload.value == metric);
            let metricAliasValue = _.get(metricMetadata, 'label');
            if (!metricAliasValue) metricAliasValue = metricAlias;
            return {
                ...preState,
                category: category,
                queryBuilderContext: { ...value, metricAlias: metricAliasValue },
                error: {
                    ...error,
                    [sectionLabel]: isValid
                }
            };
        });
    };

    const fetchComponents = async () => {
        try {
            const components = await getMetricsGroupedByComponents();
            setComponents(components);
        } catch (error) { }
        finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchComponents();
        setLoading(true)
    }, [])

    useEffect(() => {
        if (_.size(value) > 0) subscribeToFormChanges();
    }, [value]);

    const renderQueryChart = () => {
        const updateRunQuery = (flag = true) => setRunQuery(flag);
        return (
            <>
                <Grid item xs={12}>
                    <Button disabled={!validQuery} startIcon={<PlayArrowOutlined />} variant="contained" onClick={(_) => updateRunQuery()}>
                        Run Query
                    </Button>
                </Grid>
                {runQuery && (
                    <Grid item xs={12}>
                        <RunQuery random={Math.random()} handleClose={updateRunQuery} queryBuilderContext={value} />
                    </Grid>
                )}
            </>
        );
    };

    const renderQueryBuilderForm = () => {
        return (
            <Grid item sm={2}>
                <MUIForm
                    initialValues={value}
                    enableReinitialize={true}
                    subscribe={subscribe}
                    onSubmit={(value: any) => onSubmission(value)}
                    fields={fields}
                    size={{ sm: 6, xs: 6, lg: 6 }}
                    validationSchema={validationSchema}
                    ref={formikRef}
                    debounce={100}
                />
            </Grid>
        );
    };

    return <>
        {loading && <Loader />}
        <Grid container direction={'column'} spacing={2}>
            {renderQueryBuilderForm()}
            {renderQueryChart()}
        </Grid >
    </>
}

export default QueryBuilder;