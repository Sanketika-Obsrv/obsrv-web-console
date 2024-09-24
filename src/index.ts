// import * as dotenv from 'dotenv';
// dotenv.config();

import helmet from 'helmet';
import express from 'express';
import path from 'path';
import cors from 'cors';
import app from './app';
import config from './shared/resources/appConfig';
import constants from './shared/resources/constants';
import { logger } from './shared/utils/logger';
import { mountRoutes } from './main';
import sharedMiddlewares from './shared/middlewares';

const port = config.PORT;
const globalErrorHandler = sharedMiddlewares.get('globalErrorHandler');
const invalidRouteHandler = sharedMiddlewares.get('invalidRoute');
app.set('port', port);
app.set('logger', logger);
app.disable('x-powered-by');
// app.use(helmet());
app.use(cors());
app.use(express.static(path.join(__dirname, 'build')));

// mount routers
mountRoutes(app);
// handler for invalid route

app.get('*', function (req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

invalidRouteHandler && app.use('*', invalidRouteHandler?.handler({}));

// global error handler
globalErrorHandler && app.use(globalErrorHandler?.handler({}));

app.listen(port, () => {
  logger.log({ level: 'info', message: constants.SERVER_INIT.replace('${PORT}', port.toString()) });
});
