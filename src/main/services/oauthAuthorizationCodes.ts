import { getFind, getSave } from "./oauthHelper";

const table = "oauth_authorization_codes";
const findError = "Authorization code is not found";

const service = {
    ...getSave(table),
    ...getFind(table, findError),
}

export default service;