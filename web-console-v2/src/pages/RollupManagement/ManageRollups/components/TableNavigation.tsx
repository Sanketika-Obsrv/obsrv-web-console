import React from 'react';
import { Box, Button } from '@mui/material';
import styles from '../components/ManagedRollups.module.css';

interface StepperNavigationProps {
  activeStep: number;
  isStepValid: boolean;
  onBack: () => void;
  onNext: () => void;
  isLastStep: boolean;
  isSubmitting?: boolean;
  disabled?: boolean;
  onSkipSave?: () => void;
  edit?: boolean;
}

const TableNavigation: React.FC<StepperNavigationProps> = ({
  activeStep,
  isStepValid,
  onBack,
  onNext,
  isLastStep,
  isSubmitting = false,
  disabled,
  onSkipSave,
  edit,
}) => {
  return (
    <Box className={styles.tableNavigationBox}>
      <Button
        color="inherit"
        disabled={activeStep === 0 || isSubmitting}
        onClick={onBack}
        sx={{ mr: 1 }}
        size='small'
      >
        Back
      </Button>
      <Button 
        variant="contained"
        onClick={onNext}
        disabled={!isStepValid || isSubmitting || disabled}
        size='small'
        sx={{ mr: 1 }}
      >
        {isSubmitting ? 'Submitting...' : isLastStep ? 'Submit' : 'Next'}
      </Button>
      {activeStep === 3 && isStepValid && onSkipSave && (
        <Button
          variant="contained"
          onClick={onSkipSave}
          disabled={false}
          size='small'
        >
          Skip & Save
        </Button>
      )}
    </Box>
  );
};

export default TableNavigation;
