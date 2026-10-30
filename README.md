# SAUTI Community Lab

A standalone, static community prototype for scam-awareness conversations and Kenyan mobile-number lookup. It is intentionally separate from any existing scam-detection site and uses only HTML, CSS, and JavaScript.

## Run

Open `index.html` directly in a browser. No build step or package install is required. Google Fonts are loaded remotely; the page falls back to system sans-serif fonts if they are unavailable.

## PostgreSQL schema

The relational database schema is in [database/schema.sql](database/schema.sql). It targets PostgreSQL 13+ and can be applied with:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/schema.sql
```

The application must normalize Kenyan numbers and compute an HMAC-SHA-256 fingerprint using a secret pepper held outside the database. Encrypt the canonical number with an application/KMS-managed key before inserting it into `sauti.phone_number_refs`; store only the masked display value for client responses. To find associated reports, query the fingerprint and then select published reports by `phone_number_ref_id`. Never send the encrypted number or fingerprint to browsers.

The schema includes user accounts, reports and main-site detection deduplication, protected number references, report votes, threaded comments, roast posts and reactions, user flags, moderation actions, and weekly highlights. Configure database roles and grant only the needed table/column access to the application; the schema does not create database credentials or enforce row-level security by itself.

## Cloudflare Workers + D1

For Cloudflare, use [database/schema.d1.sql](database/schema.d1.sql) and [worker.js](worker.js). D1 uses SQLite, so do not apply the PostgreSQL `database/schema.sql` file to D1. [wrangler.toml.example](wrangler.toml.example) is the configuration template.

1. Install Wrangler and sign in:

	```sh
	npm install --save-dev wrangler
	npx wrangler login
	```

2. Create the D1 database and copy the returned ID into a local `wrangler.toml` copied from the example:

	```sh
	npx wrangler d1 create sauti-db
	cp wrangler.toml.example wrangler.toml
	```

	Replace `REPLACE_WITH_D1_DATABASE_ID`; set `ALLOWED_ORIGINS` to the exact HTTPS origins of the deployed community site and main site. Do not commit `wrangler.toml` if it contains private environment values.

3. Apply the D1 schema locally, then remotely:

	```sh
	npx wrangler d1 execute sauti-db --local --file=database/schema.d1.sql
	npx wrangler d1 execute sauti-db --remote --file=database/schema.d1.sql
	```

4. Create the Cloudflare Turnstile widget for community writes. Add its **site key** to the community frontend and submit the returned `turnstileToken` with report, comment, vote, flag, and roast requests. The matching secret belongs only in Worker secrets.

5. Add secrets interactively. Generate each random secret locally (for example, `openssl rand -base64 32`) and paste it at the Wrangler prompt; never put these values in source code or send them through chat:

	```sh
	npx wrangler secret put PHONE_LOOKUP_HMAC_KEY
	npx wrangler secret put PHONE_ENCRYPTION_KEY
	npx wrangler secret put ACTOR_HMAC_KEY
	npx wrangler secret put TURNSTILE_SECRET
	npx wrangler secret put MAIN_SITE_API_KEY
	npx wrangler secret put ADMIN_API_KEY
	```

	`PHONE_ENCRYPTION_KEY` must be base64 encoding of exactly 32 random bytes. Use different random values for each secret. Keep backups of encryption keys in a secure key manager; losing the key means encrypted stored phone numbers cannot be recovered.

6. Deploy and check health:

	```sh
	npx wrangler deploy
	curl https://YOUR-WORKER.workers.dev/api/health
	```

7. Connect the main detector **server-to-server**. Keep `MAIN_SITE_API_KEY` on the main site's backend, not in browser JavaScript:

	```js
	await fetch(`${SAUTI_API_URL}/api/detections`, {
	  method: "POST",
	  headers: {
		 "Authorization": `Bearer ${process.env.SAUTI_MAIN_SITE_API_KEY}`,
		 "Content-Type": "application/json"
	  },
	  body: JSON.stringify({
		 detectionId: detectorResult.id,
		 scamType: detectorResult.type,
		 title: detectorResult.title,
		 description: detectorResult.summary,
		 phoneNumber: detectorResult.phoneNumber
	  })
	});
	```

	`detectionId` makes retries idempotent. Detections are stored as `pending` until approved, so they will not appear in public search/feed until a moderator publishes them.

8. Review pending detections/reports with `GET /api/admin/reports` and publish one with `PATCH /api/admin/reports/REPORT_ID`, JSON body `{"status":"published","reason":"Reviewed"}`, and the `ADMIN_API_KEY` bearer token. Keep this key in an admin backend or secure operator environment.

The Worker provides `GET /api/reports`, `GET /api/numbers?number=...`, community report submission, comments, votes, flags, roasts, main-site detections, and admin moderation. All public number values are masked. The static page still uses its local demo state until its forms are changed to call this API; deployment of the Worker alone does not connect the frontend.

Before public launch, configure Cloudflare rate-limiting rules for API reads/writes (especially number lookup), keep Turnstile enabled, set exact allowed origins, and test moderation/retention. The Worker does not log raw phone numbers, but Cloudflare platform analytics and any surrounding proxies should also be reviewed for query-string retention.

## Demo behavior

- Seed content in `app.js` includes ten fictional Kenya-relevant tactic reports, including fake hospital payment requests, Safaricom/M-Pesa impersonation, bank security calls, health-cover and tax refund lures, job fees, loan fees, and account takeover attempts.
- Search, category filters, sorting, votes, comments, report submission, and roast submission run in the browser.
- Kenyan number lookup accepts `07...`, `01...`, `7...`, `1...`, and `+254...` mobile formats. Displays use `+254 7xx xxx xxx` (without a domestic leading zero). The reported-number directory lists masked numbers and can browse associated reports, including after reload. Exact matching by a submitted number is only available in the current tab because full numbers are not persisted; the prototype is not connected to a phone-number database.
- Votes, comments, and submitted reports are stored in browser `localStorage` under `sauti-community-demo-v1` when available. Full numbers are not persisted; public report cards show only masked numbers. New number associations exist only in current-tab memory.
- The demo banner and report form identify sample content as fictional, show a caution that community reports are unverified, and discourage identifying details or confrontation.

## Backend integration points

SAUTI exposes `window.SAUTI.registerDetection(payload)` for the main detector. Call it when the detector returns a result in the same page. For two pages on the same origin, send the same payload using the `sauti-detections` `BroadcastChannel`; SAUTI must be open to receive it. Both routes accept arbitrary scam type labels.

```js
const detection = {
	detectionId: "det-unique-id",
	scamType: "Investment impersonation",
	title: "Unexpected investment account message",
	description: "The detector's short explanation of the warning signs.",
	phoneNumber: "+254 712 345 678"
};

