/**
 * One-off: inspect documents + snapshot text in PostgreSQL.
 * Run: cd collab-web && node --env-file=.env scripts/check-db-content.mjs
 */
import pg from "pg";
import * as Y from "yjs";

const EMAILS = ["meettumanith@gmail.com", "mettumanith0@gmail.com"];

function extractPlainText(doc) {
  const frag = doc.getXmlFragment("default");
  const parts = [];

  function walkText(node) {
    if (node instanceof Y.XmlText) {
      for (const op of node.toDelta()) {
        if (typeof op.insert === "string") parts.push(op.insert);
      }
    } else if (node instanceof Y.XmlElement || node instanceof Y.XmlFragment) {
      node.forEach((child) => {
        if (child instanceof Y.XmlText) walkText(child);
        else if (child instanceof Y.XmlElement) {
          const inner = [];
          child.forEach((c) => {
            if (c instanceof Y.XmlText) {
              for (const op of c.toDelta()) {
                if (typeof op.insert === "string") inner.push(op.insert);
              }
            }
          });
          const t = inner.join("");
          const tag = child.nodeName;
          if (
            tag === "paragraph" ||
            tag === "heading" ||
            tag.startsWith("heading") ||
            tag === "blockquote" ||
            tag === "listItem"
          ) {
            parts.push(t + "\n");
          } else {
            parts.push(t);
          }
        }
      });
    }
  }

  walkText(frag);
  return parts.join("").replace(/\n{3,}/g, "\n\n").trim();
}

function textFromYjsState(buffer) {
  if (!buffer || buffer.length === 0) return "(empty yjs_state bytes)";
  const doc = new Y.Doc();
  try {
    Y.applyUpdate(doc, new Uint8Array(buffer));
    const text = extractPlainText(doc);
    return text || "(Yjs doc has no text in default fragment)";
  } catch (e) {
    return `(failed to decode: ${e.message})`;
  } finally {
    doc.destroy();
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const url = new URL(connectionString.replace(/^postgres:\/\//, "postgresql://"));
const sslMode = url.searchParams.get("sslmode");
const requiresTls =
  sslMode !== null &&
  sslMode !== "disable" &&
  sslMode !== "allow" &&
  sslMode !== "prefer";
if (requiresTls) url.searchParams.delete("sslmode");

const pool = new pg.Pool({
  connectionString: url.toString(),
  ssl: requiresTls ? { rejectUnauthorized: false } : undefined,
});

try {
  const { rows: users } = await pool.query(
    `SELECT id, email, name FROM users WHERE email = ANY($1::text[])`,
    [EMAILS],
  );
  console.log("\n=== USERS ===");
  console.table(users);

  const { rows: docs } = await pool.query(
    `
    SELECT d.id, d.title, d.updated_at,
           o.email AS owner_email,
           COUNT(DISTINCT dc.user_id) AS collaborator_count,
           COUNT(DISTINCT ds.id) AS snapshot_count
    FROM documents d
    JOIN users o ON o.id = d.owner_id
    LEFT JOIN document_collaborators dc ON dc.document_id = d.id
    LEFT JOIN document_snapshots ds ON ds.document_id = d.id
    WHERE d.owner_id IN (SELECT id FROM users WHERE email = ANY($1::text[]))
       OR EXISTS (
         SELECT 1 FROM document_collaborators c
         JOIN users u ON u.id = c.user_id
         WHERE c.document_id = d.id AND u.email = ANY($1::text[])
       )
    GROUP BY d.id, d.title, d.updated_at, o.email
    ORDER BY d.updated_at DESC
    `,
    [EMAILS],
  );

  console.log("\n=== DOCUMENTS (for both users) ===");
  if (docs.length === 0) {
    console.log("No documents found.");
  } else {
    console.table(
      docs.map((d) => ({
        id: d.id,
        title: d.title,
        owner: d.owner_email,
        collaborators: d.collaborator_count,
        snapshots: d.snapshot_count,
        updated_at: d.updated_at,
      })),
    );
  }

  for (const doc of docs) {
    const { rows: snapshots } = await pool.query(
      `
      SELECT ds.id, ds.kind, ds.created_at, ds.change_summary,
             LENGTH(ds.yjs_state) AS state_bytes,
             u.email AS created_by
      FROM document_snapshots ds
      LEFT JOIN users u ON u.id = ds.created_by_id
      WHERE ds.document_id = $1
      ORDER BY ds.created_at DESC
      LIMIT 5
      `,
      [doc.id],
    );

    console.log(`\n--- Document: "${doc.title}" (${doc.id}) ---`);
    console.log(`Snapshots in DB: ${doc.snapshot_count}`);

    if (snapshots.length === 0) {
      console.log("  NO SNAPSHOTS — document text is NOT stored in DB yet.");
      console.log(
        "  Text may only exist in browser IndexedDB + Railway memory while online.",
      );
      continue;
    }

    for (const s of snapshots) {
      const { rows: stateRow } = await pool.query(
        `SELECT yjs_state FROM document_snapshots WHERE id = $1`,
        [s.id],
      );
      const text = textFromYjsState(stateRow[0]?.yjs_state);
      console.log(`\n  [${s.kind}] ${s.created_at.toISOString()}`);
      console.log(`  bytes: ${s.state_bytes} | by: ${s.created_by ?? "system"}`);
      console.log(`  summary: ${s.change_summary ?? "(none)"}`);
      console.log(`  text: ${JSON.stringify(text.slice(0, 500))}`);
    }

    const latest = snapshots[0];
    const { rows: latestState } = await pool.query(
      `SELECT yjs_state FROM document_snapshots WHERE id = $1`,
      [latest.id],
    );
    const latestText = textFromYjsState(latestState[0]?.yjs_state);
    console.log(`\n  LATEST STORED TEXT: ${JSON.stringify(latestText)}`);
  }

  const { rows: total } = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM documents) AS documents,
       (SELECT COUNT(*)::int FROM document_snapshots) AS snapshots,
       (SELECT COUNT(*)::int FROM users) AS users`,
  );
  console.log("\n=== DB TOTALS ===");
  console.table(total);
} finally {
  await pool.end();
}
