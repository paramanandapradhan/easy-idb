import { createStore, find, insertMany, openDatabase, removeDatabase, removeStore, getStore } from "./idb";
import { Store } from "./store";
import type { DatabaseConstructorType, RestoreDataType, StoreIndexType, StoreType, StoresMapType, onUpgradeFn, } from "./types";

export class Database {
    readonly name: string;
    readonly version: number;
    readonly isReady: Promise<IDBDatabase>;

    private stores: StoreType[];
    private storesMap: StoresMapType = {};
    private db: IDBDatabase | null = null;
    private isReadyResolve: Function = () => { };
    private isReadyReject: Function = () => { };
    private isSchemaReady: boolean = false;


    constructor({ name, version, stores }: DatabaseConstructorType) {
        this.name = name;
        this.version = version;
        this.stores = stores;
        this.isReady = new Promise((resolve, rejecte) => {
            this.isReadyResolve = resolve;
            this.isReadyReject = rejecte;
        })
    }

    async openDatabase(onUpgrade?: onUpgradeFn): Promise<StoresMapType> {
        try {
            this.db = await openDatabase({
                name: this.name, version: this.version,
                onUpgrade: ({ db, oldVersion, newVersion, transaction }) => {
                    if (!this.isSchemaReady) {
                        this.isSchemaReady = true;

                        this.stores.forEach((item: StoreType) => {
                            const storeName = item.name;
                            let store: IDBObjectStore;
                            if (!db.objectStoreNames.contains(item.name)) {
                                store = createStore({ db, storeName, primaryKey: item.primaryKey, autoIncrement: item.autoIncrement });
                            } else {
                                store = transaction.objectStore(storeName)
                            }

                            // Prepare string index names to structured format
                            let indexes = (item.indexes || []).map((index: string | StoreIndexType) => {
                                if (typeof index == 'string') {
                                    return { name: index, keyPath: index } as StoreIndexType
                                }
                                if (!index.name) {
                                    if (index.keyPath && Array.isArray(index.keyPath)) {
                                        index.name = index.keyPath.join('-');
                                    } else {
                                        index.name = index.keyPath;
                                    }
                                }
                                return index as StoreIndexType;
                            })

                            // Remove indexes
                            let indexSet: Set<string> = new Set(indexes.map((index: StoreIndexType) => index.name!));
                            const indexNames = store.indexNames || [];
                            for (let i = 0; i < indexNames.length; i++) {
                                let indexName = indexNames[i];
                                if (indexName && indexName != item.primaryKey) {
                                    if (!indexSet.has(indexName)) {
                                        store.deleteIndex(indexName);
                                    }
                                }
                            }

                            // Create indexes 
                            indexes.forEach((index) => {
                                if (!store.indexNames.contains(index.name!)) {
                                    store.createIndex(index.name!, index.keyPath, { unique: index.unique, multiEntry: index.multiEntry })
                                }
                            });
                        });
                    }
                    if (onUpgrade) {
                        onUpgrade({ db, oldVersion, newVersion, transaction });
                    }
                }
            });
            this.isReadyResolve(this.db);
        } catch (error) {
            this.isReadyReject(error);
        }

        if (this.db) {
            await Promise.all(this.stores.map(async (store: StoreType) => {
                this.storesMap[store.name] = { indexStores: {} };
                let storeMap = this.storesMap[store.name];
                storeMap.store = new Store({ db: this.db!, name: store.name });
                let objectStore = getStore({ db: this.db!, storeName: store.name });
                if (objectStore) {
                    for (let i = 0; i < objectStore.indexNames.length; i++) {
                        let indexName = objectStore.indexNames[i];
                        if (indexName) {
                            storeMap.indexStores![indexName] = new Store({ db: this.db!, name: store.name })
                        }
                    }
                }
            }));
        }

        return { ...this.storesMap };
    }

    deleteDatabase() {
        return removeDatabase(this.name);
    }

    getStore(name: string): Store | undefined {
        return this.storesMap[name].store;
    }

    removeStore(name: string): void {
        if (this.db) {
            removeStore({ db: this.db, storeName: name });
            delete this.storesMap[name];
        }
    }

    async backup(): Promise<RestoreDataType> {
        let result: any = { stores: [] };
        if (this.db) {
            result.name = this.db.name;
            result.version = this.db.version;
            await Promise.all(Object.keys(this.storesMap).map(async (storeName: string) => {
                let docs = await find({ db: this.db!, storeName });
                result.stores.push({ name: storeName, docs })
            }))

        }
        result.date = new Date().toISOString();
        return result;
    }

    async restore(data: RestoreDataType): Promise<void> {
        if (this.db && data && data.version && data.name && data.stores) {
            await Promise.all(data.stores.map(async (store) => {
                await insertMany({ db: this.db!, storeName: store.name, docs: store.docs })
            }));
        }
    }

    close() {
        this.db?.close()
    }

}
