import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';


// Import pages for different routes
import NewDatasetPage from 'pages/DatasetCreation/NewDataset/NewDataset';
import IngestionPage from 'pages/DatasetCreation/Ingestion/Ingestion';
import ProcessingPage from 'pages/DatasetCreation/Processing/Processing';
import StoragePage from 'pages/DatasetCreation/Storage/Storage';
import PreviewPage from 'pages/DatasetCreation/Preview';
import SchemaDetailsPage from 'pages/DatasetCreation/Ingestion/SchemaDetails/SchemaDetails';
import ConnectorConfigurationPage from 'pages/DatasetCreation/ConnectorConfiguration/ConnectorConfiguration';
import SelectConnectorPage from 'pages/DatasetCreation/SelectConnector/SelectConnector';
import ManageConnectorsPage from 'pages/ConnectorManagement/Manage/Manage';
import Dashboard from 'pages/Dashboard/Dashboard';
import IndividualMetricDashboards from 'pages/Dashboard/IndividualDashboardPage/IndividualDashboardPage';
import DatasetCreateEvents from 'pages/DatasetList/DatasetCreateEvents';
import StepperPage from 'pages/DatasetCreation/StepperPage';
import AlertRules from 'pages/alertManager/views/AlertRules';
import SystemAlerts from 'pages/alertManager/views/SystemRules';
import AddAlert from 'pages/alertManager/views/AddRule';
import ViewAlert from 'pages/alertManager/views/ViewRule';
import EditAlert from 'pages/alertManager/views/EditRule';
import ListChannels from 'pages/notificationChannels/ListChannels';
import AddChannel from 'pages/notificationChannels/AddChannel';
import ViewChannel from 'pages/notificationChannels/ViewChannel';
import UpdateChannel from 'pages/notificationChannels/UpdateChannel';
import Loadable from 'pages/auth/components/Loadable';

import DatasetManagement from 'pages/DatasetManagement/DatasetManagement';
import { ConnectorList } from 'pages/ConnectorList/ConnectorList';
import { Connectors } from 'pages/Connectors/Connector';
import DatasetList from 'pages/DatasetList/DatasetList';
import { NotFound } from 'pages/NotFound/NotFound';
import UserManagement from 'pages/UserManagement/UserManagement';
import { useUserRead } from 'services/user';

// Type definition for the route configuration
interface RouteConfig {
  path: string;
  element: React.ReactElement<any>;
  label?: string;
  children?: RouteConfig[];
}
const CustomAlerts = lazy(() => import('pages/alertManager/views/CustomRules'));
const Login = Loadable(lazy(() => import('pages/auth/Login')));
// Base path for all routes

export const routeConfigurations: RouteConfig[] = [
    { path: '/', label: "Dashboard", element: <Navigate to={`/dashboard`} replace /> },
    {path: '/login', element: <Login/>},
    { path: `/dataset/create`, label: "New Dataset", element: <NewDatasetPage /> },
    {
        path: '/dataset',
        element: <StepperPage />,
        children: [
            { path: `edit/connector/list/:datasetId`, label: "Connector List", element: <SelectConnectorPage /> },
            { path: `edit/connector/configure/:datasetId`, label: `Connector Configuration`, element: <ConnectorConfigurationPage /> },
            { path: 'edit/ingestion/meta/:datasetId', label: "Ingestion", element: <IngestionPage /> },
            { path: 'edit/ingestion/schema/:datasetId', label: "Schema Details", element: <SchemaDetailsPage /> },
            { path: 'edit/processing/:datasetId', label: "Processing", element: <ProcessingPage /> },
            { path: 'edit/storage/:datasetId', label: "Storage", element: <StoragePage /> },
            { path: 'edit/preview/:datasetId', label: "Preview", element: <PreviewPage /> }
        ],
    },
    { path: `/dashboard`, label: "Dashboard" ,element: <Dashboard /> },
    { path: `/dashboard/infrastructure`, label: "Infrastructure", element: <IndividualMetricDashboards id="overallInfra" /> },
    { path: `/dashboard/ingestion`, label: "Ingestion", element: <IndividualMetricDashboards id="ingestion" /> },
    { path: `/dashboard/api`, label: "API", element: <IndividualMetricDashboards id="api" /> },
    { path: `/dashboard/processing`, label: "Processing", element: <IndividualMetricDashboards id="processing" /> },
    { path: `/dashboard/storage`, label: "Storage", element: <IndividualMetricDashboards id="storage" /> },
    { path: `/connector-management`, label: "Connector Management", element: <ConnectorConfigurationPage /> },
    { path: `/connector-management/manage`, label: "Manage", element: <ManageConnectorsPage /> },
    {
        path: `/alertRules`,
        label: "Alert Rules", 
        element: <AlertRules />,
        children: [
            { path: 'custom', label: "Custom", element: <CustomAlerts /> },
            { path: 'system', label: "System", element: <SystemAlerts /> }
        ],
    },
    { path: `/connectors`, label: "Connectors", element: <ConnectorList /> },
    { path: `/connectors/create`, label: "New Connector", element: <Connectors /> },
    { path: `/alertRules/add`, label: "Add", element: <AddAlert /> },
    { path: `/alertRules/view/:id`, label: "View", element: <ViewAlert /> },
    { path: `/alertRules/edit/:id`, label: "Edit", element: <EditAlert /> },
    { path: `/alertChannels`, label: "Notification Channels", element: <ListChannels /> },
    { path: `/alertChannels/new`, label: "New", element: <AddChannel /> },
    { path: `/alertChannels/edit/:id`, label: "Edit", element: <UpdateChannel /> },
    { path: `/alertChannels/view/:id`, label: "View", element: <ViewChannel /> },
    { path: `/datasets`, label: "Datasets", element: <DatasetList /> },
    { path: `/datasets/metrics/:datasetId`, label: "Metrics", element: <IndividualMetricDashboards id="individualDataset" /> },
    { path: `/datasets/addEvents/:datasetId`, label: "Add Events", element: <DatasetCreateEvents /> },
    { path: `/datasets/view/:datasetId`, label: "View", element: <DatasetManagement /> },
    { path: `/userManagement`, label: "User Management", element: <UserManagement /> },
    { path: '*', element: <NotFound /> }
];

const AppRouter = () => {
    const location = useLocation();
    const { data: currentUser } = useUserRead();
    const isAdminOrOwner = currentUser && (
      currentUser?.roles.includes('admin') || currentUser?.is_owner
    );

    const filteredRoutes = routeConfigurations.filter(route => {
      if (route.path === '/userManagement' && !isAdminOrOwner) {
        return false;
      }
      return true;
    });

    useEffect(() => {
        if (!location.pathname.includes('/dataset/edit')) {
            localStorage.removeItem('selectedConnectorId');
        }
    }, [location.pathname]);
    return (
        <Routes>
            {filteredRoutes.map(({ path, element, children }: RouteConfig) => (
                <Route
                    key={`${path}-route`}
                    path={path}
                    element={<Suspense fallback={<>Loading...</>}>{element}</Suspense>}
                >
                    {children && children.map(({ path: childPath, element: childElement }: RouteConfig) => (
                        <Route
                            key={`${path}-${childPath}`}
                            path={childPath}
                            element={<Suspense fallback={<>Loading...</>}>{childElement}</Suspense>}
                        />
                    ))}
                </Route>
            ))}
        </Routes>
    );
};

export default AppRouter;
