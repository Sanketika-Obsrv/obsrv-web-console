import MUIForm from "components/form";
import { useEffect, useMemo, useRef, useState } from "react";
import * as _ from 'lodash';
import { Grid } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import config from 'data/initialConfig';
import { addState } from "store/reducers/wizard";
import * as yup from "yup";
import { IWizard } from "types/formWizard";
const { spacing } = config;

const ConditionalForm = (props: any) => {
    const dispatch = useDispatch();
    const { id, question, options } = props;
    const existingState: any = useSelector((state: any) => _.get(state, ['wizard', 'pages', id]) || ({}));
    const { questionSelection, optionSelection } = existingState;
    const [response, subscribe] = useState<any>(questionSelection || {});
    const [childFormValue, setChildFormValues] = useState<any>(optionSelection || {});
    const selectedOption = _.get(response, _.get(question, 'name'));
    const onSubmission = (value: any) => { };
    const [config, setConfig] = useState<any>({});
    const formikRef = useRef(null);
    const wizardState: IWizard = useSelector((state: any) => state?.wizard);
    const jsonSchemaCols = _.get(wizardState, 'pages.columns.state.schema') || [];

    const dedupePredicate = (columnMetadata: Record<string, any>) => {
        if (_.get(columnMetadata, 'isDeleted') === true) return false;
        const type = _.get(columnMetadata, 'data_type');
        if (_.includes(['date', 'date-time', 'epoch', 'double', 'boolean', 'bigdecimal', 'float', 'object', 'array'], type)) return false;
        return true;
    }

    const dedupeCols: any = useMemo(() => _.map(_.filter(jsonSchemaCols, dedupePredicate), (schema: any) => {
        const name = _.get(schema, 'column');
        const type = _.get(schema, 'type');
        return { label: name, value: name, type };
    }), []);

    const selectForm = () => {
        const optionMeta = _.get(options, [selectedOption]);
        if (optionMeta) {
            const { form, description, size = { sm: 6, xs: 6, lg: 6 }, dedupOptions = false } = optionMeta;
            const validations: any = {};

            _.forEach(form, formItem => {
                if (dedupOptions) formItem.selectOptions = dedupeCols;
                const validationSchema = _.get(formItem, 'validationSchema')
                if (!validationSchema) return;
                validations[formItem.name] = validationSchema
            });

            const validationSchemas = yup.object().shape(validations);
            setConfig({ form, description, size, validationSchemas });
            return true;
        } else {
            setConfig({});
            return false;
        };
    }

    const persistState = (state: Record<string, any>, error?: any) => {
        dispatch(addState({ id, ...state, error: error }));
        !error && !_.isEmpty(childFormValue) && _.size(config)
    }

    const validateForm = async () => {
        let validationPassed = true;

        if (formikRef.current) {
            const formikReference = formikRef.current as any
            const validationStatus = await formikReference.validateForm(childFormValue);
            validationPassed = _.size(validationStatus) === 0;
        }

        persistState({ questionSelection: response, optionSelection: childFormValue }, validationPassed ? false : { error: true });
    }

    useEffect(() => {
        if (!_.isEqual(questionSelection, response))
            setChildFormValues({});
    }, [response]);

    useEffect(() => {
        const data = selectForm();
        if (!data) {
            persistState({ questionSelection: response, optionSelection: childFormValue }, false);
            return;
        }
        else {
            validateForm();
        }
    }, [selectedOption, childFormValue]);

    return <>
        <Grid container rowSpacing={spacing}>
            <Grid item xs={6}> <MUIForm initialValues={response} subscribe={subscribe} onSubmit={(value: any) => onSubmission(value)} fields={[question]} /></Grid>
            {_.get(config, 'form') ? (
                <Grid item sm={12}>
                    <MUIForm
                        subscribe={setChildFormValues}
                        initialValues={childFormValue}
                        onSubmit={(value: any) => onSubmission(value)}
                        fields={_.get(config, 'form')}
                        size={_.get(config, 'size')}
                        validationSchema={_.get(config, 'validationSchemas')}
                        ref={formikRef}
                    />
                </Grid>
            ) : null}
        </Grid>
    </>
}

export default ConditionalForm
