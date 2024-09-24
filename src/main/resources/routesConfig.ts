import controllers from '../controllers';
import schemaValidator from '../middlewares/schemaValidator';
import authMiddleware from '../middlewares/auth';
import logRequestsStartTimeMiddleware from '../middlewares/logStartTime'
import passport from 'passport';
import { authorization, ensureLoggedInMiddleware, token } from '../helpers/oauth';
import appConfig from '../../shared/resources/appConfig';

const baseURL = appConfig.BASE_URL;
export default [
    {
        path: "oauth",
        routes: [
            {
                path: 'v1',
                routes: [
                    {
                        path: 'login',
                        method: 'POST',
                        middlewares: [
                            passport.authenticate('local', { successReturnToOrRedirect: baseURL || "/", failureRedirect: `${baseURL}/login` })
                        ],
                    },
                    {
                        path: 'logout',
                        method: 'GET',
                        middlewares: [
                            controllers.get('auth:logout')?.handler({}),
                        ],
                    },
                    {
                        path: 'authorize',
                        method: 'GET',
                        middlewares: [
                            authorization
                        ],
                    },
                    {
                        path: 'token',
                        method: 'POST',
                        middlewares: [
                            token
                        ],
                    },
                    {
                        path: 'userinfo',
                        method: 'GET',
                        middlewares: [
                            passport.authenticate('bearer', { session: false }),
                            controllers.get('auth:user:info')?.handler({}),
                        ],
                    }
                ],
            },
        ]

    },
    {
        path: 'auth',
        routes: [
            {
                path: 'keycloak',
                routes: [
                    {
                        path: '',
                        method: 'GET',
                        middlewares: [
                            passport.authenticate('keycloak', { scope: ['profile'] })
                        ],
                    },
                    {
                        path: 'callback',
                        method: 'GET',
                        middlewares: [
                            passport.authenticate('keycloak', { successReturnToOrRedirect: baseURL || "/", failureRedirect: `${baseURL}/login` })
                        ],
                    }
                ]

            },
            {
                path: 'google',
                routes: [
                    {
                        path: '',
                        method: 'GET',
                        middlewares: [
                            passport.authenticate('google', { scope: ['profile', 'email'] })
                        ],
                    },
                    {
                        path: 'callback',
                        method: 'GET',
                        middlewares: [
                            passport.authenticate('google', { successReturnToOrRedirect: baseURL || "/", failureRedirect: `${baseURL}/login` })
                        ],
                    }
                ]

            },
            {
                path: 'ad',
                routes: [
                    {
                        path: '',
                        method: 'POST',
                        middlewares: [
                            passport.authenticate('ActiveDirectory', { failWithError: true, successReturnToOrRedirect: baseURL || "/", failureRedirect: `${baseURL}/login` })
                        ],
                    }
                ]

            },
            {
                path: 'oidc',
                routes: [
                    {
                        path: '',
                        method: 'GET',
                        middlewares: [
                            passport.authenticate('openidconnect')
                        ],
                    },
                    {
                        path: 'callback',
                        method: 'GET',
                        middlewares: [
                            passport.authenticate('openidconnect', { successReturnToOrRedirect: baseURL || "/", failureRedirect: `${baseURL}/login`, failureMessage: true })
                        ],
                    }
                ]
            }
        ],
    },
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
                            logRequestsStartTimeMiddleware.handler({}),
                            authMiddleware.handler({}),
                            controllers.get('metrics')?.handler({}),
                        ]
                    }
                ],
            },
        ],
    },
    {
        path: "config",
        routes: [
            {
                path: 'data',
                method: 'GET',
                middlewares: [
                    controllers.get('config:vars')?.handler({}),
                ],
            }
        ]
    },
    {
        path: 'dataset',
        routes: [
            {
                path: 'state/:datasetId',
                method: 'GET',
                middlewares: [
                    controllers.get('dataset:state')?.handler({})
                ]
            },
            {
                path: 'diff/:datasetId',
                method: 'GET',
                middlewares: [
                    ensureLoggedInMiddleware,
                    controllers.get('dataset:diff')?.handler({})
                ]
            }
        ]
    },
    {
        path: 'web-console',
        routes: [
            {
                path: 'generate-fields/:dataset_id',
                method: 'GET',
                middlewares: [
                    controllers.get('get:all:fields')?.handler({})
                ]
            }
        ]
    },
    {
        path: 'connector',
        routes: [
            {
                path: 'test',
                method: 'POST',
                middlewares: [
                    ensureLoggedInMiddleware,
                    controllers.get('connector:test')?.handler({})
                ]
            }
        ]
    }
];
