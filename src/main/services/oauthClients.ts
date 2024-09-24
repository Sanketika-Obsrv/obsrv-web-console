import { getFind } from "./oauthHelper";

const table = "oauth_clients";
const findError = "Client not found";

const service = {
    ...getFind(table, findError),
}

export default service;