export interface AccountsTable {
	id: string;
	name: string;
	handle: string;
	external_user_id: string | null;
	transport: string;
	is_default: number;
	created_at: string;
}

export interface ProfilesTable {
	id: string;
	handle: string;
	display_name: string;
	bio: string;
	followers_count: number;
	following_count: number;
	public_metrics_json: string;
	avatar_hue: number;
	avatar_url: string | null;
	location: string | null;
	url: string | null;
	verified_type: string | null;
	entities_json: string;
	raw_json: string;
	created_at: string;
}

export interface ProfileAffiliationsTable {
	subject_profile_id: string;
	organization_profile_id: string;
	organization_name: string | null;
	organization_handle: string | null;
	badge_url: string | null;
	url: string | null;
	label: string | null;
	source: string;
	is_active: number;
	first_seen_at: string;
	last_seen_at: string;
	raw_json: string;
	updated_at: string;
}

export interface ProfileSnapshotsTable {
	profile_id: string;
	snapshot_hash: string;
	observed_at: string;
	last_seen_at: string;
	source: string;
	handle: string;
	display_name: string;
	bio: string;
	location: string | null;
	url: string | null;
	verified_type: string | null;
	followers_count: number;
	following_count: number;
	affiliations_json: string;
	raw_json: string;
}

export interface ProfileBioEntitiesTable {
	profile_id: string;
	kind: string;
	value: string;
	source: string;
	is_active: number;
	first_seen_at: string;
	last_seen_at: string;
	raw_json: string;
}

export interface IdentitySearchIndexTable {
	profile_id: string;
	kind: string;
	value: string;
	normalized_value: string;
	source: string;
	weight: number;
	updated_at: string;
}

export interface TweetsTable {
	id: string;
	account_id: string;
	author_profile_id: string;
	kind: string;
	text: string;
	created_at: string;
	is_replied: number;
	reply_to_id: string | null;
	like_count: number;
	media_count: number;
	bookmarked: number;
	liked: number;
	entities_json: string;
	media_json: string;
	quoted_tweet_id: string | null;
}

export interface TweetCollectionsTable {
	account_id: string;
	tweet_id: string;
	kind: "likes" | "bookmarks";
	collected_at: string | null;
	source: string;
	raw_json: string;
	updated_at: string;
}

export interface TweetAccountEdgesTable {
	account_id: string;
	tweet_id: string;
	kind:
		| "home"
		| "mention"
		| "authored"
		| "search"
		| "profile"
		| "thread_context";
	first_seen_at: string;
	last_seen_at: string;
	seen_count: number;
	source: string;
	raw_json: string;
	updated_at: string;
}

export interface DmConversationsTable {
	id: string;
	account_id: string;
	participant_profile_id: string;
	title: string;
	inbox_kind: "accepted" | "request";
	last_message_at: string;
	unread_count: number;
	needs_reply: number;
}

export interface DmMessagesTable {
	id: string;
	conversation_id: string;
	sender_profile_id: string;
	text: string;
	created_at: string;
	direction: "inbound" | "outbound";
	is_replied: number;
	media_count: number;
}

export interface TweetActionsTable {
	id: string;
	account_id: string;
	tweet_id: string | null;
	kind: string;
	body: string;
	created_at: string;
}

export interface BlocksTable {
	account_id: string;
	profile_id: string;
	source: string;
	created_at: string;
}

export interface MutesTable {
	account_id: string;
	profile_id: string;
	source: string;
	created_at: string;
}

export interface AiScoresTable {
	entity_kind: string;
	entity_id: string;
	model: string;
	score: number;
	summary: string;
	reasoning: string;
	updated_at: string;
}

export interface SyncCacheTable {
	cache_key: string;
	value_json: string;
	updated_at: string;
}

export interface UrlExpansionsTable {
	short_url: string;
	expanded_url: string;
	final_url: string;
	status: string;
	expanded_tweet_id: string | null;
	expanded_handle: string | null;
	title: string | null;
	description: string | null;
	image_url: string | null;
	site_name: string | null;
	error: string | null;
	source: string;
	updated_at: string;
}

export interface LinkOccurrencesTable {
	source_kind: "dm" | "tweet";
	source_id: string;
	source_position: number;
	short_url: string;
	account_id: string | null;
	conversation_id: string | null;
	direction: string | null;
	created_at: string;
}

export interface FollowEdgesTable {
	account_id: string;
	direction: "followers" | "following";
	profile_id: string;
	external_user_id: string;
	source: string;
	current: number;
	first_seen_at: string;
	last_seen_at: string;
	ended_at: string | null;
	updated_at: string;
}

export interface FollowSnapshotsTable {
	id: string;
	account_id: string;
	direction: "followers" | "following";
	source: string;
	status: "complete" | "incomplete";
	page_count: number;
	result_count: number;
	started_at: string;
	completed_at: string;
	raw_meta_json: string;
}

export interface FollowSnapshotMembersTable {
	snapshot_id: string;
	profile_id: string;
	external_user_id: string;
	position: number;
}

export interface FollowEventsTable {
	id: string;
	account_id: string;
	direction: "followers" | "following";
	profile_id: string;
	external_user_id: string;
	kind: "started" | "ended";
	event_at: string;
	snapshot_id: string;
}

export interface GeocodedLocationsTable {
	normalized_key: string;
	original: string;
	lat: number;
	lng: number;
	formatted: string | null;
	country_code: string | null;
	confidence: number | null;
	provider: string;
	approx_radius_m: number | null;
	bounds_json: string;
	components_json: string;
	hits: number;
	created_at: string;
	last_used_at: string;
}

export interface GeocodedLocationsUnresolvedTable {
	normalized_key: string;
	original: string;
	reason: string;
	last_attempted_at: string;
	ttl_until: string | null;
}

export interface BirdclawDatabase {
	accounts: AccountsTable;
	profiles: ProfilesTable;
	profile_affiliations: ProfileAffiliationsTable;
	profile_snapshots: ProfileSnapshotsTable;
	profile_bio_entities: ProfileBioEntitiesTable;
	identity_search_index: IdentitySearchIndexTable;
	tweets: TweetsTable;
	tweet_collections: TweetCollectionsTable;
	tweet_account_edges: TweetAccountEdgesTable;
	dm_conversations: DmConversationsTable;
	dm_messages: DmMessagesTable;
	tweet_actions: TweetActionsTable;
	blocks: BlocksTable;
	mutes: MutesTable;
	ai_scores: AiScoresTable;
	sync_cache: SyncCacheTable;
	url_expansions: UrlExpansionsTable;
	link_occurrences: LinkOccurrencesTable;
	follow_edges: FollowEdgesTable;
	follow_snapshots: FollowSnapshotsTable;
	follow_snapshot_members: FollowSnapshotMembersTable;
	follow_events: FollowEventsTable;
	geocoded_locations: GeocodedLocationsTable;
	geocoded_locations_unresolved: GeocodedLocationsUnresolvedTable;
}
