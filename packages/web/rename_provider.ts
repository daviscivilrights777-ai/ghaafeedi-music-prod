import { db } from "./src/api/database/pg-client";
const pool = (db as any).$client;
const res = await pool.query(
  `UPDATE providers SET name = 'sunor_cc', display_name = 'Sunor.cc Music', updated_at = NOW() WHERE name = 'suno' RETURNING name, display_name`
);
console.log("Updated:", res.rows);
await pool.end();
