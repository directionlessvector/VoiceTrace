"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCustomer = createCustomer;
exports.getCustomer = getCustomer;
exports.listCustomers = listCustomers;
exports.updateCustomer = updateCustomer;
exports.deleteCustomer = deleteCustomer;
exports.createCustomerLedgerEntry = createCustomerLedgerEntry;
exports.getCustomerLedger = getCustomerLedger;
exports.listAllCustomerLedger = listAllCustomerLedger;
exports.getCustomerBalance = getCustomerBalance;
exports.listCustomerBalances = listCustomerBalances;
exports.listCustomerSummary = listCustomerSummary;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
// ─── Customers ────────────────────────────────────────────────────────────────
async function createCustomer(data) {
    const [customer] = await client_1.db.insert(schema_1.customers).values(data).returning();
    return customer;
}
async function getCustomer(id) {
    const [customer] = await client_1.db
        .select()
        .from(schema_1.customers)
        .where((0, drizzle_orm_1.eq)(schema_1.customers.id, id));
    return customer ?? null;
}
async function listCustomers(userId) {
    return client_1.db
        .select()
        .from(schema_1.customers)
        .where((0, drizzle_orm_1.eq)(schema_1.customers.userId, userId))
        .orderBy(schema_1.customers.name);
}
async function updateCustomer(id, data) {
    const [updated] = await client_1.db
        .update(schema_1.customers)
        .set({ ...data, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.customers.id, id))
        .returning();
    return updated ?? null;
}
async function deleteCustomer(id) {
    const [deleted] = await client_1.db
        .delete(schema_1.customers)
        .where((0, drizzle_orm_1.eq)(schema_1.customers.id, id))
        .returning();
    return deleted ?? null;
}
// ─── Customer Ledger ──────────────────────────────────────────────────────────
async function createCustomerLedgerEntry(data) {
    const [entry] = await client_1.db.insert(schema_1.customerLedger).values(data).returning();
    return entry;
}
async function getCustomerLedger(customerId) {
    return client_1.db
        .select()
        .from(schema_1.customerLedger)
        .where((0, drizzle_orm_1.eq)(schema_1.customerLedger.customerId, customerId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.customerLedger.txnDate));
}
// All ledger entries for a user across all customers
async function listAllCustomerLedger(userId) {
    return client_1.db
        .select({
        id: schema_1.customerLedger.id,
        customerId: schema_1.customerLedger.customerId,
        txnType: schema_1.customerLedger.txnType,
        amount: schema_1.customerLedger.amount,
        description: schema_1.customerLedger.description,
        txnDate: schema_1.customerLedger.txnDate,
        createdAt: schema_1.customerLedger.createdAt,
        customerName: schema_1.customers.name,
        customerPhone: schema_1.customers.phone,
    })
        .from(schema_1.customerLedger)
        .leftJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.customers.id, schema_1.customerLedger.customerId))
        .where((0, drizzle_orm_1.eq)(schema_1.customerLedger.userId, userId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.customerLedger.txnDate));
}
// Net balance for a customer: positive = customer owes vendor
async function getCustomerBalance(customerId) {
    const [row] = await client_1.db
        .select({
        balance: (0, drizzle_orm_1.sql) `
        sum(case when ${schema_1.customerLedger.txnType} = 'credit' then ${schema_1.customerLedger.amount}
                 else -${schema_1.customerLedger.amount} end)
      `,
    })
        .from(schema_1.customerLedger)
        .where((0, drizzle_orm_1.eq)(schema_1.customerLedger.customerId, customerId));
    return { customerId, balance: row?.balance ?? "0" };
}
// All customers with outstanding balances, total collected, and last txn date for a vendor
async function listCustomerBalances(userId) {
    return client_1.db
        .select({
        customerId: schema_1.customerLedger.customerId,
        balance: (0, drizzle_orm_1.sql) `
        coalesce(sum(case when ${schema_1.customerLedger.txnType} = 'credit' then ${schema_1.customerLedger.amount}
                          else -${schema_1.customerLedger.amount} end), '0')
      `,
        totalDebits: (0, drizzle_orm_1.sql) `
        coalesce(sum(case when ${schema_1.customerLedger.txnType} = 'debit' then ${schema_1.customerLedger.amount} else 0 end), '0')
      `,
        lastTxnDate: (0, drizzle_orm_1.sql) `max(${schema_1.customerLedger.txnDate})`,
    })
        .from(schema_1.customerLedger)
        .where((0, drizzle_orm_1.eq)(schema_1.customerLedger.userId, userId))
        .groupBy(schema_1.customerLedger.customerId);
}
// Customers with balance, total debits (collected), and last txn date
async function listCustomerSummary(userId) {
    return client_1.db
        .select({
        id: schema_1.customers.id,
        name: schema_1.customers.name,
        phone: schema_1.customers.phone,
        address: schema_1.customers.address,
        notes: schema_1.customers.notes,
        createdAt: schema_1.customers.createdAt,
        balance: (0, drizzle_orm_1.sql) `
        coalesce(sum(case when ${schema_1.customerLedger.txnType} = 'credit' then ${schema_1.customerLedger.amount}
                          else -${schema_1.customerLedger.amount} end), '0')
      `,
        totalDebits: (0, drizzle_orm_1.sql) `
        coalesce(sum(case when ${schema_1.customerLedger.txnType} = 'debit' then ${schema_1.customerLedger.amount} else 0 end), '0')
      `,
        lastTxnDate: (0, drizzle_orm_1.sql) `max(${schema_1.customerLedger.txnDate})`,
    })
        .from(schema_1.customers)
        .leftJoin(schema_1.customerLedger, (0, drizzle_orm_1.eq)(schema_1.customerLedger.customerId, schema_1.customers.id))
        .where((0, drizzle_orm_1.eq)(schema_1.customers.userId, userId))
        .groupBy(schema_1.customers.id)
        .orderBy(schema_1.customers.name);
}
