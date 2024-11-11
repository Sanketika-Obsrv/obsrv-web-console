import React from 'react';
import {
    Grid,
    useTheme,
    Stack,
    Box,
    Typography,
    AccordionDetails,
    Accordion,
    AccordionSummary
} from '@mui/material';
import * as _ from 'lodash';
import config from 'data/initialConfig';
import MainCard from 'components/CustomCard/MainCard';
const { spacing } = config;

const FieldSection = (props: any) => {
    const {
        id,
        title,
        description,
        componentType = 'accordion',
        navigation,
        section,
        ...rest
    } = props;

    const theme = useTheme();

    const sectionDetails = () => {
        return (
            <Grid container rowSpacing={spacing} columnSpacing={spacing}>
                <Grid item xs={12}>
                    {_.has(rest, 'component') && React.cloneElement(rest.component, { ...props })}
                </Grid>
            </Grid>
        );
    };

    const renderAccordion = () => {
        return (
            <Accordion expanded={true} square={false}>
                <AccordionSummary aria-controls="panel1bh-content" id="panel1bh-header">
                    <Stack direction="column"  alignItems="center">
                        <Typography sx={{ width: '100%', flexShrink: 0 }} variant="h1">
                            {title}
                        </Typography>
                        <Typography variant="body1" sx={{pt: '2px'}}>
                            {description}
                        </Typography>
                    </Stack>
                </AccordionSummary>
                <AccordionDetails>{sectionDetails()}</AccordionDetails>
            </Accordion>
        );
    };

    const renderBox = () => {
        return (
            <MainCard
                title={
                    <Typography sx={{ width: '100%', flexShrink: 0 }} variant="h1">
                        {title}
                    </Typography>
                }
                contentSX={{ px: 3, background: 'inherit' }}
                sx={{ border: '1px solid #D6D6D6' }}
            >
                {sectionDetails()}
            </MainCard>
        );
    };

    const renderSection = () => {
        switch (componentType) {
            case 'box':
                return renderBox();
            default:
                return renderAccordion();
        }
    };

    return (
        <>
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
    );
};

const AccordionSection = ({ sections }: any) => {
    const renderSection = (sectionData: Record<string, any>, section: any) => {
        return <FieldSection key={section} {...sectionData} section={section} />;
    };

    return (
        <Grid container>
            <Grid item xs={12}>
                {sections.map(renderSection)}
            </Grid>
        </Grid>
    );
};

export default AccordionSection;
