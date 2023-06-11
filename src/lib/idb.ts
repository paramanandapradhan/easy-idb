import type {
    RemoveIndexArgs,
    WhereConstraint,
    WhereOps,
    onUpgradeFn
} from "./types";

export function where(field: IDBValidKey, ops: WhereOps, value: IDBValidKey): WhereConstraint {
    return { field, ops, value };
}

/**
 * @param name: Database name
 * @param version: Databse version
 * @param  upgradeCallback: Register callback for every update, create a chance for db createtion or migration.
 * @returns Promise of indexed db instance
 */
export function openDatabase({ name, version = 1, onUpgrade }: {
    name: string;
    version: number;
    onUpgrade?: onUpgradeFn;
}): Promise<IDBDatabase> {
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

export function createStore({ db, storeName, primaryKey, autoIncrement = false, }: {
    db: IDBDatabase,
    storeName: string,
    primaryKey: string,
    autoIncrement?: boolean,
}): IDBObjectStore {
    return db.createObjectStore(storeName, { keyPath: primaryKey, autoIncrement })
}

export function removeStore({ db, storeName, }: {
    db: IDBDatabase,
    storeName: string,
}): void {
    return db.deleteObjectStore(storeName)
}

export function createIndex({ db, storeName, indexName, unique = false, multiEntry = false, }: {
    db: IDBDatabase,
    storeName: string,
    indexName?: string[] | string | null | undefined;
    unique?: boolean,
    multiEntry?: boolean,
}): IDBIndex {
    let store = getStore({ db, storeName, readOnlyMode: false })
    let actualIndexName: string;
    if (indexName && Array.isArray(indexName)) {
        actualIndexName = indexName.join('-')
    } else {
        actualIndexName = indexName as string;
    }
    return store.createIndex(actualIndexName, indexName as string[] | string, { multiEntry, unique });
}

export function removeIndex({ db, storeName, indexName }: RemoveIndexArgs): void {
    let store = getStore({ db, storeName, readOnlyMode: false })
    if (indexName && Array.isArray(indexName)) {
        indexName = indexName.join('-')
    }
    return store.deleteIndex(indexName as string);
}


export function clearStore({ db, storeName }: { db: IDBDatabase, storeName: string }): Promise<void> {
    return new Promise((resolve, reject) => {
        let store = getStore({ db, storeName });
        const req = store.clear();
        req.onsuccess = () => {
            resolve();
        };
        req.onerror = () => {
            reject('Error on clearing store: ' + req.error);
        };
    })
}

export function openCursor({ db, storeName, desc = false, unique = false, where, processor }: {
    db: IDBDatabase,
    storeName: string;
    desc?: boolean;
    unique?: boolean;
    where?: WhereConstraint | WhereConstraint[],
    processor?: (cursor: IDBCursorWithValue) => void;
}): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const queryDirection = createDirection({ desc, unique });
        const keyRange = createKeyRange(where);
        const store = getStore({ db, storeName });
        const indexName = prepareIndexNameFromConstraints(store, where);
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


export function find<T>({ db, storeName, skip = 0, limit = Math.pow(2, 32), desc = false, unique = false, where, filter, map, }: {
    db: IDBDatabase,
    storeName: string;
    skip?: number;
    limit?: number;
    desc?: boolean;
    unique?: boolean;
    where?: WhereConstraint | WhereConstraint[],
    filter?: (object: any) => boolean;
    map?: (object: any) => any;
}): Promise<T[]> {
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
        let isCursorOpened = openCursor({ db, storeName, desc, unique, where, processor: cursorProcessor, });
        if (!isCursorOpened) {
            resolve([]);
        }
    });
}

export function get<T>({ db, storeName, where }:
    {
        db: IDBDatabase,
        storeName: string;
        where: WhereConstraint | WhereConstraint[],
    }): Promise<T> {
    return new Promise((resolve, reject) => {
        const store = getStore({ db, storeName, readOnlyMode: false })
        const indexName = prepareIndexNameFromConstraints(store, where);
        const indexeStore = indexName ? store.index(indexName) : null;
        const req = (indexeStore || store).get(createKeyRange(where)!);
        req.onsuccess = () => {
            resolve(req.result);
        };
        req.onerror = () => {
            reject('Error on get: ' + req.error);
        };
    });
}

export function getAll<T>({ db, storeName, where, count }: {
    db: IDBDatabase,
    storeName: string;
    indexName?: string[] | string | null | undefined;
    desc?: boolean;
    unique?: boolean;
    where?: WhereConstraint | WhereConstraint[],
    count?: number,
}): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const keyRange = createKeyRange(where);
        const store = getStore({ db, storeName });
        const indexName = prepareIndexNameFromConstraints(store, where);
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

