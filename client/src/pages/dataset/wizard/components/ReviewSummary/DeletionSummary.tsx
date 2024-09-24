import { Grid } from "@mui/material";
import BasicReactTable from "components/BasicReactTable";
import MainCard from "components/MainCard";
import ScrollX from "components/ScrollX";
import _ from 'lodash';
import { getKeyAlias } from "services/keysAlias";
import { getSectionDetails } from "services/utils";

const DeletionSummary = (props: any) => {

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
            Header: 'Name',
            accessor: 'name',
            Cell(value: any) {
                const row = value?.cell?.row?.original || {};
                return getKeyAlias(_.get(row, "name") || "")
            }
        }
    ];

    const data = transform(diff);

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

export default DeletionSummary;