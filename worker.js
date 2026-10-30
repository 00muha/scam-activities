const encoder = new TextEncoder();
const MAX_BODY_BYTES = 20_000;
const PUBLIC_REPORT_SELECT = `
  SELECT
    r.id, r.title, r.scam_type AS scamType, r.description, r.tactic_summary AS pattern,
    r.created_at AS createdAt, r.source_kind AS sourceKind, r.source_system AS sourceSystem,
    p.masked_display AS phoneNumber,
    COALESCE((SELECT SUM(v.vote = 1) FROM report_votes v WHERE v.report_id = r.id), 0) AS upvotes,
    COALESCE((SELECT SUM(v.vote = -1) FROM report_votes v WHERE v.report_id = r.id), 0) AS downvotes,
    COALESCE((SELECT COUNT(*) FROM report_flags f WHERE f.report_id = r.id AND f.status != 'dismissed'), 0) AS reportCount,
    COALESCE((SELECT COUNT(*) FROM comments c WHERE c.report_id = r.id AND c.moderation_status = 'published'), 0) AS commentCount
  FROM reports r
  LEFT JOIN phone_number_refs p ON p.id = r.phone_number_ref_id
`;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function originIsAllowed(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  const currentOrigin = new URL(request.url).origin;
  return origin === currentOrigin || allowedOrigins(env).includes(origin);
}

function jsonResponse(request, env, data, status = 200, extraHeaders = {}) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders
  });
  const origin = request.headers.get("Origin");
  if (origin && originIsAllowed(request, env)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function requireAllowedOrigin(request, env) {
  if (!originIsAllowed(request, env)) throw new HttpError(403, "This website is not allowed to use the SAUTI API.");
}

function requireBearer(request, secret, message) {
  if (!secret) throw new HttpError(503, "This API credential is not configured.");
  const supplied = request.headers.get("Authorization") || "";
  const expected = `Bearer ${secret}`;
  if (!constantTimeEqual(supplied, expected)) throw new HttpError(401, message);
}

function constantTimeEqual(first, second) {
  if (first.length !== second.length) return false;
  let mismatch = 0;
  for (let index = 0; index < first.length; index += 1) mismatch |= first.charCodeAt(index) ^ second.charCodeAt(index);
  return mismatch === 0;
}

function normalizeKenyanNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (/^0[17]\d{8}$/.test(digits)) return `+254${digits.slice(1)}`;
  if (/^[17]\d{8}$/.test(digits)) return `+254${digits}`;
  if (/^254[17]\d{8}$/.test(digits)) return `+${digits}`;
  return "";
}

function maskNumber(e164) {
  const national = e164.slice(4);
  return `+254 ${national[0]}•• ••• ${national.slice(-3)}`;
}

function validateText(value, field, max, required = true) {
  if (typeof value !== "string") {
    if (!required && (value === undefined || value === null)) return "";
    throw new HttpError(400, `${field} must be text.`);
  }
  const text = value.trim();
  if ((!text && required) || text.length > max) throw new HttpError(400, `${field} must be ${required ? "non-empty and " : ""}at most ${max} characters.`);
  return text;
}

async function readJson(request) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_BYTES) throw new HttpError(413, "Request body is too large.");
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Expected object");
    return body;
  } catch {
    throw new HttpError(400, "Send a valid JSON object.");
  }
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  let binary;
  try {
    binary = atob(value);
  } catch {
    throw new HttpError(503, "PHONE_ENCRYPTION_KEY must be valid base64.");
  }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmacHex(value, secret) {
  if (!secret) throw new HttpError(503, "Phone lookup security is not configured.");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToHex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function encryptPhone(e164, env) {
  if (!env.PHONE_ENCRYPTION_KEY) throw new HttpError(503, "Phone encryption is not configured.");
  const rawKey = base64ToBytes(env.PHONE_ENCRYPTION_KEY);
  if (rawKey.byteLength !== 32) throw new HttpError(503, "PHONE_ENCRYPTION_KEY must decode to 32 bytes.");
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(e164));
  return { ciphertext: bytesToBase64(ciphertext), iv: bytesToBase64(iv) };
}

