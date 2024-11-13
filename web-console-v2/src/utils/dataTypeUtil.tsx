import * as _ from 'lodash';

const defaultFormatToDataTypeMapping: any = {
    text: 'string',
    number: 'double'
};

const updateDataType = (
    val: string,
    row: any,
    pageData: any,
    persistState: any,
    setFlattenedData: any,
    hasConflicts: boolean,
    setAnchorEl: any,
    dataMappings: any
) => {
    const updatedValues = { ...row, originalColumn: row.column };
    const storeState = _.cloneDeep(pageData);

    const current_arrival_format = updatedValues?.arrival_format;
    let typeVal = _.get(dataMappings, [current_arrival_format, 'store_format', val, 'jsonSchema']);
    const storageFormats = _.get(dataMappings, [current_arrival_format, 'store_format']);
    const isValidArrivalFormat = _.get(storageFormats, [val]);
    let newArrivalFormat: any = undefined;
    if (!isValidArrivalFormat) {
        newArrivalFormat = _.findKey(dataMappings, (obj) => {
            return _.includes(_.keys(_.get(obj, ['store_format'])), val);
        });
        typeVal = _.get(dataMappings, [newArrivalFormat, 'store_format', val, 'jsonSchema']);
    }

    const updateRow = (state: any): any => {
        // Recursively update subRows
        const updatedSubRows = state.subRows ? state.subRows.map(updateRow) : [];

        // Check if all child rows with suggestions are resolved
        const allChildWithSuggestionsResolved = updatedSubRows
            .filter((subRow: any) => subRow.suggestions && subRow.suggestions.length > 0)
            .every((subRow: any) => subRow.resolved === true);

        if (_.get(state, 'column') === _.get(updatedValues, 'originalColumn')) {
            return {
                ...state,
                ...updatedValues,
                column: updatedValues.originalColumn,
                isModified: true,
                data_type: val,
                ...(hasConflicts && row?.oneof && { resolved: true }),
                ...(newArrivalFormat && { arrival_format: newArrivalFormat }),
                ...(typeVal && { type: typeVal }),
                resolved: allChildWithSuggestionsResolved || !state.suggestions?.length, // Update resolved status
                subRows: updatedSubRows
            };
        } else {
            return {
                ...state,
                subRows: updatedSubRows,
                resolved: state.canExpand
                    ? allChildWithSuggestionsResolved || !state.suggestions?.length
                    : state.resolved
            };
        }
    };

    const data = storeState.map(updateRow);

    persistState(data);
    setFlattenedData((preState: Array<Record<string, any>>) => {
        const filteredData = preState.map(updateRow);
        return filteredData;
    });
    setAnchorEl(null);
};

const resetSuggestionResolve = (
    row: any,
    pageData: any,
    persistState: any,
    setFlattenedData: any,
    hasConflicts: boolean,
    setAnchorEl: any
) => {
    const updatedValues = { ...row };
    const storeState = _.cloneDeep(pageData);

    const updateState = (state: any): any => {
        if (_.get(state, 'column') === _.get(updatedValues, 'originalColumn')) {
            return {
                ...state,
                ...updatedValues,
                column: updatedValues.originalColumn,
                isModified: true,
                ...(hasConflicts && { resolved: false })
            };
        }

        if (_.isArray(state.subRows)) {
            return {
                ...state,
                subRows: _.map(state.subRows, updateState)
            };
        }
        return state;
    };

    const data = _.map(storeState, updateState);

    persistState(data);

    setFlattenedData((preState: Array<Record<string, any>>) => {
        const filteredData = _.map(preState, updateState);
        return filteredData;
    });

    setAnchorEl(null);
};

const updateFormatType = (
    val: string,
    row: any,
    pageData: any,
    persistState: any,
    setFlattenedData: any,
    dataMappings: any,
    hasConflicts: boolean,
    setAnchorEl: any
) => {
    const storageFormats = _.get(dataMappings, [val, 'store_format']);
    const isSingleStorageFormat = _.size(storageFormats) === 1;
    const newValue = isSingleStorageFormat
        ? _.keys(storageFormats)[0]
        : defaultFormatToDataTypeMapping[val];
    const typeValue = _.get(dataMappings, [val, 'store_format', newValue, 'jsonSchema']);
    const updatedValues = { ...row };
    const storeState = _.cloneDeep(pageData);
    if (!Array.isArray(storeState)) {
        console.error('storeState is not an array:', storeState);
        return;
    }

    const updateRow = (state: any): any => {
        const updatedSubRows = state.subRows ? state.subRows.map(updateRow) : [];

        const allChildWithSuggestionsResolved = updatedSubRows
            .filter((subRow: any) => subRow.suggestions && subRow.suggestions.length > 0)
            .every((subRow: any) => subRow.resolved === true);

        if (_.get(state, 'column') === _.get(updatedValues, 'originalColumn')) {
            return {
                ...state,
                ...updatedValues,
                column: updatedValues.originalColumn,
                isModified: true,
                arrival_format: val,
                ...(newValue && { data_type: newValue }),
                ...(typeValue && { type: typeValue }),
                resolved: allChildWithSuggestionsResolved || !state.suggestions?.length, // Update resolved status
                subRows: updatedSubRows
            };
        } else {
            return {
                ...state,
                subRows: updatedSubRows,
                resolved: state.canExpand
                    ? allChildWithSuggestionsResolved || !state.suggestions?.length
                    : state.resolved
            };
        }
    };

    setFlattenedData((preState: Array<Record<string, any>>) => {
        if (!Array.isArray(preState)) {
            console.error('preState is not an array:', preState);
            return [];
        }

        const filteredData = preState.map(updateRow);
        return filteredData;
    });

    setAnchorEl(null);
};

export { updateDataType, resetSuggestionResolve, updateFormatType };
