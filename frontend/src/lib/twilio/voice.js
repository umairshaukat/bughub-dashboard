import { Device } from "@twilio/voice-sdk";
import { getToken } from "../api.js";

export async function createVoiceDevice({ identity, onEvent }) {
  const { token } = await getToken("voice", { identity });
  const device = new Device(token, {
    codecPreferences: ["opus", "pcmu"],
    enableRingingState: true,
    closeProtection: true,
    logLevel: "warn"
  });

  const forward = (type) => (...args) => onEvent?.(type, ...args);
  device.on("error", forward("error"));
  device.on("registered", forward("registered"));
  device.on("unregistered", forward("unregistered"));
  device.on("incoming", forward("incoming"));
  device.on("destroyed", forward("destroyed"));

  await device.register();
  return device;
}

