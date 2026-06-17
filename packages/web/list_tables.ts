import { db } from "./src/api/database/pg-client";
const pool = (db as any).$client;
const res = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`);
console.log(res.rows.map((r: any) => r.table_name).join('\n'));
await pool.end();
