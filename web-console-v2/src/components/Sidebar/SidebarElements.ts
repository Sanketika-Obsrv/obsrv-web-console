import React from 'react';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import ConnectorManagement from 'assets/icons/ConnectorManagement';
import { AlertOutlined, MailOutlined } from '@ant-design/icons';
import DatasetManagementIcon from 'assets/icons/DatasetManagement';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';
import CableIcon from '@mui/icons-material/Cable';
import PeopleOutlineOutlinedIcon from '@mui/icons-material/PeopleOutlineOutlined';
import { theme } from 'theme';
import { useUserRead } from 'services/user';

const SidebarElements = () => {
  const { data: currentUser } = useUserRead();

  const isAdminOrOwner = currentUser && (
    currentUser?.roles.includes('admin') || currentUser?.is_owner
  );
  const elements = [
    {
      id: 'dashboard',
      icon: React.createElement(DashboardOutlinedIcon),
      title: 'Dashboard',
      route: '/dashboard',
      dropdownIcon: React.createElement(ExpandMoreOutlinedIcon),
      children: [
        {
          id: 'infrastructure',
          color: theme.palette.primary.main,
          title: 'Infrastructure',
          route: '/dashboard/infrastructure'
        },
        {
          id: 'ingestion',
          color: theme.palette.secondary.main,
          title: 'Ingestion',
          route: '/dashboard/ingestion'
        },
        {
          id: 'api',
          color: theme.palette.error.main,
          title: 'API',
          route: '/dashboard/api'
        },
        {
          id: 'processing',
          color: theme.palette.tertiary.main,
          title: 'Processing',
          route: '/dashboard/processing'
        },
        {
          id: 'storage',
          color: theme.palette.info.dark,
          title: 'Storage',
          route: '/dashboard/storage'
        }
        // {
        //     id: 'query',
        //     color: theme.palette.secondary.main,
        //     title: 'Query',
        //     route: '/dashboard/query'
        // }
      ]
    },
    // {
    //     id: 'datasetmanagement',
    //     icon: React.createElement(DatasetManagementIcon),
    //     title: 'Dataset Management',
    //     route: '/dataset-management',
    //     dropdownIcon: React.createElement(ExpandMoreOutlinedIcon),
    //     children: [
    //         {
    //             id: 'datasetmanagementmanage',
    //             color: theme.palette.primary.main,
    //             title: 'Manage',
    //             route: '/dataset-management/manage'
    //         },
    //         {
    //             id: 'datasetmanagementobserve',
    //             color: theme.palette.secondary.main,
    //             title: 'Observe/Monitor',
    //             route: '/dataset-management/observe-monitor'
    //         },
    //         {
    //             id: 'datasetmanagementplayground',
    //             color: theme.palette.tertiary.main,
    //             title: 'Playground',
    //             route: '/dataset-management/playground'
    //         }
    //     ]
    // },
    // {
    //     id: 'connectormanagement',
    //     icon: React.createElement(ConnectorManagement),
    //     title: 'Connector Management',
    //     route: '/connector-management',
    //     dropdownIcon: React.createElement(ExpandMoreOutlinedIcon),
    //     children: [
    //         {
    //             id: 'manage',
    //             color: theme.palette.primary.main,
    //             title: 'Manage',
    //             route: '/connector-management/manage'
    //         },
    //         {
    //             id: 'observe/monitor',
    //             color: theme.palette.secondary.main,
    //             title: 'Observe/Monitor',
    //             route: '/connector-management/observe-monitor'
    //         }
    //     ]
    // },
    {
      id: 'datasetcreation',
      icon: React.createElement(AddCircleOutlineIcon),
      title: 'Dataset Creation',
      route: '/dataset/create'
    },
    {
      id: 'datasetmanagement',
      icon: React.createElement(DatasetManagementIcon),
      title: 'Datasets',
      route: '/datasets',
    },
    {
      id: 'alertmanagement',
      icon: React.createElement(AlertOutlined),
      title: 'Alerts',
      route: '/alertRules'
    },
    {
      id: 'notifications',
      icon: React.createElement(MailOutlined),
      title: 'Notification Channels',
      route: '/alertChannels',
    },
    {
      id: 'connectors',
      icon:React.createElement(CableIcon),
      title: 'Connectors',
      route: '/connectors',
    },
    isAdminOrOwner && {
      id: 'usermanagement',
      icon: React.createElement(PeopleOutlineOutlinedIcon),
      title: 'User Management',
      route: '/userManagement',
    }
  ].filter(Boolean);

  return elements;
};

export default SidebarElements;
