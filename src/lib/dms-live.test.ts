// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetBirdclawPathsForTests } from "./config";
import { getConversationThread, listDmConversations } from "./queries";
import { resetDatabaseForTests } from "./db";

const listDirectMessagesViaBirdMock = vi.fn();
const getAuthenticatedBirdAccountMock = vi.fn();
const listDirectMessageEventsViaXurlMock = vi.fn();
const lookupAuthenticatedUserMock = vi.fn();

vi.mock("./bird", async () => {
	const { Effect } = await import("effect");
	return {
		getAuthenticatedBirdAccount: (...args: unknown[]) =>
			getAuthenticatedBirdAccountMock(...args),
		getAuthenticatedBirdAccountEffect: (...args: unknown[]) =>
			Effect.tryPromise({
				try: () => getAuthenticatedBirdAccountMock(...args),
				catch: (error) => error,
			}),
		listDirectMessagesViaBird: (...args: unknown[]) =>
			listDirectMessagesViaBirdMock(...args),
		listDirectMessagesViaBirdEffect: (...args: unknown[]) =>
			Effect.tryPromise({
				try: () => listDirectMessagesViaBirdMock(...args),
				catch: (error) => error,
			}),
	};
});

vi.mock("./xurl", async () => {
	const { Effect } = await import("effect");
	return {
		lookupAuthenticatedUser: (...args: unknown[]) =>
			lookupAuthenticatedUserMock(...args),
		lookupAuthenticatedUserEffect: (...args: unknown[]) =>
			Effect.tryPromise({
				try: () => lookupAuthenticatedUserMock(...args),
				catch: (error) => error,
			}),
		lookupAuthenticatedOAuth2UserEffect: (...args: unknown[]) =>
			Effect.tryPromise({
				try: () => lookupAuthenticatedUserMock(...args),
				catch: (error) => error,
			}),
		listDirectMessageEventsViaXurl: (...args: unknown[]) =>
			listDirectMessageEventsViaXurlMock(...args),
		listDirectMessageEventsViaXurlEffect: (...args: unknown[]) =>
			Effect.tryPromise({
				try: () => listDirectMessageEventsViaXurlMock(...args),
				catch: (error) => error,
			}),
	};
});

const tempDirs: string[] = [];

function makeTempHome() {
	const tempDir = mkdtempSync(path.join(os.tmpdir(), "birdclaw-dms-live-"));
	tempDirs.push(tempDir);
	process.env.BIRDCLAW_HOME = tempDir;
	return tempDir;
}

