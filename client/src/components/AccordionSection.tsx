import React, { useState } from 'react';
import { Grid, useTheme, Stack, Button, Box, Typography, AccordionDetails, Accordion, AccordionSummary } from '@mui/material';
import * as _ from 'lodash';
import config from 'data/initialConfig';
import MainCard from './MainCard';
import { ArrowRightOutlined } from '@ant-design/icons';
const { spacing } = config;

const FieldSection = (props: any) => {
    const { id, expanded, title, description, componentType = "accordion", navigation, setExpanded, handleChange, section, ...rest } = props;
    const theme = useTheme();
    const open = (id === expanded);

    const navigate = () => {
        setExpanded(navigation.next);
    }

    const renderNavigation = () => {
        if (!navigation) return null;
        return <Grid item xs={12}>
            <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1}>
                {navigation?.next && <Button variant="outlined" endIcon={<ArrowRightOutlined />} onClick={_ => navigate()}>{_.startCase(navigation.next)}</Button>}
            </Stack>
        </Grid>
    }

    const sectionDetails = () => {
        return <Grid container rowSpacing={spacing} columnSpacing={spacing}>
            <Grid item xs={12}>
                {_.has(rest, 'component') && React.cloneElement(rest.component, { ...props })}
            </Grid>
            {renderNavigation()}
        </Grid>
    }

    const renderAccordion = () => {
        return <Accordion expanded={open} onChange={handleChange(id)} square={false}>
            <AccordionSummary aria-controls="panel1bh-content" id="panel1bh-header">
                <Stack direction="column" spacing={spacing} alignItems="center">
                    <Typography sx={{ width: '100%', flexShrink: 0 }}> {title}</Typography>
                    {!open && <Typography variant='caption' sx={{ color: 'text.secondary', width: '100%' }}>{description}</Typography>}
                </Stack>
            </AccordionSummary>
            <AccordionDetails>
                {sectionDetails()}
            </AccordionDetails>
        </Accordion>
    }

    const renderBox = () => {
        return <MainCard title={<Typography sx={{ width: '100%', flexShrink: 0 }}> {title}</Typography>} contentSX={{ px: 3, background: 'inherit' }}>
            {sectionDetails()}
        </ MainCard>
    }

    const renderSection = () => {
        switch (componentType) {
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
                    }
                }
            }}
        >
            {renderSection()}
        </Box>
    </>
}


const AccordionSection = ({ sections }: any) => {
    const [expanded, setExpanded] = useState<string | false>(false);
    const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => { setExpanded(isExpanded ? panel : false) };
    const renderSection = (sectionData: Record<string, any>, section: any) => {
        return (
            <FieldSection
                key={section}
                expanded={expanded}
                setExpanded={setExpanded}
                handleChange={handleChange}
                {...sectionData}
                section={section}
            />
        );
    }

    return <>
        <Grid container>
            <Grid item xs={12}>{sections.map(renderSection)}</Grid>
        </Grid>
    </>;
};

export default AccordionSection;
