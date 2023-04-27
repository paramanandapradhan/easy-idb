import {
    count as idbCount,
    createIndex,
    createStore,
    get as idbGet,
    getAll as idbGetAll,
    removeIndex as idbRemoveIndex,
    find as idbFind,
    update as idbUpdate,
    updateMany as idbUpdateMany,
    remove as idbRemove,
    removeMany as idbRemoveMany,
} from "./idb";
import type { GetSearchArgs, StoreConstructorArgs, StoreIndexArgs } from "./types";

export class Store {
    readonly name: string;
    readonly store: IDBObjectStore;
    readonly primaryKey: string;
    readonly db: IDBDatabase;
    readonly indexes: StoreIndexArgs[];

    constructor({ db, name, primaryKey, autoIncrement = true, indexes = [] }: StoreConstructorArgs) {
        this.db = db;
        this.name = name;
        this.primaryKey = primaryKey;
        this.indexes = indexes;
        this.store = createStore({ db, storeName: name, primaryKey, autoIncrement });

        // Remove indexes
        let indexSet: Set<string> = new Set(indexes.map((index: StoreIndexArgs) => index.name));
        const indexNames = this.store.indexNames || [];
        for (let i = 0; i < indexNames.length; i++) {
            let indexName = indexNames[i];
            if (indexName && indexName != this.primaryKey) {
                if (!indexSet.has(indexName)) {
                    idbRemoveIndex({ db, storeName: name, indexName });
                }
            }
        }

        // Create indexes 
        indexes.forEach((index) => {
            createIndex({ db, storeName: name, indexName: index.name, unique: index.unique, multiEntry: index.multiEntry })
        });
    }

    get<T>({ indexName, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, }: {
        indexName?: string;
        value?: IDBValidKey;
        valueStart?: IDBValidKey;
        valueStartAfter?: IDBValidKey;
        valueEnd?: IDBValidKey;
        valueEndBefore?: IDBValidKey;
    }) {
        return idbGet<T>({ db: this.db, storeName: this.name, indexName, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, })
    }

    getAll<T>({ indexName, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, count }: {
        indexName?: string;
        value?: IDBValidKey;
        valueStart?: IDBValidKey;
        valueStartAfter?: IDBValidKey;
        valueEnd?: IDBValidKey;
        valueEndBefore?: IDBValidKey;
        count?: number,
    }) {
        return idbGetAll<T>({ db: this.db, storeName: this.name, indexName, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, count })
    }

    count({ indexName, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, }: {
        indexName?: string;
        value?: IDBValidKey;
        valueStart?: IDBValidKey;
        valueStartAfter?: IDBValidKey;
        valueEnd?: IDBValidKey;
        valueEndBefore?: IDBValidKey;
    }) {
        return idbCount({ db: this.db, storeName: this.name, indexName, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, })
    }

    find({ indexName, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, }: {
        indexName?: string;
        value?: IDBValidKey;
        valueStart?: IDBValidKey;
        valueStartAfter?: IDBValidKey;
        valueEnd?: IDBValidKey;
        valueEndBefore?: IDBValidKey;
    }) {
        return idbFind({ db: this.db, storeName: this.name, indexName, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, })
    }

    update<T>({ doc }: { doc: T }) {
        return idbUpdate<T>({ db: this.db, storeName: this.name, doc })
    }

    updateMany<T>({ docs }: { docs: T[] }) {
        return idbUpdateMany<T>({ db: this.db, storeName: this.name, docs })
    }

    remove(keyValue: string) {
        return idbRemove({ db: this.db, storeName: this.name, keyValue })
    }

    removeMany(keyValues: string[]) {
        return idbRemoveMany({ db: this.db, storeName: this.name, keyValues })
    }

}