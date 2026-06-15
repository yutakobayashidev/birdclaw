import { Effect } from "effect";
import { databaseWriteEffect } from "./database-writer";
import type { Database } from "./sqlite";
import { readSyncCache, writeSyncCache } from "./sync-cache";

export interface LiveTransportAdapter<Source extends string, Payload> {
	source: Source;
	fetch: Effect.Effect<Payload, Error>;
}

interface CachedLiveSyncOptions<Source extends string, Payload, Persisted> {
	db: Database;
	cacheKey: string;
	refresh: boolean;
	cacheTtlMs: number;
	transports: readonly LiveTransportAdapter<Source, Payload>[];
	persistLive: (db: Database, payload: Payload, source: Source) => Persisted;
	persistCached?: (db: Database, payload: Payload) => Persisted;
}

export interface CachedLiveSyncResult<
	Source extends string,
	Payload,
	Persisted,
> {
	source: Source | "cache";
	payload: Payload;
	persisted: Persisted | undefined;
}

function toError(error: unknown) {
	return error instanceof Error ? error : new Error(String(error));
}

export function normalizeCacheTtlMs(
	value: number | undefined,
	defaultValue: number,
) {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
		return defaultValue;
	}
	return Math.floor(value);
}

export function fetchWithTransportFallbackEffect<
	Source extends string,
	Payload,
>(
	transports: readonly LiveTransportAdapter<Source, Payload>[],
): Effect.Effect<{ source: Source; payload: Payload }, Error> {
	const [first, ...rest] = transports;
	if (!first) {
		return Effect.fail(new Error("No live transport adapters configured"));
	}
	return first.fetch.pipe(
		Effect.map((payload) => ({ source: first.source, payload })),
		Effect.catchAll((error) =>
			rest.length > 0
				? fetchWithTransportFallbackEffect(rest)
				: Effect.fail(toError(error)),
		),
	);
}

export function runCachedLiveSyncEffect<
	Source extends string,
	Payload,
	Persisted,
>({
	db,
	cacheKey,
	refresh,
	cacheTtlMs,
	transports,
	persistLive,
	persistCached,
}: CachedLiveSyncOptions<Source, Payload, Persisted>): Effect.Effect<
	CachedLiveSyncResult<Source, Payload, Persisted>,
	Error
> {
	return Effect.gen(function* () {
		const cached = yield* Effect.try({
			try: () => readSyncCache<Payload>(cacheKey, db),
			catch: toError,
		});
		const cacheAgeMs = cached
			? Date.now() - new Date(cached.updatedAt).getTime()
			: Number.POSITIVE_INFINITY;
		if (!refresh && cached && cacheAgeMs <= cacheTtlMs) {
			const persisted = persistCached
				? yield* databaseWriteEffect((writeDb) =>
						persistCached(writeDb, cached.value),
					)
				: undefined;
			return {
				source: "cache",
				payload: cached.value,
				persisted,
			};
		}

		const fetched = yield* fetchWithTransportFallbackEffect(transports);
		const persisted = yield* databaseWriteEffect((writeDb) => {
			const value = persistLive(writeDb, fetched.payload, fetched.source);
			writeSyncCache(cacheKey, fetched.payload, writeDb);
			return value;
		});
		return {
			source: fetched.source,
			payload: fetched.payload,
			persisted,
		};
	});
}
