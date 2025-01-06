import React, { useEffect, useState } from 'react';
import { styled, Box, Grid, Paper, Typography, Avatar } from '@mui/material';
import { fetchConnectors } from 'services/connector';
import Loader from 'components/Loader';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import styles from './ConnectorList.module.css';
import { BoldOutlined } from '@ant-design/icons';
import ConnectorListCard from './ConnectorListCard';

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: theme.palette.text.secondary,
  ...theme.applyStyles('dark', {
    backgroundColor: '#1A2027',
  }),
}));

export const ConnectorList: React.FC = () => {
  const [connectors, setConnectors] = useState<any[]>([]);
  const [isLoading, setisLoading] = useState(false);

  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/connectors/create');
  };

  useEffect(() => {
    const loadConnectors = async () => {
      setisLoading(true);
      try {
        const data = await fetchConnectors();
        setConnectors(data);
        setisLoading(false);
      } catch (error) {
        console.error('Error loading connecors', error);
        setisLoading(false);
      }
    };
    loadConnectors();
  }, []);

  return (
    <>
      {isLoading ? (
        <Loader
          loading={isLoading}
          descriptionText="Please wait while we process your request."
        />
      ) : (
        <Box className={styles.mainContainer}>
          <Box className={styles.headerBox}>
            <Typography variant="majorh4">
              Connectors List
            </Typography>
              <Button
                size="small"
                type="button"
                sx={{
                  mx: 1,
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    borderColor: 'primary.main',
                  },
                }}
                variant="outlined"
                startIcon={<AddIcon sx={{ fontSize: '1.25rem' }} />}
                onClick={handleClick}
              >
                Add Connector
              </Button>
          </Box>
          {connectors.map((connector) => (
            <Grid item xs={12} sm={6} md={4} key={connector.id} >
              <ConnectorListCard connector={connector} />
            </Grid>
          ))}
        </Box>
      )}
    </>
  );
};