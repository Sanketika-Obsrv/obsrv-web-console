import React from 'react';
import { Grid } from "@mui/material";
import _ from 'lodash';
import { useEffect, useState } from "react";
import { fetchChannels } from "services/notificationChannels";
import NotificationChannelsTable from "./components/NotificationChannelsTable";

import MainCard from "components/MainCard";
import { renderSkeleton } from "services/skeleton";
import { useAlert } from "contexts/AlertContextProvider";

const ListChannels = (props: any) => {
    const [loading, setLoading] = useState(false);
    const [channels, setChannels] = useState<any>([]);
    const { showAlert } = useAlert();

    const getAllChannels = async (config?: any) => {
        try {
            const requestData = { "request": { "options": { "order": [['createdAt', 'DESC']] } } }
            const response = await fetchChannels({ data: requestData });
            const channels = _.get(response, 'result.notifications') || [];
            const modifiedChannels = _.filter(channels, config)
            setChannels(modifiedChannels);
        } catch (err) {
            showAlert("Something went wrong", "error")
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