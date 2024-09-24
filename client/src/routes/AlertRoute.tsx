import Loadable from 'components/Loadable';
import MainLayout from 'layout/MainLayout';
import UpdateChannel from 'pages/notificationChannels/UpdateChannel';
import { lazy } from 'react';

const CustomAlerts = Loadable(lazy(() => import('pages/alertManager/views/CustomRules')));
const SystemAlerts = Loadable(lazy(() => import('pages/alertManager/views/SystemRules')));
const ListChannels = Loadable(lazy(() => import('pages/notificationChannels/ListChannels')));
const AddAlert = Loadable(lazy(() => import('pages/alertManager/views/AddRule')));
const ViewAlert = Loadable(lazy(() => import('pages/alertManager/views/ViewRule')));
const EditAlert = Loadable(lazy(() => import('pages/alertManager/views/EditRule')));
const AddChannel = Loadable(lazy(() => import('pages/notificationChannels/AddChannel')));
const ViewChannel = Loadable(lazy(() => import('pages/notificationChannels/ViewChannel')));
const AlertRules = Loadable(lazy(() => import('pages/alertManager/views/AlertRules')));

const AlertRoute = {
    path: '/',
    element: <MainLayout />,
    children: [
        {
            path: '/',
            element: (
                <AlertRules />
            ),
            children: [
                {
                    path: 'alertRules/custom',
                    element: <CustomAlerts />,
                },
                {
                    path: 'alertRules/system',
                    element: <SystemAlerts />,
                }
            ]
        },
        {
            path: 'alertRules/add',
            element: (
                <AddAlert />
            )
        },
        {
            path: 'alertRules/view/:id',
            element: (
                <ViewAlert />
            )
        },
        {
            path: 'alertRules/edit/:id',
            element: (
                <EditAlert />
            )
        },
        {
            path: 'alertChannels',
            element: <ListChannels />
        },
        {
            path: 'alertChannels/new',
            element: <AddChannel />
        },
        {
            path: 'alertChannels/edit/:id',
            element: <UpdateChannel />
        },
        {
            path: 'alertChannels/view/:id',
            element: <ViewChannel />
        }
    ]
};

export default AlertRoute;
