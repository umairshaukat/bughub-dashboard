import "dotenv/config";
import { nanoid } from "nanoid";
import { openDb } from "./db.js";

const db = openDb();

// ── Contacts ──────────────────────────────────────────────────────────────────
const contacts = [
  { name: "Maria Gonzalez",  phone: "+15550101001", address: "412 Elm Street, Houston TX 77001",        loc: "PP-100101" },
  { name: "David Patel",     phone: "+15550101002", address: "88 Oakwood Drive, Austin TX 78701",       loc: "PP-100102" },
  { name: "Sandra Kim",      phone: "+15550101003", address: "27 Birch Lane, Dallas TX 75201",          loc: "PP-100103" },
  { name: "Tom Nguyen",      phone: "+15550101004", address: "900 Magnolia Blvd, San Antonio TX 78201", loc: "PP-100104" },
  { name: "Rachel Moore",    phone: "+15550101005", address: "14 Cedar Court, Fort Worth TX 76101",     loc: "PP-100105" },
  { name: "James Ruiz",      phone: "+15550101006", address: "331 Pinewood Ave, El Paso TX 79901",      loc: "PP-100106" },
  { name: "Linda Chang",     phone: "+15550101007", address: "55 Willow Way, Plano TX 75023",           loc: "PP-100107" },
  { name: "Kevin Brooks",    phone: "+15550101008", address: "7 Sunrise Blvd, Arlington TX 76001",      loc: "PP-100108" },
];

const insertContact = db.prepare(
  `INSERT OR IGNORE INTO contacts (id, name, phone, address, pestpac_location_number)
   VALUES (?, ?, ?, ?, ?)`
);
for (const c of contacts) {
  insertContact.run(nanoid(), c.name, c.phone, c.address, c.loc);
}
console.log(`Seeded ${contacts.length} contacts.`);

