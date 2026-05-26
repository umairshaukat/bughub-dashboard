import { Client as ConversationsClient } from "@twilio/conversations";
import { getToken } from "../api.js";

export async function createConversationsClient({ identity }) {
  const { token } = await getToken("conversations", { identity });
  const client = await ConversationsClient.create(token);
  return client;
}

