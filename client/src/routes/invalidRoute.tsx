import Error404 from 'pages/maintenance/404';

const InvalidRoute = {
    path: '/',
    children: [
        {
            path: '*',
            element: (
                <Error404 />
            )
        }
    ]
};

export default InvalidRoute;
