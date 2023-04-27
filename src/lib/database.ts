import { find, insetMany, openDatabase, removeDatabase, removeStore } from "./idb";
import { Store } from "./store";
import type { DatabaseConstructorArgs, RestoreDataArgs, StoreArgs, onUpgradeFn } from "./types";

export class Database {
    readonly name: string;
    readonly version: number;
    readonly isReady: Promise<IDBDatabase>;

    private stores: StoreArgs[];
    private storesMap: { [key: string]: Store } = {};
    private db: IDBDatabase | null = null;
    private isReadyResolve: Function = () => { };
    private isReadyReject: Function = () => { };


    constructor({ name, version, stores }: DatabaseConstructorArgs) {
        this.name = name;
        this.version = version;
        this.stores = stores;
        this.isReady = new Promise((resolve, rejecte) => {
            this.isReadyResolve = resolve;
            this.isReadyReject = rejecte;
        })
    }

    async openDatabase(onUpgrade?: onUpgradeFn) {
        try {
            this.db = await openDatabase({
                name: this.name, version: this.version,
                onUpgrade: ({ db, oldVersion, newVersion }) => {
                    if (newVersion === 1) {
                        this.stores.forEach((item: StoreArgs) => {
                            let store = new Store({ db, name: item.name, primaryKey: item.primaryKey, autoIncrement: item.autoIncrement, indexes: item.indexes });

                            this.storesMap[item.name] = store;
                        })
                    }
                    if (onUpgrade) {
                        onUpgrade({ db, oldVersion, newVersion })
                    }
                }
            });
            this.isReadyResolve(this.db);
            return this.db;
        } catch (error) {
            this.isReadyReject(error);
        }
    }

    deleteDatabse() {
        return removeDatabase(this.name);
    }

    getStore(name: string): Store {
        return this.storesMap[name];
    }

    removeStore(name: string): void {
        if (this.db) {
            removeStore({ db: this.db, storeName: name });
            delete this.storesMap[name];
        }
    }

    async backup(): Promise<RestoreDataArgs> {
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

    async restore(data: RestoreDataArgs): Promise<void> {
        if (this.db && data && data.version && data.name && data.stores) {
            await Promise.all(data.stores.map(async (store) => {
                await insetMany({ db: this.db!, storeName: store.name, docs: store.docs })
            }));
        }
    }

}
