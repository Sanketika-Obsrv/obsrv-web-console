import React from 'react';
import { Typography, Stack, Card, CardContent, CardMedia } from '@mui/material';
import { DropzopType } from 'types/dropzone';
import UploadCover from 'assets/upload/upload.svg';
import './styles.css';
import styles from './Connector.module.css';

interface ConnectorCardPlaceholderProps {
  imageUrl: string;
  mainText: string;
  subText: string;
  type?: string;
}

export const ConnectorCardPlaceholder = ({
  imageUrl,
  mainText,
  subText,
  type,
}: ConnectorCardPlaceholderProps) => {
  return (
    <>
      {type !== DropzopType.standard && (
        <Card className={styles.connectorCardPlaceholder}>
          <CardMedia
            component="img"
            image={UploadCover}
            className={styles.connectorCardPlaceholderMedia}
          />
          <CardContent>
            <Stack
              spacing={1}
              alignItems="center"
              justifyContent="center"
              direction="column"
              className={styles.connectorCardPlaceholderStack}
            >
              <Typography variant="body1" className={styles.connectorCardPlaceholderText}>
                Drag & Drop or{' '}
                <Typography
                  component="span"
                  variant="body1"
                  color="primary"
                  className={styles.connectorCardPlaceholderLink}
                >
                  Choose a ZIP File
                </Typography>{' '}
                to upload
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}
    </>
  );
};