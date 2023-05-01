import type {
    OpenDbArgs,
    CreateIndexArgs,
    FindArgs,
    OpenCursorArgs,
    InsertArgs,
    InserManyArgs,
    GetStoreArgs,
    GetArgs,
    GetAllArgs,
    RemoveArgs,
    RemoveManyArgs,
    CountArgs,
    CreateStoreArgs,
    RemoveIndexArgs,
    RemoveStoreArgs
} from "./types";

/**
 * @param name: Database name
 * @param version: Databse version
 * @param  upgradeCallback: Register callback for every update, create a chance for db createtion or migration.
 * @returns Promise of indexed db instance
 */
export function openDatabase({ name, version = 1, onUpgrade }: OpenDbArgs): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req: IDBOpenDBRequest = indexedDB.open(name, version);
        req.onsuccess = () => {
            resolve(req.result);
        };
        req.onerror = () => {
            reject(`Unable to open indexed db : ` + req.error);
        };
        req.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            let db = req.result;
            const oldVersion: number = event.oldVersion;
            const newVersion: number = event.newVersion || 1;
            const transaction: IDBTransaction = (event.target as IDBOpenDBRequest).transaction!
            if (onUpgrade) {
                for (let version = oldVersion; version < newVersion; version++) {
                    onUpgrade({ db, oldVersion: version, newVersion: version + 1, transaction });
                }
            }
        };
        req.onblocked = (event: IDBVersionChangeEvent) => {
        }
    });
}

export function createStore({ db, storeName, primaryKey, autoIncrement = false, }: CreateStoreArgs): IDBObjectStore {
    return db.createObjectStore(storeName, { keyPath: primaryKey, autoIncrement })
}

export function removeStore({ db, storeName, }: RemoveStoreArgs): void {
    return db.deleteObjectStore(storeName)
}

export function createIndex({ db, storeName, indexName, unique = false, multiEntry = false, }: CreateIndexArgs): IDBIndex {
    let store = getStore({ db, storeName, readOnlyMode: false })
    return store.createIndex(indexName, indexName, { multiEntry, unique });
}

export function removeIndex({ db, storeName, indexName }: RemoveIndexArgs): void {
    let store = getStore({ db, storeName, readOnlyMode: false })
    return store.deleteIndex(indexName);
}


export function clearStore({ store }: { store: IDBObjectStore }): Promise<void> {
    return new Promise((resolve, reject) => {
        const req = store.clear();
        req.onsuccess = () => {
            resolve();
        };
        req.onerror = () => {
            reject('Error on clearing store: ' + req.error);
        };
    })
}

export function openCursor({ db, storeName, indexName, desc = false, unique = false, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, processor }: OpenCursorArgs): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const queryDirection = createDirection({ desc, unique });
        const keyRange = createKeyRange({ value, valueStart, valueStartAfter, valueEnd, valueEndBefore });
        const store = getStore({ db, storeName });
        const indexStore = indexName ? store.index(indexName) : null;
        let req: IDBRequest = (indexStore || store).openCursor(keyRange, queryDirection);
        if (req) {
            req.onsuccess = (event: any) => {
                const cursor: IDBCursorWithValue = event.target.result;
                if (processor) {
                    processor(cursor);
                }
            };
            req.onerror = (ev: any) => {
                if (processor) {
                    reject('Error on open cursor: ' + req.error)
                }
            };
            return true;
        } return false;
    })
}


export function find<T>({ db, storeName, indexName, skip = 0, limit = Math.pow(2, 32), desc = false, unique = false, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, filter, map, }: FindArgs): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const items: T[] = [];
        const cursorProcessor = (cursor: IDBCursorWithValue): void => {
            if (cursor) {
                if (!filter && skip) {
                    skip = 0;
                    cursor.advance(skip);
                    return;
                } skip = skip || 0;
                limit = limit || 0;
                if (limit > 0) {
                    let object = cursor.value;
                    if (filter) {
                        if (!filter(object)) {
                            cursor.continue();
                            return;
                        }
                    } if (skip <= 0) {
                        items.push(map ? map(object) : object);
                        limit--;
                    } else {
                        skip--;
                    } cursor.continue();
                    return;
                } resolve(items);
            } else {
                resolve(items);
            }
        };
        let isCursorOpened = openCursor({ db, storeName, indexName, desc, unique, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, processor: cursorProcessor, });
        if (!isCursorOpened) {
            resolve([]);
        }
    });
}

export function get<T>({ db, storeName, indexName, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, }: GetArgs): Promise<T> {
    return new Promise((resolve, reject) => {
        const store = getStore({ db, storeName, readOnlyMode: false })
        const indexeStore = indexName ? store.index(indexName) : null;
        const req = (indexeStore || store).get(createKeyRange({ value, valueStart, valueStartAfter, valueEnd, valueEndBefore, })!);
        req.onsuccess = () => {
            resolve(req.result);
        };
        req.onerror = () => {
            reject('Error on get: ' + req.error);
        };
    });
}

export function getAll<T>({ db, storeName, indexName, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, count = Math.pow(2, 32) }: GetAllArgs): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const keyRange = createKeyRange({ value, valueStart, valueStartAfter, valueEnd, valueEndBefore });
        const store = getStore({ db, storeName });
        const indexStore = indexName ? store.index(indexName) : null;
        let req: IDBRequest = (indexStore || store).getAll(keyRange, count);
        req.onsuccess = () => {
            resolve(req.result);
        };
        req.onerror = () => {
            reject('Error on getAll : ' + req.error);
        };
    });
}

