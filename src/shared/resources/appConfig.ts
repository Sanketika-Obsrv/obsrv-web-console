const env = process.env;

export default {
  APP_NAME: env.APP_NAME || 'obsrv-web-console',
  APP_BASE_URL: env.OAUTH_WEB_CONSOLE_URL || "http://localhost:4000",
  PORT: env.PORT || 3000,
  ENV: env.ENV || 'development',
  PROMETHEUS: {
    URL: env.PROMETHEUS_URL || "http://localhost:9090"
  },
};
