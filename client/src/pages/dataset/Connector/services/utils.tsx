import { s3ConfigsAdditionalFields } from "data/connectors/object/s3";
import { inputFields } from "data/wizard/editLiveDataset";
import _ from "lodash";

export const validateFormValues = async (form: React.MutableRefObject<any>, value: Record<string, any>) => {
    let validationStatus = true;
    if (form.current) {
        for (let i = 0; i < form.current.length; i++) {
            const formikReference = form.current[i].current;
            if (formikReference) {
                for (const field in value) {
                    formikReference.setFieldTouched(field)
                }
                const validationState = await formikReference.validateForm(value);
                if (_.size(validationState) > 0) {
                    validationStatus = false;
                }
            }
        }
    }
    return validationStatus;
}

export const renderFeildsOnCondition = (value: Record<string, any>, formData: Record<string, any>) => {
    const formKeys = _.keys(formData);
    const formValues = _.values(formData);

    const isValid = _.filter(value, (fields: any) => _.includes(formKeys, fields.name));
    const checkAdditionalFields = s3ConfigsAdditionalFields.filter(fields =>
        _.some(value, (fieldValue: any) => fields.field === fieldValue.name && _.includes(formValues, fields.value))
    );

    if (isValid.length && checkAdditionalFields.length) {
        const additionalFields = _.flatMap(checkAdditionalFields, payload => payload.formField);
        return _.concat(value, additionalFields);
    }
    return value;
}

export const renderFeildsOnConditionForEditDataset = (value: Record<string, any>, formData: Record<string, any>) => {
    const formKeys = _.keys(formData);
    const formValues = _.values(formData);

    const isValid = _.filter(value, (fields: any) => _.includes(formKeys, fields.name));
    const checkAdditionalFields: any = formData.filter((fields: any) =>
        _.some(value, (fieldValue: any) => fields.field === fieldValue.name && _.includes(formValues, fields.value))
    );

    if (isValid.length && checkAdditionalFields.length) {
        const additionalFields = _.flatMap(checkAdditionalFields, payload => payload.formField);
        return _.concat(value, additionalFields);
    }

    return value;
}
