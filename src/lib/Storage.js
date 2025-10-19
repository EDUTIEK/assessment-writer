import localForage from "localforage";

export function getStorage(name) {
    return localForage.createInstance({
        name: 'xlas-assessment-writer',
        storeName: name,
    });
}