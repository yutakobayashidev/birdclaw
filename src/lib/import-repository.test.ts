// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import {
	getImportRepository,
	resetImportRepositoriesForTests,
} from "./import-repository";
import { NativeSqliteDatabase } from "./sqlite";

let db: NativeSqliteDatabase | undefined;

afterEach(() => {
	db?.close();
	db = undefined;
	resetImportRepositoriesForTests();
});

describe("import repository", () => {
	it("owns bulk row and FTS persistence", () => {
		db = new NativeSqliteDatabase(":memory:");
		db.exec(`
      create table items (id text primary key, value text);
      create table tweets_fts (tweet_id text, text text);
    `);
		const repository = getImportRepository(db);

		repository.insertRows(
			"insert into items (id, value) values (?, ?)",
			[{ id: "one", value: "first" }],
			["id", "value"],
		);
		repository.insertFtsRows({
			target: { table: "tweets_fts", idColumn: "tweet_id" },
			rows: [
				{ id: "one", text: "first" },
				{ id: "one", text: "duplicate" },
			],
			idKey: "id",
			textKey: "text",
		});

		expect(db.prepare("select * from items").all()).toEqual([
			{ id: "one", value: "first" },
		]);
		expect(db.prepare("select * from tweets_fts").all()).toEqual([
			{ tweet_id: "one", text: "first" },
		]);
	});
});
