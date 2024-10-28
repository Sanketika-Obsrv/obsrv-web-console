import { Box, Skeleton } from "@mui/material";

const CardSkeleton = (props: any) => {
    const { config = {} } = props;
    const { animation = "wave", variant = "rectangular" } = config;

    return <>
        <Box sx={{ pt: 0.5, margin: "1rem" }}>
            <Skeleton animation={animation} />
            <Skeleton animation={animation} variant={variant} {...config} />
            <Skeleton animation={animation} />
            <Skeleton animation={animation} width={"60%"} />
        </Box>
    </>

}

export default CardSkeleton;