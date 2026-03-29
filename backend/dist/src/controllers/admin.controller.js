"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginAdmin = loginAdmin;
exports.logActivity = logActivity;
exports.listActivityLogs = listActivityLogs;
exports.getVendorStats = getVendorStats;
exports.getVendorProfiles = getVendorProfiles;
exports.getRegistrationsByMonth = getRegistrationsByMonth;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const JWT_SECRET = process.env.JWT_SECRET;
function signAdminToken(adminUserId, email) {
    return jsonwebtoken_1.default.sign({ adminUserId, email, role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
}
async function loginAdmin(data) {
    if (!data.email || !data.password) {
        throw new Error("Email and password are required");
    }
    const normalizedEmail = data.email.trim().toLowerCase();
    const [adminUser] = await client_1.db
        .select()
        .from(schema_1.adminUsers)
        .where((0, drizzle_orm_1.sql) `lower(${schema_1.adminUsers.email}) = ${normalizedEmail}`);
    if (!adminUser) {
        throw new Error("Invalid admin credentials");
    }
    const valid = await bcryptjs_1.default.compare(data.password, adminUser.passwordHash);
    if (!valid) {
        throw new Error("Invalid admin credentials");
    }
    const token = signAdminToken(adminUser.id, adminUser.email);
    return {
        token,
        adminUser: {
            id: adminUser.id,
            email: adminUser.email,
            role: adminUser.role,
        },
    };
}
// ─── Activity Logs ────────────────────────────────────────────────────────────
async function logActivity(data) {
    const [log] = await client_1.db.insert(schema_1.activityLogs).values(data).returning();
    return log;
}
async function listActivityLogs(filters, limit = 100) {
    let query = client_1.db
        .select()
        .from(schema_1.activityLogs)
        .orderBy((0, drizzle_orm_1.desc)(schema_1.activityLogs.createdAt))
        .limit(limit);
    if (filters?.userId) {
        return client_1.db
            .select()
            .from(schema_1.activityLogs)
            .where((0, drizzle_orm_1.eq)(schema_1.activityLogs.userId, filters.userId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.activityLogs.createdAt))
            .limit(limit);
    }
    if (filters?.adminUserId) {
        return client_1.db
            .select()
            .from(schema_1.activityLogs)
            .where((0, drizzle_orm_1.eq)(schema_1.activityLogs.adminUserId, filters.adminUserId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.activityLogs.createdAt))
            .limit(limit);
    }
    return query;
}
// ─── Admin Dashboard Stats ────────────────────────────────────────────────────
// Total registered vendors, active vs inactive count
async function getVendorStats() {
    const [row] = await client_1.db
        .select({
        total: (0, drizzle_orm_1.sql) `count(*)`,
        active: (0, drizzle_orm_1.sql) `count(*) filter (where ${schema_1.users.isActive} = true)`,
        inactive: (0, drizzle_orm_1.sql) `count(*) filter (where ${schema_1.users.isActive} = false)`,
    })
        .from(schema_1.users);
    return row;
}
// Basic vendor profiles — name, location, business type, activity status
async function getVendorProfiles(filters) {
    let query = client_1.db
        .select({
        id: schema_1.users.id,
        name: schema_1.users.name,
        phone: schema_1.users.phone,
        businessName: schema_1.users.businessName,
        businessType: schema_1.users.businessType,
        city: schema_1.users.city,
        state: schema_1.users.state,
        isActive: schema_1.users.isActive,
        createdAt: schema_1.users.createdAt,
    })
        .from(schema_1.users)
        .orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt));
    return query;
}
// Vendors registered by month — for growth chart
async function getRegistrationsByMonth() {
    return client_1.db
        .select({
        month: (0, drizzle_orm_1.sql) `to_char(${schema_1.users.createdAt}, 'YYYY-MM')`,
        count: (0, drizzle_orm_1.sql) `count(*)`,
    })
        .from(schema_1.users)
        .groupBy((0, drizzle_orm_1.sql) `to_char(${schema_1.users.createdAt}, 'YYYY-MM')`)
        .orderBy((0, drizzle_orm_1.sql) `to_char(${schema_1.users.createdAt}, 'YYYY-MM')`);
}
