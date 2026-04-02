import { getFind, getSave, getUpdate, getFindAll} from "./oauthHelper";

const table = "oauth_users";
const findError = "user_not_found";

const service = {
    ...getSave(table),
    ...getFind(table, findError),
    ...getUpdate(table, findError),
    ...getFindAll(table, findError),
}

export default service;
