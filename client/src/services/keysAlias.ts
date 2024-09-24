import _ from 'lodash';
import aliases from 'data/keysAlias';

export const getKeyAlias = (key: string, strict = false) => {
    const updatedKey = _.get(aliases, key);
    if (strict) return updatedKey;
    return updatedKey || key;
}