import {
    Box, Typography, AccordionDetails, Accordion,
    AccordionSummary, useTheme, Button, Grid, Divider, Container
} from '@mui/material';
import * as _ from 'lodash';
import React from 'react';
import { Stack } from '@mui/material';
import MainCard from 'components/MainCard';
import config from 'data/initialConfig';
import { GenericCard } from 'components/styled/Cards';
const { spacing } = config;

const FieldSection = (props: any) => {
    const { id, expanded, alwaysExpanded, title, description, componentType = "accordion", navigation, setExpanded, handleChange, index, master, section, noMasterNav, noGrid = false, generateInteractTelemetry, ...rest } = props;
    const theme = useTheme();
    const open = (id === expanded);

    const sectionDetails = () => {
        if (noGrid) return (_.has(rest, 'component') && React.cloneElement(rest.component, { ...props }));
        return (
            <Grid container rowSpacing={spacing} columnSpacing={spacing}>
                <Grid item xs={12}>
                    {_.has(rest, 'component') && React.cloneElement(rest.component, { ...props })}
                </Grid>
            </Grid>
        );
    }

    const renderAccordion = () => {
        return <Accordion expanded={open} onChange={handleChange(id)} square={false}>
            <AccordionSummary
                aria-controls="panel1bh-content"
                id="panel1bh-header"
                sx={{ px: 2, py: 3 }}
            >
                <Stack direction="column" spacing={spacing} alignItems="center">
                    <Typography sx={{ width: '100%', flexShrink: 0 }} variant="h5">{title}</Typography>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>{description}</Typography>
                </Stack>
            </AccordionSummary>
            <AccordionDetails sx={noGrid ? { p: 0 } : {}}>
                {sectionDetails()}
            </AccordionDetails>
        </Accordion>
    }

    const renderBox = () => {
        return <MainCard content={false} title={title} tagLine={description} headerSX={{ p: 0, px: 2, pt: 3, }}>
            <Grid margin={2}>
                {sectionDetails()}
            </Grid>
        </ MainCard>
    }

    const simpleSectionDetails = () => {
        return (_.has(rest, 'component') && (
            <GenericCard elevation={2}>
                <Stack spacing={1}>
                    <Typography mb={0.5} width="100%" flexShrink={0} variant="h5">{title}</Typography>
                    <Divider sx={{ height: 2, backgroundColor: 'primary.main' }} />
                    {React.cloneElement(rest.component, { ...props })}
                </Stack>
            </GenericCard>));
    }

    const renderSection = () => {
        switch (componentType) {
            case 'none':
                return simpleSectionDetails();
            case 'box':
                return renderBox();
            default:
                return renderAccordion();
        }
    }

    return <>
        <Box
            marginBottom={2}
            sx={{
                '& .MuiAccordion-root': {
                    borderColor: theme.palette.divider,
                    '& .MuiAccordionSummary-root': {
                        bgcolor: 'transparent',
                        flexDirection: 'row'
                    },
                    '& .MuiAccordionDetails-root': {
                        borderColor: theme.palette.divider
                    },
                    '& .Mui-expanded': {
                        color: theme.palette.primary.main
                    },
                }
            }}
        >
            {renderSection()}
        </Box>
    </>
}

export default FieldSection;
