# TaskRouter setup (to prevent “everyone clicks answer” limbo)

This project uses `Enqueue(workflowSid=...)` + a TaskRouter Workflow. TaskRouter creates **one** reservation per eligible agent and ensures only **one** agent can accept the call.

## 1) Create Activities (aux codes)
Create these Worker Activities in your TaskRouter Workspace:
- `Ready`
- `Bathroom`
- `Customer Care`
- `Billing`
- `Meeting`
- `Lunch`
- `Sign Off`

Mark only `Ready` as **Available** (eligible for inbound calls).

## 2) Create Workers (agents)
For each agent Worker, set attributes to include a browser-call target:
```json
{
  "contact_uri": "client:agent@example.com"
}
```
The `contact_uri` must match the “identity” your dashboard uses for the Twilio Voice token.

## 3) Create a TaskQueue + Workflow
- TaskQueue: route tasks to Workers where `worker.activity_name == "Ready"` (or use the Available flag).
- Workflow: send all inbound call tasks to that TaskQueue.
- Workflow **Assignment Callback URL**: `POST {PUBLIC_BASE_URL}/api/twilio/taskrouter/assignment`

## 4) Wire inbound Voice to TaskRouter
Set your Twilio Number’s Voice webhook (or Studio flow) to:
- `POST {PUBLIC_BASE_URL}/api/twilio/voice/inbound`

This responds with TwiML that enqueues the call into your Workflow and attaches a JSON task payload.

## 5) Verify browser ringing
When TaskRouter assigns a call, your backend responds with `instruction: "dequeue"` and `to: <contact_uri>`.
That causes the agent’s browser (Twilio Voice SDK) to ring and show the Accept/Decline overlay.

