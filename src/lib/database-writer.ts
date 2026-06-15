import { Effect } from "effect";
import { getNativeDb } from "./db";
import type { Database } from "./sqlite";
import {
	recordDatabaseWriteCompleted,
	recordDatabaseWriteQueued,
	recordDatabaseWriteStarted,
} from "./database-metrics";

let writeTails = new Map<string | object, Promise<void>>();

export function enqueueDatabaseWrite<T>(
	write: (db: Database) => T,
	providedDb?: Database,
): Promise<T> {
	const db = providedDb ?? getNativeDb({ seedDemoData: false });
	const writeIdentity = db.writeIdentity;
	const queuedAt = performance.now();
	recordDatabaseWriteQueued();
	const writeTail = writeTails.get(writeIdentity) ?? Promise.resolve();
	const pending = writeTail.then(() => {
		recordDatabaseWriteStarted(performance.now() - queuedAt);
		try {
			const result = db.transaction(() => write(db))();
			recordDatabaseWriteCompleted(false);
			return result;
		} catch (error) {
			recordDatabaseWriteCompleted(true);
			throw error;
		}
	});
	const settled = pending.then(
		() => undefined,
		() => undefined,
	);
	writeTails.set(writeIdentity, settled);
	void settled.then(() => {
		if (writeTails.get(writeIdentity) === settled) {
			writeTails.delete(writeIdentity);
		}
	});
	return pending;
}

export function databaseWriteEffect<T>(
	write: (db: Database) => T,
	providedDb?: Database,
) {
	return Effect.tryPromise({
		try: () => enqueueDatabaseWrite(write, providedDb),
		catch: (error) =>
			error instanceof Error ? error : new Error(String(error)),
	});
}

export async function drainDatabaseWrites() {
	while (writeTails.size > 0) {
		await Promise.all(writeTails.values());
	}
}

export function resetDatabaseWriterForTests() {
	writeTails = new Map();
}
