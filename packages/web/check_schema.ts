import { db } from "./src/api/database/pg-client";
const pool = (db as any).$client;
const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'providers' ORDER BY ordinal_position`);
console.log(JSON.stringify(res.rows, null, 2));
await pool.end();
