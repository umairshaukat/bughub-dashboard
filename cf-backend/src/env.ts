import { z } from "zod";

export type Env = z.infer<typeof schema> & {
  DB: D1Database;
  EVENTS: DurableObjectNamespace;
};

const schema = z.object({
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

export function parseEnv(env: Record<string, unknown>) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid worker env:\n${msg}`);
  }
  return parsed.data;
}
