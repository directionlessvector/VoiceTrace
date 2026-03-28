import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/client";
import { customers, customerLedger } from "../db/schema";

// ─── Customers ────────────────────────────────────────────────────────────────

export async function createCustomer(data: {
  userId: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
}) {
  const [customer] = await db.insert(customers).values(data).returning();
  return customer;
}

export async function getCustomer(id: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id));
  return customer ?? null;
}

export async function listCustomers(userId: string) {
  return db
    .select()
    .from(customers)
    .where(eq(customers.userId, userId))
    .orderBy(customers.name);
}

export async function updateCustomer(
  id: string,
  data: Partial<{ name: string; phone: string; address: string; notes: string }>
) {
  const [updated] = await db
    .update(customers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteCustomer(id: string) {
  const [deleted] = await db
    .delete(customers)
    .where(eq(customers.id, id))
    .returning();
  return deleted ?? null;
}

// ─── Customer Ledger ──────────────────────────────────────────────────────────

export async function createCustomerLedgerEntry(data: {
  customerId: string;
  userId: string;
  voiceSessionId?: string;
  txnType: "credit" | "debit";
  amount: string;
  description?: string;
  txnDate: string;
}) {
  const [entry] = await db.insert(customerLedger).values(data).returning();
  return entry;
}

export async function getCustomerLedger(customerId: string) {
  return db
    .select()
    .from(customerLedger)
    .where(eq(customerLedger.customerId, customerId))
    .orderBy(desc(customerLedger.txnDate));
}

// Net balance for a customer: positive = customer owes vendor
export async function getCustomerBalance(customerId: string) {
  const [row] = await db
    .select({
      balance: sql<string>`
        sum(case when ${customerLedger.txnType} = 'credit' then ${customerLedger.amount}
                 else -${customerLedger.amount} end)
      `,
    })
    .from(customerLedger)
    .where(eq(customerLedger.customerId, customerId));
  return { customerId, balance: row?.balance ?? "0" };
}

// All customers with outstanding balances for a vendor
export async function listCustomerBalances(userId: string) {
  return db
    .select({
      customerId: customerLedger.customerId,
      balance: sql<string>`
        sum(case when ${customerLedger.txnType} = 'credit' then ${customerLedger.amount}
                 else -${customerLedger.amount} end)
      `,
    })
    .from(customerLedger)
    .where(eq(customerLedger.userId, userId))
    .groupBy(customerLedger.customerId);
}
