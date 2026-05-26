import { z } from "zod";

const schema = z.object({
  PORT: z.string().default("8787"),
  PUBLIC_BASE_URL: z.string().url(),
  FRONTEND_ORIGIN: z.string().url(),

  TWILIO_ACCOUNT_SID: z.string().min(2),
  TWILIO_AUTH_TOKEN: z.string().min(2),
  TWILIO_API_KEY_SID: z.string().min(2),
  TWILIO_API_KEY_SECRET: z.string().min(2),

  TWILIO_TWIML_APP_SID: z.string().min(2),
  TWILIO_TR_WORKSPACE_SID: z.string().min(2),
  TWILIO_TR_WORKFLOW_SID: z.string().min(2),
  TWILIO_CONVERSATIONS_SERVICE_SID: z.string().min(2).optional(),

  TWILIO_DEFAULT_FROM: z.string().optional()
});

export function getEnv() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid backend env:\n${msg}`);
  }
  return parsed.data;
}

