import { Alert } from '@mui/material';

const AlertMessage = ({ messsage, icon, color = 'error' }: any) => {

    const IconPrimary = icon!;
    const primaryIcon = icon ? <IconPrimary fontSize="large" /> : null;

    return <>
        <Alert color={color} icon={primaryIcon}>
            {messsage || 'Something went wrong'}
        </Alert>
    </>
}

export default AlertMessage;
