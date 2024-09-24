
import Loadable from 'components/Loadable';
import MinimalLayout from 'layout/MinimalLayout';
import { lazy } from 'react';
const Login = Loadable(lazy(() => import('pages/auth/Login')));

const MainRoutes = {
    path: '/',
    element: <MinimalLayout />,
    children: [
        {
            path: '/login',
            element: <Login />
        }
    ]
};

export default MainRoutes;
