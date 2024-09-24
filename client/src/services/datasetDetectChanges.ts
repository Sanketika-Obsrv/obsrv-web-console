import _ from 'lodash';
import { setMetadata } from 'store/reducers/wizard';

export enum SCHEMA_ACTIONS {
    "UPDATE_DATA_TYPE",
    "DELETE_FIELD"
}

const detectSectionsWhereKeyIsUsed = (field: string, wizardState: Record<string, any>) => {

    const dataSource = () => {
        const jdbcTimestampColumn = _.get(wizardState, 'pages.dataSource.value.jdbc.timestampColumn');
        if (field === jdbcTimestampColumn) return { section: "dataSource" };
        return null;
    }

    const timestamp = () => {
        const indexColumn = _.get(wizardState, 'pages.timestamp.indexCol');
        if (field === indexColumn) return { section: "timestamp" };
        if (indexColumn) {
            const derivedFieldsTransformations = _.get(wizardState, 'pages.additionalFields.selection') || [];
            const derivedFieldTimestampSelection = _.find(derivedFieldsTransformations, ['column', indexColumn]);
            if (derivedFieldTimestampSelection) {
                if (_.includes(_.get(derivedFieldTimestampSelection, 'transformation'), field)) {
                    return { section: "timestamp" }
                }
            }
        }
        return null;
    }

    const transformations = () => {

        const checkForExistingFields = (selections: Record<string, any>[]) => {
            return _.some(selections, selection => _.get(selection, 'column') === field);
        }

        const checkDerivedFields = () => {
            const selections = _.get(wizardState, 'pages.additionalFields.selection') || [];
            return _.some(selections, selection => {
                return _.includes(_.get(selection, 'transformation'), field)
            })
        }

        const sections = [
            {
                sectionName: "pii",
                validate: () => {
                    return checkForExistingFields(_.get(wizardState, 'pages.pii.selection') || []);
                }
            },
            {
                sectionName: "transformation",
                validate: () => {
                    return checkForExistingFields(_.get(wizardState, 'pages.transformation.selection') || []);
                }
            },
            {
                sectionName: "additionalFields",
                validate: () => checkDerivedFields()
            }
        ];

        return _.map(sections, section => {
            const isExists = section.validate();
            if (isExists) return { section: section.sectionName }
            return null;
        });

    }

    const dedupe = () => {
        const dedupeSelection = _.get(wizardState, 'pages.dedupe.optionSelection.dedupeKey');
        if (dedupeSelection === field) return { section: "dedupe" };
        return null;
    }

    return _.compact(_.flatten([dataSource(), timestamp(), transformations(), dedupe()]));
}

export const detectSchemaConflicts = (payload: Record<string, any>) => {
    const { field, action, dispatch } = payload;
    const { store } = require('store');
    const state = store.getState();
    const wizardState = _.get(state, 'wizard');
    const existingConflicts = _.get(wizardState, 'metadata.conflicts') || {};
    switch (action) {

        case SCHEMA_ACTIONS.UPDATE_DATA_TYPE: {
            const sections = detectSectionsWhereKeyIsUsed(field, wizardState);
            return sections;
        }

        case SCHEMA_ACTIONS.DELETE_FIELD: {
            const sections = detectSectionsWhereKeyIsUsed(field, wizardState);
            dispatch(setMetadata({
                conflicts: _.reduce(sections, (conflicts: Record<string, any>, sectionMeta) => {
                    const { section } = sectionMeta;
                    const conflictMessages = conflicts[section] || [];
                    conflicts[section] = [...conflictMessages, `${field} no longer exists in the schema`];
                    return conflicts;
                }, {})
            }))
            return sections;
        }

        default: {
            throw new Error("Invalid Action");
        }
    }
}