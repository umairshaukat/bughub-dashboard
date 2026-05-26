import twilio from "twilio";
import { getEnv } from "./env.js";

export function buildInboundVoiceTwiML({ from, to, callSid }) {
  const env = getEnv();
  const twiml = new twilio.twiml.VoiceResponse();
  const taskPayload = {
    type: "inbound_call",
    from,
    to,
    callSid,
    createdAt: new Date().toISOString()
  };

  const enqueue = twiml.enqueue({ workflowSid: env.TWILIO_TR_WORKFLOW_SID });
  enqueue.task(JSON.stringify(taskPayload));
  return twiml.toString();
}

export function buildWaitTwiML() {
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say({ voice: "Polly.Joanna" }, "Thanks for calling. Please hold while we connect you.");
  twiml.play("http://com.twilio.music.classical.s3.amazonaws.com/BusyStrings.mp3");
  return twiml.toString();
}

