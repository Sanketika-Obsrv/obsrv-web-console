import { Chip, Stack } from "@mui/material";
import BasicReactTable from "components/BasicReactTable";
import MainCard from "components/MainCard";
import ScrollX from "components/ScrollX";
import _ from 'lodash';
import { getKeyAlias } from "services/keysAlias";
import { flattenObject, getSectionDetails } from "services/utils";

const AdditionSummary = (props: any) => {

    const { diff = [], transform } = props;

    const renderConfig = (config: { key: string, value: string, [key: string]: any }[]) => {
        return _.map(config, (payload, index) => {
            const key = getKeyAlias(payload.key, true);
            if (!key) return null;
            return <Chip key={"review-config" + index} variant="outlined" label={`${key}: ${payload.value}`} />
        })
    }

    const columns = [
        {
            Header: 'Type',
            accessor: 'type',
            Cell(value: any) {
                const row = value?.cell?.row?.original || {};
                const wizardSection = getSectionDetails(row);
                return wizardSection;
            }
        },
        {
            Header: 'Name',
            accessor: 'name',
            Cell(value: any) {
                const row = value?.cell?.row?.original || {};
                return getKeyAlias(_.get(row, "name") || "")
            }
        },
        {
            Header: 'Config',
            Cell(payload: any) {
                const row = payload?.cell?.row?.original || {};
                const config = row?.value || {};
                const flattened = flattenObject(config);
                return <Stack direction="row" spacing={1}>
                    {renderConfig(flattened as any)}
                </Stack>
            }
        }
    ];

    const data = transform(diff)

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

export default AdditionSummary;