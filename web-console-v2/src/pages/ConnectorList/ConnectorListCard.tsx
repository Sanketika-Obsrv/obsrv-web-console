import React from 'react';
import { Box, Typography, Avatar, Grid } from '@mui/material';
import styles from './ConnectorList.module.css';
import moment from 'moment';

export interface ConnectorListCardProps {
  connector: {
    id: string;
    name: string;
    version: string;
    runtime: string;
    status: string;
    iconurl: string | null;
    created_date: string;
    technology: string;
  };
}

const formatDate = (dateString: moment.MomentInput) => {
  return moment(dateString).format('MMMM DD, YYYY');
};

type ConnectorKeys = keyof ConnectorListCardProps['connector'];

const fieldConfig: { label: string; valueKey: ConnectorKeys; }[] = [
  { label: 'Version', valueKey: 'version' },
  { label: 'Language', valueKey: 'technology' },
  { label: 'Status', valueKey: 'status' },
];

const ConnectorListCard: React.FC<ConnectorListCardProps> = ({ connector }) => {
  return (
    <Box className={styles.cardContainerActive}>
      <Grid container direction="row">
        <Grid item xs={3} className={styles.gridItem}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {connector?.iconurl ? (
              <Avatar src={connector?.iconurl} alt={connector?.name} className={styles.avatarIcon} />
            ) : (
              <Avatar className={styles.avatarCharacter}>
                {connector?.name?.charAt(0).toUpperCase()}
              </Avatar>
            )}
            <Typography variant="h6" sx={{ fontWeight: 'bold', marginLeft: '1rem' }}>
              {connector?.name}
            </Typography>
          </Box>
        </Grid>

        {fieldConfig.map((field, index) => (
          <Grid item xs={2} className={styles.gridItem} key={index}>
            <Typography variant="captionMedium">{field.label}:</Typography>
            <Typography variant="caption" className={styles.fieldValues}>
              {connector?.[field.valueKey]}
            </Typography>
          </Grid>
        ))}

        <Grid item xs={3} className={styles.gridItemNoBorder}>
          <Typography variant="captionMedium">Created On:</Typography>
          <Typography variant="caption" className={styles.fieldValues}>
            {formatDate(connector?.created_date)}
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

export default React.memo(ConnectorListCard);
