import {
    Table, TableBody,
    TableCell, TableContainer, TableHead,
    TableRow, Alert, Grid, Tooltip,
} from '@mui/material';
import { useSelector } from 'react-redux';
import * as _ from "lodash";
import { OverflowTypography } from 'components/styled/Typography';
import { WarningOutlined } from '@ant-design/icons';

const displayModifiedColumns: any = () => {
    return ([
        { id: 'column', label: 'Field' },
        { id: '_transformationType', label: 'Transformation' },
        { id: "transformation_mode", label: "Mode" }
    ])
};

const Transformations = (props: any) => {
    const { datasetState } = props;
    const transformationFields: any = _.get(datasetState, ['pages', 'transform', 'selection']) || [];
    const additionalFields: any = _.get(datasetState, ['pages', 'derived', 'selection']) || [];
    const piiFields: any = _.get(datasetState, ['pages', 'pii', 'selection']) || [];
    const allTransformations = [...piiFields, ...transformationFields, ...additionalFields];
    const customTypes = [
        { id: "transformations", title: "Transformations", data: allTransformations },
    ]
    const renderTable = (title: string, data: any, id: string) =>
        <>
            <TableContainer>
                <Table size="small">
                    <TableHead sx={{ bgcolor: 'unset' }}>
                        <TableRow>
                            {displayModifiedColumns(id).map((item: any) => (
                                <TableCell key={item.id} sx={{ '&.MuiTableCell-root': { border: '1px solid #D9D9D9', }, }}>
                                    {item.label}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((item: any) => (
                            <TableRow>
                                {displayModifiedColumns(id).map((cellName: any) => {
                                    if (cellName.id === "_transformationType" && item[cellName.id] === "custom")
                                        return (
                                            <TableCell key={item.id} sx={{ '&.MuiTableCell-root': { border: '1px solid #D9D9D9', }, maxWidth: 200 }}>
                                                <Tooltip title={item["transformation"]}>
                                                    <OverflowTypography variant="body2" sx={{ maxWidth: "60%" }}>
                                                        {item["transformation"]}
                                                    </OverflowTypography>
                                                </Tooltip>
                                            </TableCell>
                                        )
                                    else return (
                                        <TableCell key={item.id} sx={{ '&.MuiTableCell-root': { border: '1px solid #D9D9D9', }, maxWidth: 250 }}>
                                            <Tooltip title={item[cellName.id]}>
                                                <OverflowTypography variant="body2" sx={{ maxWidth: "70%" }}>
                                                    {item[cellName.id]}
                                                </OverflowTypography>
                                            </Tooltip>
                                        </TableCell>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </>;

    if (allTransformations.length > 0)
        return (
            <>
                {customTypes.length > 0 &&
                    <Grid container columnSpacing={1} rowSpacing={1}>
                        {customTypes.map(({ title, data, id }) => {
                            if (_.size(data) > 0)
                                return (
                                    <Grid item xs={12} sm={12} md={12} lg={12}>
                                        {renderTable(title, data, id)}
                                    </Grid>
                                ); else return null;
                        })
                        }
                    </Grid>
                }
            </>
        );
    else return (<Alert color="error" icon={<WarningOutlined />}>No information to display</Alert>);

}

export default Transformations;