async function savePhoneNumber(db, env, rawNumber) {
  if (!rawNumber) return null;
  const e164 = normalizeKenyanNumber(rawNumber);
  if (!e164) throw new HttpError(400, "Enter a Kenyan mobile number in 07…, 01…, 7…, 1…, or +254… format.");
  const fingerprint = await hmacHex(e164, env.PHONE_LOOKUP_HMAC_KEY);
  const existing = await db.prepare("SELECT id FROM phone_number_refs WHERE lookup_fingerprint = ?").bind(fingerprint).first();
  if (existing) return existing.id;

  const encrypted = await encryptPhone(e164, env);
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT OR IGNORE INTO phone_number_refs
      (id, lookup_fingerprint, encrypted_e164, encryption_iv, masked_display, encryption_key_version)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    fingerprint,
    encrypted.ciphertext,
    encrypted.iv,
    maskNumber(e164),
    String(env.PHONE_ENCRYPTION_KEY_VERSION || "1").slice(0, 40)
  ).run();
  const saved = await db.prepare("SELECT id FROM phone_number_refs WHERE lookup_fingerprint = ?").bind(fingerprint).first();
  if (!saved) throw new HttpError(500, "Could not save the protected phone reference.");
  return saved.id;
}

async function verifyTurnstile(request, env, token) {
  if (!env.TURNSTILE_SECRET) throw new HttpError(503, "Community posting is not configured yet.");
  if (typeof token !== "string" || token.length < 10 || token.length > 4096) throw new HttpError(400, "Complete the anti-abuse check first.");
  const form = new FormData();
  form.set("secret", env.TURNSTILE_SECRET);
  form.set("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) form.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  if (!response.ok) throw new HttpError(502, "Could not verify the anti-abuse check.");
  const result = await response.json();
  if (!result.success) throw new HttpError(403, "The anti-abuse check was not accepted.");
}

async function anonymousActorKey(request, env) {
  if (!env.ACTOR_HMAC_KEY) throw new HttpError(503, "Anonymous interaction protection is not configured.");
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const userAgent = (request.headers.get("User-Agent") || "").slice(0, 256);
  return hmacHex(`${ip}\n${userAgent}`, env.ACTOR_HMAC_KEY);
}

async function getPublicReports(db, { phoneRefId = "", search = "", scamType = "", sort = "newest", limit = 30 } = {}) {
  const conditions = ["r.moderation_status = 'published'"];
  const bindings = [];
  if (phoneRefId) {
    conditions.push("r.phone_number_ref_id = ?");
    bindings.push(phoneRefId);
  }
  if (search) {
    conditions.push("(r.title LIKE ? OR r.scam_type LIKE ? OR r.description LIKE ?)");
    const term = `%${search.slice(0, 100)}%`;
    bindings.push(term, term, term);
  }
  if (scamType) {
    conditions.push("r.scam_type = ?");
    bindings.push(scamType.slice(0, 100));
  }
  const orderBy = sort === "popular"
    ? "upvotes - downvotes DESC, r.created_at DESC"
    : sort === "reported"
      ? "reportCount DESC, r.created_at DESC"
      : "r.created_at DESC";
  const query = `${PUBLIC_REPORT_SELECT} WHERE ${conditions.join(" AND ")} ORDER BY ${orderBy} LIMIT ?`;
  bindings.push(Math.max(1, Math.min(Number(limit) || 30, 50)));
  const result = await db.prepare(query).bind(...bindings).all();
  return result.results || [];
}

async function submitCommunityReport(request, env, db) {
  requireAllowedOrigin(request, env);
  const body = await readJson(request);
  await verifyTurnstile(request, env, body.turnstileToken);
  const title = validateText(body.title, "title", 160);
  const scamType = validateText(body.scamType || "Other scam tactic", "scamType", 100);
  const description = validateText(body.description, "description", 5000);
  const tacticSummary = validateText(body.tacticSummary, "tacticSummary", 300, false);
  const phoneRefId = await savePhoneNumber(db, env, body.phoneNumber);
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO reports (id, phone_number_ref_id, source_kind, scam_type, title, description, tactic_summary, moderation_status)
    VALUES (?, ?, 'community', ?, ?, ?, ?, 'pending')
  `).bind(id, phoneRefId, scamType, title, description, tacticSummary || null).run();
  return { id, status: "pending_review" };
}

async function registerMainSiteDetection(request, env, db) {
  requireBearer(request, env.MAIN_SITE_API_KEY, "Main-site API key is invalid.");
  const body = await readJson(request);
  const detectionId = validateText(body.detectionId || body.id, "detectionId", 160);
  const scamType = validateText(body.scamType || body.type || "Scam detected", "scamType", 100);
  const title = validateText(body.title || `${scamType} alert`, "title", 160);
  const description = validateText(body.description || body.summary || "Detected by the connected main website.", "description", 5000);
  const tacticSummary = validateText(body.tacticSummary, "tacticSummary", 300, false);
  const phoneRefId = await savePhoneNumber(db, env, body.phoneNumber);
  const sourceSystem = String(env.MAIN_SITE_NAME || "main-site").slice(0, 80);
  const id = crypto.randomUUID();

  await db.prepare(`
    INSERT INTO reports
      (id, phone_number_ref_id, source_kind, source_system, source_detection_id, scam_type, title, description, tactic_summary, moderation_status)
    VALUES (?, ?, 'main_site', ?, ?, ?, ?, ?, ?, 'pending')
    ON CONFLICT(source_system, source_detection_id) DO NOTHING
  `).bind(id, phoneRefId, sourceSystem, detectionId, scamType, title, description, tacticSummary || null).run();
  const saved = await db.prepare("SELECT id, moderation_status AS status FROM reports WHERE source_system = ? AND source_detection_id = ?").bind(sourceSystem, detectionId).first();
  if (!saved) throw new HttpError(500, "Could not register the detection.");
  return { id: saved.id, status: saved.status, duplicate: saved.id !== id };
}

async function createComment(request, env, db, reportId) {
  requireAllowedOrigin(request, env);
  const body = await readJson(request);
  await verifyTurnstile(request, env, body.turnstileToken);
  const report = await db.prepare("SELECT id FROM reports WHERE id = ? AND moderation_status = 'published'").bind(reportId).first();
  if (!report) throw new HttpError(404, "Published report not found.");
  const text = validateText(body.body, "body", 2000);
  const parentId = body.parentCommentId ? validateText(body.parentCommentId, "parentCommentId", 80) : null;
  if (parentId) {
    const parent = await db.prepare("SELECT id FROM comments WHERE id = ? AND report_id = ? AND moderation_status = 'published'").bind(parentId, reportId).first();
    if (!parent) throw new HttpError(400, "Reply target is not a published comment on this report.");
  }
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO comments (id, report_id, author_label, parent_comment_id, body, moderation_status)
    VALUES (?, ?, 'Community member', ?, ?, 'pending')
  `).bind(id, reportId, parentId, text).run();
  return { id, status: "pending_review" };
}

