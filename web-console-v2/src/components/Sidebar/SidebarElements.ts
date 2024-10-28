import React from 'react';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import ConnectorManagement from 'assets/icons/ConnectorManagement';
import DatasetManagementIcon from 'assets/icons/DatasetManagement';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';
import { theme } from 'theme';

const SidebarElements = () => {
  const elements = [
    {
      id: 'dashboard',
      icon: React.createElement(DashboardOutlinedIcon),
      title: 'Dashboard',
      route: '/home/dashboard',
      dropdownIcon: React.createElement(ExpandMoreOutlinedIcon),
      children: [
        {
          id: 'infrastructure',
          color: theme.palette.primary.main,
          title: 'Infrastructure',
          route: '/home/dashboard/infrastructure'
        },
        {
          id: 'ingestion',
          color: theme.palette.secondary.main,
          title: 'Ingestion',
          route: '/home/dashboard/ingestion'
        },
        {
          id: 'api',
          color: theme.palette.secondary.main,
          title: 'Api',
          route: '/home/dashboard/api'
        },
        {
          id: 'processing',
          color: theme.palette.tertiary.main,
          title: 'Processing',
          route: '/home/dashboard/processing'
        },
        {
          id: 'storage',
          color: theme.palette.info.dark,
          title: 'Storage',
          route: '/home/dashboard/storage'
        }
        // {
        //     id: 'query',
        //     color: theme.palette.secondary.main,
        //     title: 'Query',
        //     route: '/home/dashboard/query'
        // }
      ]
    },
    // {
    //     id: 'datasetmanagement',
    //     icon: React.createElement(DatasetManagementIcon),
    //     title: 'Dataset Management',
    //     route: '/home/dataset-management',
    //     dropdownIcon: React.createElement(ExpandMoreOutlinedIcon),
    //     children: [
    //         {
    //             id: 'datasetmanagementmanage',
    //             color: theme.palette.primary.main,
    //             title: 'Manage',
    //             route: '/home/dataset-management/manage'
    //         },
    //         {
    //             id: 'datasetmanagementobserve',
    //             color: theme.palette.secondary.main,
    //             title: 'Observe/Monitor',
    //             route: '/home/dataset-management/observe-monitor'
    //         },
    //         {
    //             id: 'datasetmanagementplayground',
    //             color: theme.palette.tertiary.main,
    //             title: 'Playground',
    //             route: '/home/dataset-management/playground'
    //         }
    //     ]
    // },
    // {
    //     id: 'connectormanagement',
    //     icon: React.createElement(ConnectorManagement),
    //     title: 'Connector Management',
    //     route: '/home/connector-management',
    //     dropdownIcon: React.createElement(ExpandMoreOutlinedIcon),
    //     children: [
    //         {
    //             id: 'manage',
    //             color: theme.palette.primary.main,
    //             title: 'Manage',
    //             route: '/home/connector-management/manage'
    //         },
    //         {
    //             id: 'observe/monitor',
    //             color: theme.palette.secondary.main,
    //             title: 'Observe/Monitor',
    //             route: '/home/connector-management/observe-monitor'
    //         }
    //     ]
    // },
    {
      id: 'datasetcreation',
      icon: React.createElement(AddCircleOutlineIcon),
      title: 'Dataset Creation',
      route: '/home/new-dataset'
    },
    {
          id: 'datasetmanagement',
          icon: React.createElement(DatasetManagementIcon),
          title: 'Dataset Management',
          route: '/home/dataset-management',
    }
  ];

  return elements;
};

export default SidebarElements;