// ── Calls ─────────────────────────────────────────────────────────────────────
const calls = [
  {
    callSid: "CA_DEMO_0001",
    direction: "inbound",
    from: "+15550101001",
    to: "+18005550100",
    status: "completed",
    answeredBy: "agent@bughub.com",
    duration: 312,
    startedAt: "2026-05-26T08:04:11Z",
    endedAt:   "2026-05-26T08:09:23Z",
    transcript: "Customer: Hi, I've got a serious cockroach problem in my kitchen. They're everywhere — under the sink, inside the cabinets. Agent: I'm sorry to hear that, Maria. Let me pull up your account. I can schedule a German cockroach treatment for this Thursday between 9 and 11 AM. Does that work? Customer: Yes, please. Agent: Great, I've booked it. Our tech will use a gel bait and IGR spray combo. You'll get a reminder text the day before.",
    aiSummary: "Customer reported heavy German cockroach infestation in kitchen. Scheduled treatment for Thursday 9–11 AM using gel bait + IGR spray. Reminder SMS to be sent.",
    disposition: "scheduled",
    score: 92,
  },
  {
    callSid: "CA_DEMO_0002",
    direction: "inbound",
    from: "+15550101002",
    to: "+18005550100",
    status: "completed",
    answeredBy: "agent@bughub.com",
    duration: 198,
    startedAt: "2026-05-26T09:15:00Z",
    endedAt:   "2026-05-26T09:18:18Z",
    transcript: "Customer: I found mud tubes along my foundation. I think I have termites. Agent: That does sound like subterranean termites, David. We'll need to do a full inspection first. I can get an inspector out Friday morning. Customer: Perfect. How long does the inspection take? Agent: About 45 minutes. If we find activity we'll recommend a Termidor barrier treatment same day if you'd like.",
    aiSummary: "Customer found mud tubes — suspected subterranean termites. Booked full inspection for Friday AM. Termidor barrier treatment offered contingent on findings.",
    disposition: "inspection_booked",
    score: 88,
  },
  {
    callSid: "CA_DEMO_0003",
    direction: "inbound",
    from: "+15550101003",
    to: "+18005550100",
    status: "completed",
    answeredBy: "agent2@bughub.com",
    duration: 145,
    startedAt: "2026-05-26T10:02:44Z",
    endedAt:   "2026-05-26T10:05:09Z",
    transcript: "Customer: There's a huge wasp nest under my deck. My kids can't go outside. Agent: Absolutely a safety issue, Sandra. We can get a technician out today — we have a 2 PM slot available. Customer: Today works great. Agent: Perfect. Our tech will remove the nest and treat the area with a residual insecticide to prevent rebuilding.",
    aiSummary: "Urgent wasp nest removal under deck. Same-day appointment booked for 2 PM. Residual treatment included to deter nest rebuilding.",
    disposition: "same_day",
    score: 95,
  },
  {
    callSid: "CA_DEMO_0004",
    direction: "outbound",
    from: "+18005550100",
    to: "+15550101004",
    status: "completed",
    answeredBy: null,
    duration: 87,
    startedAt: "2026-05-26T11:30:00Z",
    endedAt:   "2026-05-26T11:31:27Z",
    transcript: "Agent: Hi Tom, this is BugHub Pest Control calling to confirm your rodent exclusion appointment tomorrow at 10 AM. Please make sure the garage is accessible. Customer: Yes, I'll have it open. Is there anything else I need to do? Agent: Just keep pets away from the garage area for a few hours after treatment. We'll seal the entry points and place snap traps.",
    aiSummary: "Outbound confirmation call for rodent exclusion appointment tomorrow 10 AM. Customer to keep garage accessible. Pets away post-treatment reminder given.",
    disposition: "confirmed",
    score: 90,
  },
  {
    callSid: "CA_DEMO_0005",
    direction: "inbound",
    from: "+15550101005",
    to: "+18005550100",
    status: "completed",
    answeredBy: "agent@bughub.com",
    duration: 263,
    startedAt: "2026-05-26T13:10:00Z",
    endedAt:   "2026-05-26T13:14:23Z",
    transcript: "Customer: I keep waking up with bites. I think I might have bed bugs. Agent: I'm sorry to hear that, Rachel. Bed bugs are stressful. Let me book an inspection — our bed bug dog can come out Wednesday. Customer: A dog? Agent: Yes, our K9 team is very accurate. If confirmed, we'll recommend a heat treatment which kills all stages in one visit. Customer: Please book it. I can't sleep.",
    aiSummary: "Customer suspects bed bug infestation based on bites. K9 inspection booked for Wednesday. Heat treatment recommended if confirmed. Customer distressed.",
    disposition: "inspection_booked",
    score: 85,
  },
  {
    callSid: "CA_DEMO_0006",
    direction: "inbound",
    from: "+15550101006",
    to: "+18005550100",
    status: "completed",
    answeredBy: "agent2@bughub.com",
    duration: 174,
    startedAt: "2026-05-26T14:45:00Z",
    endedAt:   "2026-05-26T14:47:54Z",
    transcript: "Customer: I'm seeing fire ants all over my backyard. My dog got stung three times. Agent: Fire ants can be dangerous for pets, James. We recommend a two-step treatment — broadcast granules plus mound drench. I can schedule that for Saturday morning. Customer: Saturday is perfect. How long until it's pet-safe? Agent: About 30 minutes after the granules are watered in.",
    aiSummary: "Customer reported fire ants injuring pet dog. Two-step treatment (broadcast granules + mound drench) booked for Saturday AM. Pet re-entry after 30 min.",
    disposition: "scheduled",
    score: 91,
  },
  {
    callSid: "CA_DEMO_0007",
    direction: "inbound",
    from: "+15550101007",
    to: "+18005550100",
    status: "no-answer",
    answeredBy: null,
    duration: 0,
    startedAt: "2026-05-26T15:22:00Z",
    endedAt:   "2026-05-26T15:22:00Z",
    transcript: null,
    aiSummary: null,
    disposition: "callback_needed",
    score: null,
  },
  {
    callSid: "CA_DEMO_0008",
    direction: "inbound",
    from: "+15550101008",
    to: "+18005550100",
    status: "completed",
    answeredBy: "agent@bughub.com",
    duration: 221,
    startedAt: "2026-05-26T16:05:00Z",
    endedAt:   "2026-05-26T16:08:41Z",
    transcript: "Customer: There are hundreds of ants coming through my bathroom wall. Tiny ones. Agent: Those are likely odorous house ants, Kevin. They love moisture. We'll use a non-repellent transfer bait so they carry it back to the colony. I have Thursday at 3 PM available. Customer: Yes, book it. Agent: Done. Avoid spraying anything on them before we come — it can scatter the colony.",
    aiSummary: "Odorous house ant infestation via bathroom wall. Non-repellent bait treatment booked Thursday 3 PM. Customer advised NOT to spray before visit.",
    disposition: "scheduled",
    score: 89,
  },
];

