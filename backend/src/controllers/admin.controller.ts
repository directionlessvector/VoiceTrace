import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "../db/client";
import { activityLogs, users, adminUsers } from "../db/schema";

const JWT_SECRET = process.env.JWT_SECRET!;

function signAdminToken(adminUserId: string, email: string): string {
  return jwt.sign({ adminUserId, email, role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
}

export async function loginAdmin(data: { email: string; password: string }) {
  if (!data.email || !data.password) {
    throw new Error("Email and password are required");
  }

  const [adminUser] = await db.select().from(adminUsers).where(eq(adminUsers.email, data.email.trim()));
  if (!adminUser) {
    throw new Error("Invalid admin credentials");
  }

  const valid = await bcrypt.compare(data.password, adminUser.passwordHash);
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

export async function logActivity(data: {
  action: string;
  userId?: string;
  adminUserId?: string;
  metadata?: object;
}) {
  const [log] = await db.insert(activityLogs).values(data).returning();
  return log;
}

export async function listActivityLogs(
  filters?: { userId?: string; adminUserId?: string },
  limit = 100
) {
  let query = db
    .select()
    .from(activityLogs)
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);

  if (filters?.userId) {
    return db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.userId, filters.userId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  if (filters?.adminUserId) {
    return db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.adminUserId, filters.adminUserId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  return query;
}

// ─── Admin Dashboard Stats ────────────────────────────────────────────────────

// Total registered vendors, active vs inactive count
export async function getVendorStats() {
  const [row] = await db
    .select({
      total:    sql<string>`count(*)`,
      active:   sql<string>`count(*) filter (where ${users.isActive} = true)`,
      inactive: sql<string>`count(*) filter (where ${users.isActive} = false)`,
    })
    .from(users);
  return row;
}

// Basic vendor profiles — name, location, business type, activity status
export async function getVendorProfiles(filters?: { isActive?: boolean; businessType?: string }) {
  let query = db
    .select({
      id:           users.id,
      name:         users.name,
      phone:        users.phone,
      businessName: users.businessName,
      businessType: users.businessType,
      city:         users.city,
      state:        users.state,
      isActive:     users.isActive,
      createdAt:    users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return query;
}

// Vendors registered by month — for growth chart
export async function getRegistrationsByMonth() {
  return db
    .select({
      month: sql<string>`to_char(${users.createdAt}, 'YYYY-MM')`,
      count: sql<string>`count(*)`,
    })
    .from(users)
    .groupBy(sql`to_char(${users.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${users.createdAt}, 'YYYY-MM')`);
}