async function castVote(request, env, db, reportId) {
  requireAllowedOrigin(request, env);
  const body = await readJson(request);
  await verifyTurnstile(request, env, body.turnstileToken);
  const vote = Number(body.vote);
  if (vote !== 1 && vote !== -1) throw new HttpError(400, "vote must be 1 or -1.");
  const report = await db.prepare("SELECT id FROM reports WHERE id = ? AND moderation_status = 'published'").bind(reportId).first();
  if (!report) throw new HttpError(404, "Published report not found.");
  const voterKey = await anonymousActorKey(request, env);
  await db.prepare(`
    INSERT INTO report_votes (report_id, voter_key, vote)
    VALUES (?, ?, ?)
    ON CONFLICT(report_id, voter_key) DO UPDATE SET vote = excluded.vote, updated_at = datetime('now')
  `).bind(reportId, voterKey, vote).run();
  return { ok: true };
}

async function flagReport(request, env, db, reportId) {
  requireAllowedOrigin(request, env);
  const body = await readJson(request);
  await verifyTurnstile(request, env, body.turnstileToken);
  const reason = validateText(body.reason, "reason", 40);
  const allowedReasons = new Set(["personal_information", "false_information", "harassment", "spam", "other"]);
  if (!allowedReasons.has(reason)) throw new HttpError(400, "Unsupported report flag reason.");
  const details = validateText(body.details, "details", 2000, false);
  const reporterKey = await anonymousActorKey(request, env);
  await db.prepare(`
    INSERT INTO report_flags (id, report_id, reporter_key, reason, details)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(report_id, reporter_key) DO NOTHING
  `).bind(crypto.randomUUID(), reportId, reporterKey, reason, details || null).run();
  return { ok: true };
}

