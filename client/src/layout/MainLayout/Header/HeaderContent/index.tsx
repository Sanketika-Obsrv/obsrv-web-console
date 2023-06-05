import { Box, Stack } from '@mui/material';
import Menus from './MenuSection'

const HeaderContent = () => {
    return (
        <>
            <Box sx={{ ml: 1, width: '100%', }} display="flex" justifyContent={"flex-end"} alignItems="center">
                <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2}>
                <Menus />
               </Stack>
            </Box>
        </>
    );
};

export default HeaderContent;
