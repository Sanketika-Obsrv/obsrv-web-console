import { Box, Skeleton } from "@mui/material"

const TableSkeleton = (props: any) => {
    const { config = {} } = props;
    const { totallines = 6, animation = "wave", variant = "rectangular", height = 60 } = config;

    const skeletonElements: JSX.Element[] = [];

    for (let i = 1; i <= totallines; i++) {
        skeletonElements.push(<Skeleton key={i} animation={animation} {...config} />);
    }

    return <>
        <Box sx={{ pt: 0.5, margin: '1rem' }}>
            <Skeleton animation={animation} height={height} variant={variant} {...config} />
            <Box sx={{ margin: '1rem' }}></Box>
            {skeletonElements}
            <Skeleton animation={animation} {...config} width={"60%"} />
            <Skeleton animation={animation} {...config} width={"60%"} />
        </Box></>
}

export default TableSkeleton;
