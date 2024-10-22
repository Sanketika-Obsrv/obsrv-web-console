import React from 'react';
import { Alert, Grid, Stack, Typography } from '@mui/material';
import AdditionSummary from './AdditionSummary';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import _ from 'lodash';
import en from 'utils/locales/en.json';
import { useFetchDatasetDiff } from 'services/dataset';
import { getConfigValue } from 'services/configData';
import { renderSections } from 'pages/alertManager/services/utils';
import UpdateSummary from './UpdateSummary';
import DeletionSummary from './DeletionSummary';

const ReviewDataset = () => {
    const datasetId = getConfigValue('dataset_id');

    const { data } = useFetchDatasetDiff({
        datasetId
    });

    const { additions = [], deletions = [], modifications = [] } = data || {};
    const noModifications = _.size(_.flatten([additions, deletions, modifications])) === 0;

    const transform = (data: Record<string, any>[]) => {
        return _.flatten(
            _.map(data, (payload) => {
                const { type, items = [], value } = payload;
                return [
                    ..._.map(items, (item) => ({ type, ...item })),
                    ...(value ? [{ type, value }] : [])
                ];
            })
        );
    };

    const sections = [
        ...(additions?.length
            ? [
                  {
                      id: 'additions',
                      componentType: 'box',
                      title: (
                          <Stack direction="row" spacing={2}>
                              <Typography variant="inherit">Additional Parameters</Typography>
                          </Stack>
                      ),
                      description: 'Lists down all the additions in the configurations',
                      component: <AdditionSummary diff={additions} transform={transform} />
                  }
              ]
            : []),
        ...(modifications?.length
            ? [
                  {
                      id: 'updates',
                      componentType: 'box',
                      title: (
                          <Stack direction="row" spacing={2}>
                              <Typography variant="inherit">Modified Parameters</Typography>
                          </Stack>
                      ),
                      description:
                          'Lists down all the modifications in the configuration along with new and old value',
                      component: <UpdateSummary diff={modifications} transform={transform} />
                  }
              ]
            : []),
        ...(deletions?.length
            ? [
                  {
                      id: 'deletion',
                      componentType: 'box',
                      title: (
                          <Stack direction="row" spacing={2}>
                              <RemoveCircleIcon color="error" />{' '}
                              <Typography variant="inherit">Deleted Parameters</Typography>
                          </Stack>
                      ),
                      description: 'Lists down all the deletions in the configurations',
                      component: <DeletionSummary diff={deletions} transform={transform} />
                  }
              ]
            : [])
    ];

    const render = () => {
        if (noModifications) {
            return (
                <Grid item xs={12}>
                    <Alert severity="info">{en['no-summary-modifications']}</Alert>
                </Grid>
            );
        }
        return (
            <Grid item xs={12}>
                {renderSections({ sections: sections })}
                <Alert severity="error">{en['dataset-summary-review-warning']}</Alert>
            </Grid>
        );
    };

    return (
        <>
            <Grid container>{render()}</Grid>
        </>
    );
};

export default ReviewDataset;