async function createRoast(request, env, db) {
  requireAllowedOrigin(request, env);
  const body = await readJson(request);
  await verifyTurnstile(request, env, body.turnstileToken);
  const title = validateText(body.title, "title", 120);
  const text = validateText(body.body, "body", 1000);
  const tacticLabel = validateText(body.tacticLabel, "tacticLabel", 120);
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO roast_posts (id, author_label, title, body, tactic_label, moderation_status)
    VALUES (?, 'Community member', ?, ?, ?, 'pending')
  `).bind(id, title, text, tacticLabel).run();
  return { id, status: "pending_review" };
}

async function moderateContent(request, env, db, kind, id) {
  requireBearer(request, env.ADMIN_API_KEY, "Admin API key is invalid.");
  const body = await readJson(request);
  const status = validateText(body.status, "status", 20);
  const allowedStatuses = new Set(["published", "hidden", "removed"]);
  if (!allowedStatuses.has(status)) throw new HttpError(400, "status must be published, hidden, or removed.");
  const tableConfig = {
    reports: { table: "reports", type: "report" },
    comments: { table: "comments", type: "comment" },
    roasts: { table: "roast_posts", type: "roast" }
  }[kind];
  if (!tableConfig) throw new HttpError(404, "Moderation endpoint not found.");
  const item = await db.prepare(`SELECT id FROM ${tableConfig.table} WHERE id = ?`).bind(id).first();
  if (!item) throw new HttpError(404, "Item not found.");
  const reason = validateText(body.reason || `Set status to ${status}`, "reason", 2000);
  await db.batch([
    db.prepare(`UPDATE ${tableConfig.table} SET moderation_status = ?, updated_at = datetime('now') WHERE id = ?`).bind(status, id),
    db.prepare(`INSERT INTO moderation_actions (id, subject_type, subject_id, action, reason) VALUES (?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), tableConfig.type, id, status === "published" ? "publish" : status === "removed" ? "remove" : "hide", reason)
  ]);
  return { id, status };
}

