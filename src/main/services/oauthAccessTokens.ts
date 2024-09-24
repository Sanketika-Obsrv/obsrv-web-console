import { getFind, getRemove, getSave } from "./oauthHelper";

const table = "oauth_access_tokens";
const findError = "access token not found";

const service = {
    ...getSave(table),
    ...getFind(table, findError),
    ...getRemove(table)
}

export default service;