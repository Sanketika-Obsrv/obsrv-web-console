import _ from 'lodash';


export const clearLocalStorage = (): void => localStorage.clear();

export const deleteLocalStorageItem = (key: string): void => localStorage.removeItem(key);

export const fetchLocalStorageItem = <T>(key: string): T | null => {
    const storedItem = localStorage.getItem(key);

    if (!storedItem) return null;

    try {
        return JSON.parse(storedItem) as T;
    } catch {
        return storedItem as unknown as T;
    }
};

export const fetchLocalStorageValue = (key: string, path: string) => {
    const item = fetchLocalStorageItem(key);

    return _.get(item, path, null);
};

export const storeLocalStorageItem = <T>(key: string, value: T): void =>
    localStorage.setItem(key, JSON.stringify(value));