export function count({ db, storeName, where }: {
    db: IDBDatabase,
    storeName: string,
    where?: WhereConstraint | WhereConstraint[],
}): Promise<number> {
    return new Promise((resolve, reject) => {
        const keyRange = createKeyRange(where);
        const store = getStore({ db, storeName });
        const indexName = prepareIndexNameFromConstraints(store, where);
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


export function insert<T>({ db, storeName, doc }: {
    db: IDBDatabase,
    storeName: string;
    doc: T;
}): Promise<T> {
    return new Promise((resolve, reject) => {
        const store = getStore({ db, storeName, readOnlyMode: false })
        const req = store.add(doc);
        req.onsuccess = () => {
            let getReq = store.get(req.result);
            getReq.onsuccess = () => {
                resolve(getReq.result);
            }
            getReq.onerror = () => {
                reject('Error on insert and get: ' + getReq.error);
            }
        };
        req.onerror = () => {
            reject('Error on insert: ' + req.error);
        };
    });
}

export function insertMany<T>({ db, storeName, docs, }: {
    db: IDBDatabase,
    storeName: string,
    docs: T[],
}): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        let store = transaction.objectStore(storeName);
        let results: T[] = [];
        transaction.oncomplete = () => {
            resolve(results);
        };
        transaction.onerror = () => {
            reject('Error insert many ' + transaction.error)
        };

        (docs || []).forEach((object: any) => {
            let addReq = store.add(object);
            addReq.onsuccess = () => {
                let getReq = store.get(addReq.result);
                getReq.onsuccess = () => {
                    results.push(getReq.result);
                }
            }
        });
        transaction.commit();
    })

}

export function update<T>({ db, storeName, doc }: {
    db: IDBDatabase,
    storeName: string,
    doc: T,
}): Promise<T> {
    return new Promise((resolve, reject) => {
        const store = getStore({ db, storeName, readOnlyMode: false })
        const req = store.put(doc);
        req.onsuccess = () => {
            let getReq = store.get(req.result);
            getReq.onsuccess = () => {
                resolve(getReq.result);
            }
            getReq.onerror = () => {
                reject('Error on update and get: ' + getReq.error);
            }
        };
        req.onerror = () => {
            reject('Error on update: ' + req.error);
        };
    });
}

export function updateMany<T>({ db, storeName, docs, }: {
    db: IDBDatabase,
    storeName: string,
    docs: T[],
}): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        let store = transaction.objectStore(storeName);
        let results: T[] = [];
        transaction.oncomplete = () => {
            resolve(results);
        };
        transaction.onerror = () => {
            reject('Error update many: ' + transaction.error)
        };
        (docs || []).forEach((object: any) => {
            let putReq = store.put(object);
            putReq.onsuccess = () => {
                let getReq = store.get(putReq.result);
                getReq.onsuccess = () => {
                    results.push(getReq.result);
                }
            }
        });
        transaction.commit();
    });
}

export function upsert<T>({ db, storeName, doc }: {
    db: IDBDatabase,
    storeName: string,
    doc: T,
}): Promise<T> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);


        const onSuccess = (event: any) => {
            const getRequest = store.get(event.target.result);
            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => reject(`Error on upsert get: ${getRequest.error}`);
        };

        const onError = (action: any) => (event: any) => {
            reject(`Error on upsert ${action}: ${event.target.error}`);
            transaction.abort();
        };

        const primaryKey = (doc as any)[(store as any).keyPath];
        if (primaryKey) {
            const getReq = store.get(primaryKey);
            getReq.onsuccess = () => {
                const request = getReq.result ? store.put(doc) : store.add(doc);
                request.onsuccess = onSuccess;
                request.onerror = onError(getReq.result ? 'put' : 'add');
            };
            getReq.onerror = onError('get');
        } else {
            const addReq = store.add(doc);
            addReq.onsuccess = onSuccess;
            addReq.onerror = onError('add');
        }
    });
}

export function upsertMany<T>({ db, storeName, docs, }: {
    db: IDBDatabase,
    storeName: string,
    docs: T[],
}): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        let results: T[] = [];

        let isTransactionAborted = false;

        transaction.oncomplete = () => resolve(results);
        transaction.onerror = () => reject(`Error update many: ${transaction.error}`);

        const onSuccess = (event: any) => {
            const getRequest = store.get(event.target.result);
            getRequest.onsuccess = () => {
                results.push(getRequest.result);
            };
            getRequest.onerror = () => reject(`Error on upsert get: ${getRequest.error}`);
        };

        const onError = (action: any) => (event: any) => {
            if (!isTransactionAborted) {
                isTransactionAborted = true;
                reject(`Error on upsert ${action}: ${event.target.error}`);
                transaction.abort();
            }
        };

        docs.forEach((doc: any) => {
            const primaryKey = (doc)[(store as any).keyPath];
            if (primaryKey) {
                const getReq = store.get(primaryKey);
                getReq.onsuccess = () => {
                    const request = getReq.result ? store.put(doc) : store.add(doc);
                    request.onsuccess = onSuccess;
                    request.onerror = onError(getReq.result ? 'put' : 'add');
                };
                getReq.onerror = onError('get');
            } else {
                const addReq = store.add(doc);
                addReq.onsuccess = onSuccess;
                addReq.onerror = onError('add');
            }
        });
    });
}


