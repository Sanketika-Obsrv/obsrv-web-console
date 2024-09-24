

import { find as query, create, destroy } from "../../shared/databases/postgres";

export const getSave = (table: string) => ({
    save: (data: any) => create(table, data)
})

export const getFind = (table: string, errorMessage: string = "can't find the item") => {
    return ({
        find: async (conditionParams: any) => {
            const data = await query(table, conditionParams)
            if (data.length > 0) {
                return Promise.resolve(data[0])
            }
            return Promise.reject(errorMessage)
        }
    })
}

export const getRemove = (table: string) => ({
    remove: (data: any) => destroy(table, data)
})