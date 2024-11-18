import controllers from '../controllers';
import schemaValidator from '../middlewares/schemaValidator';
import authMiddleware from '../middlewares/auth';
import logRequestsStartTimeMiddleware from '../middlewares/logStartTime'
import passport from 'passport';
import { authorization, ensureLoggedInMiddleware, token } from '../helpers/oauth';
import appConfig from '../../shared/resources/appConfig';
import passportAuthenticateCallback from '../middlewares/passportAuthenticate';
import setContext from '../middlewares/setContext';
import authorizationMiddleware from '../middlewares/authorization';
import { permissions } from '../middlewares/authorization';

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
                        middlewares: [passportAuthenticateCallback.handler()],
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
            },
            {
                path: 'exists/:datasetId',
                method: 'GET',
                middlewares: [
                    ensureLoggedInMiddleware,
                    controllers.get('dataset:exists')?.handler({})
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
    },
    {
        path: 'user',
        routes: [
            {
                path: 'read/:user_name',
                method: 'GET',
                middlewares: [setContext.handler(permissions.ReadUser), ensureLoggedInMiddleware, controllers.get('user:read')?.handler({})],
            },
            {
                path: 'update',
                method: 'PATCH',
                middlewares: [
                    setContext.handler(permissions.UpdateUser),
                    ensureLoggedInMiddleware,
                    schemaValidator.handler({
                        entityName: 'userUpdate',
                        schema: 'verify',
                    }),
                    controllers.get('user:update')?.handler({}),
                ],
            },
            {
                path: 'create',
                method: 'POST',
                middlewares: [
                    setContext.handler(permissions.CreateUser),
                    authorizationMiddleware.handler(),
                    schemaValidator.handler({
                        entityName: 'userCreate',
                        schema: 'verify',
                    }),
                    controllers.get('user:create')?.handler({}),
                ],
            },
            {
                path: 'status/manage',
                method: 'POST',
                middlewares: [
                    setContext.handler(permissions.UserStatus),
                    authorizationMiddleware.handler(),
                    schemaValidator.handler({
                        entityName: 'userManageStatus',
                        schema: 'verify',
                    }),
                    controllers.get('user:manage:status')?.handler({}),
                ],
            },
            {
                path: 'roles/manage',
                method: 'POST',
                middlewares: [
                    setContext.handler(permissions.UserRoles),
                    authorizationMiddleware.handler(),
                    schemaValidator.handler({
                        entityName: 'userManageRoles',
                        schema: 'verify',
                    }),
                    controllers.get('user:manage:roles')?.handler({}),
                ],
            },
            {
                path: 'list',
                method: 'POST',
                middlewares: [
                    setContext.handler(permissions.UserList),
                    authorizationMiddleware.handler(),
                    schemaValidator.handler({
                        entityName: 'userList',
                        schema: 'verify',
                    }),
                    controllers.get('user:list')?.handler({}),
                ],
            },
        ]
    }
];
