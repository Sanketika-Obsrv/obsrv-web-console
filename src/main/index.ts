import { Express } from 'express';
import { mount } from './routes';

const mountRoutes = (app: Express) => {
    mount(app);
}

export { mountRoutes };
