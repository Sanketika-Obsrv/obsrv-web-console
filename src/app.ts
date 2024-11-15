import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import proxies from './main/proxies';
import mountProxies from './main/utils/proxy';
import passport from 'passport';
import { pool } from './shared/databases/postgres';
import pgSession from 'connect-pg-simple';
import { authProviderFactory } from './main/services/authProviderFactory';
import path from 'path';

const app = express();
const sessionSecret: any = process.env.SESSION_SECRET
const PostgresqlStore = pgSession(session)
const sessionStore: any = new PostgresqlStore({
  pool: pool,
  tableName: 'user_session'
})
app.use(
  session({
    store: sessionStore,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
  })
);

mountProxies(app, proxies);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
import './main/services/auth'; // Don't change this import position in file
import appConfig from './shared/resources/appConfig';

const authenticationType = appConfig.AUTHENTICATION_TYPE;
const keycloakUrl = appConfig.KEYCLOAK.URL;
const keycloakClientID = appConfig.KEYCLOAK.CLIENT_ID;
const keycloakRealm = appConfig.KEYCLOAK.REALM;

const keycloakConfig = {
  resource: keycloakClientID,
  realm: keycloakRealm,
  authServerUrl: keycloakUrl,
  bearerOnly: false
};

const authProvider = authProviderFactory(authenticationType,keycloakConfig, sessionStore); 
app.use(authProvider.init())
app.get('/console/logout', authProvider.authenticate(), async (req:any, res) => {
  await authProvider.logout(req, res);
  res.redirect('/console');
});
app.get('/console', authProvider.authenticate(), (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

export default app;
