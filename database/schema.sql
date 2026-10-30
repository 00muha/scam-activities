-- SAUTI PostgreSQL schema
-- Requires PostgreSQL 13+ for gen_random_uuid().
-- Phone numbers are never stored as plaintext. The application must normalize Kenyan
-- mobile numbers to E.164, compute a keyed HMAC-SHA-256 fingerprint, encrypt the
-- normalized number using an application/KMS-managed key, and supply a masked value.

CREATE SCHEMA IF NOT EXISTS sauti;

CREATE TABLE IF NOT EXISTS sauti.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_subject text UNIQUE,
    handle text NOT NULL UNIQUE,
    display_name text,
    account_status text NOT NULL DEFAULT 'active'
        CHECK (account_status IN ('active', 'suspended', 'deleted')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (handle ~ '^[A-Za-z0-9_.-]{2,30}$')
);

CREATE TABLE IF NOT EXISTS sauti.phone_number_refs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lookup_fingerprint bytea NOT NULL UNIQUE,
    encrypted_e164 bytea NOT NULL,
    masked_display text NOT NULL,
    encryption_key_version text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    CHECK (octet_length(lookup_fingerprint) = 32),
    CHECK (masked_display LIKE '+254 %'),
    CHECK (expires_at IS NULL OR expires_at > created_at)
);

CREATE TABLE IF NOT EXISTS sauti.reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id uuid REFERENCES sauti.users(id) ON DELETE SET NULL,
    phone_number_ref_id uuid REFERENCES sauti.phone_number_refs(id) ON DELETE SET NULL,
    source_kind text NOT NULL DEFAULT 'community'
        CHECK (source_kind IN ('community', 'main_site')),
    source_system text,
    source_detection_id text,
    scam_type text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    tactic_summary text,
    moderation_status text NOT NULL DEFAULT 'pending'
        CHECK (moderation_status IN ('pending', 'published', 'hidden', 'removed')),
    fictional_demo boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (length(trim(scam_type)) BETWEEN 1 AND 100),
    CHECK (length(trim(title)) BETWEEN 1 AND 160),
    CHECK (length(trim(description)) BETWEEN 1 AND 5000),
    CHECK (
        (source_kind = 'community' AND source_system IS NULL AND source_detection_id IS NULL)
        OR
        (source_kind = 'main_site' AND source_system IS NOT NULL AND source_detection_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS reports_source_detection_unique
    ON sauti.reports (source_system, source_detection_id)
    WHERE source_kind = 'main_site';
CREATE INDEX IF NOT EXISTS reports_feed_idx
    ON sauti.reports (created_at DESC, id)
    WHERE moderation_status = 'published';
CREATE INDEX IF NOT EXISTS reports_scam_type_idx
    ON sauti.reports (scam_type, created_at DESC)
    WHERE moderation_status = 'published';
CREATE INDEX IF NOT EXISTS reports_phone_ref_idx
    ON sauti.reports (phone_number_ref_id)
    WHERE phone_number_ref_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reports_moderation_queue_idx
    ON sauti.reports (created_at)
    WHERE moderation_status = 'pending';

CREATE TABLE IF NOT EXISTS sauti.report_votes (
    report_id uuid NOT NULL REFERENCES sauti.reports(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES sauti.users(id) ON DELETE CASCADE,
    vote smallint NOT NULL CHECK (vote IN (-1, 1)),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (report_id, user_id)
);
CREATE INDEX IF NOT EXISTS report_votes_user_idx
    ON sauti.report_votes (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sauti.comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id uuid NOT NULL REFERENCES sauti.reports(id) ON DELETE CASCADE,
    author_id uuid REFERENCES sauti.users(id) ON DELETE SET NULL,
    parent_comment_id uuid,
    body text NOT NULL,
    moderation_status text NOT NULL DEFAULT 'published'
        CHECK (moderation_status IN ('published', 'hidden', 'removed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (length(trim(body)) BETWEEN 1 AND 2000),
    UNIQUE (id, report_id),
    FOREIGN KEY (parent_comment_id, report_id)
        REFERENCES sauti.comments(id, report_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS comments_report_feed_idx
    ON sauti.comments (report_id, created_at)
    WHERE moderation_status = 'published';

CREATE TABLE IF NOT EXISTS sauti.roast_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id uuid REFERENCES sauti.users(id) ON DELETE SET NULL,
    title text NOT NULL,
    body text NOT NULL,
    tactic_label text NOT NULL,
    moderation_status text NOT NULL DEFAULT 'pending'
        CHECK (moderation_status IN ('pending', 'published', 'hidden', 'removed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (length(trim(title)) BETWEEN 1 AND 120),
    CHECK (length(trim(body)) BETWEEN 1 AND 1000),
    CHECK (length(trim(tactic_label)) BETWEEN 1 AND 120)
);
CREATE INDEX IF NOT EXISTS roast_posts_feed_idx
    ON sauti.roast_posts (created_at DESC)
    WHERE moderation_status = 'published';

CREATE TABLE IF NOT EXISTS sauti.roast_reactions (
    roast_post_id uuid NOT NULL REFERENCES sauti.roast_posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES sauti.users(id) ON DELETE CASCADE,
    reaction text NOT NULL DEFAULT 'laugh'
        CHECK (reaction IN ('laugh', 'useful')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (roast_post_id, user_id, reaction)
);

CREATE TABLE IF NOT EXISTS sauti.report_flags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id uuid NOT NULL REFERENCES sauti.reports(id) ON DELETE CASCADE,
    reporter_id uuid REFERENCES sauti.users(id) ON DELETE SET NULL,
    reason text NOT NULL
        CHECK (reason IN ('personal_information', 'false_information', 'harassment', 'spam', 'other')),
    details text,
    status text NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    CHECK (details IS NULL OR length(details) <= 2000)
);
CREATE UNIQUE INDEX IF NOT EXISTS report_flags_user_unique
    ON sauti.report_flags (report_id, reporter_id)
    WHERE reporter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS report_flags_queue_idx
    ON sauti.report_flags (created_at)
    WHERE status IN ('open', 'reviewing');

CREATE TABLE IF NOT EXISTS sauti.weekly_highlights (
    week_start date PRIMARY KEY,
    report_id uuid NOT NULL REFERENCES sauti.reports(id) ON DELETE RESTRICT,
    selected_by uuid REFERENCES sauti.users(id) ON DELETE SET NULL,
    note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (extract(isodow FROM week_start) = 1)
);

CREATE TABLE IF NOT EXISTS sauti.moderation_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    moderator_id uuid REFERENCES sauti.users(id) ON DELETE SET NULL,
    subject_type text NOT NULL CHECK (subject_type IN ('report', 'comment', 'roast', 'phone_number')),
    subject_id uuid NOT NULL,
    action text NOT NULL CHECK (action IN ('publish', 'hide', 'remove', 'restore', 'redact')),
    reason text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (length(trim(reason)) BETWEEN 1 AND 2000)
);
CREATE INDEX IF NOT EXISTS moderation_actions_subject_idx
    ON sauti.moderation_actions (subject_type, subject_id, created_at DESC);

-- Lookup contract:
-- 1. Application normalizes input to +2547XXXXXXXX or +2541XXXXXXXX.
-- 2. Application computes HMAC-SHA-256(canonical_number, secret_pepper).
-- 3. Query by lookup_fingerprint; return masked_display and published reports only.
-- Never return encrypted_e164, lookup_fingerprint, or the encryption key to clients.
-- Keep the HMAC pepper and decryption keys outside the database (KMS/secret manager).
