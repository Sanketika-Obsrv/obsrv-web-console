import React from 'react';
import { Grid } from '@mui/material';
import CustomTable from 'components/CustomeTable/CustomTable';
import MainCard from 'components/MainCard';
import _ from 'lodash';
import { getKeyAlias } from 'services/keysAlias';
import { getSectionDetails, isSensitiveConfigKey, maskedTextStyle, resolveUiSpecFormat } from 'services/utils';

// "dataSource" is the diff backend's type string for connector-config changes (see
// dataset_diff.ts) -- only those rows can hold credential-shaped field names. dataSchema/
// transformations rows are user-defined dataset column names and must never be masked here,
// since a column legitimately named e.g. "password" would otherwise have its real diff hidden.
const isConnectorRow = (row: Record<string, any>) => _.get(row, 'type') === 'dataSource';

// `name` on a dataSource row is the connector_id the change belongs to (see dataset_diff.ts).
// Prefer the real schema's format declaration; only guess from the field name when the schema
// has no entry for it (e.g. authenticationMechanism.* never reaches here -- the backend already
// excludes that subtree from modifications -- so this mainly covers flat fields like a DB
// connector's password column that live outside authenticationMechanism).
const isSensitiveField = (row: Record<string, any>, connectorSpecsById: Record<string, any>) => {
    if (!isConnectorRow(row)) return false;
    const field = _.get(row, 'field');
    const uiSpec = connectorSpecsById[_.get(row, 'name')];
    const specFormat = resolveUiSpecFormat(uiSpec, field);
    return specFormat !== undefined ? specFormat === 'password' : isSensitiveConfigKey(field);
};

const UpdateSummary = (props: any) => {
    const { diff = [], transform, connectorSpecsById = {} } = props;

    const columns = [
        {
            id: 'type',
            header: 'Type',
            accessor: 'type',
            Cell(value: any) {
                const row = value?.cell?.row?.original || {};
                const wizardSection = getSectionDetails(row);
                return <Grid m={1}>{wizardSection}</Grid>;
            }
        },
        {
            id: 'field',
            header: 'Field',
            accessor: 'field',
            Cell(value: any) {
                const row = value?.cell?.row?.original || {};
                const field = _.get(row, 'field');
                return getKeyAlias(field);
            }
        },
        {
            id: 'property',
            header: 'Property',
            accessor: 'name',
            Cell({ value }: any) {
                return getKeyAlias(value) || '-';
            }
        },
        {
            id: 'from',
            header: 'Current Live Value',
            accessor: 'from',
            Cell(value: any) {
                const row = value?.cell?.row?.original || {};
                const from = _.get(row, 'value.from');
                const isSensitive = isSensitiveField(row, connectorSpecsById);
                if (!(from || from === false)) return '-';
                return isSensitive ? <span style={maskedTextStyle}>{_.toString(from)}</span> : _.toString(from);
            }
        },
        {
            id: 'to',
            header: 'Updated Value',
            accessor: 'to',
            Cell(value: any) {
                const row = value?.cell?.row?.original || {};
                const to = _.get(row, 'value.to');
                const isSensitive = isSensitiveField(row, connectorSpecsById);
                if (!(to || to === false)) return '-';
                return isSensitive ? <span style={maskedTextStyle}>{_.toString(to)}</span> : _.toString(to);
            }
        }
    ];

    const data = _.filter(transform(diff), (data) => {
        return !_.includes(['dedup_config.dedup_key'], _.get(data, 'field'));
    });

    const renderTable = () => {
        return (
            <MainCard content={false} border={false}>
                <CustomTable header={true} columns={columns} data={data} striped={true} />
            </MainCard>
        );
    };

    return <>{renderTable()}</>;
};

export default UpdateSummary;
