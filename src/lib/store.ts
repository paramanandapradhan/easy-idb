import {
    count,
    get,
    getAll,
    find,
    update,
    updateMany,
    remove,
    removeMany,
    insert,
    insertMany,
    upsertMany,
    upsert,
    clearStore,
} from "./idb";
import type { StoreConstructor, WhereConstraint } from "./types";

/**
 * IndexedDB Object Store.
 * 
 */
export class Store {
    readonly name: string;
    readonly db: IDBDatabase;

    /**
     * 
     * @param db:  IDBDatabase instance
     * @param name: Object Store Name
     */
    constructor({ db, name, }: StoreConstructor) {
        this.db = db;
        this.name = name;
    }

    /**
    * Get one object from the object store
    * @param  where: WhereConstraint[], use where() function to construct it
    * 
    * @returns <T> Return object based on tht query match.
    */
    get<T>(where: WhereConstraint | WhereConstraint[]): Promise<T> {
        return get<T>({ db: this.db, storeName: this.name, where })
    }

    /**
     * Get all objects from the object store. Be carefull when use this function it may through Low memory exception for large store.
     * It is not a ideal way to retrive all records from a large object store use find function instead.
     * 
     * @param where: WhereConstraint[], use where() function to construct it
     * @param count count of the object required fron the query.
     * 
     * @returns <T>[] Return array of objects based on tht query match.
     */
    getAll<T>({ where, count }: {
        where?: WhereConstraint | WhereConstraint[],
        count?: number,
    } = {}): Promise<T[]> {
        return getAll<T>({ db: this.db, storeName: this.name, where, count })
    }

    /**
     * Count number of records match the query
     * 
     * @param where: WhereConstraint[], use where() function to construct it
     * 
     * @returns number Return count of records match the query 
     */
    count(where?: WhereConstraint | WhereConstraint[]): Promise<number> {
        return count({ db: this.db, storeName: this.name, where })
    }

    /**
     * Find all objects from the object store.
     * 
     * @param indexName Provide index name for the query param match
     * @param skip Start offset of the query
     * @param limit Limit the number of record to be return from matched query
     * @param desc Ascending or descending qquery
     * @param unique Returns only unique value from the index
     * @param where: WhereConstraint[], use where() function to construct it
     * @param count count of the object required fron the query.
     * @param filter Advance custom data filter function
     * @param map Transform value before return
     * 
     * @returns <T>[] Return array of objects based on tht query match.
     */
    find<T>({ skip, limit, desc, unique, where, filter, map }: {
        indexName?: string[] | string | null | undefined,
        skip?: number,
        limit?: number,
        desc?: boolean,
        unique?: boolean,
        where?: WhereConstraint | WhereConstraint[],
        filter?: (object: any) => boolean,
        map?: (object: any) => any,
    } = {}): Promise<T[]> {
        return find<T>({ db: this.db, storeName: this.name, skip, limit, desc, unique, where, filter, map })
    }

    /**
     * Insert a object to the store.
     * @param doc Insertable document
     * @returns <T> Return created object
     */
    insert<T>(doc: T): Promise<T> {
        return insert<T>({ db: this.db, storeName: this.name, doc });
    }

    /**
     * Insert multiple objects to the store.
     * @param docs Insertable documents
     * @returns <T>[] Return created object
     */
    insertMany<T>(docs: T[]): Promise<T[]> {
        return insertMany<T>({ db: this.db, storeName: this.name, docs });
    }

    /**
     * Update a object to the store.
     * @param doc Updateable document
     * @returns <T> Return upddated object
     */
    update<T>(doc: T): Promise<T> {
        return update<T>({ db: this.db, storeName: this.name, doc });
    }

    /**
     * Update multiple objects to the store.
     * @param docs Updateable documents
     * @returns <T>[] Return updated objects
     */
    updateMany<T>(docs: T[]): Promise<T[]> {
        return updateMany<T>({ db: this.db, storeName: this.name, docs });
    }

    /**
     * Upsert a object to the store.
     * @param doc Updateable document
     * @returns <T> Return upddated object
     */
    upsert<T>(doc: T): Promise<T> {
        return upsert<T>({ db: this.db, storeName: this.name, doc });
    }

    /**
     * Upsert multiple objects to the store.
     * @param docs Updateable documents
     * @returns <T>[] Return updated objects
     */
    upsertMany<T>(docs: T[]): Promise<T[]> {
        return upsertMany<T>({ db: this.db, storeName: this.name, docs });
    }

    /**
     * Remove a object to the store provided primary index value.
     * @param value indexKeyValue
     * @returns <string> Return provided indexKeyValue when success delete 
     */
    remove<T>(  primaryKeyValue: IDBValidKey  ): Promise<T | null> {
        return remove<T>({ db: this.db, storeName: this.name, primaryKeyValue })
    }

    /**
     * Remove multiple objects to the store provided primary index values.
     * @param primaryKeyValues indexKeyValues
     * @returns <string> Return provided indexKeyValues when success delete 
     */
    removeMany<T>(primaryKeyValues: IDBValidKey[] ): Promise<(T | null)[]> {
        return removeMany<T>({ db: this.db, storeName: this.name, primaryKeyValues })
    }

    /**
     * Remove all object fron the store.
     * @returns <void> Return void
     */
    removeAll<T>(): Promise<void> {
        return clearStore({ db: this.db, storeName: this.name })
    }

}