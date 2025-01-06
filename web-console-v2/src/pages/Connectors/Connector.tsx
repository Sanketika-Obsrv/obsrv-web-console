import React, { useState } from 'react';
import { GenericCard } from 'components/Styled/Cards';
import { Box, Button, Typography } from '@mui/material';
import _ from 'lodash';
import { theme } from 'theme';
import { useAlert } from 'contexts/AlertContextProvider';

import ConnectorFileUpload from './ConnectorFileUpload';
import Actions from 'components/ActionButtons/Actions';
import { useNavigate } from 'react-router-dom';
import Loader from 'components/Loader';

import ConnectorFilesPreview from './ConnectorFilesPreview';
import { registerConnector } from 'services/connector';


export const Connectors = () => {
  const { data: dataState, files: filesState, config: configState } = {} as any;
  const { showAlert } = useAlert();

  const [data, setData] = useState(dataState);
  const [files, setFiles] = useState(filesState);
  const [fileErrors, setFileErrors] = useState<any>(null);
  const [isLoading, setisLoading] = useState(false);

  const navigate = useNavigate();


  const onRemoveAll = () => {
    setFiles(null);
    setData(null);
  };

  const onSubmit = async () => {
    if (_.isEmpty(files)) {
      showAlert('Please upload files before proceeding', 'error');
      return;
    }

    try {
      setisLoading(true);
      await registerConnector(files);
      navigate('/connectors');
      showAlert('Connector registered successfully', 'success');
    } catch (error) {
      setisLoading(false);

      console.error('Submission error', error);
      showAlert('Failed to submit Connector', 'error');
    }
  };

  const readGzFileContents = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const isValidGz =
        file.name.toLowerCase().endsWith('.gz') &&
        (file.type === 'application/gzip' ||
          file.type === 'application/x-gzip' ||
          file.type === 'application/gz' ||
          file.type === '');

      if (!isValidGz) {
        reject(new Error('Only .gz files are supported'));
        return;
      }

      resolve(file);
    });
  };

  const onFileRemove = async (file: File | string) => {
    try {
      const filteredFiles = !_.isEmpty(files)
        ? _.filter(files, (_file: string) => _file !== file)
        : [];

      if (filteredFiles.length === 0) {
        setFiles(null);
        setData(null);
        return;
      }

      const contents = await Promise.all(
        filteredFiles.map((file: File) => readGzFileContents(file)),
      );

      const flattenedContents = _.flattenDeep(contents);

      setFiles(filteredFiles);
      setData(flattenedContents);
    } catch (error) {
      console.error('Error removing file:', error);
      showAlert('Error processing remaining files', 'error');
    }
  };

  return isLoading ? (
    <Loader loading={isLoading} />
  ) : (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Loader
          loading={isLoading}
          descriptionText="Please wait while we process your request."
        />
        <GenericCard>
          <Box>
            <ConnectorFileUpload
              data={data}
              setData={setData}
              files={files}
              setFiles={setFiles}
              subscribeErrors={setFileErrors}
            />
            {!_.isEmpty(files) && (
              <Box mx={3} mt={0}>
                <Box display="flex" justifyContent="space-between"></Box>
                <ConnectorFilesPreview
                  files={files}
                  showList={false}
                  onRemove={onFileRemove}
                />
              </Box>
            )}
          </Box>
        </GenericCard>
      </Box>

      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Actions
          buttons={[
            {
              id: 'btn1',
              label: 'Proceed',
              variant: 'contained',
              color: 'primary',
              disabled: _.isEmpty(files),
            },
          ]}
          onClick={onSubmit}
        />
      </Box>
    </Box>
  );
};
