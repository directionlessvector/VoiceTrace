import { fetchJson, resolveActiveUserId } from "@/lib/backendApi";

export type Customer = {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerBalance = {
  customerId: string;
  balance: string;
  totalDebits: string;
  lastTxnDate: string | null;
};

export type CustomerLedgerEntry = {
  id: string;
  customerId: string;
  userId: string;
  voiceSessionId: string | null;
  txnType: "credit" | "debit";
  amount: string;
  description: string | null;
  txnDate: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerSummary = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  balance: string;
  totalDebits: string;
  lastTxnDate: string | null;
};

export async function listCustomerSummary(): Promise<CustomerSummary[]> {
  const userId = await resolveActiveUserId();
  return fetchJson<CustomerSummary[]>(`/customers/user/${userId}/summary`);
}

export async function listCustomers(): Promise<Customer[]> {
  const userId = await resolveActiveUserId();
  return fetchJson<Customer[]>(`/customers/user/${userId}`);
}

export async function listCustomerBalances(): Promise<CustomerBalance[]> {
  const userId = await resolveActiveUserId();
  return fetchJson<CustomerBalance[]>(`/customers/user/${userId}/balances`);
}

export async function getCustomerLedger(customerId: string): Promise<CustomerLedgerEntry[]> {
  return fetchJson<CustomerLedgerEntry[]>(`/customers/${customerId}/ledger`);
}

export async function createCustomer(data: {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
}): Promise<Customer> {
  const userId = await resolveActiveUserId();
  return fetchJson<Customer>("/customers", {
    method: "POST",
    body: JSON.stringify({ ...data, userId }),
  });
}

export async function addCustomerLedgerEntry(data: {
  customerId: string;
  txnType: "credit" | "debit";
  amount: string;
  description?: string;
  txnDate: string;
}): Promise<CustomerLedgerEntry> {
  const userId = await resolveActiveUserId();
  return fetchJson<CustomerLedgerEntry>(`/customers/${data.customerId}/ledger`, {
    method: "POST",
    body: JSON.stringify({ ...data, userId }),
  });
}
