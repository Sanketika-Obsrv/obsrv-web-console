import React, { useState } from 'react';
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
import config from '../../data/initialConfig';
import MainCard from '../MainCard';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const { spacing } = config;

const FieldSection = (props: any) => {
    const {
        id,
        expanded,
        title,
        description,
        componentType = 'accordion',
        navigation,
        setExpanded,
        handleChange,
        section,
        ...rest
    } = props;
    const theme = useTheme();
    const open = id === expanded;

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
            <Accordion
                expanded={open}
                onChange={handleChange(id)}
                square={true}
                sx={{
                    boxShadow: 'none',
                    borderRadius: "10px"
                }}
            >
                <AccordionSummary
                    sx={{ py: '8px' }}
                    expandIcon={<ExpandMoreIcon sx={{ color: 'black' }} />}
                >
                    <Stack
                        direction="column"
                        spacing={spacing}
                        alignItems="center"
                        justifyContent="center"
                    >
                        <Typography variant="h6" fontWeight={600} color="#000">
                            {' '}
                            {title}
                        </Typography>
                        {!open && (
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary', width: '100%' }}
                            >
                                {description}
                            </Typography>
                        )}
                    </Stack>
                </AccordionSummary>
                <AccordionDetails>{sectionDetails()}</AccordionDetails>
            </Accordion>
        );
    };

    const renderBox = () => {
        return (
            <MainCard
                title={<Typography sx={{ width: '100%', flexShrink: 0 }}> {title}</Typography>}
                contentSX={{ px: 3 }}
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
                            boxShadow: 'none',
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
    const [expanded, setExpanded] = useState<string | false>(false);
    const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpanded(isExpanded ? panel : false);
    };
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
    };

    return (
        <>
            <Grid container>
                <Grid item xs={12}>
                    {sections.map(renderSection)}
                </Grid>
            </Grid>
        </>
    );
};

export default AccordionSection;
