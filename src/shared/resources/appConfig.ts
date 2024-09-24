const env = process.env;

export default {
    APP_NAME: env.APP_NAME || 'obsrv-web-console',
    APP_BASE_URL: env.OAUTH_WEB_CONSOLE_URL || 'http://localhost:4000',
    PORT: env.PORT || 3000,
    ENV: env.ENV || 'development',
    AUTHENTICATION_ALLOWED_TYPES: env.AUTHENTICATION_ALLOWED_TYPES || 'obsrv,ad,google',
    DEFAULT_ALERT_MANAGER: env.ALERT_MANAGER || 'grafana',
    PROMETHEUS: {
        URL: env.PROMETHEUS_URL || 'http://localhost:9090',
    },
    OBS_API: {
        URL: env.OBS_API_URL || 'http://localhost:4000',
    },
    CONFIG_API: {
        URL: env.CONFIG_API_URL || 'http://localhost:4000',
    },
    SYSTEM_API: {
        URL: env.SYSTEM_API_URL || 'http://localhost:4002',
    },
    ALERT_MANAGER: {
        URL: env.ALERT_MANAGER_URL || 'http://localhost:9093',
    },
    GRAFANA: {
        URL: env.GRAFANA_URL || 'http://localhost:8000',
        TOKEN: env.GF_BEARER_TOKEN || '',
    },
    SUPERSET: {
        URL: env.SUPERSET_URL || 'http://localhost:8088',
    },
    AUTH: {
        KEYCLOAK: {
            URL: env.AUTH_KEYCLOAK_SERVER_URL || 'http://localhost:8080/auth',
            REALM: env.AUTH_KEYCLOAK_REALM || 'MyKeyCloakRealm',
            CLIENT_ID: env.AUTH_KEYCLOAK_CLIENT_ID || 'myOauthClient',
            CLIENT_SECRET: env.AUTH_KEYCLOAK_CLIENT_SECRET || 'SCWHeF9HgtJ5BjmJFruk2IW15a5auueq',
            PUBLIC_CLIENT: env.AUTH_KEYCLOAK_PUBLIC_CLIENT || 'false',
            SSL_REQUIRED: env.AUTH_KEYCLOAK_SSL_REQUIRED || 'external',
        },
        GOOGLE: {
            CLIENT_ID: env.AUTH_GOOGLE_CLIENT_ID || 'test-google-client',
            CLIENT_SECRET: env.AUTH_GOOGLE_CLIENT_SECRET || 'test-google-client-secret',
        },
        AD: {
            URL: env.AUTH_AD_URL || 'ldap://localhost:3004',
            BASE_DN: env.AUTH_AD_BASE_DN || 'dc=example,dc=com',
            USER_NAME: env.AUTH_AD_USER_NAME || 'admin',
            PASSWORD: env.AUTH_AD_PASSWORD || 'password1',
        },
        OIDC: {
            ISSUER: env.AUTH_OIDC_ISSUER || '',
            AUTHRIZATION_URL: env.AUTH_OIDC_AUTHRIZATION_URL || '',
            TOKEN_URL: env.AUTH_OIDC_TOKEN_URL || '',
            USER_INFO_URL: env.AUTH_OIDC_USER_INFO_URL || '',
            CLIENT_ID: env.AUTH_OIDC_CLIENT_ID || '',
            CLIENT_SECRET: env.AUTH_OIDC_CLIENT_SECRET || '',
            SCOPE: env.AUTH_OIDC_SCOPE || 'openid profile email',
        },
    },
    BASE_URL: env.BASE_URL || '/console',
};
