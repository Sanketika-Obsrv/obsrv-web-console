import { DownloadOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { Stack, Typography, Box, } from '@mui/material';
import AnimateButton from 'components/@extended/AnimateButton';
import { StandardWidthButton } from 'components/styled/Buttons';

const WizardNavigator = ({ showPrevious, gotoPreviousSection, gotoNextSection, enableDownload, handleDownload, master, section = undefined, nextDisabled = false, edit }: any) => {

    return <Stack direction="row" justifyContent={showPrevious ? 'space-between' : 'flex-end'}>

        {showPrevious && gotoPreviousSection &&
            <AnimateButton>
                <StandardWidthButton
                    variant="outlined"
                    type="button"
                    onClick={gotoPreviousSection}
                >
                    <Typography variant="h5">Previous</Typography>
                </StandardWidthButton>
            </AnimateButton>
        }

        <Box display="flex" justifyContent="space-evenly" alignItems="center">
            {enableDownload && handleDownload &&
                <AnimateButton>
                    <StandardWidthButton
                        startIcon={<DownloadOutlined style={{ fontSize: '1.25rem' }} />}
                        sx={{ width: 'auto' }}
                        type="button"
                        onClick={handleDownload}
                        variant='outlined'
                    >
                        <Typography variant="h5">Download JSON Schema</Typography>
                    </StandardWidthButton>
                </AnimateButton>
            }

            {gotoNextSection &&
                <AnimateButton>
                    <StandardWidthButton
                        variant="contained"
                        type="button"
                        onClick={gotoNextSection}
                        disabled={nextDisabled}>
                        <Typography variant="h5">Proceed</Typography>
                    </StandardWidthButton>
                </AnimateButton>
            }
        </Box>
    </Stack>
};

export default WizardNavigator;
