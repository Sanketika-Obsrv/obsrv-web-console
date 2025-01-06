import React, { useState, ReactNode } from 'react';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Grafana from '../../../assets/icons/Grafana';
import styles from './Metrics.module.css';

interface MenuItemProps {
  label: string;
  onClick: () => void;
}

interface MetricsProps {
  title: string;
  sync?: string;
  logoIcon: ReactNode;
  icon: ReactNode;
  children: ReactNode;
  menuItems: MenuItemProps[];
  nested?: boolean;
}

const Metrics: React.FC<MetricsProps> = ({
  title,
  sync,
  logoIcon,
  icon,
  children,
  menuItems,
  nested,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Card elevation={0} className={styles.card}>
      <CardContent
        className={` ${nested ? styles.metricsCard2 : styles.metricsCard}`}
      >
        <div className={styles.header}>
          <div className={` ${nested ? styles.heading2 : styles.heading}`}>
            <div className={styles.grafana}>{logoIcon}</div>
            <Typography variant="h1" className={styles.title}>
              {title}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {sync}
            </Typography>
          </div>
          <IconButton color="primary" size="small" onClick={handleMenuClick}>
            {/* <Typography color="primary" pr={3} variant="bodyBold">
              {' '}
              View Details
            </Typography> */}
            {icon}
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
          >
            {menuItems.map((item, index) => (
              <MenuItem
                key={index}
                onClick={() => {
                  item.onClick();
                  handleMenuClose();
                }}
              >
                <Typography variant="bodyBold" className={styles.menuItem}>{item.label}</Typography>
              </MenuItem>
            ))}
          </Menu>
        </div>
        <div className={styles.cardsContainer}>{children}</div>
      </CardContent>
    </Card>
  );
};

export default Metrics;
