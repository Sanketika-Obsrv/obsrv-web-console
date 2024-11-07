import React from 'react';
import { useState, ReactNode, useEffect } from 'react';
import { Step, Stepper, StepLabel, Typography, Box } from '@mui/material';
import * as _ from 'lodash';
import ListDimensions from './ListDimensions';
import ListMetrics from './ListMetrics';
import { useLocation, useParams } from 'react-router';
import { datasetRead, formatNewFields, getDatasetState } from 'services/dataset';
import { searchDatasources } from 'services/rollups';
import { flattenSchemaV1 } from 'services/json-schema';
import { steps } from '../../../services/commonUtils';
import Loader from 'components/Loader';
import ReviewRollup from './ReviewRollup';
import { DatasetStatus } from 'types/datasets';
import en from 'utils/locales/en.json';
import { useAlert } from 'contexts/AlertContextProvider';
import { dataMappings } from 'utils/dataMappings';

const RollupConfig = () => {
  const [showWizard, setShowWizard] = useState(true);
  const [errorIndex, setErrorIndex] = useState<number | null>(null);
  const [rollupState, setUpdatedRollupState] = useState<any>();
  const [activeStep, setActiveStep] = useState(0);
  const { datasetId } = useParams();
  const [datasetState, setDatasetState] = useState<any>({});
  const [flattenedData, setFlattenedData] = useState<Array<Record<string, any>>>([]);
  const location = useLocation()
  const [loading, setLoading] = useState(false);
  const [selectedGranularityOptions, setSelectedGranularityOptions] = useState<any>([]);
  const [indexColumn, setIndexColumn] = useState<string>("");
  const [customGranularity, setCustomGranularity] = useState<any>([]);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [datasetName, setDatasetName] = useState<string>('');
  const [rollupMetadata, setRollupMetadata] = useState<any>({});
  const [filteredRollup, setFilteredRollup] = useState<Record<string, any>>();
  const [isValidFilter, setIsValidFilter] = useState<boolean>(true)
  const [skipFilters, setSkipFilters] = useState<boolean>(false)
  const [filterRollupErrors, setFilterRollupErrors] = useState<string>()
  const { showAlert } = useAlert();

  const selectCardinalityKeys = (summary: any) => {
    const keysWithIndexFalse = Object.keys(summary).filter(key => !summary[key].index);
    return keysWithIndexFalse;
  }

  interface MyObject {
    key: string;
    [key: string]: any;
  }

  function mergeAndKeepAllKeys(
    modifiedFlattenedData: MyObject[],
    newlyAddedDataForRollups: MyObject[],
    mergeKey: string
  ): MyObject[] {
    const mergedMap: Map<string, MyObject> = new Map();

    // Process modifiedFlattenedData and add to the mergedMap
    modifiedFlattenedData.forEach(obj => {
      const keyValue = obj[mergeKey];
      mergedMap.set(keyValue, { ...obj });
    });

    // Process newlyAddedDataForRollups and update the mergedMap
    newlyAddedDataForRollups.forEach(obj => {
      const keyValue = obj[mergeKey];
      if (mergedMap.has(keyValue) && keyValue !== 'rollupType') {
        const existingObject: any = { ...mergedMap.get(keyValue) };
        // Check for conditions to update values
        if (!existingObject.isNewlyAdded && !existingObject.isModified) {
          // Copy all keys from newDataForRollups to existingObject
          Object.keys(obj).forEach(key => {
            existingObject[key] = obj[key];
          });
          mergedMap.set(keyValue, existingObject);
        }
      } else {
        // Add new keys if not present and key is not 'rollupType'
        if (keyValue !== 'rollupType') {
          mergedMap.set(keyValue, { ...obj });
        }
      }
    });

    // Convert the map values back to an array
    const mergedArray: MyObject[] = Array.from(mergedMap.values());
    return mergedArray;
  }

  const getRollupType = (item: any, cardinalKeys: any, isNewlyAddedField: any) => {
    const isStringType = ["string", "text", "boolean"];
    const includesDateType = _.includes(['epoch', 'date-time', 'date'], item.data_type);
    const isArrayType = ["array"];
    const isNumberType = item.arrival_format === 'number';

    const isAnyItemNewlyAdded = _.some(isNewlyAddedField, (newItem) => item.column.includes(newItem?.column));

    const isIgnore = () => (
      _.some(cardinalKeys, column => item.column.includes(column)) ||
      ((_.includes(isStringType, item.arrival_format) || isNumberType) && includesDateType) ||
      _.includes(isArrayType, item.arrival_format) || (item?.rollupType === 'ignore' && (!_.includes(isStringType, item.arrival_format) || !isNumberType)) || isAnyItemNewlyAdded
    );

    const isDimension = () => (_.includes(isStringType, item.arrival_format)) && !includesDateType;

    const isFact = () => isNumberType && !includesDateType;

    const conditionMapping: any = {
      ignore: isIgnore(),
      dimension: isDimension(),
      fact: isFact(),
      object: () => (item.arrival_format === 'object' && item?.parent === true),
    };

    for (const condition in conditionMapping) {
      if (conditionMapping[condition]) {
        return condition || 'dimension';
      }
    }
  };

  const getSchema = async () => {
    try {
      setLoading(true)
      const response = await datasetRead({ datasetId: `${datasetId}?mode=edit&fields=data_schema,dataset_config,name,transformations_config,dataset_id` }).then(response => _.get(response, 'data.result'));
      const datasetState = _.get(response, 'dataset_config')
      let newFields = _.get(response, 'transformation_config') || [];
      newFields = _.filter(newFields, field => _.get(field, "metadata.section") === "derived")
      newFields = formatNewFields(newFields, dataMappings);
      setDatasetState(response)
      setDatasetName(_.get(response, 'name'));
      const flattenedSchema = flattenSchemaV1(_.get(response, 'data_schema'));
      const tsValues = _.get(response, ["dataset_config", "keys_config", "timestamp_key"])
      setIndexColumn(tsValues);
      let cardinalKeys: any = [];
      if (_.get(datasetState, "configurations.indexConfiguration.rollupSuggestions")) {
        const cardinalityColumns = _.get(datasetState, "configurations.indexConfiguration.rollupSuggestions.summary")
        cardinalKeys = selectCardinalityKeys(cardinalityColumns || []);
      }

      const flattenedDataWithoutIndexCol = flattenedSchema.filter((item: any) => {
        if (item.column !== tsValues) {
          return item
        }
      })

      const data: any = _.map([...flattenedDataWithoutIndexCol, ...newFields], (item: any) => ({ ...item, rollupType: getRollupType(item, cardinalKeys, []) }));

      if (location.state?.edit === true) {
        const response = await searchDatasources({ datasetId: `${datasetId}`, config: { params: { status: DatasetStatus.Draft } } });
        const rollupClientState = response?.data.result.filter((ele: any) => {
          if (ele.dataset_id === datasetId && ele.datasource === location.state?.rollupDatasourceName) {
            return ele
          }
        })
        setFilteredRollup(_.get(rollupClientState, '[0].ingestion_spec.spec.dataSchema.transformSpec', {}));
        setRollupMetadata(_.get(rollupClientState, '[0].metadata', []));
        const modifiedFlattenedData = rollupClientState[0]?.metadata?.value;
        const newFildsRollupType = _.differenceBy(flattenedDataWithoutIndexCol, modifiedFlattenedData, 'key');
        const mergedArray: any = mergeAndKeepAllKeys(modifiedFlattenedData, flattenedDataWithoutIndexCol, "key") || [];
        const data: any = _.map([...mergedArray, ...newFields], (item) => ({ ...item, rollupType: getRollupType(item, cardinalKeys, newFildsRollupType) }));
        setFlattenedData(data)
        setLoading(false)
      }
      else {
        setFlattenedData(data)
        setLoading(false)
      }
    } catch (err) {
      setLoading(false)
      showAlert(en.datasetNotExist, "error")
    }
  }

  const getStepContent = (step: number, handleNext: () => void, handleBack: () => void, setErrorIndex: (i: number | null) => void, master: boolean, edit: boolean, setActiveStep: any) => {
    switch (step) {
      case 0:
        return <ListDimensions
          handleBack={handleBack}
          handleNext={handleNext}
          setErrorIndex={setErrorIndex}
          index={0}
          edit={edit}
          param="Dimensions"
          setActiveStep={setActiveStep}
          datasetState={datasetState}
          setUpdatedRollupState={setUpdatedRollupState}
          flattenedData={flattenedData}
          setFlattenedData={setFlattenedData}
          getSchema={getSchema}
          setSelectedGranularityOptions={setSelectedGranularityOptions}
          selectedGranularityOptions={selectedGranularityOptions}
          indexColumn={indexColumn}
          customGranularity={customGranularity}
          setCustomGranularity={setCustomGranularity}
          selectedOptions={selectedOptions}
          setFilteredRollup={setFilteredRollup}
          filteredRollup={filteredRollup}
          setIsValidFilter={setIsValidFilter}
          isValidFilter={isValidFilter}
          setSkipFilters={setSkipFilters}
          skipFilters={skipFilters}
          setFilterRollupErrors={setFilterRollupErrors}
          filterRollupErrors={filterRollupErrors}
          setSelectedOptions={setSelectedOptions} />;

      case 1:
        return <ListMetrics
          handleBack={handleBack}
          handleNext={handleNext}
          setErrorIndex={setErrorIndex}
          index={1}
          edit={edit}
          param="Aggregations"
          setActiveStep={setActiveStep}
          datasetState={datasetState}
          rollupState={rollupState}
          setUpdatedRollupState={setUpdatedRollupState}
          flattenedData={flattenedData}
          setFlattenedData={setFlattenedData} />

      case 2:
        return <ReviewRollup
          handleBack={handleBack}
          handleNext={handleNext}
          setErrorIndex={setErrorIndex}
          index={2}
          edit={edit}
          param="Granularity"
          setActiveStep={setActiveStep}
          datasetState={datasetState}
          rollupState={rollupState}
          setUpdatedRollupState={setUpdatedRollupState}
          selectedGranularityOptions={selectedGranularityOptions}
          flattenedData={flattenedData}
          datasetName={datasetName}
          filteredRollup={filteredRollup}
          isValidFilter={isValidFilter}
          skipFilters={skipFilters}
          rollupMetadata={rollupMetadata} />

      default:
        throw new Error('Unknown step');
    }
  };

  const handleNext = () => {
    setActiveStep((prevState: any) => {
      const page = prevState + 1;
      return page;
    });
    setErrorIndex(null);
  };

  const handleBack = () => {
    if (activeStep === 0) setShowWizard(false);
    else setActiveStep((prevState: any) => {
      const page = prevState - 1;
      return page;
    });
  };

  useEffect(() => {
    if (_.isEmpty(flattenedData)) {
      getSchema()
    }
    setShowWizard(true)
  }, [filteredRollup]);

  const stepper = () => (
    <Stepper activeStep={activeStep} sx={{ py: 2 }}>
      {steps.map((label, index: any) => {
        const labelProps: { error?: boolean; optional?: ReactNode } = {};
        if (index === errorIndex) {
          labelProps.optional = (
            <Typography variant="caption" color="error">
              Error
            </Typography>
          );
          labelProps.error = true;
        }
        return (
          <Step key={Math.random()}>
            <StepLabel {...labelProps}>{label}</StepLabel>
          </Step>
        );
      })}
    </Stepper>
  );

  return (
    <>
      <Box>
        {loading && <Loader loading={loading} />}
        {stepper()}
        {showWizard && getStepContent(activeStep, handleNext, handleBack, setErrorIndex, false, false, setActiveStep)}
      </Box>
    </>
  );
};

export default RollupConfig;
