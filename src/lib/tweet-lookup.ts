import { Effect } from "effect";
import { lookupTweetsByIdsViaBirdEffect } from "./bird";
import { runEffectPromise } from "./effect-runtime";
import type { XurlTweetsResponse } from "./types";
import { lookupTweetsByIdsEffect as lookupTweetsByIdsViaXurlEffect } from "./xurl";

export type TweetLookupMode = "auto" | "xurl" | "bird";

function errorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}

function failLookupViaBird(error: unknown) {
	return Effect.fail(
		new Error(`Tweet lookup failed via bird: ${errorMessage(error)}`),
	);
}

export function lookupTweetsByIdsEffect(
	ids: string[],
	mode: TweetLookupMode = "auto",
): Effect.Effect<XurlTweetsResponse, unknown> {
	if (mode === "bird") {
		return lookupTweetsByIdsViaBirdEffect(ids);
	}
	if (mode === "xurl") {
		return lookupTweetsByIdsViaXurlEffect(ids);
	}

	return lookupTweetsByIdsViaBirdEffect(ids).pipe(
		Effect.catchAll(failLookupViaBird),
	);
}

export function lookupTweetsByIds(
	ids: string[],
	mode: TweetLookupMode = "auto",
): Promise<XurlTweetsResponse> {
	return runEffectPromise(lookupTweetsByIdsEffect(ids, mode));
}
