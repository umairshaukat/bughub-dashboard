import twilio from "twilio";
import { getEnv } from "./env.js";

export function getTwilioClient() {
  const env = getEnv();
  return twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
}

