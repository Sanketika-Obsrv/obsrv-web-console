import MUIForm from "components/form";
import { useEffect, useState } from "react";
import * as _ from 'lodash';
import { Grid } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { addState } from "store/reducers/wizard";
import config from 'data/initialConfig';
import { saveDatasetIntermediateState } from "services/dataset";
import * as yup from "yup";
import en from 'utils/locales/en.json';
const { spacing } = config;

const DataKeySelection = (props: any) => {
    const { id = "dataKey", description } = props;
    const dispatch = useDispatch();
    const existingState = useSelector((state: any) => _.get(state, ['wizard', 'pages', id]));
    const wizardState: any = useSelector((state: any) => state?.wizard);
    const jsonSchema = _.get(wizardState, 'pages.jsonSchema');
    const [formErrors, subscribeErrors] = useState<any>(null);
    const indexColumns = Object.entries(_.get(jsonSchema, ['schema', 'properties'])).map(([key, value]) => ({ label: key, value: key }));
    const piiFields = _.get(wizardState, 'pages.pii.selection', []);
    const tranformationFields = _.get(wizardState, 'pages.transform.selection', []);
    const transformations = [...piiFields, ...tranformationFields] || [];
    const [value, subscribe] = useState<any>({});

    const filteredIndexColumns = _.filter(indexColumns, (field) => {
        if (_.find(transformations, ['column', _.get(field, 'value')])) return false;
        return true
    })

    const pushStateToStore = (values: Record<string, any>) => dispatch(addState({ id, ...values, error: _.keys(formErrors).length > 0 }));
    const setStoreToError = () => dispatch(addState({ id, ...existingState || {}, error: existingState ? false : true }));
    const onSubmission = (value: any) => { };

    useEffect(() => {
        const dataKey = _.get(value, 'dataKey')
        dataKey && pushStateToStore({ dataKey });
    }, [value]);

    useEffect(() => {
        setStoreToError();
    }, []);

    const fields = [
        {
            name: "dataKey",
            label: "Select Data key Field",
            type: 'autocomplete',
            required: true,
            selectOptions: filteredIndexColumns
        }
    ]

    const validationSchema = yup.object().shape({
        dataKey: yup.string().required(en.isRequired),
    });

    return <>
        <Grid container rowSpacing={spacing} columnSpacing={spacing}>
            <Grid item xs={4}>
                <MUIForm
                    initialValues={existingState || {}}
                    subscribe={subscribe}
                    onSubmit={(value: any) => onSubmission(value)}
                    fields={fields}
                    size={{ xs: 6 }}
                    subscribeErrors={subscribeErrors}
                    validationSchema={validationSchema}
                />
            </Grid>
        </Grid>
    </>
}

export default DataKeySelection;
