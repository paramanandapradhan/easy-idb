import type { Store } from "./store";
export type WhereOps = '==' | '>' | '>=' | '<' | '<=';
export type WhereConstraint = {
    [field: string]: IDBValidKey,
    ops: WhereOps,
    value: IDBValidKey,
}

export type UpdateCallbackArgs = {
    db: IDBDatabase,
    oldVersion: number,
    newVersion: number,
    transaction: IDBTransaction,
}

export type onUpgradeFn = ({ db, oldVersion, newVersion, transaction }: UpdateCallbackArgs) => void;

export type RemoveIndexArgs = {
    db: IDBDatabase,
    storeName: string,
    indexName?: string[] | string | null | undefined,
}

export type StoreDefinitionType = {
    name: string,
    primaryKey: string,
    autoIncrement?: boolean,
    indexes?: StoreIndexDefinitionType[] | string[],
}



export type StoreConstructor = {
    db: IDBDatabase,
    name: string,
}

export type StoreIndexDefinitionType = {
    keyPath: string | string[],
    multiEntry?: boolean,
    name?: string,
    unique?: boolean,
}




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

 