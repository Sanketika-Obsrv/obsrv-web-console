import { styled } from '@mui/material/styles';
import { Typography } from '@mui/material';

const VerticalOverflowText = styled(Typography)(({ theme }) => ({
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    "-webkit-line-clamp": '2',
    "-webkit-box-orient": "vertical",
    maxWidth: '95%'
}));

const OverflowTypography = styled(Typography)(({ theme }) => ({
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: 'nowrap',
    maxWidth: '85%'
}));

export { VerticalOverflowText, OverflowTypography };
