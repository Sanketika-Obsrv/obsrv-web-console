import { lazy } from 'react';
import MainLayout from 'layout/MainLayout';
import Loadable from 'components/Loadable';

const MetricsDetails = Loadable(lazy(() => import('pages/metrics/details')));

const MainRoutes = {
    path: '/',
    element: <MainLayout />,
    children: [
        {
            path: '/',
            element: <MetricsDetails />
        },
    ]
};

export default MainRoutes;
