import { getFind, getRemove, getSave } from "./oauthHelper";

const table = "oauth_refresh_tokens";
const findError = "refresh token not found";

const service = {
    ...getSave(table),
    ...getFind(table, findError),
    ...getRemove(table)
}


export default service;