const insertCall = db.prepare(
  `INSERT OR IGNORE INTO calls
     (id, call_sid, direction, from_number, to_number, status, answered_by,
      duration_seconds, started_at, ended_at, transcript_text, ai_summary, disposition, score)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
for (const c of calls) {
  insertCall.run(
    nanoid(), c.callSid, c.direction, c.from, c.to, c.status, c.answeredBy ?? null,
    c.duration, c.startedAt, c.endedAt, c.transcript ?? null, c.aiSummary ?? null, c.disposition, c.score ?? null
  );
}
console.log(`Seeded ${calls.length} calls.`);

// ── Messages ──────────────────────────────────────────────────────────────────
const messages = [
  { channel: "sms", from: "+15550101001", to: "+18005550100", body: "Hi this is Maria. Do you treat for scorpions? We just moved to Texas and found one in the bathroom." },
  { channel: "sms", from: "+18005550100", to: "+15550101001", body: "Hi Maria! Yes, we offer scorpion barrier treatments. An agent will call you shortly to schedule. Stay safe!" },
  { channel: "sms", from: "+15550101003", to: "+18005550100", body: "Just wanted to say the wasp nest is gone and the kids are finally playing outside again. Thank you!!" },
  { channel: "sms", from: "+18005550100", to: "+15550101003", body: "That's wonderful to hear, Sandra! Don't hesitate to call if they try to rebuild. Have a great day!" },
  { channel: "sms", from: "+15550101005", to: "+18005550100", body: "Quick question — after the bed bug heat treatment, when can I put my mattress back on the bed?" },
  { channel: "sms", from: "+18005550100", to: "+15550101005", body: "Hi Rachel! You can put everything back the same evening once the room cools down, usually 2–3 hours after treatment." },
  { channel: "sms", from: "+15550101002", to: "+18005550100", body: "Found more mud tubes on the other side of the house. Should I send photos?" },
  { channel: "sms", from: "+18005550100", to: "+15550101002", body: "Yes please, David! Send them to this number and we'll forward to the inspector before Friday's visit." },
  { channel: "sms", from: "+15550101006", to: "+18005550100", body: "The fire ant treatment worked great. Haven't seen any new mounds. Thanks!" },
  { channel: "sms", from: "+15550101007", to: "+18005550100", body: "I called earlier and no one picked up. I have a spider infestation — brown recluse I think. Please call me back ASAP." },
  { channel: "sms", from: "+18005550100", to: "+15550101007", body: "Hi Linda, so sorry we missed your call! An agent will call you back within 15 minutes. Brown recluse is a priority for us." },
  { channel: "sms", from: "+15550101004", to: "+18005550100", body: "Just a heads up — there's a car in the driveway tomorrow but the garage door will be unlocked for your technician." },
  { channel: "sms", from: "+18005550100", to: "+15550101004", body: "Perfect, thank you Tom! Our tech Mike will arrive around 10 AM. See you then." },
];

const insertMessage = db.prepare(
  `INSERT INTO messages (id, channel, from_number, to_number, body) VALUES (?, ?, ?, ?, ?)`
);
for (const m of messages) {
  insertMessage.run(nanoid(), m.channel, m.from, m.to, m.body);
}
console.log(`Seeded ${messages.length} messages.`);

console.log("\nAll pest control demo data seeded successfully.");
