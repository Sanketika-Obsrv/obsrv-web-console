import React from 'react';
import { DownloadOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { Stack, Typography, Box, Button } from '@mui/material';
import AnimateButton from 'components/@extended/AnimateButton';
import { StandardWidthButton } from 'components/Styled/Buttons';

const WizardNavigator = ({ showPrevious, gotoPreviousSection, gotoNextSection, enableDownload, handleDownload, master, section = undefined, nextDisabled = false, edit }: any) => {

    return <Stack direction="row" justifyContent={showPrevious ? 'space-between' : 'flex-end'} mx={6}>

        {showPrevious && gotoPreviousSection &&
            <Button
                variant="outlined"
                type="button"
                onClick={gotoPreviousSection}
            >
                <Typography variant="buttonSecondaryCTA">Previous</Typography>
            </Button>
        }

        <Box display="flex" justifyContent="space-evenly" alignItems="center">
            {enableDownload && handleDownload &&
                <Button
                    startIcon={<DownloadOutlined style={{ fontSize: '1.25rem' }} />}
                    sx={{ width: 'auto' }}
                    type="button"
                    onClick={handleDownload}
                    variant='outlined'
                >
                    <Typography variant="buttonSecondaryCTA">Download JSON Schema</Typography>
                </Button>
            }

            {gotoNextSection &&
                <Button
                    variant="contained"
                    type="button"
                    onClick={gotoNextSection}
                    disabled={nextDisabled}>
                    <Typography variant="button">Proceed</Typography>
                </Button>
            }
        </Box>
    </Stack>
};

export default WizardNavigator;
