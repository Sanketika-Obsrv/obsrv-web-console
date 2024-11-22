import React, { useCallback, useEffect, useState } from 'react';
import Action from 'components/ActionButtons/Actions';
import { Box, Button } from '@mui/material';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import HelpSection from 'components/HelpSection/HelpSection';
import styles from 'pages/ConnectorConfiguration/ConnectorConfiguration.module.css';
import processingStyle from './Processing.module.css';
import _, { mapKeys } from 'lodash';
import AccordionSection from 'components/Accordian/AccordionSection';
import { theme } from 'theme';
import ProcessingSection from './ProcessingSection/ProcessingSection';
import AddPIIDialog from './ProcessingSection/Pii/Pii';
import AddTransformationExpression from './ProcessingSection/AddTransformationExpression/AddTransformationExpression';
import AddNewField from './ProcessingSection/Derived/AddNewField';
import DataDenorm from './ProcessingSection/Denormalization/DataDenormalization';
import DedupeEvent from './ProcessingSection/DedupeEvent/DedupeEvent';
import DataValidation from './ProcessingSection/DataValidation/DataValidation';
import { useFetchDatasetsById, useDatasetList, useUpdateDataset } from 'services/dataset';
import { TransformationMode } from 'types/datasets';
import { useNavigate, useParams } from 'react-router-dom';
import Loader from 'components/Loader';
import { useDetectPiiFields } from 'services/system';
import { flattenObject, setAdditionalProperties } from 'services/json-schema';
import ProcessingHelpText from 'assets/help/processing';
export const extractTransformationOptions = (schema: any, path: string[] = []): string[] => {
    const options: string[] = [];

    if (schema?.properties) {
        for (const key in schema.properties) {
            const currentPath = [...path, key].join('.');

            if (!schema.properties[key].properties) {
                options.push(currentPath);
            }

            if (schema.properties[key].properties) {
                options.push(
                    ...extractTransformationOptions(schema.properties[key], [...path, key])
                );
            }
        }
    }

    return options;
};

const mapDatasetToProcessingData = (dataset: any) => {
    const { data_schema, transformations_config, validation_config, dedup_config, denorm_config } =
        dataset || {};

    const schema = _.get(data_schema, 'properties');

    const processingData = {
        validation: {
            validate: _.get(validation_config, ['validate'], false),
            mode: _.get(validation_config, ['mode'], '')
        },
        pii: [],
        transform: [],
        derived: [],
        dedup: {
            drop_duplicates: _.get(dedup_config, ['drop_duplicates'], false),
            dedup_key: _.get(dedup_config, ['dedup_key'], '')
        },
        denorm: denorm_config || {}
    };

    const getColumnMetadata = (fieldName: string) => _.find(schema, ['column', fieldName]);

    _.forEach(transformations_config, (transformation) => {
        const { field_key, transformation_function = {} } = transformation;

        const { type, expr, datatype, category } = transformation_function;

        const transformationMode = _.get(transformation, 'mode');

        const metadata = {
            isModified: true,
            column: field_key,
            transformationMode,
            datatype,
            transformationType: type,
            ...(_.isEqual(type, 'jsonata') && {
                transformation: expr,
                transformationType: 'custom',
                required: false
            })
        };

        if (category) {
            if (type === 'mask' || type === 'encrypt') {
                _.set(processingData, ['pii'], [..._.get(processingData, ['pii']), metadata]);
            } else {
                _.set(processingData, [category], [..._.get(processingData, [category]), metadata]);
            }
        } else {
            const isPartOfSchema = getColumnMetadata(field_key);

            if (isPartOfSchema) {
                _.set(
                    processingData,
                    ['transform'],
                    [..._.get(processingData, ['transform']), metadata]
                );
            } else {
                _.set(
                    processingData,
                    ['derived'],
                    [..._.get(processingData, ['derived']), metadata]
                );
            }
        }
    });

    return processingData;
};

export const keyMapping: any = {
    validation: 'validation_config',
    transformations: 'transformations_config',
    dedup: 'dedup_config',
    denorm: 'denorm_config'
};

let updatedSchema = {};

