import type { Store } from "./store";

export type UpdateCallbackArgs = {
    db: IDBDatabase;
    oldVersion: number;
    newVersion: number;
    transaction: IDBTransaction;
}

export type onUpgradeFn = ({ db, oldVersion, newVersion, transaction }: UpdateCallbackArgs) => void;

export type OpenDbArgs = {
    name: string;
    version: number;
    onUpgrade?: onUpgradeFn;
}

export type CreateStoreArgs = {
    db: IDBDatabase,
    storeName: string;
    primaryKey: string;
    autoIncrement?: boolean;
}

export type CreateIndexArgs = {
    db: IDBDatabase,
    storeName: string;
    indexName: string;
    unique?: boolean;
    multiEntry?: boolean;
}

export type RemoveIndexArgs = {
    db: IDBDatabase,
    storeName: string;
    indexName: string;
}

export type FindArgs = {
    db: IDBDatabase,
    storeName: string;
    indexName?: string | null | undefined;
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
}

export type OpenCursorArgs = {
    db: IDBDatabase,
    storeName: string;
    indexName?: string | null | undefined;
    desc?: boolean;
    unique?: boolean;
    value?: IDBValidKey;
    valueStart?: IDBValidKey;
    valueStartAfter?: IDBValidKey;
    valueEnd?: IDBValidKey;
    valueEndBefore?: IDBValidKey;
    processor?: (cursor: IDBCursorWithValue) => void;
}

export type InsertArgs<T> = {
    db: IDBDatabase,
    storeName: string;
    doc: T;
}

export type InserManyArgs<T> = {
    db: IDBDatabase,
    storeName: string,
    docs: T[],
}

export type UpdateArgs<T> = {
    db: IDBDatabase,
    storeName: string;
    doc: T;
}

export type UpdateManyArgs<T> = {
    db: IDBDatabase,
    storeName: string,
    docs: T[];
}


export type RemoveArgs = {
    db: IDBDatabase,
    storeName: string;
    value: IDBValidKey,

}

export type RemoveManyArgs = {
    db: IDBDatabase,
    storeName: string,
    values: IDBValidKey[],
}

export type GetStoreArgs = {
    db: IDBDatabase,
    storeName: string;
    readOnlyMode?: boolean
}

export type GetSearchArgs = {
    indexName?: string | null | undefined;
    value?: IDBValidKey;
    valueStart?: IDBValidKey;
    valueStartAfter?: IDBValidKey;
    valueEnd?: IDBValidKey;
    valueEndBefore?: IDBValidKey;
}

export type GetArgs = {
    db: IDBDatabase,
    storeName: string;
    indexName?: string | null | undefined;
    value?: IDBValidKey;
    valueStart?: IDBValidKey;
    valueStartAfter?: IDBValidKey;
    valueEnd?: IDBValidKey;
    valueEndBefore?: IDBValidKey;
}

export type GetAllArgs = {
    db: IDBDatabase,
    storeName: string;
    indexName?: string | null | undefined;
    desc?: boolean;
    unique?: boolean;
    value?: IDBValidKey;
    valueStart?: IDBValidKey;
    valueStartAfter?: IDBValidKey;
    valueEnd?: IDBValidKey;
    valueEndBefore?: IDBValidKey;
    count?: number,
}

export type CountArgs = {
    db: IDBDatabase,
    storeName: string;
    indexName?: string | null | undefined;
    desc?: boolean;
    unique?: boolean;
    value?: IDBValidKey;
    valueStart?: IDBValidKey;
    valueStartAfter?: IDBValidKey;
    valueEnd?: IDBValidKey;
    valueEndBefore?: IDBValidKey;
    count?: number,
}

export type StoreArgs = {
    name: string,
    primaryKey: string,
    autoIncrement?: boolean,
    indexes?: StoreIndexArgs[] | string[],
}

export type DatabaseConstructorArgs = {
    name: string,
    version: number,
    stores: StoreArgs[],
}

export type StoreConstructorArgs = {
    db: IDBDatabase,
    name: string,
    indexName?: string | null;
}

export type StoreIndexArgs = {
    keyPath: string | string[],
    multiEntry?: boolean,
    name?: string,
    unique?: boolean,
};


export type RemoveStoreArgs = {
    db: IDBDatabase,
    storeName: string;

}

export type RestoreDataArgs = {
    name: string,
    version: number,
    date: string,
    stores: [
        {
            name: string,
            docs: any[],
        }
    ]
}

export type StoresMapArgs = { [key: string]: { store?: Store, indexStores?: { [key: string]: Store } } };