// Same page:
window.SAUTI.registerDetection(detection);

// Separate pages on the same origin:
new BroadcastChannel("sauti-detections").postMessage(detection);
```

`detectionId` is used to avoid registering the same result twice. `phoneNumber` is optional; when supplied it must be a Kenyan mobile format. Full numbers are held only in current-tab memory and removed before local storage; SAUTI renders a masked value. The connected main site must explicitly send detections: this bridge does not discover or connect to another website automatically. Different origins require a shared backend/API with authentication and appropriate CORS, not `BroadcastChannel`.

Replace `loadState()` and `saveState()` in `app.js` with API-backed data loading and mutations for durable cross-device sharing. The number-search handler currently filters in-memory reports; replace it with a privacy-reviewed backend lookup endpoint. Keep full numbers out of public responses and logs, return masked display values, and apply access controls and retention limits. Keep the existing rendering functions as the presentation layer; report and comment objects are plain data records that can be mapped to database responses.

Suggested records:

- `Report`: `id`, `title`, `category`, `author`, `story`, `pattern`, `reports`, `up`, `down`, `createdAt`, `comments`, and a protected phone-number reference
- `Comment`: `author`, `text`, and a report reference
- `Roast`: `author`, `text`, `target`, and a reaction count

Before enabling public posting or number lookups, add authentication, server-side validation, abuse reporting, moderation, rate limits, a process for correcting/removing mistaken reports, and a clear privacy/retention policy for phone numbers. Frontend-only checks are not a moderation or security boundary. Do not treat community allegations as verified identity or proof of wrongdoing.