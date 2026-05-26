// Minimal Twilio Access Token (JWT) generator for Cloudflare Workers.
// Voice grant JSON shape must match Twilio Voice SDK expectations:
// - grants.voice.incoming.allow = true
// - grants.voice.outgoing.application_sid = APxxxx

export async function signTwilioAccessToken({
  accountSid,
  apiKeySid,
  apiKeySecret,
  identity,
  ttlSeconds = 3600,
  grants
}: {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  identity: string;
  ttlSeconds?: number;
  grants: Record<string, unknown>;
}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT", cty: "twilio-fpa;v=1" };
  const payload = {
    jti: `${apiKeySid}-${now}`,
    iss: apiKeySid,
    sub: accountSid,
    exp: now + ttlSeconds,
    grants: { identity, ...grants }
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const sig = await hmacSha256(signingInput, apiKeySecret);
  return `${signingInput}.${sig}`;
}

export function voiceGrants({ twimlAppSid }: { twimlAppSid: string }) {
  return {
    voice: {
      incoming: { allow: true },
      outgoing: { application_sid: twimlAppSid }
    }
  };
}

export function conversationsGrants({ serviceSid }: { serviceSid?: string }) {
  // Twilio Conversations SDK expects a ChatGrant (service-scoped).
  // If serviceSid is omitted, some setups may fail with authorization errors.
  return serviceSid ? { chat: { service_sid: serviceSid } } : { chat: {} };
}

async function hmacSha256(input: string, secret: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(input));
  return base64UrlEncodeBytes(new Uint8Array(sig));
}

function base64UrlEncode(value: string) {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlEncodeBytes(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = btoa(binary);
  return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
