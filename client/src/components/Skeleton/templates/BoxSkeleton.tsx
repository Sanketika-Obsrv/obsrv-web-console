import { Box, Skeleton } from "@mui/material";

const BoxSkeleton = (props: any) => {
    const { config = {} } = props;
    const { animation = "wave", variant = "rectangular" } = config;

    return <>
        <Box sx={{ pt: 0.5 }}>
            <Skeleton animation={animation} variant={variant} {...config} />
        </Box>
    </>
}

export default BoxSkeleton;