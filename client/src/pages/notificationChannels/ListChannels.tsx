import { Grid } from "@mui/material";
import _ from 'lodash';
import { useEffect, useState } from "react";
import { fetchChannels } from "services/notificationChannels";
import NotificationChannelsTable from "./components/NotificationChannelsTable";
import { useDispatch } from "react-redux";
import { error } from "services/toaster";
import MainCard from "components/MainCard";
import { renderSkeleton } from "services/skeleton";

const ListChannels = (props: any) => {
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [channels, setChannels] = useState<any>([]);

    const getAllChannels = async (config?: any) => {
        try {
            const requestData = { "request": { "options": { "order": [['createdAt', 'DESC']] } } }
            const response = await fetchChannels({ data: requestData });
            const channels = _.get(response, 'result.notifications') || [];
            const modifiedChannels = _.filter(channels, config)
            setChannels(modifiedChannels);
        } catch (err) {
            dispatch(error({ message: 'Something went wrong' }));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        setLoading(true)
        getAllChannels();
    }, [])

    const renderChannels = () => {
        return <Grid item xs={12}>
            <NotificationChannelsTable channels={channels} getAllChannels={getAllChannels} />
        </Grid>
    }

    return <>
        <Grid container rowSpacing={2} columnSpacing={2}>
            {loading &&
                <Grid item xs={12}>
                    <MainCard content={false}>{renderSkeleton({ config: { type: 'table', loader: false, width: "100%", totallines: 6 } })}</MainCard>
                </Grid>}
            {!loading && renderChannels()}
        </Grid>
    </>
}

export default ListChannels;