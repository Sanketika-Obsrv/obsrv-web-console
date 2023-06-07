import { ReactNode } from 'react';
import { ChipProps } from '@mui/material';

import { GenericCardProps } from './root';

export type NavItemType = {
  breadcrumbs?: boolean;
  caption?: ReactNode | string;
  children?: NavItemType[];
  chip?: ChipProps;
  color?: 'primary' | 'secondary' | 'default' | undefined;
  disabled?: boolean;
  external?: boolean;
  icon?: GenericCardProps['iconPrimary'];
  id?: string;
  search?: string;
  target?: boolean;
  title?: ReactNode | string;
  type?: string;
  url?: string | undefined;
  onClick?: (config: any) => any;
};

export type LinkTarget = '_blank' | '_self' | '_parent' | '_top';

export type MenuProps = {
  openItem: string[];
  openComponent: string;
  drawerOpen: boolean;
  componentDrawerOpen: boolean;
};
