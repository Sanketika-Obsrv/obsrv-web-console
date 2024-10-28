import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import _ from 'lodash';

// Import pages for different routes
import NewDatasetPage from 'pages/NewDataset/NewDataset';
import StepperPage from 'pages/StepsPages/StepperPage';
import IngestionPage from 'pages/StepsPages/Ingestion/Ingestion';
import ProcessingPage from 'pages/StepsPages/Processing/Processing';
import StoragePage from 'pages/StepsPages/Storage/Storage';
import PreviewPage from 'pages/StepsPages/Preview';
import SchemaDetailsPage from 'pages/StepsPages/Ingestion/SchemaDetails/SchemaDetails';
import ConnectorConfigurationPage from 'pages/ConnectorConfiguration/ConnectorConfiguration';
import SelectConnectorPage from 'pages/SelectConnector/SelectConnector';
import DashboardPage from 'pages/Dashboard/Dashboard';
import InfrastructurePage from 'pages/Dashboard/Infrastructure/Infrastructure';
import IngestionDashboardPage from 'pages/Dashboard/Ingestion/Ingestion';
import ProcessingDashboardPage from 'pages/Dashboard/Processing/Processing';
import StorageDashboardPage from 'pages/Dashboard/Storage/Storage';
// import DatasetManagementPage from 'pages/DatasetManagement/DatasetManagement';
// import ManageDatasetPage from 'pages/DatasetManagement/Manage/Manage';
// import ObserveMonitorPage from 'pages/DatasetManagement/Observe/Observe';
// import PlaygroundPage from 'pages/DatasetManagement/Playground/Playground';
import ConnectorManagementPage from 'pages/ConnectorManagement/ConnectorManagement';
import ManageConnectorsPage from 'pages/ConnectorManagement/Manage/Manage';
import SettingsPage from 'pages/Settings/Settings';
import UploadPage from 'pages/IngestionPage/IngestionPage';

// TypeScript interface to define the structure of route configuration
interface RouteConfig {
    path: string;
    element: React.ReactElement;
    children?: RouteConfig[];
}

// Base path for all routes
const BASE_PATH = '/home';

// Route configurations with nested routes
const routeConfigurations: RouteConfig[] = [
    {
        path: '/',
        element: <Navigate to={`${BASE_PATH}`} replace />
    },
    {
        path: `${BASE_PATH}`,
        element: <Navigate to={`${BASE_PATH}/new-dataset`} replace />
    },
    {
        path: `${BASE_PATH}/new-dataset/connector-configuration`,
        element: <ConnectorConfigurationPage />
    },
    {
        path: `${BASE_PATH}/new-dataset`,
        element: <NewDatasetPage />
    },
    {
        path: `${BASE_PATH}`,
        element: <UploadPage/>,
        children: [
            { path: 'ingestion', element: <IngestionPage /> },
            { path: 'ingestion/schema-details/:datasetId', element: <SchemaDetailsPage /> },
            { path: 'processing/:datasetId', element: <ProcessingPage /> },
            { path: 'storage/:datasetId', element: <StoragePage /> },
            { path: 'preview/:datasetId', element: <PreviewPage /> }
        ]
    },
    {
        path: `${BASE_PATH}/new-dataset/connector-list`,
        element: <SelectConnectorPage />
    },
    {
        path: `${BASE_PATH}/dashboard`,
        element: <DashboardPage />,
        children: [
            { path: 'infrastructure', element: <InfrastructurePage /> },
            { path: 'ingestion', element: <IngestionDashboardPage /> },
            { path: 'processing', element: <ProcessingDashboardPage /> },
            { path: 'storage', element: <StorageDashboardPage /> }
        ]
    },
    // {
    //     path: `${BASE_PATH}/dataset-management`,
    //     element: <DatasetManagementPage />,
    //     children: [
    //         { path: 'manage', element: <ManageDatasetPage /> },
    //         { path: 'observe-monitor', element: <ObserveMonitorPage /> },
    //         { path: 'playground', element: <PlaygroundPage /> }
    //     ]
    // },
    {
        path: `${BASE_PATH}/connector-management`,
        element: <ConnectorConfigurationPage />,
        children: [
            { path: 'manage', element: <ManageConnectorsPage /> },
        ]
    },
    {
        path: `${BASE_PATH}/settings`,
        element: <SettingsPage />
    }
];

// Recursive function to render routes with potential nested routes
const renderRoutes = (routes: RouteConfig[]): JSX.Element[] =>
    _.map(routes, ({ path, element, children }) => (
        <Route
            key={`${path}-route`}
            path={path}
            element={<Suspense fallback={<div>Loading...</div>}>{element}</Suspense>}
        >
            {children && renderRoutes(children)} {/* Recursive call for nested routes */}
        </Route>
    ));

// Main router component that renders all routes
const AppRouter = () => <Routes>{renderRoutes(routeConfigurations)}</Routes>;

export default AppRouter;
