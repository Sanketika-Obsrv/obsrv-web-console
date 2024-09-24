import { Grid } from "@mui/material";
import Loader from "components/Loader";
import SkeletonComp from 'components/Skeleton';

export const renderSkeleton = (props: any) => {
    const { config = {} } = props;
    const { type = "", loader = true } = config;

    return <Grid item xs={12}>
        {loader && <Loader />}
        <SkeletonComp type={type} {...{ config }} />
    </Grid>
}