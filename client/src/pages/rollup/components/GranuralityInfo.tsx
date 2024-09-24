import { Chip, Grid } from '@mui/material'
import { Box, Typography } from '@mui/material'
import { useLocation } from 'react-router'
import * as _ from 'lodash'
import { useState } from 'react'

const GranuralityInfo = (props: any) => {
    const { selectedGranularityOptions, datasetName } = props;
    const location = useLocation()
    const isEdit = location.state?.edit;
    const [granularity, setGranularity] = useState<any>(selectedGranularityOptions);
    const aggregationLevel = location.state?.aggregationLevel

    const sections = [
        {
            lable: 'Rollup datasource name :',
            value: datasetName
        },
        {
            lable: 'Aggregation level :',
            value: aggregationLevel ? (<Chip sx={{ ml: 1 }} color="primary" label={_.capitalize(aggregationLevel.replaceAll("_", ' '))} />) : granularity.map((value: any) => {
                return (<Chip sx={{ ml: 1 }} color="primary" label={_.capitalize(value.replaceAll("_", ' '))} />)
            })
        }
    ]

    return (
        <Box>
            <Grid spacing={1}>
                {_.map(sections, (item) => {
                    return <Box display={'flex'} gap={1} alignItems={'center'}>
                        <Typography mb={0.5} flexShrink={0} variant="h5">
                            {item.lable}
                        </Typography>
                        <Typography mb={0.5} width="100%" flexShrink={0}>
                            {item.value}
                        </Typography>
                    </Box>
                })}
            </Grid>
        </Box>
    )
}

export default GranuralityInfo