import React from 'react';
import { Box, Card, CardContent, Tooltip, Typography } from '@mui/material';
import styles from "./BasicCard2.module.css";

interface BasicCard2Props {
  header?: React.ReactNode;
  content?: React.ReactNode;
  footer?: React.ReactNode;
  description?: string;
}

const BasicCard2: React.FC<BasicCard2Props> = ({
  header,
  content,
  footer,
  description,
}) => {
  return (
    <Tooltip title={description}>
      <Card
        elevation={0}
        className={styles.mainCard}
      >
        <CardContent
          className={styles.cardContent}
        >
          {header && (
            <Typography variant="bodyBold">
              {header}{' '}
            </Typography>
          )}

          {content && (
            <Box
              className={styles.contentBox}
            >
              <Typography variant="bodyBold" className={styles.displayContent}>
                {content}
              </Typography>
            </Box>
          )}
          {footer && (
            <Typography variant="captionMedium" className={styles.displayFooter}>
              {footer}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Tooltip>
  );
};

export default BasicCard2;
