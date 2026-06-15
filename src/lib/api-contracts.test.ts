import { describe, expect, it } from "vitest";
import { queryResponseSchema, webSyncJobSchema } from "./api-contracts";

describe("API contracts", () => {
	it("accepts search timeline responses", () => {
		const result = queryResponseSchema.safeParse({
			resource: "search",
			items: [],
		});

		expect(result.success).toBe(true);
	});

	it("rejects malformed nested query items", () => {
		const result = queryResponseSchema.safeParse({
			resource: "dms",
			items: [{ id: "conversation-1" }],
		});

		expect(result.success).toBe(false);
	});

	it("validates completed sync job results", () => {
		const result = webSyncJobSchema.safeParse({
			id: "sync_timeline_1",
			kind: "timeline",
			status: "succeeded",
			startedAt: "2026-06-15T12:00:00.000Z",
			finishedAt: "2026-06-15T12:00:01.000Z",
			summary: "Synced 1 item",
			inProgress: false,
			result: {
				ok: true,
				kind: "timeline",
				startedAt: "2026-06-15T12:00:00.000Z",
				finishedAt: "2026-06-15T12:00:01.000Z",
				summary: "Synced 1 item",
				steps: [
					{
						kind: "timeline",
						label: "Home timeline",
						count: 1,
					},
				],
			},
		});

		expect(result.success).toBe(true);
	});
});
