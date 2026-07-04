import "dotenv/config";

const required = ["DATABASE_URL", "NEXTAUTH_SECRET"] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const config = {
  host: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? 1234),
  databaseUrl: process.env.DATABASE_URL!,
  nextAuthSecret: process.env.NEXTAUTH_SECRET!,
  maxMessageBytes: Number(process.env.MAX_MESSAGE_BYTES ?? 1_048_576),
  maxMessagesPerSecond: Number(process.env.MAX_MESSAGES_PER_SECOND ?? 50),
  maxMalformedMessages: Number(process.env.MAX_MALFORMED_MESSAGES ?? 5),
  persistenceDebounceMs: Number(process.env.PERSISTENCE_DEBOUNCE_MS ?? 30_000),
  internalApiSecret: process.env.WS_INTERNAL_SECRET ?? "",
} as const;
