
// const service = {
//     async find(data: any): Promise<any> {
//         const users = await find(table, data)
//         if (users.length > 0) {
//             return Promise.resolve(users[0])
//         }
//         return Promise.reject('user_not_found')
//     },
//     async create(userInfo: User): Promise<any> {
//         const user = await insert(table, userInfo);
//         return user;
//     }
// }

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
