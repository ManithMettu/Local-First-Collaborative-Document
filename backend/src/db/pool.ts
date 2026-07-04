import pg from "pg";

export function createPgPool(connectionString: string) {
  const url = new URL(
    connectionString.replace(/^postgres:\/\//, "postgresql://"),
  );
  const sslMode = url.searchParams.get("sslmode");
  const requiresTls =
    sslMode !== null &&
    sslMode !== "disable" &&
    sslMode !== "allow" &&
    sslMode !== "prefer";

  if (requiresTls) {
    url.searchParams.delete("sslmode");
  }

  const pool = new pg.Pool({
    connectionString: url.toString(),
    ssl: requiresTls ? { rejectUnauthorized: false } : undefined,
    // Remote managed Postgres (e.g. Aiven) may drop idle TLS sockets.
    keepAlive: true,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  // Without this handler, idle client errors crash the Node process.
  pool.on("error", (error) => {
    console.error("[db] Pool idle client error:", error.message);
  });

  return pool;
}
