import { z } from "zod";
import type {
	AccountRecord,
	ArchiveCandidate,
	DmConversationItem,
	DmMessageItem,
	DmSearchMatchItem,
	EmbeddedTweet,
	ProfileAffiliation,
	ProfileRecord,
	QueryEnvelope,
	QueryResponse,
	TimelineItem,
	TransportStatus,
	TweetEntities,
	TweetMediaItem,
	UrlExpansionItem,
} from "./types";
import type {
	WebSyncJobSnapshot,
	WebSyncResponse,
	WebSyncStep,
} from "./web-sync";

const jsonRecordSchema = z.record(z.string(), z.unknown());
const unknownProfile: ProfileRecord = {
	id: "profile_unknown",
	handle: "unknown",
	displayName: "Unknown",
	bio: "",
	followersCount: 0,
	avatarHue: 0,
	createdAt: "",
};

const profileAffiliationSchema: z.ZodType<ProfileAffiliation> = z.object({
	organizationProfileId: z.string(),
	organizationName: z.string().optional(),
	organizationHandle: z.string().optional(),
	badgeUrl: z.string().nullable().optional(),
	url: z.string().nullable().optional(),
	label: z.string().nullable().optional(),
	source: z.string(),
	firstSeenAt: z.string(),
	lastSeenAt: z.string(),
	isActive: z.boolean(),
});

const profileRecordSchema = z.object({
	id: z.string().default("profile_unknown"),
	handle: z.string().default("unknown"),
	displayName: z.string().default("Unknown"),
	bio: z.string().default(""),
	followersCount: z.number().default(0),
	followingCount: z.number().optional(),
	avatarHue: z.number().default(0),
	avatarUrl: z.string().optional(),
	location: z.string().optional(),
	url: z.string().optional(),
	verifiedType: z.string().optional(),
	entities: jsonRecordSchema.optional(),
	affiliations: z.array(profileAffiliationSchema).optional(),
	primaryAffiliation: profileAffiliationSchema.optional(),
	createdAt: z.string().default(""),
}) satisfies z.ZodType<ProfileRecord>;

const tweetEntitiesSchema: z.ZodType<TweetEntities> = z.object({
	mentions: z
		.array(
			z.object({
				username: z.string(),
				id: z.string().optional(),
				start: z.number(),
				end: z.number(),
				profile: profileRecordSchema.optional(),
			}),
		)
		.optional(),
	urls: z
		.array(
			z.object({
				url: z.string(),
				expandedUrl: z.string(),
				displayUrl: z.string(),
				start: z.number(),
				end: z.number(),
				title: z.string().optional(),
				description: z.string().nullable().optional(),
				imageUrl: z.string().nullable().optional(),
				siteName: z.string().nullable().optional(),
			}),
		)
		.optional(),
	hashtags: z
		.array(
			z.object({
				tag: z.string(),
				start: z.number(),
				end: z.number(),
			}),
		)
		.optional(),
	article: z
		.object({
			title: z.string(),
			previewText: z.string().optional(),
			url: z.string(),
			coverImageUrl: z.string().optional(),
		})
		.optional(),
});

const tweetMediaSchema: z.ZodType<TweetMediaItem> = z.object({
	url: z.string(),
	type: z.enum(["image", "video", "gif", "unknown"]),
	altText: z.string().optional(),
	width: z.number().optional(),
	height: z.number().optional(),
	thumbnailUrl: z.string().optional(),
	durationMs: z.number().optional(),
	variants: z
		.array(
			z.object({
				url: z.string(),
				contentType: z.string().optional(),
				bitRate: z.number().optional(),
			}),
		)
		.optional(),
});

const embeddedTweetSchema: z.ZodType<EmbeddedTweet> = z.object({
	id: z.string(),
	text: z.string(),
	createdAt: z.string().default(""),
	replyToId: z.string().nullable().optional(),
	isReplied: z.boolean().optional(),
	likeCount: z.number().optional(),
	mediaCount: z.number().optional(),
	bookmarked: z.boolean().optional(),
	liked: z.boolean().optional(),
	author: profileRecordSchema.default(unknownProfile),
	entities: tweetEntitiesSchema.default({}),
	media: z.array(tweetMediaSchema).default([]),
});

const timelineItemSchema: z.ZodType<TimelineItem> = z.object({
	id: z.string(),
	accountId: z.string().default("acct_primary"),
	accountHandle: z.string().default(""),
	kind: z
		.enum(["home", "mention", "authored", "search", "like", "bookmark"])
		.default("home"),
	text: z.string(),
	searchSnippet: z.string().optional(),
	createdAt: z.string().default(""),
	replyToId: z.string().nullable().optional(),
	isReplied: z.boolean().default(false),
	likeCount: z.number().default(0),
	mediaCount: z.number().default(0),
	bookmarked: z.boolean().default(false),
	liked: z.boolean().default(false),
	author: profileRecordSchema.default(unknownProfile),
	entities: tweetEntitiesSchema.default({}),
	media: z.array(tweetMediaSchema).default([]),
	replyToTweet: embeddedTweetSchema.nullable().optional(),
	quotedTweet: embeddedTweetSchema.nullable().optional(),
	retweetedTweet: embeddedTweetSchema.nullable().optional(),
	qualityReason: z.string().nullable().optional(),
});

