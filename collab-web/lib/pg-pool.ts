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
    // Let the explicit `ssl` option control TLS; avoid pg parsing sslmode as verify-full.
    url.searchParams.delete("sslmode");
  }

  const pool = new pg.Pool({
    connectionString: url.toString(),
    ssl: requiresTls ? { rejectUnauthorized: false } : undefined,
    keepAlive: true,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  pool.on("error", (error) => {
    console.error("[db] Pool idle client error:", error.message);
  });

  return pool;
}
