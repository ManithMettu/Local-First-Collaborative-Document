import pg from "pg";

let cachedAvailability: boolean | null = null;

export async function isDatabaseAvailable(): Promise<boolean> {
  if (cachedAvailability !== null) {
    return cachedAvailability;
  }

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    cachedAvailability = false;
    return false;
  }

  const pool = new pg.Pool({ connectionString });

  try {
    await pool.query("SELECT 1");
    cachedAvailability = true;
    return true;
  } catch {
    cachedAvailability = false;
    return false;
  } finally {
    await pool.end();
  }
}
