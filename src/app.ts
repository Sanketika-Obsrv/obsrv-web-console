import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import proxies from './main/proxies';
import mountProxies from './main/utils/proxy';
import passport from 'passport';
import { pool } from './shared/databases/postgres';
import pgSession from 'connect-pg-simple';

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
app.use(passport.initialize());
app.use(passport.session());
import './main/services/auth'; // Don't change this import position in file


export default app;
