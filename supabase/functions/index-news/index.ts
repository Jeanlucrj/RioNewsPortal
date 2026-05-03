/**
 * Supabase Edge Function: index-news
 *
 * Triggered by a pg_net webhook on INSERT into public.noticias.
 * Receives { slug, titulo, categoria } and calls the Google Web Search
 * Indexing API to request immediate indexation of the article URL.
 *
 * Environment secrets required (set via `supabase secrets set`):
 *   GOOGLE_SERVICE_ACCOUNT_JSON  — full JSON from Google Cloud service account
 *   SUPABASE_SERVICE_ROLE_KEY    — injected automatically by Supabase runtime
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SITE_URL = "https://odiariocarioca.com.br";
const INDEXING_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const INDEXING_SCOPE = "https://www.googleapis.com/auth/indexing";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

interface WebhookPayload {
  slug: string;
  titulo?: string;
  categoria?: string;
  type?: "URL_UPDATED" | "URL_DELETED";
}

// ─── JWT RS256 signing (Web Crypto API — no external deps) ───────────────────

function base64url(data: ArrayBuffer | string): string {
  const bytes =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : new Uint8Array(data);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function createSignedJWT(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: INDEXING_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );

  const message = `${header}.${claims}`;

  // Strip PEM armor and decode
  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigBytes = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(message)
  );

  return `${message}.${base64url(sigBytes)}`;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const jwt = await createSignedJWT(sa);

  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const { access_token } = await resp.json();
  return access_token;
}

// ─── Google Indexing API call ────────────────────────────────────────────────

async function notifyGoogle(
  url: string,
  type: "URL_UPDATED" | "URL_DELETED" = "URL_UPDATED"
): Promise<{ success: boolean; message: string }> {
  const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!saJson) {
    return { success: false, message: "GOOGLE_SERVICE_ACCOUNT_JSON not configured" };
  }

  const sa: ServiceAccount = JSON.parse(saJson);
  const token = await getAccessToken(sa);

  const resp = await fetch(INDEXING_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url, type }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Indexing API error ${resp.status}: ${err}`);
  }

  const result = await resp.json();
  console.log(`✅ Indexed ${type}: ${url}`, result);
  return { success: true, message: `${type} sent for ${url}` };
}

// ─── Request handler ─────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify request comes from our Supabase project
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { slug, type = "URL_UPDATED" } = payload;
  if (!slug) {
    return new Response(JSON.stringify({ error: "slug is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const articleUrl = `${SITE_URL}/noticia/${slug}`;

  try {
    const result = await notifyGoogle(articleUrl, type);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ index-news error:", message);
    return new Response(JSON.stringify({ success: false, message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
