import localForage from "localforage";

export function getStorage(name) {
    return localForage.createInstance({
        name: 'xlas-assessment-writer',
        version: '2.0',
        storeName: name,
    });
}