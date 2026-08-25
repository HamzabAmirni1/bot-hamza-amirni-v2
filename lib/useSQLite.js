// Robust SQLite Baileys Auth Store with WAL Mode & Auto-Recovery
import Database from 'better-sqlite3';
import { Mutex } from 'async-mutex';
import { BufferJSON, initAuthCreds, proto } from 'baileys';
import path from 'path';
import fs from 'fs';

export default async (folder = './sessions') => {
	const mutex = new Mutex();

	const targetFolder = process.env.SESSION_FOLDER || folder;
	const dir = path.resolve(`${targetFolder}/auth.db`);
	fs.mkdirSync(path.dirname(dir), { recursive: true });

	let db;
	let stmtGetCreds, stmtSetCreds, stmtGetKey, stmtSetKey, stmtDelKey;

	function initDatabase() {
		try {
			if (db) {
				try { db.close(); } catch (_) {}
			}
			db = new Database(dir, { timeout: 15000 });

			db.pragma('journal_mode = WAL');
			db.pragma('busy_timeout = 15000');
			db.pragma('synchronous = NORMAL');
			db.pragma('temp_store = MEMORY');
			db.pragma('foreign_keys = ON');

			db.exec(`
				CREATE TABLE IF NOT EXISTS creds (
					id INTEGER PRIMARY KEY CHECK (id = 1),
					data TEXT NOT NULL,
					updated_at INTEGER
				);

				CREATE TABLE IF NOT EXISTS keys (
					category TEXT NOT NULL,
					id TEXT NOT NULL,
					data TEXT,
					updated_at INTEGER,
					PRIMARY KEY (category, id)
				);
			`);

			stmtGetCreds = db.prepare(`SELECT data FROM creds WHERE id=1`);
			stmtSetCreds = db.prepare(
				`INSERT OR REPLACE INTO creds
				 (id, data, updated_at)
				 VALUES (1, ?, ?)`
			);

			stmtGetKey = db.prepare(
				`SELECT data FROM keys
				 WHERE category=? AND id=?`
			);
			stmtSetKey = db.prepare(
				`INSERT OR REPLACE INTO keys
				 (category, id, data, updated_at)
				 VALUES (?, ?, ?, ?)`
			);
			stmtDelKey = db.prepare(
				`DELETE FROM keys
				 WHERE category=? AND id=?`
			);
		} catch (e) {
			console.error(`❌ [useSQLite] Init Error for ${dir}:`, e.message);
		}
	}

	initDatabase();

	// Helper for safe query execution with auto-reconnect on DBMOVED
	const safeExec = (fn) => {
		try {
			return fn();
		} catch (err) {
			if (err?.code === 'SQLITE_READONLY_DBMOVED' || err?.code === 'SQLITE_READONLY' || /readonly/i.test(err?.message)) {
				console.warn(`⚠️ [useSQLite] Recovering from ${err.code || err.message}, re-opening database...`);
				initDatabase();
				return fn(); // retry once after re-opening
			}
			throw err;
		}
	};

	const readCreds = async () =>
		mutex.runExclusive(() => {
			return safeExec(() => {
				const row = stmtGetCreds.get();
				return row ? JSON.parse(row.data, BufferJSON.reviver) : null;
			});
		});

	const writeCreds = async (creds) =>
		mutex.runExclusive(() => {
			return safeExec(() => {
				stmtSetCreds.run(JSON.stringify(creds, BufferJSON.replacer), Date.now());
			});
		});

	const readKey = async (category, id) =>
		mutex.runExclusive(() => {
			return safeExec(() => {
				const row = stmtGetKey.get(category, id);
				if (!row) return null;

				let value = JSON.parse(row.data, BufferJSON.reviver);

				if (category === 'app-state-sync-key') {
					value = proto.Message.AppStateSyncKeyData.fromObject(value);
				}

				return value;
			});
		});

	const writeKey = async (category, id, value) =>
		mutex.runExclusive(() => {
			return safeExec(() => {
				stmtSetKey.run(category, id, JSON.stringify(value, BufferJSON.replacer), Date.now());
			});
		});

	const removeKey = async (category, id) =>
		mutex.runExclusive(() => {
			return safeExec(() => {
				stmtDelKey.run(category, id);
			});
		});

	const creds = (await readCreds()) || initAuthCreds();

	return {
		state: {
			creds,
			keys: {
				get: async (type, ids) => {
					const result = {};
					for (const id of ids) {
						result[id] = await readKey(type, id);
					}
					return result;
				},

				set: async (data) => {
					const tasks = [];
					for (const category in data) {
						if (!category) continue;

						for (const id in data[category]) {
							const value = data[category][id];
							tasks.push(value ? writeKey(category, id, value) : removeKey(category, id));
						}
					}
					await Promise.all(tasks);
				},
			},
		},

		saveCreds: async () => {
			await writeCreds(creds);
		},
	};
};

