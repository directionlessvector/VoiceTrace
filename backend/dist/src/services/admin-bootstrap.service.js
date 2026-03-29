"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapAdminFromEnv = bootstrapAdminFromEnv;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const BCRYPT_ROUNDS = 10;
function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
function parseBoolean(value) {
    if (!value)
        return false;
    return ["1", "true", "yes", "y", "on"].includes(value.trim().toLowerCase());
}
async function bootstrapAdminFromEnv(logger) {
    const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim();
    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
    const role = (process.env.ADMIN_BOOTSTRAP_ROLE || "super_admin").trim();
    const forceReset = parseBoolean(process.env.ADMIN_BOOTSTRAP_FORCE_RESET);
    if (!email || !password) {
        logger.info("Admin bootstrap skipped (set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD to enable)");
        return;
    }
    const normalizedEmail = normalizeEmail(email);
    const [existing] = await client_1.db
        .select()
        .from(schema_1.adminUsers)
        .where((0, drizzle_orm_1.sql) `lower(${schema_1.adminUsers.email}) = ${normalizedEmail}`);
    if (!existing) {
        const passwordHash = await bcryptjs_1.default.hash(password, BCRYPT_ROUNDS);
        await client_1.db.insert(schema_1.adminUsers).values({
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
    const passwordHash = await bcryptjs_1.default.hash(password, BCRYPT_ROUNDS);
    await client_1.db
        .update(schema_1.adminUsers)
        .set({
        passwordHash,
        role,
    })
        .where((0, drizzle_orm_1.sql) `lower(${schema_1.adminUsers.email}) = ${normalizedEmail}`);
    logger.warn(`Admin bootstrap: reset credentials for ${normalizedEmail}`);
}
