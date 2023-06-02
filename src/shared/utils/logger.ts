import winston from 'winston';
import CONFIG from '../resources/appConfig'

export const logger = ((config: winston.LoggerOptions = {}) => {
  const instance = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: CONFIG.APP_NAME },
    transports: [new winston.transports.Console({ format: winston.format.simple() })],
    ...config,
  });

  return instance;
})();
