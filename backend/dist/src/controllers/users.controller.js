"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = createUser;
exports.getUserById = getUserById;
exports.getUserByPhone = getUserByPhone;
exports.updateUser = updateUser;
exports.toggleUserActive = toggleUserActive;
exports.listAllUsers = listAllUsers;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
async function createUser(data) {
    const [user] = await client_1.db.insert(schema_1.users).values(data).returning();
    return user;
}
async function getUserById(id) {
    const [user] = await client_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id));
    return user ?? null;
}
async function getUserByPhone(phone) {
    const [user] = await client_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.phone, phone));
    return user ?? null;
}
async function updateUser(id, data) {
    const [updated] = await client_1.db
        .update(schema_1.users)
        .set({ ...data, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, id))
        .returning();
    return updated ?? null;
}
async function toggleUserActive(id, isActive) {
    const [updated] = await client_1.db
        .update(schema_1.users)
        .set({ isActive, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, id))
        .returning();
    return updated ?? null;
}
// Admin — list all vendors with basic profile
async function listAllUsers(filters) {
    let query = client_1.db
        .select({
        id: schema_1.users.id,
        phone: schema_1.users.phone,
        name: schema_1.users.name,
        businessName: schema_1.users.businessName,
        businessType: schema_1.users.businessType,
        city: schema_1.users.city,
        state: schema_1.users.state,
        isActive: schema_1.users.isActive,
        createdAt: schema_1.users.createdAt,
    })
        .from(schema_1.users);
    if (filters?.isActive !== undefined) {
        return query.where((0, drizzle_orm_1.eq)(schema_1.users.isActive, filters.isActive));
    }
    return query;
}
