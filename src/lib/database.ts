
import { createStore, find, openDatabase, removeDatabase, removeStore, getStore, insert } from "./idb";
import { Store } from "./store";
import type { RestoreDataType, StoreDefinitionType, StoreIndexDefinitionType, onUpgradeFn, } from "./types";

export class Database {
    readonly name: string;
    readonly version: number;
    readonly isReady: Promise<IDBDatabase>;

    private storeDefinitions: StoreDefinitionType[];
    private storesMap: { [key: string]: Store } = {};
    private db: IDBDatabase | null = null;
    private isReadyResolve: Function = () => { };
    private isReadyReject: Function = () => { };
    private isSchemaReady: boolean = false;


    constructor({ name, version, stores }: {
        name: string,
        version: number,
        stores: StoreDefinitionType[],
    }) {
        this.name = name;
        this.version = version;
        this.storeDefinitions = JSON.parse(JSON.stringify(stores || []));
        this.isReady = new Promise((resolve, rejecte) => {
            this.isReadyResolve = resolve;
            this.isReadyReject = rejecte;
        })
        this.storeDefinitions.forEach((storeDefinition) => {
            // Prepare string index names to structured format
            storeDefinition.indexes = (storeDefinition.indexes || []).map((index: string | StoreIndexDefinitionType) => {
                if (typeof index == 'string') {
                    return { name: index, keyPath: index } as StoreIndexDefinitionType
                }
                if (!index.name) {
                    if (index.keyPath && Array.isArray(index.keyPath)) {
                        index.name = index.keyPath.join('-');
                    } else {
                        index.name = index.keyPath;
                    }
                }
                return index as StoreIndexDefinitionType;
            });
        })
    }

    async openDatabase(onUpgrade?: onUpgradeFn): Promise<{ [storeName: string]: Store }> {
        try {
            this.db = await openDatabase({
                name: this.name, version: this.version,
                onUpgrade: ({ db, oldVersion, newVersion, transaction }) => {
                    if (!this.isSchemaReady) {
                        this.isSchemaReady = true;

                        this.storeDefinitions.forEach((storeDefinition: StoreDefinitionType) => {
                            const storeName = storeDefinition.name;
                            let store: IDBObjectStore;
                            if (!db.objectStoreNames.contains(storeDefinition.name)) {
                                store = createStore({ db, storeName, primaryKey: storeDefinition.primaryKey, autoIncrement: storeDefinition.autoIncrement });
                            } else {
                                store = transaction.objectStore(storeName)
                            }

                            // Remove indexes
                            let indexSet: Set<string> = new Set(((storeDefinition.indexes || []) as StoreIndexDefinitionType[]).map((indexDefinition: StoreIndexDefinitionType) => indexDefinition.name!));
                            const indexNames = store.indexNames || [];
                            for (let i = 0; i < indexNames.length; i++) {
                                let indexName = indexNames[i];
                                if (indexName && !indexSet.has(indexName)) {
                                    store.deleteIndex(indexName);
                                }
                            }

                            // Create indexes 
                            ((storeDefinition.indexes || []) as StoreIndexDefinitionType[]).forEach((indexDefinition: StoreIndexDefinitionType) => {
                                if (!store.indexNames.contains(indexDefinition.name!)) {
                                    store.createIndex(indexDefinition.name!, indexDefinition.keyPath, { unique: indexDefinition.unique, multiEntry: indexDefinition.multiEntry })
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
            await Promise.all(this.storeDefinitions.map(async (storeDefinition: StoreDefinitionType) => {
                this.storesMap[storeDefinition.name] = new Store({ db: this.db!, name: storeDefinition.name });
                if (!this.db?.objectStoreNames.contains(storeDefinition.name)) {
                    throw new Error(`The store '${storeDefinition.name}' does not exist! Please verify the store definition or upgrade the database version.`);
                }
                let objectStore = getStore({ db: this.db!, storeName: storeDefinition.name });
                if (objectStore) {
                    ((storeDefinition.indexes || []) as StoreIndexDefinitionType[]).forEach((indexDefinition: StoreIndexDefinitionType) => {
                        if (!objectStore.indexNames.contains(indexDefinition.name!)) {
                            throw new Error(`The index '${indexDefinition.name}' does not exist in the store '${storeDefinition.name}'! Please verify the store definition or upgrade the database version.`);
                        }
                    });
                }
            }));
        }

        return { ...this.storesMap };
    }

    deleteDatabase() {
        return removeDatabase(this.name);
    }

    getStore(name: string): Store | undefined {
        return this.storesMap[name];
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
                await insert({ db: this.db!, storeName: store.name, data: store.docs })
            }));
        }
    }

    close() {
        this.db?.close()
    }

}
