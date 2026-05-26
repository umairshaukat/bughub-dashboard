# Cloudflare deployment (recommended)

This repo includes:
- `cf-backend/`: Cloudflare Worker API (Hono) + Durable Object realtime events + D1 storage
- `frontend/`: React UI for Cloudflare Pages

## 1) Deploy the backend (Workers + D1 + Durable Objects)
From `cf-backend`:
1) Install:
   - `npm.cmd install`
2) Create a D1 database in Cloudflare (once):
   - `wrangler d1 create omni-dashboard`
3) Put the returned `database_id` into `cf-backend/wrangler.toml` under `[[d1_databases]]`.
4) Run schema migration:
   - `npm.cmd run db:migrate`
5) Set Worker secrets (Cloudflare dashboard or CLI):
   - `wrangler secret put TWILIO_ACCOUNT_SID`
   - `wrangler secret put TWILIO_AUTH_TOKEN`
   - `wrangler secret put TWILIO_API_KEY_SID`
   - `wrangler secret put TWILIO_API_KEY_SECRET`
   - `wrangler secret put TWILIO_TWIML_APP_SID`
   - `wrangler secret put TWILIO_TR_WORKSPACE_SID`
   - `wrangler secret put TWILIO_TR_WORKFLOW_SID`
   - (recommended) `wrangler secret put TWILIO_CONVERSATIONS_SERVICE_SID`
   - (optional) `wrangler secret put TWILIO_DEFAULT_FROM`
6) Set public vars in `cf-backend/wrangler.toml`:
   - `PUBLIC_BASE_URL` = your Worker URL (or custom domain)
   - `FRONTEND_ORIGIN` = your Pages URL
7) Deploy:
   - `npm.cmd run deploy`

Your API base is now your Worker URL, and realtime connects at:
- `GET /api/events/ws` (WebSocket)

## 2) Deploy the frontend (Cloudflare Pages)
Create a Pages project for `frontend/` with:
- Build command: `npm ci && npm run build`
- Output directory: `dist`

Add env vars in Pages:
- `VITE_BACKEND_URL` = your Worker URL (example: `https://twilio-omni-dashboard-api.<account>.workers.dev`)
- `VITE_REALTIME` = `ws`

## 3) Point Twilio webhooks to the Worker
Update Twilio Console to hit the Worker base URL:
- TwiML App Voice URL → `POST {PUBLIC_BASE_URL}/api/twilio/voice/outbound`
- Phone Number (Voice) incoming webhook → `POST {PUBLIC_BASE_URL}/api/twilio/voice/inbound`
- TaskRouter Workflow Assignment Callback URL → `POST {PUBLIC_BASE_URL}/api/twilio/taskrouter/assignment`
- (Optional) Call status callbacks → `POST {PUBLIC_BASE_URL}/api/twilio/voice/status`
- Messaging “A message comes in” → `POST {PUBLIC_BASE_URL}/api/twilio/messaging/inbound`

## 4) TaskRouter “ring browser agents” requirement
To make the browser ring, your Worker records must include `contact_uri` like:
```json
{ "contact_uri": "client:agent@example.com" }
```
And the agent must generate a Voice token with the same `identity`.

More details: `TASKROUTER_SETUP.md`.
