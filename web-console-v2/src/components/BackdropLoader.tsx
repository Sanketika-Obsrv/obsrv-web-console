import { Backdrop, CircularProgress } from '@mui/material';

const BackdropLoader = ({ open }: any) => {
    return (
        <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 101 }} open={open}>
            <CircularProgress color="inherit" />
        </Backdrop>
    );
};

export default BackdropLoader;
