import { Express } from "express"
import { IController } from "../../shared/types"
import middlewares from "../middlewares"
const authHandler = middlewares.get("auth")!


const mountProxies = (app: Express, proxies: Map<string, Omit<IController, "name">>) => {
    proxies.forEach(proxy => {
        app.use(proxy?.path, authHandler.handler({}), proxy.handler())
    })
}

export default mountProxies;