---
title: Compose & Reply
description: "Post tweets, reply to tweets, and reply to DMs from the CLI or web app."
---

# Compose & Reply

Three verbs cover everything you can publish: `post`, `reply`, and `dm`.

```bash
birdclaw compose post "Ship local software."
birdclaw compose reply tweet_004 "On it."
birdclaw compose dm dm_003 "Send it over." --transport xurl
```

Tweet posts and tweet replies use `bird` first. DM replies require `--transport xurl` with the current bird CLI because bird does not expose DM sends. Compose commands never touch SQLite when the live call fails, so a failed publish does not leave a half-state row behind.

## compose post

Post a new tweet on the active account.

```bash
birdclaw compose post "Ship local software."
birdclaw compose post --account acct_primary "Multi-account post."
```

Flags:

- `--account <id>`
- `--reply-to <tweet-id>` — equivalent to `compose reply`
- `--quote <tweet-id>` — quote-tweet
- `--media <path>` — attach a local file (planned)
- `--dry-run` — render the payload, do not publish

## compose reply

Reply to an existing tweet by ID.

```bash
birdclaw compose reply 1891234567890 "On it."
birdclaw compose reply tweet_004 "Already shipped."
```

The `<tweet-id>` argument accepts:

- canonical numeric Twitter IDs (e.g. `1891234567890`)
- local short IDs from search results (e.g. `tweet_004`)
- canonical Twitter URLs (e.g. `https://x.com/user/status/1891...`)

## compose dm

Reply within an existing DM conversation by conversation ID.

```bash
birdclaw compose dm dm_003 "Send it over." --transport xurl
birdclaw compose dm dm_004 "Sounds good." --transport xurl
```

`compose dm` resolves the conversation, requires an explicit xurl transport for live send, and merges the sent message back into the local DM tables only after the transport succeeds.

## Disabling live writes

Set `BIRDCLAW_DISABLE_LIVE_WRITES=1` to make every compose verb a dry-run regardless of flags. CI and the test suite rely on this — see [Configuration](configuration.md#disabling-live-writes).

```bash
export BIRDCLAW_DISABLE_LIVE_WRITES=1
birdclaw compose post "this will not actually post"
```

The command still validates the payload and prints what *would* have been sent.

## Web UI

The web app's `Home`, `Mentions`, and `DMs` lanes all share the same compose backend. Drafts are stored locally in SQLite while you type, so closing a tab does not lose work.

## Exit codes

- `0` — published
- `2` — invalid usage (missing tweet ID, empty body)
- `3` — auth unavailable for the active account
- `4` — transport unavailable (`xurl` and `bird` both failed)

## See also

- [Configuration](configuration.md) — transport precedence and `BIRDCLAW_DISABLE_LIVE_WRITES`
- [Mentions](mentions.md) — pull a unreplied queue, then reply
- [DMs](dms.md) — DM triage flow
