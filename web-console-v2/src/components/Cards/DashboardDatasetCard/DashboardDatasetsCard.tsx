import { Card, CardContent, Typography } from '@mui/material';
import React, { ReactNode } from 'react';
import styles from "./DashboardDatasetCard.module.css"

interface DashboardDatasetsCardProps {
  datasetType: string;
  children: ReactNode;
}

const DashboardDatasetsCard: React.FC<DashboardDatasetsCardProps> = ({
  datasetType,
  children,
}) => {
  return (
    <Card elevation={0} className={styles.card}>
      <CardContent className={styles.cardContent}>
        <Typography variant="bodyBold" className={styles.datasetTypeContainer}>
          {datasetType}
        </Typography>
        <div>{children}</div>
      </CardContent>
    </Card>
  );
};

export default DashboardDatasetsCard;
