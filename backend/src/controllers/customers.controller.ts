import { eq, desc, sql } from "drizzle-orm";
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

// All ledger entries for a user across all customers
export async function listAllCustomerLedger(userId: string) {
  return db
    .select({
      id: customerLedger.id,
      customerId: customerLedger.customerId,
      txnType: customerLedger.txnType,
      amount: customerLedger.amount,
      description: customerLedger.description,
      txnDate: customerLedger.txnDate,
      createdAt: customerLedger.createdAt,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(customerLedger)
    .leftJoin(customers, eq(customers.id, customerLedger.customerId))
    .where(eq(customerLedger.userId, userId))
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

// All customers with outstanding balances, total collected, and last txn date for a vendor
export async function listCustomerBalances(userId: string) {
  return db
    .select({
      customerId: customerLedger.customerId,
      balance: sql<string>`
        coalesce(sum(case when ${customerLedger.txnType} = 'credit' then ${customerLedger.amount}
                          else -${customerLedger.amount} end), '0')
      `,
      totalDebits: sql<string>`
        coalesce(sum(case when ${customerLedger.txnType} = 'debit' then ${customerLedger.amount} else 0 end), '0')
      `,
      lastTxnDate: sql<string | null>`max(${customerLedger.txnDate})`,
    })
    .from(customerLedger)
    .where(eq(customerLedger.userId, userId))
    .groupBy(customerLedger.customerId);
}

// Customers with balance, total debits (collected), and last txn date
export async function listCustomerSummary(userId: string) {
  return db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      address: customers.address,
      notes: customers.notes,
      createdAt: customers.createdAt,
      balance: sql<string>`
        coalesce(sum(case when ${customerLedger.txnType} = 'credit' then ${customerLedger.amount}
                          else -${customerLedger.amount} end), '0')
      `,
      totalDebits: sql<string>`
        coalesce(sum(case when ${customerLedger.txnType} = 'debit' then ${customerLedger.amount} else 0 end), '0')
      `,
      lastTxnDate: sql<string | null>`max(${customerLedger.txnDate})`,
    })
    .from(customers)
    .leftJoin(customerLedger, eq(customerLedger.customerId, customers.id))
    .where(eq(customers.userId, userId))
    .groupBy(customers.id)
    .orderBy(customers.name);
}
