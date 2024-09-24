import {
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Alert, Chip,
} from '@mui/material'; import MainCard from 'components/MainCard';
import { useSelector } from 'react-redux';
import * as _ from "lodash";
import { WarningOutlined } from '@ant-design/icons';

const Preview = () => {
    const wizardState: any = useSelector((state: any) => state?.wizard);
    const dataValidation: any = _.get(wizardState, ['pages', 'dataRention', 'values']);
    const rollupConfig: any = _.get(wizardState, ['pages', 'rollup', 'values']);

    const dataTable = () => <MainCard content={false} title="Data Retention Config" sx={{ my: 2 }}>
        <TableContainer>
            <Table sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
                <TableHead>
                    <TableRow>
                        {Object.keys(dataValidation).map((item: any) => (
                            <TableCell key={item}>
                                {item}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    <TableRow>
                        {Object.values(dataValidation).map((item: any) => (
                            <TableCell key={item}>
                                {`${item}`}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableBody>
            </Table>
        </TableContainer>
    </MainCard >;

    const rollupTable = () => <MainCard content={false} title="Rollup Config" sx={{ my: 2 }}>
        <TableContainer>
            <Table sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
                <TableHead>
                    <TableRow>
                        {rollupConfig.slice(0, 1).map((item: any) => (
                            Object.keys(item).map((keyName: any) => (
                                <TableCell key={keyName}>
                                    {_.capitalize(keyName)}
                                </TableCell>
                            ))))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rollupConfig.map((item: any) => (
                        <TableRow>
                            {Object.values(item).map((value: any) => (
                                <TableCell key={value}>
                                    {Array.isArray(value) ? (
                                        value.map((child: any) =>
                                            <Chip
                                                sx={{ m: 0.5 }}
                                                label={child.label}
                                                key={child}
                                                variant="outlined"
                                                color="info"
                                            />
                                        )
                                    ) : value}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    </MainCard >;

    if (dataValidation || rollupConfig) return (<>
        {dataValidation && dataTable()}
        {rollupConfig && rollupTable()}
    </>
    )
    else return (<Alert color="error" icon={<WarningOutlined />}>No information to display</Alert>);
}

export default Preview;
