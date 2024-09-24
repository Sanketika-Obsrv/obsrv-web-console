import * as _ from "lodash";

const updateDataType = (
    val: string, row: any,
    setFlattenedData: any) => {
    const excludedValues = ['ignore', 'dimension', 'fact'];
    const updatedValues = { ...row };
    updatedValues.aggregateFunctions = updatedValues.aggregateFunctions || [];

    if (!excludedValues.includes(val)) {
        updatedValues.aggregateFunctions = updatedValues.aggregateFunctions.includes(val)
            ? updatedValues.aggregateFunctions.filter((v: any) => v !== val)
            : [...updatedValues.aggregateFunctions, val === 'fact' ? 'count' : val];
    }
    else {
        updatedValues.aggregateFunctions = []
    }

    setFlattenedData((preState: Array<Record<string, any>>) => {
        const filteredData = _.map(preState, state => {
            if (_.get(state, 'column') === (_.get(updatedValues, 'column'))) {
                return { ...state, ...updatedValues, column: updatedValues.column, isModified: true };
            }
            if (_.get(state, 'column') === (_.get(updatedValues, 'originalColumn'))) {
                return { ...state, ...updatedValues, column: updatedValues.originalColumn, isModified: true };
            }
            else return state;
        });
        return filteredData;
    });
}

const updateRollupDataType = (
    val: string, row: any,
    setFlattenedData: any) => {
    const excludedValues = ['ignore', 'dimension', 'fact'];
    const updatedValues = { ...row };
    updatedValues.aggregateFunctions = updatedValues.aggregateFunctions || [];

    if (!excludedValues.includes(val)) {
        updatedValues.aggregateFunctions = updatedValues.aggregateFunctions.includes(val)
            ? updatedValues.aggregateFunctions.filter((v: any) => v !== val)
            : [...updatedValues.aggregateFunctions, val === 'fact' ? 'count' : val];
    }
    else {
        updatedValues.aggregateFunctions = []
    }

    setFlattenedData((preState: Array<Record<string, any>>) => {
        const filteredData = _.map(preState, state => {
            if (_.get(state, 'column') === (_.get(updatedValues, 'column'))) {
                return { ...state, ...updatedValues, column: updatedValues.column, isModified: true, rollupType: val };
            }
            if (_.get(state, 'column') === (_.get(updatedValues, 'originalColumn'))) {
                return { ...state, ...updatedValues, column: updatedValues.originalColumn, isModified: true, rollupType: val };
            }
            else return state;
        });
        return filteredData;
    });
}

export { updateDataType, updateRollupDataType };
