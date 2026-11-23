import React from 'react';
import { Chip, Stack } from '@mui/material';
import CustomTable from 'components/CustomeTable/CustomTable';
import MainCard from 'components/MainCard';
import _ from 'lodash';
import { getKeyAlias } from 'services/keysAlias';
import { flattenObject, getSectionDetails, isSensitiveField, maskedTextStyle, resolveUiSpecNode } from 'services/utils';

const AdditionSummary = (props: any) => {
    const { diff = [], transform, connectorSpecsById = {} } = props;

    // Strip the "connector_config." prefix so the path lines up with the connector's schema.
    const renderConfig = (config: { key: string; value: string; [key: string]: any }[], row: Record<string, any>) => {
        const isConnectorRow = _.get(row, 'type') === 'dataSource';
        const uiSpec = isConnectorRow ? connectorSpecsById[_.get(row, 'name')] : undefined;
        return _.map(config, (payload, index) => {
            // Fall back to the raw key instead of dropping the row when there's no alias for it.
            const key = getKeyAlias(payload.key);
            if (!key) return null;
            let isSensitive = false;
            let label = key;
            if (isConnectorRow) {
                const schemaPath = payload.key.replace(/^connector_config\./, '');
                isSensitive = isSensitiveField(uiSpec, schemaPath);
                label = resolveUiSpecNode(uiSpec, schemaPath)?.title || key;
            }
            return (
                <Chip
                    key={'review-config' + index}
                    variant="filled"
                    label={<>{label}: <span style={isSensitive ? maskedTextStyle : undefined}>{payload.value}</span></>}
                />
            );
        });
    };

    const columns = [
        {
            id: 'type',
            header: 'Type',
            accessor: 'type',
            Cell(value: any) {
                const row = value?.cell?.row?.original || {};
                const wizardSection = getSectionDetails(row);
                return wizardSection;
            }
        },
        {
            id: 'name',
            header: 'Name',
            accessor: 'name',
            Cell(value: any) {
                const row = value?.cell?.row?.original || {};
                return getKeyAlias(_.get(row, 'name') || '');
            }
        },
        {
            id: 'config',
            header: 'Config',
            Cell(payload: any) {
                const row = payload?.cell?.row?.original || {};
                const config = row?.value || {};
                const flattened = flattenObject(config);
                return (
                    <Stack direction="row" spacing={1}>
                        {renderConfig(flattened as any, row)}
                    </Stack>
                );
            }
        }
    ];

    const data = transform(diff);

    const renderTable = () => {
        return (
            <MainCard content={false} border={false}>
                <CustomTable header={true} columns={columns} data={data} striped={true} />
            </MainCard>
        );
    };

    return <>{renderTable()}</>;
};

export default AdditionSummary;
