import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Modal, inputClass, selectClass, labelClass, PrimaryButton } from '@/components/ui/Modal';
import { saveExpense, EXPENSE_CATEGORIES, type ExpenseRow } from '@/services/expenseService';
import { useAuthStore } from '@/stores/authStore';
import { todayKey } from '@/utils/format';

interface ExpenseModalProps {
  expense: ExpenseRow | null; // null = create
  onClose: () => void;
}

export function ExpenseModal({ expense, onClose }: ExpenseModalProps) {
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const isEdit = expense !== null;

  const [category, setCategory] = useState(expense?.category ?? 'Inventory');
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [expenseDate, setExpenseDate] = useState(expense?.expense_date ?? todayKey());
  const [note, setNote] = useState(expense?.note ?? '');

  const mutation = useMutation({
    mutationFn: async () =>
      saveExpense(
        { category, amount: Number(amount) || 0, note: note.trim() || null, expenseDate },
        expense?.id ?? null,
        profile?.id ?? 'unknown'
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(isEdit ? 'Expense updated' : 'Expense logged');
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  });

  return (
    <Modal
      title={isEdit ? 'Edit Expense' : 'Add Expense'}
      subtitle={isEdit ? undefined : 'Log operational spending'}
      onClose={onClose}
      footer={
        <PrimaryButton
          onClick={() => mutation.mutate()}
          disabled={!(Number(amount) > 0) || mutation.isPending}
        >
          {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Log Expense'}
        </PrimaryButton>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelClass}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Amount (₱)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>Date</label>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Weekly milk delivery"
            className={inputClass}
          />
        </div>
      </div>
    </Modal>
  );
}
