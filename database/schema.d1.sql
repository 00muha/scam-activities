-- SAUTI schema for Cloudflare D1 (SQLite).
-- Phone numbers are not stored in plaintext. The Worker stores encrypted E.164
-- values plus a keyed HMAC-SHA-256 fingerprint and a masked display value.

CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    auth_subject TEXT UNIQUE,
    handle TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'member'
        CHECK (role IN ('member', 'moderator', 'admin')),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS phone_number_refs (
    id TEXT PRIMARY KEY,
    lookup_fingerprint TEXT NOT NULL UNIQUE,
    encrypted_e164 TEXT NOT NULL,
    encryption_iv TEXT NOT NULL,
    masked_display TEXT NOT NULL CHECK (masked_display LIKE '+254 %'),
    encryption_key_version TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT
);

CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    author_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    phone_number_ref_id TEXT REFERENCES phone_number_refs(id) ON DELETE SET NULL,
    source_kind TEXT NOT NULL DEFAULT 'community'
        CHECK (source_kind IN ('community', 'main_site')),
    source_system TEXT,
    source_detection_id TEXT,
    scam_type TEXT NOT NULL CHECK (length(trim(scam_type)) BETWEEN 1 AND 100),
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
    description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 5000),
    tactic_summary TEXT,
    moderation_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (moderation_status IN ('pending', 'published', 'hidden', 'removed')),
    fictional_demo INTEGER NOT NULL DEFAULT 0 CHECK (fictional_demo IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (
        (source_kind = 'community' AND source_system IS NULL AND source_detection_id IS NULL)
        OR
        (source_kind = 'main_site' AND source_system IS NOT NULL AND source_detection_id IS NOT NULL)
    ),
    UNIQUE (source_system, source_detection_id)
);

CREATE INDEX IF NOT EXISTS reports_public_feed_idx
    ON reports (moderation_status, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_type_feed_idx
    ON reports (scam_type, created_at DESC, moderation_status);
CREATE INDEX IF NOT EXISTS reports_phone_idx
    ON reports (phone_number_ref_id, moderation_status);
CREATE INDEX IF NOT EXISTS reports_moderation_queue_idx
    ON reports (moderation_status, created_at);

CREATE TABLE IF NOT EXISTS report_votes (
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    voter_key TEXT NOT NULL,
    vote INTEGER NOT NULL CHECK (vote IN (-1, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (report_id, voter_key)
);

CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    author_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    author_label TEXT NOT NULL DEFAULT 'Community member',
    parent_comment_id TEXT,
    body TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 2000),
    moderation_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (moderation_status IN ('pending', 'published', 'hidden', 'removed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (id, report_id),
    FOREIGN KEY (parent_comment_id, report_id)
        REFERENCES comments(id, report_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS comments_public_feed_idx
    ON comments (report_id, moderation_status, created_at);

CREATE TABLE IF NOT EXISTS roast_posts (
    id TEXT PRIMARY KEY,
    author_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    author_label TEXT NOT NULL DEFAULT 'Community member',
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
    body TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 1000),
    tactic_label TEXT NOT NULL CHECK (length(trim(tactic_label)) BETWEEN 1 AND 120),
    moderation_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (moderation_status IN ('pending', 'published', 'hidden', 'removed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS roast_posts_public_feed_idx
    ON roast_posts (moderation_status, created_at DESC);

CREATE TABLE IF NOT EXISTS roast_reactions (
    roast_post_id TEXT NOT NULL REFERENCES roast_posts(id) ON DELETE CASCADE,
    voter_key TEXT NOT NULL,
    reaction TEXT NOT NULL DEFAULT 'laugh'
        CHECK (reaction IN ('laugh', 'useful')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (roast_post_id, voter_key, reaction)
);

CREATE TABLE IF NOT EXISTS report_flags (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    reporter_key TEXT NOT NULL,
    reason TEXT NOT NULL
        CHECK (reason IN ('personal_information', 'false_information', 'harassment', 'spam', 'other')),
    details TEXT CHECK (details IS NULL OR length(details) <= 2000),
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT,
    UNIQUE (report_id, reporter_key)
);
CREATE INDEX IF NOT EXISTS report_flags_queue_idx
    ON report_flags (status, created_at);

CREATE TABLE IF NOT EXISTS weekly_highlights (
    week_start TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE RESTRICT,
    selected_by TEXT REFERENCES members(id) ON DELETE SET NULL,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (strftime('%w', week_start) = '1')
);

CREATE TABLE IF NOT EXISTS moderation_actions (
    id TEXT PRIMARY KEY,
    moderator_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    subject_type TEXT NOT NULL
        CHECK (subject_type IN ('report', 'comment', 'roast', 'phone_number')),
    subject_id TEXT NOT NULL,
    action TEXT NOT NULL
        CHECK (action IN ('publish', 'hide', 'remove', 'restore', 'redact')),
    reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 2000),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS moderation_actions_subject_idx
    ON moderation_actions (subject_type, subject_id, created_at DESC);

-- The Worker computes lookup_fingerprint as HMAC-SHA-256 over canonical E.164
-- using PHONE_LOOKUP_HMAC_KEY. Never use an unkeyed hash for phone numbers.
-- encrypted_e164 uses AES-GCM with PHONE_ENCRYPTION_KEY; secrets stay in Worker secrets.