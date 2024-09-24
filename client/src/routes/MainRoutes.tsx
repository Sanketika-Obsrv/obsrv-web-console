import { lazy } from 'react';
import MainLayout from 'layout/MainLayout';
import Loadable from 'components/Loadable';
import RollupConfig from 'pages/rollup/components'; 
import { DatasetType } from 'types/datasets';

const DatasetMetrics = Loadable(lazy(() => import('pages/dashboard/DatasetMetrics')));
const ClusterHealth = Loadable(lazy(() => import('pages/dashboard/datasets')));
const NewDataset = Loadable(lazy(() => import('pages/dataset/newDataset')));
const ImportExiDataset = Loadable(lazy(() => import('pages/dataset/importDataset')));
const EditDataset = Loadable(lazy(() => import('pages/dataset/editDataset')));
const SystemMetrics = Loadable(lazy(() => import('pages/metrics/metrics')));
const HomePage = Loadable(lazy(() => import('pages/home')));
const MetricsDetails = Loadable(lazy(() => import('pages/metrics/details')));
const DatasetCreateEvents = Loadable(lazy(() => import('pages/dashboard/createEvents')));
const SystemSettings = Loadable(lazy(() => import('pages/systemSettings')));
const DatasetManagement = Loadable(lazy(() => import('pages/datasetManagement/components/DatasetManagement')));

const MainRoutes = {
    path: '/',
    element: <MainLayout />,
    children: [
        {
            path: '/',
            element: <HomePage />
        },
        {
            path: 'datasets',
            element: <ClusterHealth />
        },
        {
            path: 'datasets/:datasetId',
            element: <DatasetMetrics />
        },
        {
            path: 'datasets/addEvents/:datasetId',
            element: <DatasetCreateEvents />
        },
        {
            path: 'metrics',
            element: <SystemMetrics />
        },
        {
            path: 'metrics/details/:metricId',
            element: <MetricsDetails />
        },
        {
            path: 'dataset/new',
            element: <NewDataset key="normal" />
        },
        {
            path: 'datasets/import',
            element: <ImportExiDataset key="normal"/>
        },
        {
            path: 'datasets/edit/:datasetId',
            element: <EditDataset key="normal" />
        },
        {
            path: 'dataset/new/master',
            element: <NewDataset master key={DatasetType.MasterDataset} />
        },
        {
            path: 'systemSettings',
            element: <SystemSettings />
        },
        {
            path: 'datasets/configurerollups/:datasetId',
            element: <RollupConfig />
        },
        {
            path: 'datasets/management/:datasetId',
            element: <DatasetManagement />
        }
    ]
};

export default MainRoutes;
