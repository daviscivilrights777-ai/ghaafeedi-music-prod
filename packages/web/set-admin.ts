import { db } from "./src/api/database/index.ts";
import { profiles } from "./src/api/database/schema.ts";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const userId = "yhvvSJpIXQtwmFctcGR15RozsxKBTGmb";

const existing = await db.select().from(profiles).where(eq(profiles.userId, userId));
if (existing.length > 0) {
  await db.update(profiles).set({ role: "admin" }).where(eq(profiles.userId, userId));
  console.log("Updated to admin:", existing[0].id);
} else {
  const id = randomUUID();
  await db.insert(profiles).values({ id, userId, role: "admin" });
  console.log("Inserted admin profile:", id);
}
const check = await db.select().from(profiles).where(eq(profiles.userId, userId));
console.log("Profile:", check);
