import React from 'react';
import { Button, Card, CardContent, Grid, Stack } from '@mui/material';
import _ from 'lodash';
import AccordionSection from 'components/Accordian/AccordionSection';

export const validateForm = (config: Record<string, any>) => {
    if (!config) return false;
    return _.every(_.values(config), (value) => value === true);
};

export const renderSections = (context: Record<string, any>) => {
    const { testChannel = true } = context;
    return (
        <Card sx={{ minWidth: 275, padding: 0 }}>
            <CardContent sx={{ background: '#f9f9f9' }}>
                <Grid
                    sx={{ padding: '1rem' }}
                    container
                    justifyContent="flex-start"
                    alignItems="center"
                >
                    <Grid item sm={12}>
                        <AccordionSection sections={context.sections}></AccordionSection>
                    </Grid>
                    <Grid item xs={12}>
                        <Stack direction="row" spacing={2}>
                            {context.actionHandler && context.actionLabel && (
                                <Button
                                    variant="contained"
                                    disabled={
                                        !validateForm(_.get(context.formData, 'error')) ||
                                        !testChannel
                                    }
                                    onClick={(_) => context.actionHandler()}
                                >
                                    {context.actionLabel}
                                </Button>
                            )}
                            {context.notificationTestHandler && (
                                <Button
                                    variant="contained"
                                    disabled={!validateForm(_.get(context.formData, 'error'))}
                                    onClick={(_) => context.notificationTestHandler()}
                                >
                                    {context.notificationTestLabel}
                                </Button>
                            )}
                        </Stack>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};