describe("cached live DMs", () => {
	beforeEach(() => {
		listDirectMessagesViaBirdMock.mockReset();
		getAuthenticatedBirdAccountMock.mockReset();
		listDirectMessageEventsViaXurlMock.mockReset();
		lookupAuthenticatedUserMock.mockReset();
		getAuthenticatedBirdAccountMock.mockResolvedValue({
			id: "25401953",
			username: "steipete",
		});
		lookupAuthenticatedUserMock.mockResolvedValue({
			id: "25401953",
			username: "steipete",
		});
	});

	afterEach(() => {
		resetDatabaseForTests();
		resetBirdclawPathsForTests();
		delete process.env.BIRDCLAW_HOME;

		for (const dir of tempDirs.splice(0)) {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("keeps cached DM sync effects lazy", async () => {
		makeTempHome();
		const { syncDirectMessagesViaCachedBirdEffect } =
			await import("./dms-live");

		const effect = syncDirectMessagesViaCachedBirdEffect({
			account: "acct_primary",
			limit: 5,
			refresh: true,
		});

		expect(listDirectMessagesViaBirdMock).not.toHaveBeenCalled();
		await expect(Effect.runPromise(effect)).rejects.toThrow(
			"bird CLI does not support direct messages",
		);
		expect(listDirectMessagesViaBirdMock).not.toHaveBeenCalled();
	});

	it("reports current bird DMs as unsupported without calling bird", async () => {
		makeTempHome();
		const { syncDirectMessagesViaCachedBird } = await import("./dms-live");

		await expect(
			syncDirectMessagesViaCachedBird({
				account: "acct_primary",
				limit: 5,
				refresh: true,
			}),
		).rejects.toThrow("bird CLI does not support direct messages");
		expect(getAuthenticatedBirdAccountMock).not.toHaveBeenCalled();
		expect(listDirectMessagesViaBirdMock).not.toHaveBeenCalled();
	});

	it("fetches recent xurl DM events into the local store", async () => {
		makeTempHome();
		listDirectMessageEventsViaXurlMock.mockResolvedValueOnce({
			data: [
				{
					id: "dm_xurl_1",
					event_type: "MessageCreate",
					text: "Hello from xurl",
					created_at: "2026-05-20T12:00:00.000Z",
					dm_conversation_id: "25401953-42",
					sender_id: "42",
					participant_ids: ["25401953", "42"],
				},
			],
			includes: {
				users: [
					{ id: "25401953", username: "steipete", name: "Peter" },
					{ id: "42", username: "sam", name: "Sam Altman" },
				],
			},
			meta: { result_count: 1 },
		});
		const { syncDirectMessagesViaCachedBird } = await import("./dms-live");

		const summary = await syncDirectMessagesViaCachedBird({
			account: "acct_primary",
			mode: "xurl",
			limit: 5,
			refresh: true,
		});

		expect(summary).toEqual({
			ok: true,
			source: "xurl",
			accountId: "acct_primary",
			conversations: 1,
			messages: 1,
		});
		expect(listDirectMessagesViaBirdMock).not.toHaveBeenCalled();
		expect(lookupAuthenticatedUserMock).toHaveBeenCalledWith("steipete");
		expect(listDirectMessageEventsViaXurlMock).toHaveBeenCalledWith({
			maxResults: 5,
			username: "steipete",
		});
		expect(listDmConversations({ search: "xurl", limit: 10 })).toEqual([
			expect.objectContaining({
				id: "25401953-42",
				accountId: "acct_primary",
				inboxKind: "accepted",
				isMessageRequest: false,
				participant: expect.objectContaining({
					handle: "sam",
					displayName: "Sam Altman",
				}),
			}),
		]);
		expect(getConversationThread("25401953-42")?.messages).toEqual([
			expect.objectContaining({
				id: "dm_xurl_1",
				text: "Hello from xurl",
				direction: "inbound",
				sender: expect.objectContaining({ handle: "sam" }),
			}),
		]);
	});

	it("paginates xurl DM events when requested", async () => {
		makeTempHome();
		listDirectMessageEventsViaXurlMock
			.mockResolvedValueOnce({
				data: [
					{
						id: "dm_xurl_page_1",
						event_type: "MessageCreate",
						text: "Page one",
						created_at: "2026-05-20T12:00:00.000Z",
						dm_conversation_id: "25401953-42",
						sender_id: "42",
						participant_ids: ["25401953", "42"],
					},
				],
				includes: {
					users: [
						{ id: "25401953", username: "steipete", name: "Peter" },
						{ id: "42", username: "sam", name: "Sam Altman" },
					],
				},
				meta: { next_token: "next-page" },
			})
			.mockResolvedValueOnce({
				data: [
					{
						id: "dm_xurl_page_2",
						event_type: "MessageCreate",
						text: "Page two",
						created_at: "2026-05-19T12:00:00.000Z",
						dm_conversation_id: "25401953-99",
						sender_id: "99",
						participant_ids: ["25401953", "99"],
					},
				],
				includes: {
					users: [{ id: "99", username: "pat", name: "Pat" }],
				},
				meta: {},
			});
		const { syncDirectMessagesViaCachedBird } = await import("./dms-live");

		await expect(
			syncDirectMessagesViaCachedBird({
				mode: "xurl",
				limit: 5,
				maxPages: 1,
				refresh: true,
			}),
		).resolves.toEqual(
			expect.objectContaining({
				source: "xurl",
				conversations: 2,
				messages: 2,
			}),
		);
		expect(listDirectMessageEventsViaXurlMock).toHaveBeenNthCalledWith(2, {
			maxResults: 5,
			username: "steipete",
			paginationToken: "next-page",
		});
	});

	it("reuses fresh xurl cache without spending another live call", async () => {
		makeTempHome();
		listDirectMessageEventsViaXurlMock.mockResolvedValue({
			data: [],
			meta: { result_count: 0 },
		});
		const { syncDirectMessagesViaCachedBird } = await import("./dms-live");

		await syncDirectMessagesViaCachedBird({
			mode: "xurl",
			account: "acct_primary",
			limit: 5,
		});
		const second = await syncDirectMessagesViaCachedBird({
			mode: "xurl",
			account: "acct_primary",
			limit: 5,
		});

		expect(second.source).toBe("cache");
		expect(listDirectMessageEventsViaXurlMock).toHaveBeenCalledTimes(1);
	});

	it("validates limits and account selection", async () => {
		makeTempHome();
		const { syncDirectMessagesViaCachedBird } = await import("./dms-live");

		await expect(syncDirectMessagesViaCachedBird({ limit: 0 })).rejects.toThrow(
			"bird DM mode requires --limit of at least 1",
		);
		await expect(
			syncDirectMessagesViaCachedBird({
				mode: "xurl",
				account: "missing",
				limit: 1,
			}),
		).rejects.toThrow("Unknown account: missing");
		await expect(
			syncDirectMessagesViaCachedBird({ mode: "xurl", limit: 101 }),
		).rejects.toThrow("xurl DM mode requires --limit between 1 and 100");
		await expect(
			syncDirectMessagesViaCachedBird({
				mode: "xurl",
				inbox: "requests",
				limit: 5,
			}),
		).rejects.toThrow("xurl DM mode cannot read the message-request inbox");
	});

	it("does not spend xurl or bird in auto mode while bird lacks DMs", async () => {
		makeTempHome();
		const { syncDirectMessagesViaCachedBird } = await import("./dms-live");

		await expect(
			syncDirectMessagesViaCachedBird({
				mode: "auto",
				limit: 5,
				refresh: true,
			}),
		).rejects.toThrow("bird CLI does not support direct messages");
		expect(listDirectMessageEventsViaXurlMock).not.toHaveBeenCalled();
		expect(listDirectMessagesViaBirdMock).not.toHaveBeenCalled();
	});

	it("rejects request inbox syncs without spending transports", async () => {
		makeTempHome();
		const { syncDirectMessagesViaCachedBird } = await import("./dms-live");

		await expect(
			syncDirectMessagesViaCachedBird({
				mode: "auto",
				inbox: "requests",
				limit: 5,
				refresh: true,
			}),
		).rejects.toThrow("bird CLI does not support direct messages");
		expect(lookupAuthenticatedUserMock).not.toHaveBeenCalled();
		expect(listDirectMessageEventsViaXurlMock).not.toHaveBeenCalled();
		expect(listDirectMessagesViaBirdMock).not.toHaveBeenCalled();
	});

	it("rejects bird DM sync before account checks while bird lacks DMs", async () => {
		makeTempHome();
		const { syncDirectMessagesViaCachedBird } = await import("./dms-live");

		await expect(
			syncDirectMessagesViaCachedBird({
				account: "acct_primary",
				limit: 5,
				refresh: true,
			}),
		).rejects.toThrow(
			"bird CLI does not support direct messages; use --mode xurl for accepted DMs",
		);
		expect(getAuthenticatedBirdAccountMock).not.toHaveBeenCalled();
		expect(listDirectMessagesViaBirdMock).not.toHaveBeenCalled();
	});

	it("refuses xurl DMs when xurl is authenticated as another account", async () => {
		makeTempHome();
		lookupAuthenticatedUserMock.mockResolvedValueOnce({
			id: "1995710751097659392",
			username: "openclaw",
		});
		const { syncDirectMessagesViaCachedBird } = await import("./dms-live");

		await expect(
			syncDirectMessagesViaCachedBird({
				account: "acct_primary",
				mode: "xurl",
				limit: 5,
				refresh: true,
			}),
		).rejects.toThrow(
			"xurl is authenticated as user 1995710751097659392; refusing to sync into acct_primary (25401953)",
		);
		expect(listDirectMessageEventsViaXurlMock).not.toHaveBeenCalled();
	});

	it("keeps bird DM payload normalization unreachable while bird lacks DMs", async () => {
		makeTempHome();
		const { syncDirectMessagesViaCachedBird } = await import("./dms-live");

		await expect(
			syncDirectMessagesViaCachedBird({
				account: "acct_primary",
				limit: 5,
				refresh: true,
			}),
		).rejects.toThrow("bird CLI does not support direct messages");
		expect(listDirectMessagesViaBirdMock).not.toHaveBeenCalled();
	});
});
