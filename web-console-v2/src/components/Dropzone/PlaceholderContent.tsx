import React from 'react';
import { Typography, Stack, Card, CardContent, CardMedia } from '@mui/material';
import { DropzopType } from 'types/dropzone';

interface PlaceholderContentProps {
    imageUrl: string;
    mainText: string;
    subText: string;
    type?: string;
}

const PlaceholderContent = ({ imageUrl, mainText, subText, type }: PlaceholderContentProps) => {
    return (
        <>
            {type !== DropzopType.standard && (
                <Card
                    sx={{
                        width: '18.75rem',
                        height: '14.375rem',
                        margin: 4,
                        boxShadow: '0.625rem 0.625rem 2.75rem 0 rgba(0, 0, 0, 0.1)'
                    }}
                >
                    <CardMedia
                        component="img"
                        image={imageUrl}
                        sx={{ width: '64px', height: '4rem', marginLeft: 15, marginTop: 3 }}
                    />
                    <CardContent>
                        <Stack
                            spacing={1}
                            alignItems="center"
                            justifyContent="center"
                            direction="column"
                            sx={{ width: 1, textAlign: { xs: 'center', md: 'left' } }}
                        >
                            <Typography variant="h2" textAlign="center">
                                {mainText}
                            </Typography>
                            <Typography variant="body1">
                                Drag & Drop or{' '}
                                <Typography
                                    component="span"
                                    variant="body1"
                                    color="primary"
                                    sx={{ textDecoration: 'underline', cursor: 'pointer' }}
                                >
                                    Choose File
                                </Typography>{' '}
                                to upload
                            </Typography>

                            <Typography variant="caption" textAlign="center" fontWeight={400}>
                                Formats Supported: <br />
                                {subText}
                            </Typography>
                        </Stack>
                    </CardContent>
                </Card>
            )}
        </>
    );
};

export default PlaceholderContent;
