import { Express } from 'express';
import { mount } from './routes';
import controllers from './controllers'

const promController = controllers.get("prometheus:metrics:scrap")!;

const mountRoutes = (app: Express) => {
    app.get('/metrics', promController.handler());
    mount(app);
}

export { mountRoutes };
