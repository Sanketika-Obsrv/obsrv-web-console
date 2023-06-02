import controllers from '../controllers';

export default [
    {
        path: 'report',
        routes: [
            {
                path: 'v1',
                routes: [
                    {
                        path: 'metrics/:id',
                        method: 'POST',
                        middlewares: [
                            controllers.get('metrics')?.handler({}),
                        ]
                    }
                ],
            },
        ],
    }
];