export function count({ db, storeName, indexName, value, valueStart, valueStartAfter, valueEnd, valueEndBefore }: CountArgs): Promise<number> {
    return new Promise((resolve, reject) => {
        const keyRange = createKeyRange({ value, valueStart, valueStartAfter, valueEnd, valueEndBefore });
        const store = getStore({ db, storeName });
        const indexStore = indexName ? store.index(indexName) : null;
        let req: IDBRequest = (indexStore || store).count(keyRange);
        req.onsuccess = () => {
            resolve(req.result);
        };
        req.onerror = () => {
            reject('Error on getAll : ' + req.error);
        };
    });
}


export function insert<T>({ db, storeName, doc }: InsertArgs<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        const store = getStore({ db, storeName, readOnlyMode: false })
        const req = store.add(doc);
        req.onsuccess = () => {
            resolve(doc);
        };
        req.onerror = () => {
            reject('Error on inser: ' + req.error);
        };
    });
}

export function insertMany<T>({ db, storeName, docs, }: InserManyArgs<T>): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        let store = transaction.objectStore(storeName);
        transaction.oncomplete = () => {
            resolve(docs);
        };
        transaction.onerror = () => {
            reject('Error insert many ' + transaction.error)
        };

        (docs || []).forEach((object: any) => {
            store.add(object);
        });
        transaction.commit();
    })

}

export function update<T>({ db, storeName, doc }: InsertArgs<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        const store = getStore({ db, storeName, readOnlyMode: false })
        const req = store.put(doc);
        req.onsuccess = () => {
            resolve(doc);
        };
        req.onerror = () => {
            reject('Error on inser: ' + req.error);
        };
    });
}

export function updateMany<T>({ db, storeName, docs, }: InserManyArgs<T>): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        let store = transaction.objectStore(storeName);
        transaction.oncomplete = () => {
            resolve(docs);
        };
        transaction.onerror = () => {
            reject('Error insert many ' + transaction.error)
        };

        (docs || []).forEach((object: any) => {
            store.put(object);
        });
        transaction.commit();
    });
}


export function remove({ db, storeName, value }: RemoveArgs): Promise<string> {
    return new Promise((resolve, reject) => {
        const store = getStore({ db, storeName, readOnlyMode: false });
        const getRequest = store.get(value);
        getRequest.onsuccess = () => {
            const document = getRequest.result;
            if (document) {
                const req = store.delete(value);
                req.onsuccess = () => {
                    resolve(document);
                };
                req.onerror = () => {
                    reject('Error on delete doc: ' + req.error);
                };
            } else {
                reject('Doc not found');
            }
        };
        getRequest.onerror = () => {
            reject("Error on delete : " + getRequest.error);
        };
    });
}

export function removeMany<T>({ db, storeName, value }: RemoveManyArgs): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.openCursor();
        const docs: T[] = [];
        let valueSet = new Set(value);

        request.onsuccess = (event: Event) => {
            const cursor: IDBCursorWithValue = (event.target as IDBRequest).result;
            if (cursor) {
                if (cursor.value && valueSet.has(cursor.value[cursor.primaryKey as string])) {
                    docs.push(cursor.value);
                    cursor.delete();
                    cursor.continue();
                }
            } else {
                // No more entries
                transaction.commit();
            }
        };

        transaction.oncomplete = () => {
            resolve(docs);
        };

        transaction.onerror = () => {
            reject('Error in removeAll: ' + transaction.error);
        };
    });

}

export function removeDatabase(dbName: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase(dbName);
        req.onsuccess = () => {
            resolve('DB deleted');
        };
        req.onerror = () => {
            reject('Error on deleting db: ' + req.error);
        };
    });

}

function createKeyRange({ value, valueStart, valueStartAfter, valueEnd, valueEndBefore, }: {
    value?: IDBValidKey;
    valueStart?: IDBValidKey;
    valueStartAfter?: IDBValidKey;
    valueEnd?: IDBValidKey;
    valueEndBefore?: IDBValidKey;
}): IDBKeyRange | undefined {
    let keyRange: IDBKeyRange | undefined = undefined;
    if (value) {
        keyRange = IDBKeyRange.only(value);
    } else if (valueStart || valueStartAfter) {
        keyRange = IDBKeyRange.lowerBound(valueStart || valueStartAfter, !!valueStartAfter);
    } else if (valueEnd || valueEndBefore) {
        keyRange = IDBKeyRange.upperBound(valueEnd || valueEndBefore, !!valueEndBefore);
    } else if (valueStart || valueStartAfter || valueEnd || valueEndBefore) {
        keyRange = IDBKeyRange.bound(valueStart || valueStartAfter, valueEnd || valueEndBefore, !!valueStartAfter, !!valueEndBefore);
    }
    return keyRange;
}

function createDirection({ desc = false, unique = false }: {
    desc?: boolean;
    unique?: boolean
}): IDBCursorDirection | undefined {
    const direction: IDBCursorDirection = desc ? (unique ? 'prevunique' : 'prev') : unique ? 'nextunique' : 'next';
    return direction || undefined;
}

function getStore({ db, storeName, readOnlyMode = false }: GetStoreArgs): IDBObjectStore {
    const tx = db.transaction(storeName, readOnlyMode ? 'readonly' : 'readwrite');
    return tx.objectStore(storeName);
}





