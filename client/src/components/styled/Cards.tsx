import { styled } from '@mui/material/styles';
import { Card, Typography } from '@mui/material';

const GenericCard = styled(Card)(({ theme }) => ({
    outline: 'none',
    padding: theme.spacing(3, 3),
    margin: theme.spacing(1, 0),
}));

const CardTitle = styled(Typography)(({ theme }) => ({
    fontWeight: 500,
    fontSize: '1.125rem',
    lineHeight: '1rem',
    marginBottom: theme.spacing(2),
}));


export { GenericCard, CardTitle };
