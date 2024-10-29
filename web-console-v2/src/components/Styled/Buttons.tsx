import { styled } from '@mui/material/styles';
import { Button } from '@mui/material';

const StandardWidthButton = styled(Button)(({ theme }) => ({
    outline: 'none',
    margin: theme.spacing(1),
    width: '14.375rem',
    height: '2.75rem',
}));


export { StandardWidthButton };
