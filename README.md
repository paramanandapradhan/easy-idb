# easy-idb
A lightweight and straightforward library for storing data in browser IndexedDB. It offers a simple promise-based API for all CRUD operations in the database.

## Installation
```bash
npm i @cloudparker/easy-idb --save
```

# Simple Usage

```ts
import { Database, Store } from '@cloudparker/easy-idb';

// ...

let todos: Store;
let users: Store;
let db: Database | null = null;
let dbName = 'test-db';
let version = 2;
let storeDefinitions: StoreArgs[] = [
  { name: 'todos', primaryKey: '_id', autoIncrement: true },
  { name: 'users', primaryKey: '_id', autoIncrement: true, indexes: ['updatedAt'] }
];

db = new Database({ name: dbName, version, storeDefinitions });

// After opening the database, it will return all the Object Store instances based on the provided store names.
let results = await db.openDatabase(({ db, oldVersion, newVersion }) => {
  // TODO: handle data migration logic here
  switch(newVersion) {
    case 1:
      // Handle data migration for version 1
      break;
    case 2:
      // Handle data migration for version 2
      break;
  }
  console.log({ db, oldVersion, newVersion });
});

todos = results.todos; // todos store instance
users = results.users; // users store instance

console.log('Db opened');

await todos.insert({ task: 'Task1' });  // Insert one document

await todos.insertMany([{ task: 'Task1' }, { task: 'Task2' }]);  // Insert multiple documents

await todos.count(); // count the records in the store

await todos.get({ value: 1 }); // return the document with primaryKey value 1 (where primaryKey field is `_id`)
// Result : { _id: 1, task: 'Task1' }

await todos.getAll(); // Read all records from a store. Use this method carefully when the store size is large.

await todos.find(); // Read all records, irrespective of the store size

await todos.find({ desc: true }); // Read all records in descending order

await todos.find({ unique: true }); // Read all unique records, based on the id index

// Read all documents that match the custom query. Query based on primary key or other index ranges, or filter by custom filter function. It also allows transforming the values using the map function.
await todos.find({ indexName, skip, limit, desc, unique, value, valueStart, valueStartAfter, valueEnd, valueEndBefore, filter, map });

await todos.update({ _id: 1, task: 'Task First' });

await todos.updateMany([{ _id: 1, task: 'Task First' }, { _id: 2, task: 'Task Second' }]);

await todos.get({ value: 1 }); // return the document with primaryKey value 1 (where primaryKey field is `_id`)
// Result : { _id: 1, task: 'Task First' }

await todos.remove({ value: 1 }); // Remove record from store with _id = 1
await todos.removeMany({ values: [1, 2] }); // Remove multiple records from stores.

```


