<script lang="ts">
	import { browser } from '$app/environment';
	import { Database, Store, where, type StoreDefinitionType, IdbWhere } from '$lib';
	import { onMount } from 'svelte';

	let todo: any;
	let items: any[] = [];
	let task = '';
	let db: Database | null = null;
	let version = 8;
	let stores: StoreDefinitionType[] = [
		{ name: 'tags', primaryKey: '_id', autoIncrement: true },
		{ name: 'todos', primaryKey: '_id', autoIncrement: true },
		{ name: 'users', primaryKey: '_id', autoIncrement: true, indexes: ['updatedAt', 'name'] }
	];

	let todos: Store;

	async function handleOpenDb() {
		db = new Database({ name: 'easy-idb-test-db', version, stores });
		let results = await db.openDatabase(({ db, oldVersion, newVersion }) => {
			console.log({ db, oldVersion, newVersion });
		});
		console.log('Db opened', results);
		todos = results.todos!;
		console.log(results);
		console.log('todo 7 ', await todos.get(IdbWhere('_id', '==', 7)));
	}

	async function handleSave() {
		task = (task || '').trim();
		if (task) {
			if (!todo) {
				console.log(await todos.upsert({ task }));
			} else {
				todo.task = task;
				console.log(await todos.update(todo, { merge: true }));
			}
		}
		task = '';
		todo = null;
		handleLoad();
	}

	async function handleLoad() {
		items = await todos.find({});
	}

	async function handleEdit(item: any) {
		task = item.task;
		todo = item;
	}

	async function handleDelete(item: any) {
		console.log(item._id);
		todos.remove({ where: IdbWhere('_id', '==', item._id) });
		todo = null;
		handleLoad();
	}

	onMount(async () => {
		if (browser) {
			await handleOpenDb();
			await handleLoad();
			return () => {
				db?.close();
			};
		}
	});
</script>

<div>
	<div>Welcome to easy-idb databse library.</div>
	<!-- <button on:click={handleOpenDb}>Open DB</button> -->
	<hr />
	<div>
		<input type="text" bind:value={task} />
		<button on:click={handleSave}>Save Task</button>
	</div>

	<hr />
	<div>
		{#each items as item}
			<div>
				<span>{item.task}</span>
				<button on:click={() => handleEdit(item)}>Edit</button>
				<button on:click={() => handleDelete(item)}>Delete</button>
			</div>
		{/each}
	</div>
</div>