async function route(request, env) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (method === "OPTIONS") {
    requireAllowedOrigin(request, env);
      return new Response(null, { status: 204, headers: new Headers({
        "Access-Control-Allow-Origin": request.headers.get("Origin") || new URL(request.url).origin,
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin"
      })});
  }
  if (path === "/api/health" && method === "GET") return jsonResponse(request, env, { ok: true, service: "sauti-api" });
  if (!env.DB) throw new HttpError(503, "D1 binding DB is not configured.");

  if (path === "/api/reports" && method === "GET") {
    const reports = await getPublicReports(env.DB, {
      search: url.searchParams.get("q") || "",
      scamType: url.searchParams.get("type") || "",
      sort: url.searchParams.get("sort") || "newest",
      limit: url.searchParams.get("limit") || 30
    });
    return jsonResponse(request, env, { reports });
  }

  if (path === "/api/reports" && method === "POST") {
    const result = await submitCommunityReport(request, env, env.DB);
    return jsonResponse(request, env, result, 201);
  }

  if (path === "/api/numbers" && method === "GET") {
    const e164 = normalizeKenyanNumber(url.searchParams.get("number"));
    if (!e164) throw new HttpError(400, "Provide a valid Kenyan mobile number.");
    const fingerprint = await hmacHex(e164, env.PHONE_LOOKUP_HMAC_KEY);
    const phone = await env.DB.prepare("SELECT id, masked_display FROM phone_number_refs WHERE lookup_fingerprint = ?").bind(fingerprint).first();
    if (!phone) return jsonResponse(request, env, { found: false, number: maskNumber(e164), reports: [] });
    const reports = await getPublicReports(env.DB, { phoneRefId: phone.id, sort: "newest", limit: 50 });
    return jsonResponse(request, env, { found: reports.length > 0, number: phone.masked_display, reports });
  }

  if (path === "/api/detections" && method === "POST") {
    const result = await registerMainSiteDetection(request, env, env.DB);
    return jsonResponse(request, env, result, result.duplicate ? 200 : 201);
  }

  if (path === "/api/roasts" && method === "GET") {
    const result = await env.DB.prepare(`
      SELECT id, author_label AS author, title, body, tactic_label AS tacticLabel, created_at AS createdAt,
        (SELECT COUNT(*) FROM roast_reactions rr WHERE rr.roast_post_id = rp.id AND rr.reaction = 'laugh') AS laughs
      FROM roast_posts rp WHERE moderation_status = 'published' ORDER BY created_at DESC LIMIT 50
    `).all();
    return jsonResponse(request, env, { roasts: result.results || [] });
  }
  if (path === "/api/roasts" && method === "POST") {
    return jsonResponse(request, env, await createRoast(request, env, env.DB), 201);
  }

  const reportComments = path.match(/^\/api\/reports\/([A-Za-z0-9-]+)\/comments$/);
  if (reportComments && method === "GET") {
    const report = await env.DB.prepare("SELECT id FROM reports WHERE id = ? AND moderation_status = 'published'").bind(reportComments[1]).first();
    if (!report) throw new HttpError(404, "Published report not found.");
    const result = await env.DB.prepare(`
      SELECT id, author_label AS author, parent_comment_id AS parentCommentId, body, created_at AS createdAt
      FROM comments WHERE report_id = ? AND moderation_status = 'published' ORDER BY created_at ASC
    `).bind(reportComments[1]).all();
    return jsonResponse(request, env, { comments: result.results || [] });
  }
  if (reportComments && method === "POST") {
    return jsonResponse(request, env, await createComment(request, env, env.DB, reportComments[1]), 201);
  }

  const reportVote = path.match(/^\/api\/reports\/([A-Za-z0-9-]+)\/votes$/);
  if (reportVote && method === "POST") return jsonResponse(request, env, await castVote(request, env, env.DB, reportVote[1]));
  const reportFlag = path.match(/^\/api\/reports\/([A-Za-z0-9-]+)\/flags$/);
  if (reportFlag && method === "POST") return jsonResponse(request, env, await flagReport(request, env, env.DB, reportFlag[1]));

  const adminQueue = path === "/api/admin/reports" && method === "GET";
  if (adminQueue) {
    requireBearer(request, env.ADMIN_API_KEY, "Admin API key is invalid.");
    const status = url.searchParams.get("status") || "pending";
    if (!["pending", "published", "hidden", "removed"].includes(status)) throw new HttpError(400, "Unsupported moderation status.");
    const result = await env.DB.prepare(`${PUBLIC_REPORT_SELECT} WHERE r.moderation_status = ? ORDER BY r.created_at ASC LIMIT 100`).bind(status).all();
    return jsonResponse(request, env, { reports: result.results || [] });
  }
  const adminModeration = path.match(/^\/api\/admin\/(reports|comments|roasts)\/([A-Za-z0-9-]+)$/);
  if (adminModeration && method === "PATCH") {
    const result = await moderateContent(request, env, env.DB, adminModeration[1], adminModeration[2]);
    return jsonResponse(request, env, result);
  }

  throw new HttpError(404, "Endpoint not found.");
}

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (!(error instanceof HttpError)) console.error("SAUTI Worker request failed", error?.name || "Error");
      return jsonResponse(request, env, { error: status === 500 ? "Internal server error." : error.message }, status);
    }
  }
};