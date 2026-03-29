"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupplier = createSupplier;
exports.getSupplier = getSupplier;
exports.listSuppliers = listSuppliers;
exports.updateSupplier = updateSupplier;
exports.deleteSupplier = deleteSupplier;
exports.listMappedSuppliers = listMappedSuppliers;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
async function createSupplier(data) {
    const [supplier] = await client_1.db.insert(schema_1.suppliers).values(data).returning();
    return supplier;
}
async function getSupplier(id) {
    const [supplier] = await client_1.db
        .select()
        .from(schema_1.suppliers)
        .where((0, drizzle_orm_1.eq)(schema_1.suppliers.id, id));
    return supplier ?? null;
}
async function listSuppliers(userId, filters) {
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.suppliers.userId, userId)];
    if (filters?.category)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.suppliers.category, filters.category));
    if (filters?.locationSource)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.suppliers.locationSource, filters.locationSource));
    return client_1.db
        .select()
        .from(schema_1.suppliers)
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy(schema_1.suppliers.name);
}
async function updateSupplier(id, data) {
    const [updated] = await client_1.db
        .update(schema_1.suppliers)
        .set({ ...data, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.suppliers.id, id))
        .returning();
    return updated ?? null;
}
async function deleteSupplier(id) {
    const [deleted] = await client_1.db
        .delete(schema_1.suppliers)
        .where((0, drizzle_orm_1.eq)(schema_1.suppliers.id, id))
        .returning();
    return deleted ?? null;
}
// Returns suppliers that have lat/lng set — for map view
async function listMappedSuppliers(userId) {
    return client_1.db
        .select({
        id: schema_1.suppliers.id,
        name: schema_1.suppliers.name,
        phone: schema_1.suppliers.phone,
        addressRaw: schema_1.suppliers.addressRaw,
        lat: schema_1.suppliers.lat,
        lng: schema_1.suppliers.lng,
        category: schema_1.suppliers.category,
    })
        .from(schema_1.suppliers)
        .where((0, drizzle_orm_1.eq)(schema_1.suppliers.userId, userId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.suppliers.createdAt));
}
