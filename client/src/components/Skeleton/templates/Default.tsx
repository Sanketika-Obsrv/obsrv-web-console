import { Box, Skeleton } from "@mui/material"

const DefaultSkeleton = (props: any) => {
    const { config = {} } = props;
    const { animation = "wave" } = config;
    return <>
        <Box sx={{ pt: 0.5, margin: '1rem' }}>
            <Skeleton animation={animation} />
            <Skeleton animation={animation} />
            <Skeleton animation={animation} />
            <Skeleton animation={animation} width={"60%"} />
            <Skeleton animation={animation} width={"60%"} />
        </Box></>
}

export default DefaultSkeleton;