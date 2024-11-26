import React from 'react';
import { Grid } from '@mui/material';
import CustomTable from 'components/CustomeTable/CustomTable';
import MainCard from 'components/MainCard';
import _ from 'lodash';
import { getKeyAlias } from 'services/keysAlias';
import { getSectionDetails } from 'services/utils';

const DeletionSummary = (props: any) => {
    const { diff = [], transform } = props;

    const columns = [
        {
            id:  'type',
            header: 'Type',
            accessor: 'type',
            Cell(value: any) {
                const row = value?.cell?.row?.original || {};
                const wizardSection = getSectionDetails(row);
                return <Grid m={1}>{wizardSection}</Grid>;
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

export default DeletionSummary;
