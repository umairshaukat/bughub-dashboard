import twilio from "twilio";
import { getEnv } from "./env.js";

const { AccessToken } = twilio.jwt;
const { VoiceGrant, ConversationsGrant } = AccessToken;
const { taskrouter: taskrouterJwt } = twilio.jwt;

export function createVoiceToken(identity) {
  const env = getEnv();
  const token = new AccessToken(
    env.TWILIO_ACCOUNT_SID,
    env.TWILIO_API_KEY_SID,
    env.TWILIO_API_KEY_SECRET,
    { identity }
  );
  token.addGrant(new VoiceGrant({ outgoingApplicationSid: env.TWILIO_TWIML_APP_SID, incomingAllow: true }));
  return token.toJwt();
}

export function createConversationsToken(identity) {
  const env = getEnv();
  const token = new AccessToken(
    env.TWILIO_ACCOUNT_SID,
    env.TWILIO_API_KEY_SID,
    env.TWILIO_API_KEY_SECRET,
    { identity }
  );
  if (env.TWILIO_CONVERSATIONS_SERVICE_SID) {
    token.addGrant(new ConversationsGrant({ serviceSid: env.TWILIO_CONVERSATIONS_SERVICE_SID }));
  } else {
    token.addGrant(new ConversationsGrant({}));
  }
  return token.toJwt();
}

export function createTaskRouterWorkerToken({ workerSid, ttlSeconds = 3600 }) {
  const env = getEnv();
  const capability = new taskrouterJwt.TaskRouterCapability({
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    workspaceSid: env.TWILIO_TR_WORKSPACE_SID,
    channelId: workerSid,
    ttl: ttlSeconds
  });

  capability.addPolicy(new taskrouterJwt.Policy({
    url: `https://taskrouter.twilio.com/v1/Workspaces/${env.TWILIO_TR_WORKSPACE_SID}/Workers/${workerSid}`,
    method: "GET",
    allow: true
  }));
  capability.addPolicy(new taskrouterJwt.Policy({
    url: `https://taskrouter.twilio.com/v1/Workspaces/${env.TWILIO_TR_WORKSPACE_SID}/Workers/${workerSid}`,
    method: "POST",
    allow: true
  }));
  capability.addPolicy(new taskrouterJwt.Policy({
    url: `https://taskrouter.twilio.com/v1/Workspaces/${env.TWILIO_TR_WORKSPACE_SID}/Tasks/**`,
    method: "GET",
    allow: true
  }));
  capability.addPolicy(new taskrouterJwt.Policy({
    url: `https://taskrouter.twilio.com/v1/Workspaces/${env.TWILIO_TR_WORKSPACE_SID}/Tasks/**`,
    method: "POST",
    allow: true
  }));

  return capability.toJwt();
}

