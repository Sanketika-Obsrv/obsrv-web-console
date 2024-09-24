import MUIForm from "components/form";
import { useEffect, useState, useMemo } from "react";
import * as _ from 'lodash';
import { Grid } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { addState } from "store/reducers/wizard";
import config from 'data/initialConfig';
import { saveDatasetIntermediateState } from "services/dataset";
import * as yup from "yup";
import en from 'utils/locales/en.json';
const { spacing } = config;

const TimestampSelection = (props: any) => {
    const { id = "timestamp" } = props;
    const dispatch = useDispatch();
    const wizardState: any = useSelector((state: any) => state?.wizard);
    const existingState = _.get(wizardState, ['pages', id]);
    const jsonSchema = _.get(wizardState, 'pages.jsonSchema');
    const jsonSchemaCols = _.get(wizardState, 'pages.columns.state.schema') || [];
    const indexColumns: any = Object.entries(_.get(jsonSchema, 'configurations.indexConfiguration.index')).map(([key, value]) => ({ label: key, value: value })) || {};
    const [value, subscribe] = useState<any>({});
    const [formErrors, subscribeErrors] = useState<any>({ 'error': true });
    const [valueOverwrite, setValueOverwrite] = useState<any>(null);
    
    const pushStateToStore = (values: Record<string, any>, error?: any) => dispatch(addState({ id, ...values, error: error }));
    const setStoreToError = () => dispatch(addState({ id, ...existingState || {}, error: _.get(existingState, 'indexCol') ? false : true }));
    const onSubmission = (value: any) => { };

    const piiTransformation = _.get(wizardState, ['pages', 'pii', 'selection']) || [];
    const derivedFieldsTransformation = _.get(wizardState, ['pages', 'additionalFields', 'selection']) || [];
    const existingFieldsTransformation = _.get(wizardState, ['pages', 'transformation', 'selection']) || [];
    const existingAllTransformationSelections = _.flatten([...piiTransformation, ...existingFieldsTransformation, ...derivedFieldsTransformation]);

    useEffect(() => {
        setStoreToError();
    }, []);

    useEffect(() => {
        const indexCol = _.get(value, 'indexCol');
        indexCol && pushStateToStore({ indexCol }, false);
    }, [_.get(value, 'indexCol')]);

    const filterTimestampPredicate = (path: string) => (payload: Record<string, any>) => {
        if (!_.get(payload, "isDeleted") && _.includes(['date-time', 'date', 'epoch'], _.get(payload, path))) {
            return true
        } else {
            return false;
        }
    }

    const filterExistingSelection = (payload: Record<string, any>) => {
        if (_.find(existingAllTransformationSelections, ['column', _.get(payload, 'column')])) return false;
        return true
    }

    const transform = (columnMetadata: Record<string, any>) => {
        const column = _.get(columnMetadata, 'column');
        return { label: column, value: column }
    }

    const getTimestampOptions = () => {
        const filteredExistingFieldsTransformation = _.filter(existingFieldsTransformation, filterTimestampPredicate("_transformedFieldDataType"));
        const filteredDerivedFieldsTransformation = _.filter(derivedFieldsTransformation, filterTimestampPredicate("_transformedFieldDataType"));
        const schemaColumns = _.filter(_.filter(jsonSchemaCols, filterTimestampPredicate("data_type")), filterExistingSelection);
        const input = _.concat(schemaColumns, filteredExistingFieldsTransformation, filteredDerivedFieldsTransformation);
        return _.uniqBy([..._.map(input, transform), ...indexColumns], 'label');
    }

    const getIndexColumns = () => {
        const options = getTimestampOptions();
        const existingSelection = _.get(existingState, 'indexCol');
        if (existingSelection) {
            if (!_.find(options, ['value', existingSelection])) {
                dispatch(addState({ id, indexCol: "", error: true }));
                subscribe({ indexCol: "" })
            }
        }
        return options;
    }

    const fields = useMemo(() => [
        {
            name: "indexCol",
            label: "Select Timestamp Field",
            type: 'autocomplete',
            required: true,
            selectOptions: getIndexColumns(),
        }
    ], [_.get(existingAllTransformationSelections, 'length')]);

    const validationSchema = yup.object()
        .shape({
            indexCol: yup.string().required(en.isRequired),
        });

    return <>
        <Grid container rowSpacing={spacing} columnSpacing={spacing}>
            <Grid item xs={4}>
                <MUIForm
                    initialValues={existingState || {}}
                    enableReinitialize={true}
                    subscribe={subscribe}
                    onSubmit={(value: any) => onSubmission(value)}
                    fields={fields}
                    size={{ xs: 6 }}
                    validationSchema={validationSchema}
                    subscribeErrors={subscribeErrors}
                    customUpdate={setValueOverwrite}
                />
            </Grid>
        </Grid>
    </>
}

export default TimestampSelection;
