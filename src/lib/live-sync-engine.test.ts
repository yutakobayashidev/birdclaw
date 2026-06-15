// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetBirdclawPathsForTests } from "./config";
import { resetDatabaseWriterForTests } from "./database-writer";
import { getNativeDb, resetDatabaseForTests } from "./db";
import { runEffectPromise } from "./effect-runtime";
import {
	fetchWithTransportFallbackEffect,
	runCachedLiveSyncEffect,
} from "./live-sync-engine";
import { writeSyncCache } from "./sync-cache";

let tempDir: string | undefined;

afterEach(() => {
	resetDatabaseWriterForTests();
	resetDatabaseForTests();
	resetBirdclawPathsForTests();
	delete process.env.BIRDCLAW_HOME;
	if (tempDir) rmSync(tempDir, { recursive: true, force: true });
	tempDir = undefined;
});

function setupDatabase() {
	tempDir = mkdtempSync(path.join(os.tmpdir(), "birdclaw-sync-engine-"));
	process.env.BIRDCLAW_HOME = tempDir;
	const db = getNativeDb({ seedDemoData: false });
	db.exec("create table sync_events (value text)");
	return db;
}

describe("live sync engine", () => {
	it("falls through transport adapters in order", async () => {
		const result = await runEffectPromise(
			fetchWithTransportFallbackEffect([
				{
					source: "xurl",
					fetch: Effect.fail(new Error("unavailable")),
				},
				{
					source: "bird",
					fetch: Effect.succeed({ value: 2 }),
				},
			]),
		);

		expect(result).toEqual({ source: "bird", payload: { value: 2 } });
	});

	it("returns a fresh cache without fetching", async () => {
		const db = setupDatabase();
		writeSyncCache("timeline:test", { value: 1 }, db);
		const fetch = vi.fn(() => ({ value: 2 }));

		const result = await runEffectPromise(
			runCachedLiveSyncEffect({
				db,
				cacheKey: "timeline:test",
				refresh: false,
				cacheTtlMs: 60_000,
				transports: [{ source: "bird", fetch: Effect.sync(fetch) }],
				persistLive: () => undefined,
			}),
		);

		expect(result).toMatchObject({
			source: "cache",
			payload: { value: 1 },
		});
		expect(fetch).not.toHaveBeenCalled();
	});

	it("commits canonical writes and cache updates together", async () => {
		const db = setupDatabase();

		await expect(
			runEffectPromise(
				runCachedLiveSyncEffect({
					db,
					cacheKey: "timeline:test",
					refresh: true,
					cacheTtlMs: 0,
					transports: [
						{ source: "bird", fetch: Effect.succeed({ value: "live" }) },
					],
					persistLive: (writeDb, payload) => {
						writeDb
							.prepare("insert into sync_events (value) values (?)")
							.run(payload.value);
						throw new Error("rollback");
					},
				}),
			),
		).rejects.toThrow("rollback");
		expect(db.prepare("select value from sync_events").all()).toEqual([]);
		expect(
			db
				.prepare(
					"select cache_key from sync_cache where cache_key = 'timeline:test'",
				)
				.get(),
		).toBeUndefined();
	});
});
