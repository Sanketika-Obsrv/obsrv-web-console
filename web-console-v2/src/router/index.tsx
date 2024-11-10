import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';


// Import pages for different routes
import NewDatasetPage from 'pages/NewDataset/NewDataset';
import IngestionPage from 'pages/StepsPages/Ingestion/Ingestion';
import ProcessingPage from 'pages/StepsPages/Processing/Processing';
import StoragePage from 'pages/StepsPages/Storage/Storage';
import PreviewPage from 'pages/StepsPages/Preview';
import SchemaDetailsPage from 'pages/StepsPages/Ingestion/SchemaDetails/SchemaDetails';
import ConnectorConfigurationPage from 'pages/ConnectorConfiguration/ConnectorConfiguration';
import SelectConnectorPage from 'pages/SelectConnector/SelectConnector';
import ManageConnectorsPage from 'pages/ConnectorManagement/Manage/Manage';
import SettingsPage from 'pages/Settings/Settings';
import Dashboard from 'pages/Dashboard/Dashboard';
import IndividualMetricDashboards from 'pages/Dashboard/IndividualDashboardPage/IndividualDashboardPage';
import DatasetMetrics from 'pages/dashboardV1/DatasetMetrics';
import DatasetCreateEvents from 'pages/dashboardV1/createEvents';
import ClusterHealth from 'pages/dashboardV1/datasets';

import StepperPage from 'pages/StepsPages/StepperPage';
import AlertRules from 'pages/alertManager/views/AlertRules';
import SystemAlerts from 'pages/alertManager/views/SystemRules';
import AddAlert from 'pages/alertManager/views/AddRule';
import ViewAlert from 'pages/alertManager/views/ViewRule';
import EditAlert from 'pages/alertManager/views/EditRule';
import ListChannels from 'pages/notificationChannels/ListChannels';
import AddChannel from 'pages/notificationChannels/AddChannel';
import ViewChannel from 'pages/notificationChannels/ViewChannel';
import UpdateChannel from 'pages/notificationChannels/UpdateChannel';
import DatasetManagement from 'pages/datasetManagement/components/DatasetManagement';
// Type definition for the route configuration
interface RouteConfig {
    path: string;
    element: React.ReactElement;
    label?: string;
    children?: RouteConfig[];
}
const CustomAlerts = lazy(() => import('pages/alertManager/views/CustomRules'));
// Base path for all routes
const BASE_PATH = '/home';

export const routeConfigurations: RouteConfig[] = [
    { path: '/', label: "Dashboard", element: <Navigate to={`${BASE_PATH}/dashboard`} replace /> },
    { path: `${BASE_PATH}`, label: "Home", element: <Navigate to={`${BASE_PATH}`} replace /> },
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
    { path: `${BASE_PATH}/dashboard`, label: "Dashboard" ,element: <Dashboard /> },
    { path: `${BASE_PATH}/dashboard/infrastructure`, label: "Infrastructure", element: <IndividualMetricDashboards id="overallInfra" /> },
    { path: `${BASE_PATH}/dashboard/ingestion`, label: "Ingestion", element: <IndividualMetricDashboards id="ingestion" /> },
    { path: `${BASE_PATH}/dashboard/api`, label: "API", element: <IndividualMetricDashboards id="api" /> },
    { path: `${BASE_PATH}/dashboard/processing`, label: "Processing", element: <IndividualMetricDashboards id="processing" /> },
    { path: `${BASE_PATH}/dashboard/storage`, label: "Storage", element: <IndividualMetricDashboards id="storage" /> },
    { path: `${BASE_PATH}/connector-management`, label: "Connector Management", element: <ConnectorConfigurationPage /> },
    { path: `${BASE_PATH}/connector-management/manage`, label: "Manage", element: <ManageConnectorsPage /> },
    { path: `${BASE_PATH}/settings`, label: "Settings", element: <SettingsPage /> },
    {
        path: `${BASE_PATH}/alertRules`,
        label: "Alert Rules", 
        element: <AlertRules />,
        children: [
            { path: 'custom', label: "Custom", element: <CustomAlerts /> },
            { path: 'system', label: "System", element: <SystemAlerts /> }
        ],
    },
    { path: `${BASE_PATH}/alertRules/add`, label: "Add", element: <AddAlert /> },
    { path: `${BASE_PATH}/alertRules/view/:id`, label: "View", element: <ViewAlert /> },
    { path: `${BASE_PATH}/alertRules/edit/:id`, label: "Edit", element: <EditAlert /> },
    { path: `${BASE_PATH}/alertChannels`, label: "Notification Channels", element: <ListChannels /> },
    { path: `${BASE_PATH}/alertChannels/new`, label: "New", element: <AddChannel /> },
    { path: `${BASE_PATH}/alertChannels/edit/:id`, label: "Edit", element: <UpdateChannel /> },
    { path: `${BASE_PATH}/alertChannels/view/:id`, label: "View", element: <ViewChannel /> },
    { path: `${BASE_PATH}/datasets`, label: "Datasets", element: <ClusterHealth /> },
    { path: `${BASE_PATH}/datasets/metrics/:datasetId`, label: "Metrics", element: <DatasetMetrics /> },
    { path: `${BASE_PATH}/datasets/addEvents/:datasetId`, label: "Add Events", element: <DatasetCreateEvents /> },
    { path: `${BASE_PATH}/datasets/view/:datasetId`, label: "View", element: <DatasetManagement /> }
];

const AppRouter = () => (
    <Routes>
        {routeConfigurations.map(({ path, element, children }: RouteConfig) => (
            <Route
                key={`${path}-route`}
                path={path}
                element={<Suspense fallback={<div>Loading...</div>}>{element}</Suspense>}
            >
                {children && children.map(({ path: childPath, element: childElement }: RouteConfig) => (
                    <Route
                        key={`${path}-${childPath}`}
                        path={childPath}
                        element={<Suspense fallback={<div>Loading...</div>}>{childElement}</Suspense>}
                    />
                ))}
            </Route>
        ))}
    </Routes>
);

export default AppRouter;
