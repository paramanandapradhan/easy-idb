import type { Store } from "./store";
export type WhereOps = '==' | '>' | '>=' | '<' | '<=';
export type  WhereConstraint = {
    field: IDBValidKey,
    ops: WhereOps,
    value: IDBValidKey,
}

export type UpdateCallbackArgs = {
    db: IDBDatabase;
    oldVersion: number;
    newVersion: number;
    transaction: IDBTransaction;
}

export type onUpgradeFn = ({ db, oldVersion, newVersion, transaction }: UpdateCallbackArgs) => void;

 
 

export type RemoveIndexArgs = {
    db: IDBDatabase,
    storeName: string;
    indexName?: string[] | string | null | undefined;
}

 

 
 
export type StoreType = {
    name: string,
    primaryKey: string,
    autoIncrement?: boolean,
    indexes?: StoreIndexType[] | string[],
}

export type DatabaseConstructorType = {
    name: string,
    version: number,
    stores: StoreType[],
}

export type StoreConstructor = {
    db: IDBDatabase,
    name: string,
}

export type StoreIndexType = {
    keyPath: string | string[],
    multiEntry?: boolean,
    name?: string,
    unique?: boolean,
};


 

export type RestoreDataType = {
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

export type StoresMapType = { [key: string]: { store?: Store, indexStores?: { [key: string]: Store } } };