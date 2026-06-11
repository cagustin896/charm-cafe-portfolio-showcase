// ─── Expense Service ──────────────────────────────────────────────────────────
// Operational spending log. Feeds the P&L in Analytics (Phase 7).

import type { Expense, Profile } from '@/types';
import { readCollection, writeCollection, uid, nowIso } from '@/services/storage';
import { todayKey } from '@/utils/format';

export const EXPENSE_CATEGORIES = [
  'Inventory',
  'Supplies',
  'Rent',
  'Utilities',
  'Salaries',
  'Marketing',
  'Equipment',
  'Maintenance',
  'Permits & Fees',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface ExpenseRow extends Expense {
  actor_name: string;
}

export async function getExpenses(): Promise<ExpenseRow[]> {
  const expenses = readCollection<Expense>('expenses');
  const profiles = readCollection<Profile>('profiles');
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  return expenses
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date) || b.created_at.localeCompare(a.created_at))
    .map((e) => ({
      ...e,
      actor_name: (e.created_by && profileById.get(e.created_by)?.full_name) || '—',
    }));
}

export interface ExpenseInput {
  category: string;
  amount: number;
  note: string | null;
  expenseDate: string; // yyyy-MM-dd
}

export function saveExpense(input: ExpenseInput, id: string | null, createdBy: string): Expense {
  if (!(input.amount > 0)) throw new Error('Amount must be greater than zero');
  if (!input.category) throw new Error('Pick a category');
  if (!input.expenseDate) throw new Error('Pick a date');

  const expenses = readCollection<Expense>('expenses');
  const now = nowIso();

  if (id) {
    const existing = expenses.find((e) => e.id === id);
    if (!existing) throw new Error('Expense not found');
    const updated: Expense = {
      ...existing,
      category: input.category,
      amount: input.amount,
      note: input.note,
      expense_date: input.expenseDate,
      updated_at: now,
    };
    writeCollection('expenses', expenses.map((e) => (e.id === id ? updated : e)));
    return updated;
  }

  const expense: Expense = {
    id: uid(),
    category: input.category,
    amount: input.amount,
    note: input.note,
    expense_date: input.expenseDate,
    receipt_url: null,
    created_by: createdBy,
    created_at: now,
    updated_at: now,
  };
  writeCollection('expenses', [...expenses, expense]);
  return expense;
}

export function deleteExpense(id: string): void {
  const expenses = readCollection<Expense>('expenses');
  if (!expenses.some((e) => e.id === id)) throw new Error('Expense not found');
  writeCollection('expenses', expenses.filter((e) => e.id !== id));
}

// ─── Summaries ───────────────────────────────────────────────────────────────

export interface ExpenseSummary {
  total: number;
  thisMonth: number;
  byCategory: { category: string; amount: number }[];
}

export function summarizeExpenses(expenses: ExpenseRow[]): ExpenseSummary {
  const monthPrefix = todayKey().slice(0, 7); // yyyy-MM
  let total = 0;
  let thisMonth = 0;
  const catMap = new Map<string, number>();

  for (const e of expenses) {
    total += e.amount;
    if (e.expense_date.slice(0, 7) === monthPrefix) thisMonth += e.amount;
    catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.amount);
  }

  const byCategory = [...catMap.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return { total, thisMonth, byCategory };
}