export function remove<T>({ db, storeName, value }: {
    db: IDBDatabase,
    storeName: string,
    value: IDBValidKey,
}): Promise<T | null> {
    return new Promise((resolve, reject) => {
        const store = getStore({ db, storeName, readOnlyMode: false });
        const getRequest = store.get(value);
        getRequest.onsuccess = () => {
            const result: T = getRequest.result;
            if (result) {
                const delReq = store.delete(value);
                delReq.onsuccess = () => {
                    resolve(result);
                };
                delReq.onerror = () => {
                    reject('Error on get and remove : ' + delReq.error);
                };
            } else {
                resolve(null)
            }
        };
        getRequest.onerror = () => {
            reject("Error on delete : " + getRequest.error);
        };
    });
}

export function removeMany<T>({ db, storeName, values }: {
    db: IDBDatabase,
    storeName: string,
    values: IDBValidKey[],
}): Promise<(T | null)[]> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const results: (T | null)[] = [];
        (values).forEach((value) => {
            const getReq = store.get(value);
            getReq.onsuccess = () => {
                const result: T = getReq.result;
                if (result) {
                    const delReq = store.delete(value);
                    delReq.onsuccess = () => {
                        results.push(result);
                    };
                } else {
                    results.push(null);
                }
            };
        })
        transaction.oncomplete = () => {
            resolve(results);
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
        req.onblocked = (ev) => {
            console.error(ev);
            reject('Blocked on deleting db.');
        };
        req.onerror = () => {
            reject('Error on deleting db: ' + req.error);
        };
    });

}

function prepareIndexNameFromConstraints(store: IDBObjectStore, constrains: WhereConstraint | WhereConstraint[] = []) {
    let indexName: IDBValidKey = '';
    let field: IDBValidKey = '';

    let constraintArray: WhereConstraint[];
    if (Array.isArray(constrains)) {
        constraintArray = constrains
    } else {
        constraintArray = [constrains]
    }

    (constraintArray).forEach((constrain) => {
        indexName = constrain.field;
        field = constrain.field;
    })

    if (indexName && Array.isArray(indexName)) {
        indexName = indexName.join('-');
    }
    if (store.keyPath == indexName) {
        // primary key should not provide any indexName
        indexName = '';
    } else if (indexName && !store.indexNames.contains(indexName)) {
        throw Error(`Store '${store.name}' Index '${field}' not found!`);
    }

    return indexName
}

function prepareKeyRangeConstraints(constrains: WhereConstraint | WhereConstraint[] = []) {
    let keyRangeConstraint: {
        value?: IDBValidKey;
        valueStart?: IDBValidKey;
        valueStartAfter?: IDBValidKey;
        valueEnd?: IDBValidKey;
        valueEndBefore?: IDBValidKey;
    } = {};

    if (!Array.isArray(constrains)) {
        constrains = [constrains]
    }

    (constrains).forEach((constrain) => {
        if (constrain.ops == '==') {
            keyRangeConstraint.value = constrain.value;
        }
        if (constrain.ops == '>') {
            keyRangeConstraint.valueStartAfter = constrain.value;
        }
        if (constrain.ops == '>=') {
            keyRangeConstraint.valueStart = constrain.value;
        }
        if (constrain.ops == '<') {
            keyRangeConstraint.valueEndBefore = constrain.value;
        }
        if (constrain.ops == '<=') {
            keyRangeConstraint.valueEnd = constrain.value;
        }
    });

    return keyRangeConstraint;
}

function createKeyRange(constrains: WhereConstraint | WhereConstraint[] = []): IDBKeyRange | undefined {
    let { value, valueStart, valueStartAfter, valueEnd, valueEndBefore, } = prepareKeyRangeConstraints(constrains)
    let keyRange: IDBKeyRange | undefined = undefined;
    if (value) {
        keyRange = IDBKeyRange.only(value);
    } else if ((valueStart || valueStartAfter) && (valueEnd || valueEndBefore)) {
        keyRange = IDBKeyRange.bound(valueStart || valueStartAfter, valueEnd || valueEndBefore, !!valueStartAfter, !!valueEndBefore);
    } else if (valueStart || valueStartAfter) {
        keyRange = IDBKeyRange.lowerBound(valueStart || valueStartAfter, !!valueStartAfter);
    } else if (valueEnd || valueEndBefore) {
        keyRange = IDBKeyRange.upperBound(valueEnd || valueEndBefore, !!valueEndBefore);
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

export function getStore({ db, storeName, readOnlyMode = false }: {
    db: IDBDatabase,
    storeName: string,
    readOnlyMode?: boolean,
}): IDBObjectStore {
    const tx = db.transaction(storeName, readOnlyMode ? 'readonly' : 'readwrite');
    return tx.objectStore(storeName);
}





