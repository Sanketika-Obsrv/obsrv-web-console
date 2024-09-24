import { Grid } from "@mui/material";
import BasicReactTable from "components/BasicReactTable";
import MainCard from "components/MainCard";
import ScrollX from "components/ScrollX";
import _ from 'lodash';
import { getKeyAlias } from "services/keysAlias";
import { getSectionDetails } from "services/utils";

const UpdateSummary = (props: any) => {

    const { diff = [], transform } = props;

    const columns = [
        {
            Header: 'Type',
            accessor: 'type',
            Cell(value: any) {
                const row = value?.cell?.row?.original || {};
                const wizardSection = getSectionDetails(row);
                return <Grid m={1}>{wizardSection}</Grid>
            }
        },
        {
            Header: 'Field',
            accessor: 'field',
            Cell(value: any) {
                const row = value?.cell?.row?.original || {};
                const field = _.get(row, 'field');
                return getKeyAlias(field)
            }
        },
        {
            Header: 'Property',
            accessor: 'name',
            Cell({ value }: any) {
                return getKeyAlias(value) || '-';
            }
        },
        {
            Header: 'Current Live Value',
            accessor: 'from',
            Cell(value: any) {
                const row = value?.cell?.row?.original || {};
                const from = _.get(row, 'value.from');
                return (from || from === false) ? _.toString(from) : '-';
            }
        },
        {
            Header: 'Updated Value',
            accessor: 'to',
            Cell(value: any) {
                const row = value?.cell?.row?.original || {};
                const to = _.get(row, 'value.to');
                return (to || to === false) ? _.toString(to) : '-';
            }
        }
    ];

    const data = _.filter(transform(diff), data => {
        return !_.includes(["dedup_config.dedup_key"], _.get(data, "field"))
    });

    const renderTable = () => {
        return <ScrollX>
            <MainCard content={false}>
                <BasicReactTable header={true} columns={columns} data={data} striped={true} />
            </MainCard>
        </ScrollX>
    }

    return <>
        {renderTable()}
    </>

}

export default UpdateSummary;