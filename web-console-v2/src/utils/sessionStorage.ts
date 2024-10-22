import _ from 'lodash';

/**
 * Clears all items from session storage.
 */
const clearSessionStorage = (): void => sessionStorage.clear();

/**
 * Deletes a specific item from session storage by its key.
 * @param key - The key of the item to remove.
 */
const deleteSessionStorageItem = (key: string): void => sessionStorage.removeItem(key);

/**
 * Retrieves an item from session storage, parsing it as JSON if possible.
 * If parsing fails, returns the raw string.
 * @param key - The key of the item to retrieve.
 * @returns The parsed item or raw string, or null if the item doesn't exist.
 */
const fetchSessionStorageItem = <T>(key: string): T | null => {
    const storedItem = sessionStorage.getItem(key);

    if (!storedItem) return null;

    try {
        return JSON.parse(storedItem) as T;
    } catch {
        // Return the raw string if JSON parsing fails
        return storedItem as unknown as T;
    }
};

/**
 * Retrieves a specific value from a JSON-encoded item in session storage.
 * Uses lodash to get the value from a specified path.
 * @param key - The key of the item containing the JSON data.
 * @param path - The path to the specific value within the JSON data.
 */
const fetchSessionStorageValue = (key: string, path: string) => {
    const item = fetchSessionStorageItem(key);

    return _.get(item, path, null);
};

/**
 * Stores a JSON-encoded item in session storage.
 * @param key - The key under which to store the item.
 * @param value - The value to store, which will be JSON-encoded.
 */
const storeSessionStorageItem = <T>(key: string, value: T): void =>
    sessionStorage.setItem(key, JSON.stringify(value));

export {
    clearSessionStorage,
    deleteSessionStorageItem,
    fetchSessionStorageItem,
    fetchSessionStorageValue,
    storeSessionStorageItem
};