const Processing: React.FC = () => {

    const { datasetId }:any = useParams();

    const navigate = useNavigate();

    const { data: datasetData, isSuccess: fetchSuccess } = useFetchDatasetsById({
        datasetId,
        queryParams:
            'status=Draft&mode=edit&fields=dataset_id,data_schema,sample_data,transformations_config,validation_config,dedup_config,denorm_config,version_key'
    });

    const datasetList = useDatasetList({
        status: ['Live']
    });

    const { mutate: detectPiiFieldMutate, data: piiSuggestionResponse } = useDetectPiiFields();

    const [masterDatasets, setMasterDatasets] = useState<any>([]);

    const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

    const [piiSuggestions, setPiiSuggestions] = useState<any>([]);
    const datasetListResponse = datasetList.isSuccess && datasetList.data;

    useEffect(() => {
        if (!_.isEmpty(datasetListResponse.data)) {
            const masterDatasetResult = _.filter(datasetListResponse.data, { type: 'master' });

            setMasterDatasets(masterDatasetResult);
        }
    }, [datasetListResponse]);

    useEffect(() => {
        const mergedEvent = _.get(datasetData, 'sample_data.mergedEvent');
        const flattenedEvent = _.has(mergedEvent, '$schema') ? [] : flattenObject(mergedEvent);

        if (!_.isEmpty(flattenedEvent)) {
            detectPiiFieldMutate({ event: flattenedEvent, datasetId });
        }
    }, [detectPiiFieldMutate, datasetId, fetchSuccess, datasetData]);

    useEffect(() => {
        if (!_.isEmpty(piiSuggestionResponse)) {
            const piiSuggestionResult = _.uniqBy(
                _.map(piiSuggestionResponse, (ele: any) => ({
                    isModified: true,
                    column: _.get(ele, 'field'),
                    transformationType: 'mask',
                    transformationMode: 'Strict',
                    dataType: 'string',
                    isSuggestedField: true
                })),
                'column'
            );

            setPiiSuggestions(piiSuggestionResult);
        }
    }, [piiSuggestionResponse]);

    const transformationOptions = extractTransformationOptions(datasetData?.data_schema || {});

    const excludedKeywords = ['date', 'timestamp', 'datetime'];

    const dedupeOptions = transformationOptions.filter(
        (option) => !excludedKeywords.some((keyword) => option.toLowerCase().includes(keyword))
    );

    const jsonData = _.get(datasetData, ['sample_data']) || {};
    const [canProceed, setCanProceed] = useState(true);
    const processingData = mapDatasetToProcessingData(datasetData);

    const { mutate: updateDataset } = useUpdateDataset();

    const [isHelpSectionOpen, setIsHelpSectionOpen] = useState(true);

    const handleProceed = (value: boolean) => {
        setCanProceed(value);
    };

    const handleAddOrEdit = useCallback((data: any, mapKey: string) => {
        const keyName = keyMapping[mapKey];
        if (mapKey === 'validation') {

            updateDataset({
                data: {
                    [keyName]: data,
                    data_schema: updatedSchema,
                    dataset_id: datasetId
                }
            });
        } else {
            updateDataset({ data: { [keyName]: data, dataset_id: datasetId } });
        }
    }, []);

    const handleDelete = (fieldKey: string, data: any) => {
        let newData = {
            transformations_config: [
                {
                    value: { field_key: fieldKey },
                    action: 'remove'
                }
            ],
            dataset_id: datasetId
        };

        if (!fieldKey && _.has(data, 'denorm_config')) newData = data;

        updateDataset({ data: newData });
    };

    const handleButtonClick = () => {
        navigate(`/dataset/edit/storage/${datasetId}`);
    };
    const handleDatasetNameClick = (id: string) => setHighlightedSection(id);

    const handleHelpSectionToggle = () => setIsHelpSectionOpen(!isHelpSectionOpen);


    const actions = [
        { label: 'Mask', component: '', value: 'mask' },
        { label: 'Encrypt', component: '', value: 'encrypt' }
    ];

    const transformation_mode = [
        { label: 'Strict', component: '', value: TransformationMode.Strict, selected: true },
        { label: 'Lenient', component: '', value: TransformationMode.Lenient }
    ];

    const piiColumns: any = _.map(_.get(processingData, 'pii'), 'column');
    const derivedColumns: any = _.map(_.get(processingData, 'derived'), 'column');

    const columnsToExcludeInTransformation = _.union(piiColumns, derivedColumns);

    function filterTransformationOptions(
        transformationOptions: any[],
        columnsToExclude: any[]
    ): any[] {
        return _.filter(transformationOptions, (ele: any) => !columnsToExclude.includes(ele));
    }

    const processingSections = [
        {
            id: 'dataValidation',
            title: 'Allow Additional Fields',
            description: 'Data is by default validated against schema requirements, including data types, enumerated values, numeric ranges, min/max constraints, and required fields. Any validation failure will fail the data record. Do you want to allow additional fields?:',
            component: (
                <div onClick={() => handleDatasetNameClick('section1')}>
                    <DataValidation
                        datasetData={datasetData}
                        data={_.get(processingData, 'validation')}
                        handleAddOrEdit={(data: any) => {
                            const validation = {
                                validate: data ? true : false,
                                mode: data
                            };
                            updatedSchema = setAdditionalProperties(_.get(datasetData, ['data_schema']), data);
                            handleAddOrEdit(validation, 'validation');
                        }}
                    />
                </div>
            )
        },
        {
            id: 'denorm',
            title: 'Data Denormalization',
            description:
                'Real-time denormalization allows you to enrich data as it flows through the pipeline by joining it with master data. This helps maintain data completeness and context in downstream processes.',
            component: (
                <div onClick={() => handleDatasetNameClick('section2')}>
                    <DataDenorm
                        pageId="processing"
                        jsonData={jsonData}
                        data={_.get(processingData, ['denorm', 'denorm_fields'], [])}
                        transformationOptions={transformationOptions}
                        masterDatasets={masterDatasets}
                        handleAddOrEdit={(data: any) => handleAddOrEdit(data, 'denorm')}
                        handleDelete={(data: any) => handleDelete('', data)}
                    />
                </div>
            )
        },
        {
            id: 'pii',
            title: 'Data Privacy',
            description:
                'Identify fields containing sensitive information such as PII, passwords, keys, or company identifiers. This enables masking or encryption to ensure data privacy and protect both individual and business data.',
            component: (
                <div onClick={() => handleDatasetNameClick('section3')}>
                    <ProcessingSection
                        onClick={() => handleDatasetNameClick('section3')}
                        id="pii"
                        actions={actions}
                        transformation_mode={transformation_mode}
                        label={'Add Sensitive Field'}
                        dialog={<AddPIIDialog />}
                        transformationOptions={transformationOptions}
                        addedSuggestions={piiSuggestions}
                        setPiiSuggestions={setPiiSuggestions}
                        data={_.map(_.get(processingData, 'pii'), (obj1) => {
                            const matchingObj = _.find(piiSuggestions, {
                                column: _.get(obj1, 'column')
                            });

                            return _.assign({}, obj1, {
                                isSuggestedField: !_.isUndefined(matchingObj)
                            });
                        })}
                        handleAddOrEdit={(data: any) => handleAddOrEdit(data, 'transformations')}
                        handleDelete={handleDelete}
                    />
                </div>
            ),

            navigation: {
                next: 'transformation'
            }
        },
        {
            id: 'transform',
            title: 'Data Transformations',
            description:
                'Use JSONata to apply instant transformations on your data, such as filtering, restructuring, or calculations. Customize the flow of your data to meet specific requirements in real-time, ensuring it’s processed as needed.',
            component: (
                <div onClick={() => handleDatasetNameClick('section4')}>
                    <ProcessingSection
                        id="transform"
                        actions={[...actions, { label: 'JSONata', component: '', value: 'custom' }]}
                        transformation_mode={transformation_mode}
                        label={'Add Transformation'}
                        dialog={<AddTransformationExpression />}
                        jsonData={jsonData}
                        transformationOptions={filterTransformationOptions(transformationOptions, columnsToExcludeInTransformation)}
                        addedSuggestions={[]}
                        data={_.get(processingData, 'transform')}
                        handleAddOrEdit={(data: any) => handleAddOrEdit(data, 'transformations')}
                        handleDelete={handleDelete}
                    />
                </div>
            ),

            navigation: {
                next: 'additionalFields'
            }
        },
        {
            id: 'derived',
            title: 'Derived Fields',
            description: 'Create new fields in real-time using JSONata transformations on existing event data. These fields are added back to the event, allowing for enhanced data processing and analysis.',
            component: (
                <div onClick={() => handleDatasetNameClick('section5')}>
                    <ProcessingSection
                        id="derived"
                        actions={[{ label: 'JSONata', component: '', value: 'custom' }]}
                        transformation_mode={transformation_mode}
                        label={'Add Derived Field'}
                        dialog={<AddNewField filteredTransformation={transformationOptions} />}
                        jsonData={jsonData}
                        transformationOptions={transformationOptions}
                        addedSuggestions={[]}
                        data={_.get(processingData, 'derived')}
                        handleAddOrEdit={(data: any) => handleAddOrEdit(data, 'transformations')}
                        handleDelete={handleDelete}
                    />
                </div>
            )
        },
        {
            id: 'dedupe',
            title: 'Data Deduplication',
            description: 'Select a unique key for deduplication to prevent duplicate records from flowing into the system, ensuring data integrity and accuracy.',
            component: (
                <div onClick={() => handleDatasetNameClick('section6')}>
                    <DedupeEvent
                        data={_.get(processingData, 'dedup')}
                        transformationOptions={dedupeOptions}
                        handleAddOrEdit={(data: any) => handleAddOrEdit(data, 'dedup')}
                        isSuccess={fetchSuccess}
                        isProceed={handleProceed}
                    />
                </div>
            )
        }
    ];

    const handleNavigate = () => {
        navigate(`/dataset/edit/ingestion/schema/${datasetId}`)
    };

    useEffect(() => {
        window.scrollTo(0, 1);
    }, []);

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingBottom: '80px'
                }}
            >
                <Box mx={4}>
                    <Button
                        variant="back"
                        startIcon={
                            <KeyboardBackspaceIcon
                                className={processingStyle.backIcon}
                            />
                        }
                        onClick={handleNavigate}
                    >
                        Back
                    </Button>
                </Box>
                <Box overflow="auto" display="flex" flexDirection="column">
                    {
                        (datasetList.isPending)
                            ?
                            <Loader loading={datasetList.isPending} descriptionText="Please wait while we process your request." />
                            :
                            <Box
                                className={`${styles.formContainer} ${isHelpSectionOpen ? styles.expanded : styles.collapsed}`}
                                pr={9}
                                pl={3.5}
                                sx={{
                                    '& .MuiFormHelperText-root': {
                                        display: 'none'
                                    },
                                    '& .MuiFormControlLabel-root .MuiFormControlLabel-label': {
                                        fontSize: '1rem',
                                        color: theme.palette.text.primary
                                    },
                                    height: 'auto',
                                    scrollbarWidth: 'none',
                                    overflowY: 'auto'
                                }}
                            >
                                <AccordionSection sections={processingSections} />
                            </Box>
                    }


                    <HelpSection
                        helpSection={{
                            defaultHighlight: "section1"
                        }}
                        helpText={<ProcessingHelpText />}
                        onExpandToggle={handleHelpSectionToggle}
                        highlightSection={highlightedSection}
                        expand={isHelpSectionOpen}
                    />
                </Box>
            </Box>

            {/* Fixed Action Button Section */}
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    width: isHelpSectionOpen ? 'calc(100% - 23rem)' : '100%',
                    transition: 'width 0.3s ease',
                    zIndex: 50
                }}
            >
                <Action
                    buttons={[
                        {
                            id: 'btn2',
                            label: 'Proceed',
                            variant: 'contained',
                            color: 'primary',
                            disabled: !canProceed
                        }
                    ]}
                    onClick={handleButtonClick}
                />
            </Box>
        </Box>

    );
};

export default Processing;