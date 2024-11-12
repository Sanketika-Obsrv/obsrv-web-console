import React from 'react';
import { useState } from 'react';
import * as _ from 'lodash';
import { useLocation } from 'react-router';
import AccordionSection from 'components/Accordian/AccordionSection';
import GranularityOptions from './GranularityOptions';
import Loader from 'components/Loader';
import { Box, Typography } from '@mui/material';

const Granularity = (props: any) => {
    const {
        setProceedToListPage,
        setSelectedGranularityOptions,
        setCustomGranularity,
        customGranularity,
        selectedOptions,
        setSelectedOptions
    } = props;
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const isEditing = location.state?.edit;

    return (
        <>
            {loading && <Loader loading={loading} />}
            {!loading &&
                <Box sx={{ mx:6, px:2.5, pt:2, background: '#ffffff', border: '1px solid #d6d6d6', borderRadius: '8px'}}>
                    <Typography variant='h5' sx={{pb:2}}>Granularity *</Typography>
                    {!isEditing ?
                    <GranularityOptions
                        setSelectedOptions={setSelectedOptions}
                        selectedOptions={selectedOptions}
                        setCustomGranularity={setCustomGranularity}
                        customGranularity={customGranularity}
                        setProceedToListPage={setProceedToListPage}
                        setSelectedGranularityOptions={setSelectedGranularityOptions}
                    /> : null}
                </Box>
            }
        </>
    );
};

export default Granularity;
