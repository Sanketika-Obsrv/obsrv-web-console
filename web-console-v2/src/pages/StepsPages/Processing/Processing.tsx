import React, { useEffect, useState } from 'react';
import Action from 'components/ActionButtons/Actions';
import { Box, Button } from '@mui/material';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import HelpSection from 'components/HelpSection/HelpSection';
import styles from 'pages/ConnectorConfiguration/ConnectorConfiguration.module.css';
import processingStyle from './Processing.module.css';
import _ from 'lodash';
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
import { useNavigate } from 'react-router-dom';
import helpSectionData from './HelpSectionData.json';
import Loader from 'components/Loader';
import { useDetectPiiFields } from 'services/system';
import { fetchSessionStorageValue } from 'utils/sessionStorage';
import { flattenObject, setAdditionalProperties } from 'services/json-schema';

export const extractTransformationOptions = (schema: any, path: string[] = []): string[] => {
    const options: string[] = [];

    if (schema?.properties) {
        for (const key in schema.properties) {
            const currentPath = [...path, key].join('.');

            if(!schema.properties[key].properties){
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
            _.set(processingData, [category], [..._.get(processingData, [category]), metadata]);
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

const keyMapping: any = {
    validation: 'validation_config',
    transformations: 'transformations_config',
    dedup: 'dedup_config',
    denorm: 'denorm_config'
};

let updatedSchema = {};

const Processing: React.FC = () => {
    const datasetId = fetchSessionStorageValue('configDetails', 'dataset_id') || '';

    const navigate = useNavigate();

    const { data: datasetData, isSuccess: fetchSuccess } = useFetchDatasetsById({
        datasetId,
        queryParams:
            'status=Draft&mode=edit&fields=data_schema,sample_data,transformations_config,validation_config,dedup_config,denorm_config'
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
    const [canProceed, setCanProceed] = useState(false);
    const processingData = mapDatasetToProcessingData(datasetData);

    const { mutate: updateDataset } = useUpdateDataset();

    const [isHelpSectionOpen, setIsHelpSectionOpen] = useState(false);

    const handleProceed = (value: boolean) => {
        setCanProceed(value);
    };

    const handleAddOrEdit = (data: any, mapKey: string) => {
        const keyName = keyMapping[mapKey];
        if (mapKey === 'validation') {
            
            updateDataset({ 
                data: { 
                    [keyName]: data,
                    data_schema: updatedSchema
                } 
            });
        } else {
            updateDataset({ data: { [keyName]: data } });
        }
    };

    const handleDelete = (fieldKey: string, data: any) => {
        let newData = {
            transformations_config: [
                {
                    value: { field_key: fieldKey },
                    action: 'remove'
                }
            ]
        };

        if (!fieldKey && _.has(data, 'denorm_config')) newData = data;

        updateDataset({ data: newData });
    };

    const handleButtonClick = () => {
        navigate(`/home/storage/${datasetId}`);
    };
    const handleDatasetNameClick = (id: string) => setHighlightedSection(id);

    const handleHelpSectionToggle = () => setIsHelpSectionOpen(!isHelpSectionOpen);

    const helpSection = {
        isOpen: isHelpSectionOpen,
        activeMenuId: 'setupGuide',
        menus: helpSectionData.menus
    };

    const actions = [
        { label: 'Mask', component: '', value: 'mask' },
        { label: 'Encrypt', component: '', value: 'encrypt' }
    ];

    const transformation_mode = [
        { label: 'Strict', component: '', value: TransformationMode.Strict, selected: true },
        { label: 'Lenient', component: '', value: TransformationMode.Lenient }
    ];

    const processingSections = [
        {
            id: 'dataValidation',
            title: 'Data Validation',
            component: (
                <div onClick={() => handleDatasetNameClick('section1')}>
                    <DataValidation
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
                'Data denormalization is a technique used in database design where the data in a database is intentionally made less normalized. In other words, instead of having data organized into many separate tables that are related to each other by keys, the data is combined into fewer tables.',
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
            title: 'PII Fields',
            description:
                'PII is sensitive information that needs to be protected and kept secure to prevent identity theft, fraud, or other types of harm.  PII fields are often identified and tagged to ensure that appropriate controls are in place to protect the data',
            component: (
                <div onClick={() => handleDatasetNameClick('section3')}>
                    <ProcessingSection
                        id="pii"
                        actions={actions}
                        transformation_mode={transformation_mode}
                        label={'Add PII Field'}
                        dialog={<AddPIIDialog />}
                        transformationOptions={_.union(
                            transformationOptions,
                            _.map(piiSuggestions, 'column')
                        )}
                        addedSuggestions={piiSuggestions}
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
            title: 'Fields Transformation',
            description:
                'Field transformations allows users to manipulate and transform data during ingestion or query time. Custom Expressions specify a set of column transformations to be performed on input data',
            component: (
                <div onClick={() => handleDatasetNameClick('section4')}>
                    <ProcessingSection
                        id="transform"
                        actions={[...actions, { label: 'JSONata', component: '', value: 'custom' }]}
                        transformation_mode={transformation_mode}
                        label={'Add Transformation'}
                        dialog={<AddTransformationExpression />}
                        jsonData={jsonData}
                        transformationOptions={transformationOptions}
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
            description: 'Create New Columns by applying custom transformation expressions',
            component: (
                <div onClick={() => handleDatasetNameClick('section5')}>
                    <ProcessingSection
                        id="derived"
                        actions={[{ label: 'JSONata', component: '', value: 'custom' }]}
                        transformation_mode={transformation_mode}
                        label={'Add Derived Field'}
                        dialog={<AddNewField />}
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
            title: 'Dedupe Events',
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
            <Loader loading={datasetList.isPending} descriptionText="Loading the page" />
            <Box
                my={2.4}
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingBottom: '80px',
                    paddingTop: 2
                }}
            >
                <Box mx={3.5} marginBlock={2} mt={-2}>
                    <Button
                        variant="text"
                        sx={{ color: theme.palette.text.primary }}
                        startIcon={<KeyboardBackspaceIcon className={processingStyle.backIcon} />}
                        onClick={() => {
                            navigate(-1);
                        }}
                    >
                        Back
                    </Button>
                </Box>
                <Box overflow="auto" display="flex" flexDirection="column">
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

                    <HelpSection
                        helpSection={{
                            ...helpSection,
                            highlightedSection: highlightedSection
                        }}
                        onExpandToggle={handleHelpSectionToggle}
                        expand={isHelpSectionOpen}
                    />
                </Box>
            </Box>

            {/* Fixed Action Button Section */}
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: -30,
                    width: isHelpSectionOpen ? 'calc(100% - 400px)' : '102%',
                    transition: 'width 0.3s ease',
                    zIndex:50
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
