# Twilio Omni Dashboard (Calls + Conversations)

Custom “CTM-like” dashboard starter that brings Twilio Voice (calls), TaskRouter (queues/agent states), and Conversations/Messaging (SMS/WhatsApp/web chat) into one modern UI.

## What you get
- Live calls board (ringing / answered / in-progress)
- Agent presence (Ready + Not Ready aux codes)
- Call detail panel (contact card + transcript + AI summary placeholders)
- Conversations inbox UI (token-based; wire to your channels)
- Backend webhooks + realtime updates (Socket.IO)
- SQLite persistence (easy local dev)

## Prereqs (Twilio Console)
You’ll need to create/collect these SIDs and configure webhooks:
- Account SID + Auth Token
- API Key SID + API Key Secret
- TwiML App (Voice) + set its Voice URL to your backend
- TaskRouter Workspace + Workflow + (optional) TaskQueue(s)
- Conversations Service (if using messaging threads)

## Setup
1) Backend env:
   - Copy `backend/.env.example` to `backend/.env` and fill values.
2) Frontend env:
   - Copy `frontend/.env.example` to `frontend/.env` and set backend URL.
3) Install + run:
   - Backend: `cd backend` then `npm.cmd install` then `npm.cmd run dev`
   - Frontend: `cd frontend` then `npm.cmd install` then `npm.cmd run dev`
4) (Optional) Seed a sample contact:
   - `cd backend` then `npm.cmd run seed`

## Cloudflare deployment
Use the Cloudflare Workers + D1 backend in `cf-backend` and deploy the UI to Cloudflare Pages.
Steps: see `CLOUDFLARE_DEPLOY.md`.

## Local URLs
- Backend: http://localhost:8787
- Frontend: http://localhost:5173

## Twilio webhook endpoints (backend)
- Voice inbound (TwiML): `POST /api/twilio/voice/inbound`
- Voice outbound (TwiML App Voice URL): `POST /api/twilio/voice/outbound`
- Voice status callback: `POST /api/twilio/voice/status`
- TaskRouter assignment callback: `POST /api/twilio/taskrouter/assignment`
- Messaging inbound (SMS): `POST /api/twilio/messaging/inbound`

## Notes
- This project is a starter: Twilio Console wiring (Workflow SIDs, callback URLs, worker attributes) must match your account.
- AI summary/transcription hooks are provided as placeholders; plug in your chosen transcription + LLM pipeline.
 - TaskRouter details: see `TASKROUTER_SETUP.md`.

## Minimal Twilio wiring checklist (custom dashboard)
1) **TwiML App**: set the Voice URL to `POST {PUBLIC_BASE_URL}/api/twilio/voice/outbound`
2) **Phone Number (Voice)**: point the incoming call webhook to `POST {PUBLIC_BASE_URL}/api/twilio/voice/inbound`
3) **TaskRouter Workflow**: set Assignment Callback URL to `POST {PUBLIC_BASE_URL}/api/twilio/taskrouter/assignment`
4) **(Optional) Call status callbacks**: set to `POST {PUBLIC_BASE_URL}/api/twilio/voice/status`
5) **SMS webhook** (if using basic SMS): point “A message comes in” to `POST {PUBLIC_BASE_URL}/api/twilio/messaging/inbound`
