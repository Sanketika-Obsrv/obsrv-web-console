import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  styled,
  Button,
  TextField
} from '@mui/material';
import MuiAccordion, { AccordionProps } from '@mui/material/Accordion';
import MuiAccordionDetails from '@mui/material/AccordionDetails';
import MuiAccordionSummary, { AccordionSummaryProps } from '@mui/material/AccordionSummary';
import ArrowForwardIosSharpIcon from '@mui/icons-material/ArrowForwardIosSharp';
import { useNavigate, useParams } from 'react-router-dom';
import { useReadRollup } from '../ManageRollups/services/rollup';
import KeyboardBackspaceIcon from '@mui/icons-material/KeyboardBackspace';
import { granularityOptions } from '../ManageRollups/services/configs';
import { DatasetStatus } from 'types/datasets';
import * as _ from 'lodash';

const Accordion = styled((props: AccordionProps) => (
  <MuiAccordion disableGutters elevation={0} square {...props} />
))(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  '&:not(:last-child)': {
    borderBottom: 0,
  },
  '&::before': {
    display: 'none',
  },
}));

const AccordionSummary = styled((props: AccordionSummaryProps) => (
  <MuiAccordionSummary
    expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: '0.9rem' }} />}
    {...props}
  />
))(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, .05)'
      : 'rgba(0, 0, 0, .03)',
  '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
    transform: 'rotate(90deg)',
  },
  '& .MuiAccordionSummary-content': {
    margin: 0,
  },
  '& .MuiAccordionSummary-expandIconWrapper': {
    position: 'absolute',
    right: theme.spacing(2),
  },
}));

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: '1px solid rgba(0, 0, 0, .125)',
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

const ViewRollup: React.FC = () => {
  const navigate = useNavigate();
  const { tableId } = useParams<{ tableId: string }>();
  const { data: rollupData, isLoading, error } = useReadRollup(tableId || '', DatasetStatus.Live);
  const [expanded, setExpanded] = React.useState<string | false>('basic');

  const handleChange = (panel: string) => (event: React.SyntheticEvent, newExpanded: boolean) => {
    setExpanded(newExpanded ? panel : false);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">Error loading table details</Typography>
      </Box>
    );
  }

  const tableData = rollupData?.data;
  return (
    <Box p={3}>
      <Paper elevation={0} sx={{ p: 2 }}>
        <Box sx={{ pb: 2 }}>
          <Button
            variant="back"
            startIcon={
              <KeyboardBackspaceIcon
              />
            }
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
        </Box>
        <Accordion expanded={expanded === 'basic'} onChange={handleChange('basic')}>
          <AccordionSummary aria-controls="basic-content" id="basic-header">
            <Typography variant="h6">Table Details</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper} sx={{ width: '80%' }}>
              <Table size="small" aria-label="basic info table">
                <TableHead>
                  <TableRow>
                    <TableCell align="left" width={'40%'} sx={{ borderRight: '1px solid #ddd !important' }}>Property</TableCell>
                    <TableCell align="left" width={'60%'}>Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <StyledTableRow>
                    <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>Table ID</TableCell>
                    <TableCell align="left">{tableData?.id}</TableCell>
                  </StyledTableRow>
                  <StyledTableRow>
                    <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>Table Name</TableCell>
                    <TableCell align="left">{tableData?.name}</TableCell>
                  </StyledTableRow>
                  <StyledTableRow>
                    <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>Granularity</TableCell>
                    <TableCell align="left">{granularityOptions.find(option =>
                      option.value === (tableData?.metadata?.spec?.granularity || tableData?.spec?.granularity)
                    )?.label || ''}</TableCell>
                  </StyledTableRow>
                  <StyledTableRow>
                    <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>Type</TableCell>
                    <TableCell align="left">{tableData?.spec?.rollup || tableData?.metadata?.spec?.rollup ? "Aggregate" : "Subset"}</TableCell>
                  </StyledTableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded === 'metrics'} onChange={handleChange('metrics')}>
          <AccordionSummary aria-controls="metrics-content" id="metrics-header">
            <Typography variant="h6">Metrics</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {tableData?.metadata?.spec?.metrics?.length > 0 ? (
              <TableContainer component={Paper} sx={{ width: '80%' }}>
                <Table size="small" aria-label="metrics table">
                  <TableHead>
                    <TableRow>
                      <TableCell align="left" width={'25%'} sx={{ borderRight: '1px solid #ddd !important' }}>Name</TableCell>
                      <TableCell align="left" width={'25%'} sx={{ borderRight: '1px solid #ddd !important' }}>Aggregate</TableCell>
                      <TableCell align="left" width={'25%'} sx={{ borderRight: '1px solid #ddd !important' }}>Field</TableCell>
                      <TableCell align="left" width={'25%'}>Data Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableData?.metadata?.spec?.metrics?.map((metric: any, index: number) => (
                      <StyledTableRow key={index}>
                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{metric.name}</TableCell>
                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{metric.aggregate}</TableCell>
                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{metric.field}</TableCell>
                        <TableCell align="left">{metric.datatype}</TableCell>
                      </StyledTableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography color="textSecondary">No metrics found</Typography>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded === 'dimensions'} onChange={handleChange('dimensions')}>
          <AccordionSummary aria-controls="dimensions-content" id="dimensions-header">
            <Typography variant="h6">Dimensions</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {tableData?.metadata?.spec?.dimensions?.length > 0 ? (
              <TableContainer component={Paper} sx={{ width: '80%' }}>
                <Table size="small" aria-label="dimensions table">
                  <TableHead>
                    <TableRow>
                      <TableCell align="left" width={'33%'} sx={{ borderRight: '1px solid #ddd !important' }}>Name</TableCell>
                      <TableCell align="left" width={'33%'} sx={{ borderRight: '1px solid #ddd !important' }}>Field</TableCell>
                      <TableCell align="left" width={'34%'}>Data Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableData?.metadata?.spec?.dimensions?.map((dimension: any, index: number) => (
                      <StyledTableRow key={index}>
                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{dimension.name}</TableCell>
                        <TableCell align="left" sx={{ borderRight: '1px solid #ddd !important' }}>{dimension.field}</TableCell>
                        <TableCell align="left">{dimension.datatype}</TableCell>
                      </StyledTableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography color="textSecondary">No dimensions found</Typography>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>

        {!_.isEmpty(tableData?.metadata?.spec?.filter) && (
          <Accordion expanded={expanded === 'filter'} onChange={handleChange('filter')}>
            <AccordionSummary aria-controls="filter-content" id="filter-header">
              <Typography variant="h6">Filter</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ width: '80%' }}>
                <TextField
                  fullWidth
                  multiline
                  disabled
                  rows={8}
                  value={JSON.stringify(tableData.metadata.spec.filter, null, 2)}
                  variant="outlined"
                  InputProps={{
                    sx: {
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      backgroundColor: 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        )}
      </Paper>
    </Box>
  );
};

export default ViewRollup;
