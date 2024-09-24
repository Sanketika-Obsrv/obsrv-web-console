import { Box, Stack } from '@mui/material';
import Menus from './MenuSection'
import Notification from './Notification';
import WizardBreadCrumbs from 'components/@extended/WizardBreadCrumbs';
import { useLocation, useParams } from "react-router-dom";
import * as _ from "lodash"

const routes = ["/dataset/new", "/datasets/edit"];
const rollupRoutes = ["/management/", "/configurerollups/"]

const HeaderContent = () => {
    const location = useLocation();
    const wizard: any = routes.map((route: string) => location.pathname.includes(route));
    const rollup: any = rollupRoutes.map((route: string) => location.pathname.includes(route));
    const { datasetId } = useParams();

    return (
        <>
            <Box sx={{ ml: 1, width: '100%', }} display="flex" justifyContent={wizard.includes(true) || rollup.includes(true) ? "space-between" : "flex-end"} alignItems="center">
                {(wizard.includes(true) || rollup.includes(true)) && (
                    <Stack justifyContent="flex-start" alignItems="center" spacing={2}>
                        <WizardBreadCrumbs rollup={rollup.includes(true)} datasetId={datasetId} />
                    </Stack>
                )}
                <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2}>
                    <Menus />
                    <Notification />
                </Stack>
            </Box>
        </>
    );
};

export default HeaderContent;
