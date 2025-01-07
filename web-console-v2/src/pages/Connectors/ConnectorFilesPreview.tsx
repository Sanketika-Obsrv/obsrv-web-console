import React from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  LinearProgress,
} from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FileTextOutlined from '@mui/icons-material/DescriptionOutlined';
import { DropzopType } from 'types/dropzone';
import { ReactComponent as DeleteIcon } from 'assets/upload/Trash.svg';
import { useTheme } from '@mui/material/styles';
import styles from './Connector.module.css';

interface ConnectorFilesPreviewProps {
  files: File[];
  onRemove: (file: File | string) => void;
  showList?: boolean;
  type?: DropzopType;
}

const LinearProgressWithLabel = ({ value, theme, ...props }: any) => {
  return (
    <Box className={styles.linearProgressWithLabelBox1}>
      <Box className={styles.linearProgressWithLabelBox2}>
        <LinearProgress
          variant="determinate"
          color="inherit"
          value={value}
          {...props}
          className={styles.linearProgressWithLabel}

        />
      </Box>
      <Box>
        <Typography variant="h2Secondary" color="text.secondary">{`${Math.round(value)}%`}</Typography>
      </Box>
    </Box>
  );
};

const ConnectorFilesPreview: React.FC<ConnectorFilesPreviewProps> = ({
  files,
  onRemove,
  showList = true,
  type = DropzopType.standard,
}) => {
  const theme = useTheme();
  const hasFile = files.length > 0;
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  if (!showList) {
    return (
      <Box>
        <Typography variant="body2" color="text.secondary">
          {files.length} file{files.length !== 1 ? 's' : ''} selected
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <List
        disablePadding
        className={`${hasFile && type !== DropzopType.standard ? styles.listWithFile : ''} ${type === DropzopType.standard ? styles.standardList : ''
          }`}
      >
        {files.map((file, index) => (
          <ListItem
            key={`${file.name}-${index}`}
            className={styles.listItem}
          >
            <FileTextOutlined className={styles.fileIcon} />
            <ListItemText
              primary={file.name}
              secondary={formatFileSize(file.size)}
            />
            <LinearProgressWithLabel value={100} theme={theme} />

            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={() => onRemove(file)}
              >
                <DeleteIcon className={styles.deleteIcon} />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default ConnectorFilesPreview;