const dmMessageSchema: z.ZodType<DmMessageItem> = z.object({
	id: z.string(),
	conversationId: z.string().default(""),
	text: z.string(),
	createdAt: z.string().default(""),
	direction: z.enum(["inbound", "outbound"]).default("inbound"),
	isReplied: z.boolean().default(false),
	mediaCount: z.number().default(0),
	sender: profileRecordSchema.default(unknownProfile),
});

const urlExpansionSchema: z.ZodType<UrlExpansionItem> = z.object({
	url: z.string(),
	expandedUrl: z.string(),
	finalUrl: z.string(),
	status: z.enum(["hit", "miss", "error"]),
	source: z.enum(["cache", "network"]),
	title: z.string().optional(),
	description: z.string().nullable().optional(),
	error: z.string().optional(),
	updatedAt: z.string(),
});

const dmSearchMatchSchema: z.ZodType<DmSearchMatchItem> = z.object({
	message: dmMessageSchema,
	before: z.array(dmMessageSchema),
	after: z.array(dmMessageSchema),
	urlExpansions: z.array(urlExpansionSchema).optional(),
});

const dmConversationSchema: z.ZodType<DmConversationItem> = z.object({
	id: z.string(),
	accountId: z.string(),
	accountHandle: z.string().default(""),
	title: z.string(),
	searchSnippet: z.string().optional(),
	inboxKind: z.enum(["accepted", "request"]).optional(),
	isMessageRequest: z.boolean().optional(),
	lastMessageAt: z.string().default(""),
	lastMessagePreview: z.string().default(""),
	unreadCount: z.number().default(0),
	needsReply: z.boolean().default(false),
	influenceScore: z.number().default(0),
	influenceLabel: z.string().default(""),
	participant: profileRecordSchema.default(unknownProfile),
	matches: z.array(dmSearchMatchSchema).optional(),
});

const accountRecordSchema: z.ZodType<AccountRecord> = z.object({
	id: z.string(),
	name: z.string().default(""),
	handle: z.string().default(""),
	externalUserId: z.string().nullable().optional(),
	profileId: z.string().optional(),
	avatarHue: z.number().optional(),
	avatarUrl: z.string().optional(),
	transport: z.string().default("local"),
	isDefault: z.coerce.number().default(0),
	createdAt: z.string().default(""),
});

const archiveCandidateSchema: z.ZodType<ArchiveCandidate> = z.object({
	path: z.string(),
	name: z.string().default(""),
	size: z.number().default(0),
	sizeFormatted: z.string().default(""),
	modifiedTime: z.string().default(""),
	dateFormatted: z.string().default(""),
});

const transportStatusSchema: z.ZodType<TransportStatus> = z.object({
	installed: z.boolean().default(false),
	availableTransport: z.enum(["xurl", "local"]).default("local"),
	statusText: z.string(),
	rawStatus: z.string().optional(),
});

export const queryEnvelopeSchema: z.ZodType<QueryEnvelope> = z.object({
	accounts: z.array(accountRecordSchema),
	archives: z.array(archiveCandidateSchema),
	transport: transportStatusSchema,
	stats: z.object({
		home: z.number(),
		mentions: z.number(),
		dms: z.number(),
		needsReply: z.number(),
		inbox: z.number(),
	}),
});

const timelineQueryResponseSchema = z.object({
	resource: z.enum(["home", "mentions", "authored", "search"]),
	items: z.array(timelineItemSchema),
	selectedConversation: z.undefined().optional(),
});

const dmQueryResponseSchema = z.object({
	resource: z.literal("dms"),
	items: z.array(dmConversationSchema),
	selectedConversation: z
		.object({
			conversation: dmConversationSchema,
			messages: z.array(dmMessageSchema),
		})
		.nullable()
		.optional(),
});

export const queryResponseSchema: z.ZodType<QueryResponse> = z.union([
	timelineQueryResponseSchema,
	dmQueryResponseSchema,
]);

export const webSyncKindSchema = z.enum([
	"timeline",
	"mentions",
	"likes",
	"bookmarks",
	"dms",
]);

const webSyncStepSchema: z.ZodType<WebSyncStep> = z.object({
	kind: z.union([webSyncKindSchema, z.literal("mention-threads")]),
	label: z.string(),
	count: z.number(),
	source: z.string().optional(),
	partial: z.boolean().optional(),
	warnings: z.array(z.string()).optional(),
});

export const webSyncResponseSchema: z.ZodType<WebSyncResponse> = z.object({
	ok: z.boolean(),
	kind: webSyncKindSchema,
	accountId: z.string().optional(),
	startedAt: z.string().default(""),
	finishedAt: z.string().optional(),
	summary: z.string(),
	steps: z.array(webSyncStepSchema).default([]),
	inProgress: z.boolean().optional(),
	backup: z.custom<WebSyncResponse["backup"]>().optional(),
	error: z.string().optional(),
});

export const webSyncJobSchema: z.ZodType<WebSyncJobSnapshot> = z.object({
	id: z.string(),
	kind: webSyncKindSchema,
	accountId: z.string().optional(),
	status: z.enum(["running", "succeeded", "failed"]),
	startedAt: z.string(),
	finishedAt: z.string().optional(),
	summary: z.string(),
	inProgress: z.boolean(),
	result: webSyncResponseSchema.optional(),
	error: z.string().optional(),
});

export const actionResponseSchema = jsonRecordSchema;
