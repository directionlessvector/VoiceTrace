import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "../db/client";
import { adminUsers } from "../db/schema";

const BCRYPT_ROUNDS = 10;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseBoolean(value?: string): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "y", "on"].includes(value.trim().toLowerCase());
}

export async function bootstrapAdminFromEnv(logger: { info: (msg: string) => void; warn: (msg: string) => void; error: (msg: string) => void; }) {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const role = (process.env.ADMIN_BOOTSTRAP_ROLE || "super_admin").trim();
  const forceReset = parseBoolean(process.env.ADMIN_BOOTSTRAP_FORCE_RESET);

  if (!email || !password) {
    logger.info("Admin bootstrap skipped (set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD to enable)");
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  const [existing] = await db
    .select()
    .from(adminUsers)
    .where(sql`lower(${adminUsers.email}) = ${normalizedEmail}`);

  if (!existing) {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await db.insert(adminUsers).values({
      email: normalizedEmail,
      passwordHash,
      role,
    });
    logger.info(`Admin bootstrap: created admin user ${normalizedEmail}`);
    return;
  }

  if (!forceReset) {
    logger.info(`Admin bootstrap: admin ${normalizedEmail} already exists (set ADMIN_BOOTSTRAP_FORCE_RESET=true to reset password)`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await db
    .update(adminUsers)
    .set({
      passwordHash,
      role,
    })
    .where(sql`lower(${adminUsers.email}) = ${normalizedEmail}`);

  logger.warn(`Admin bootstrap: reset credentials for ${normalizedEmail}`);
}
