import { db } from "./src/api/database/pg-client";
const pool = (db as any).$client;
const res = await pool.query(`SELECT id, name, display_name, enabled, job_types, priority, cost_per_unit, unit FROM providers ORDER BY priority`);
console.log(JSON.stringify(res.rows, null, 2));
await pool.end();
