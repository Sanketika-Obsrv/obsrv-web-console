import { Box, Chip, Grid, MenuItem, Select, Stack, Typography, Paper, Tooltip } from "@mui/material"
import { v4 } from 'uuid'
import React, { useState } from 'react';
import * as _ from 'lodash';
import { InfoCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import globalConfig from 'data/initialConfig';
import dayjs from 'dayjs';
import interactIds from "data/telemetry/interact.json";
import { OverflowTypography } from "components/styled/Typography";

const transformFilter = (filter: Record<string, any>) => {

    if (_.toLower(_.get(filter, 'label')) === "today") {
        const now = dayjs();
        const minutesSinceStartOfDay = now.hour() * 60 + now.minute();
        return { ...filter, value: minutesSinceStartOfDay }
    }

    return filter;
}

const ApexWithFilters = (props: any) => {
    const { uuid, title = '', filters = [], children, type = 'chip', description = '', id = v4() } = props;
    const defaultFilter = transformFilter(_.find(filters, ['default', true]));
    const [filter, setFilter] = useState<any>(_.get(defaultFilter, 'value'));
    const [step, setStep] = useState<string>(_.get(defaultFilter, 'step') || '5m');
    const [filterMeta, setFilterMeta] = useState<any>(defaultFilter || {});
    const [refresh, setRefresh] = useState(0);

    const getFilterMeta = (value: number) => _.find(filters, ['value', value]);

    const handlechange = (event: any) => {
        const value = _.get(event, 'target.value');
        if (value) {
            const filter = transformFilter(getFilterMeta(value));
            if (filter) {
                setFilterMeta(filter);
                setFilter(_.get(filter, 'value'));
                setStep(_.get(filter, 'step'));
            }
        }
    }

    const onClickHandler = (filter: Record<string, any>) => {
        const { value, step } = transformFilter(filter);
        if (value && step) {
            setFilter(value);
            setStep(step);
            setFilterMeta(filter);
        }
    }

    const renderFilters = () => {
        const menuItems = _.map(filters, (filter: Record<string, any>, index) => {
            return <MenuItem value={filter.value} key={`filter-${index}`}>{filter.label}</MenuItem>
        })

        return <Select value={filter} size="small" onChange={handlechange}>{menuItems}</ Select>
    }
    const renderChipFilters = () => {
        const menuItems = _.map(filters, (filterMeta: Record<string, any>, index) => {
            const transformedFilter = transformFilter(filterMeta);
            const variant = (_.get(transformedFilter, 'value') === filter) ? "filled" : "outlined";
            const color = _.get(filterMeta, 'color') || "primary"
            return <Chip
                data-edataid={interactIds.chart_filter}
                data-objectid={`${title}:${filterMeta.label}`}
                data-objecttype="chart"
                label={<div
                    data-edataid={`${interactIds.chart_filter}:${filterMeta.telemetryid}`}
                    data-objectid={id}
                    data-objecttype="chart"
                >{filterMeta.label}</div>}
                variant={variant} color={color} onClick={_ => onClickHandler(filterMeta)} key={`chip-${index}`} />
        })
        return <Stack direction="row" spacing={2}> {menuItems}</Stack>
    }

    const childrenWithProps = React.Children.map(children, child => {
        if (React.isValidElement(child)) {
            const updatedProps = { uuid, interval: filter, step, refresh, ...filterMeta };
            return React.cloneElement(child, updatedProps);
        }
        return child;
    });

    return <>
        <Paper elevation={globalConfig.elevation} style={{height: '100%'}}>
            <Grid item>
                <Grid container>
                    <Grid item xs={12} sm={12} alignItems="stretch">
                        <Stack sx={{ ml: 2, mt: 3, mr: 2 }} alignItems={{ xs: 'center', sm: 'flex-start' }} height="100%">
                            <Grid container alignItems="center">
                                <Grid item xs={10}>
                                    <Tooltip title={title}>
                                        <OverflowTypography sx={{ maxWidth: "95%" }} color="textSecondary" mr={1}>{title}</OverflowTypography>
                                    </Tooltip>
                                </Grid>
                                <Grid item xs={2}>
                                    <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1}>
                                        <Tooltip title={description}>
                                            <InfoCircleOutlined />
                                        </Tooltip>
                                        <Tooltip title={'Refresh'}>
                                            <ReloadOutlined onClick={_ => setRefresh(pre => pre + 1)} />
                                        </Tooltip>
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Stack>
                    </Grid>
                    <Grid item xs={12} sm={12}>
                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            justifyContent={{ xs: 'center', sm: 'flex-start' }}
                            overflow="auto"
                            mt={1}
                            ml={2}
                        >

                            {(filters.length && type === 'chip') ? renderChipFilters() : null}
                            {(filters.length && type === 'select') ? renderFilters() : null}
                        </Stack>
                    </Grid>
                </Grid>
            </Grid>
            <Box padding={2}>
                {childrenWithProps}
            </Box>
        </Paper>
    </>
}

export default ApexWithFilters;
