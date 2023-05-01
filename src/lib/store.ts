import {
    count,
    createStore,
    get,
    getAll,
    find,
    update,
    updateMany,
    remove,
    removeMany,
    insert,
    insertMany,
} from "./idb";
import type { StoreConstructorArgs, StoreIndexArgs } from "./types";

export class Store {
    readonly name: string;
    readonly db: IDBDatabase;

    constructor({ db, name }: StoreConstructorArgs) {
        this.db = db;
        this.name = name;
    }

    get<T>({ indexName, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, }: {
        indexName?: string;
        value?: IDBValidKey;
        valueStart?: IDBValidKey;
        valueStartAfter?: IDBValidKey;
        valueEnd?: IDBValidKey;
        valueEndBefore?: IDBValidKey;
    } = {}): Promise<T> {
        return get<T>({ db: this.db, storeName: this.name, indexName, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, })
    }

    getAll<T>({ indexName, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, count }: {
        indexName?: string;
        value?: IDBValidKey;
        valueStart?: IDBValidKey;
        valueStartAfter?: IDBValidKey;
        valueEnd?: IDBValidKey;
        valueEndBefore?: IDBValidKey;
        count?: number,
    } = {}): Promise<T[]> {
        return getAll<T>({ db: this.db, storeName: this.name, indexName, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, count })
    }

    count({ indexName, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, }: {
        indexName?: string;
        value?: IDBValidKey;
        valueStart?: IDBValidKey;
        valueStartAfter?: IDBValidKey;
        valueEnd?: IDBValidKey;
        valueEndBefore?: IDBValidKey;
    } = {}): Promise<number> {
        return count({ db: this.db, storeName: this.name, indexName, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, })
    }

    find<T>({ indexName, skip, limit, desc, unique, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, filter, map }: {
        indexName?: string;
        skip?: number;
        limit?: number;
        desc?: boolean;
        unique?: boolean;
        value?: IDBValidKey;
        valueStart?: IDBValidKey;
        valueStartAfter?: IDBValidKey;
        valueEnd?: IDBValidKey;
        valueEndBefore?: IDBValidKey;
        filter?: (object: any) => boolean;
        map?: (object: any) => any;
    } = {}): Promise<T[]> {
        return find<T>({ db: this.db, storeName: this.name, indexName, skip, limit, desc, unique, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, filter, map })
    }

    insert<T>(  doc: T  ): Promise<T> {
        return insert<T>({ db: this.db, storeName: this.name, doc });
    }

    insertMany<T>( docs: T[]  ): Promise<T[]> {
        return insertMany<T>({ db: this.db, storeName: this.name, docs });
    }

    update<T>( doc: T  ): Promise<T> {
        return update<T>({ db: this.db, storeName: this.name, doc });
    }

    updateMany<T>(  docs: T[] ): Promise<T[]> {
        return updateMany<T>({ db: this.db, storeName: this.name, docs });
    }

    remove(value: string): Promise<string> {
        return remove({ db: this.db, storeName: this.name, value })
    }

    removeMany(value: string[]): Promise<string[]> {
        return removeMany({ db: this.db, storeName: this.name, value })
    }

}