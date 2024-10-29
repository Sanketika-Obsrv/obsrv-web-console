import React, { Suspense } from 'react';
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

// Type definition for the route configuration
interface RouteConfig {
    path: string;
    element: React.ReactElement;
    children?: RouteConfig[];
}

// Base path for all routes
const BASE_PATH = '/home';

const routeConfigurations: RouteConfig[] = [
    { path: '/', element: <Navigate to={`${BASE_PATH}/dashboard`} replace /> },
    { path: `${BASE_PATH}`, element: <Navigate to={`${BASE_PATH}`} replace /> },
    { path: `${BASE_PATH}/new-dataset`, element: <NewDatasetPage /> },
    { 
        path: `${BASE_PATH}`, 
        element: <StepperPage />,
        children: [
            { path: 'ingestion', element: <IngestionPage /> },
            { path: 'ingestion/schema-details/:datasetId', element: <SchemaDetailsPage /> },
            { path: 'processing/:datasetId', element: <ProcessingPage /> },
            { path: 'storage/:datasetId', element: <StoragePage /> },
            { path: 'preview/:datasetId', element: <PreviewPage /> }
        ],
    },
    { path: `${BASE_PATH}/new-dataset/connector-configuration`, element: <ConnectorConfigurationPage /> },
    { path: `${BASE_PATH}/new-dataset/connector-list`, element: <SelectConnectorPage /> },
    { path: `${BASE_PATH}/dashboard`, element: <Dashboard /> },
    { path: `${BASE_PATH}/dashboard/infrastructure`, element: <IndividualMetricDashboards id="overallInfra" /> },
    { path: `${BASE_PATH}/dashboard/ingestion`, element: <IndividualMetricDashboards id="ingestion" /> },
    { path: `${BASE_PATH}/dashboard/api`, element: <IndividualMetricDashboards id="api" /> },
    { path: `${BASE_PATH}/dashboard/processing`, element: <IndividualMetricDashboards id="processing" /> },
    { path: `${BASE_PATH}/dashboard/storage`, element: <IndividualMetricDashboards id="storage" /> },
    { path: `${BASE_PATH}/connector-management`, element: <ConnectorConfigurationPage /> },
    { path: `${BASE_PATH}/connector-management/manage`, element: <ManageConnectorsPage /> },
    { path: `${BASE_PATH}/settings`, element: <SettingsPage /> },
    { path: `${BASE_PATH}/datasets`, element: <ClusterHealth /> },
    { path: `${BASE_PATH}/datasets/:datasetId`, element: <DatasetMetrics /> },
    { path: `${BASE_PATH}/datasets/addEvents/:datasetId`, element: <DatasetCreateEvents /> },
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
