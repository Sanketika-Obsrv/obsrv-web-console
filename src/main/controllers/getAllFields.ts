import { NextFunction, Request, Response } from "express";
import { fetchDatasetRecord } from "../services/dataset";
import * as _ from "lodash";
import { flattenSchema, formatDenormFields, formatNewFields } from "../helpers/getAllFieldsHelper";

export default {
    name: 'get:all:fields',
    handler: () => async (request: Request, response: Response, next: NextFunction) => {
        const { dataset_id } = request.params;
        const status: any = request.query.status;
        let flattenResult: any = [];
        try {
            const dataset = await fetchDatasetRecord(dataset_id, status);
            const data_schema = _.get(dataset, "data_schema", {});
            const denorm_config = _.get(dataset, "denorm_config", []);
            const transformations_config = _.get(dataset, "transformations_config", [])
            const flattenedSchemaFields = flattenSchema(data_schema);
            const derivedFields = formatNewFields(transformations_config, null)
            const denorm_fields = await formatDenormFields(_.get(denorm_config, "denorm_fields"), transformations_config);
            let pageData = _.map(flattenedSchemaFields, (item) => {
                const transformedData = _.find(transformations_config, { field_key: item.column });
                if (transformedData) {
                    return {
                        ...item,
                        data_type: transformedData?.transformation_function?.datatype
                    };
                }
                return item;
            });
            flattenResult.push([...pageData, ...denorm_fields, ...derivedFields])
            response.status(200).json(flattenResult)
        } catch (error) {
            next(error);
        }
    }
};