import { Box, Typography } from "@mui/material";

const SuggestionBox = ({ suggestion, Icon, color }: any) => {
    return (
        <Box display="flex" alignItems="center" my={1} px={1}>
            <Icon style={{ fontSize: '1.15rem', color: color }} />
            <Box>
                <Typography variant="body2" mx={1.5}>{suggestion.message}</Typography>
                <Typography variant="body2" mx={1.5} my={0.5}>{suggestion.advice}</Typography>
            </Box>
        </Box>
    );
}

export default SuggestionBox;
