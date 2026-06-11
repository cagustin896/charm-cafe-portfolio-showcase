import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, inputClass, labelClass, PrimaryButton } from '@/components/ui/Modal';
import { computePeriod, savePeriod, sumAdjustments } from '@/services/payrollService';
import type { PayrollEntry, PayrollAdjustment, PayrollPeriod } from '@/types';
import { formatMoney, formatHours, formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';

interface PayrollModalProps {
  period: PayrollPeriod | null; // null = create new
  onClose: () => void;
}

const ADJ_LABELS: Record<PayrollAdjustment['type'], string> = {
  bonus: 'Bonus',
  deduction: 'Deduction',
  cash_advance: 'Cash advance',
};

export function PayrollModal({ period, onClose }: PayrollModalProps) {
  const queryClient = useQueryClient();
  const isEdit = period !== null;

  const [periodStart, setPeriodStart] = useState(period?.period_start ?? '');
  const [periodEnd, setPeriodEnd] = useState(period?.period_end ?? '');
  const [entries, setEntries] = useState<PayrollEntry[]>(period?.entries ?? []);
  const [computed, setComputed] = useState(isEdit);

  function handleCompute() {
    try {
      const result = computePeriod(periodStart, periodEnd);
      if (result.length === 0) {
        toast.info('No staff with completed shifts or pay rates in that range.');
      }
      setEntries(result);
      setComputed(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not compute');
    }
  }

  function addAdjustment(entryId: string) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? { ...e, adjustments: [...e.adjustments, { type: 'bonus', amount: 0, note: '' }] }
          : e
      )
    );
  }

  function patchAdjustment(entryId: string, idx: number, patch: Partial<PayrollAdjustment>) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? { ...e, adjustments: e.adjustments.map((a, i) => (i === idx ? { ...a, ...patch } : a)) }
          : e
      )
    );
  }

  function removeAdjustment(entryId: string, idx: number) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, adjustments: e.adjustments.filter((_, i) => i !== idx) } : e
      )
    );
  }

  const saveMutation = useMutation({
    mutationFn: async () =>
      savePeriod({ id: period?.id ?? null, periodStart, periodEnd, entries }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      toast.success(isEdit ? 'Payroll updated' : 'Payroll period saved as draft');
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  });

  const grandTotal = entries.reduce(
    (sum, e) => sum + e.base_pay + sumAdjustments(e.adjustments),
    0
  );

  return (
    <Modal
      title={isEdit ? 'Edit Payroll Period' : 'Run Payroll'}
      subtitle={isEdit ? `${formatDate(period.period_start)} – ${formatDate(period.period_end)}` : 'Compute pay from clocked hours'}
      onClose={onClose}
      maxWidth="max-w-[680px]"
      footer={
        computed ? (
          <div className="flex items-center gap-3">
            <div className="text-[12px] text-muted">
              Total payout <span className="font-heading text-[16px] font-semibold text-espresso ml-1">{formatMoney(grandTotal)}</span>
            </div>
            <div className="flex-1">
              <PrimaryButton
                onClick={() => saveMutation.mutate()}
                disabled={entries.length === 0 || saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Save as Draft'}
              </PrimaryButton>
            </div>
          </div>
        ) : (
          <PrimaryButton onClick={handleCompute} disabled={!periodStart || !periodEnd}>
            Compute Pay
          </PrimaryButton>
        )
      }
    >
      <div className="space-y-4">
        {/* Period */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelClass}>Period start</label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => { setPeriodStart(e.target.value); if (!isEdit) setComputed(false); }}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Period end</label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => { setPeriodEnd(e.target.value); if (!isEdit) setComputed(false); }}
              className={inputClass}
            />
          </div>
        </div>

        {!computed ? (
          <p className="text-[12.5px] text-muted rounded-xl border border-dashed border-line px-4 py-6 text-center">
            Pick a date range, then compute pay from each staff member's completed shifts.
          </p>
        ) : entries.length === 0 ? (
          <p className="text-[12.5px] text-muted rounded-xl border border-dashed border-line px-4 py-6 text-center">
            No staff had completed shifts or pay rates in this range.
          </p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const adjTotal = sumAdjustments(entry.adjustments);
              const total = entry.base_pay + adjTotal;
              return (
                <div key={entry.id} className="rounded-xl border border-line bg-cream/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13.5px] font-semibold text-dark-roast">{entry.profile?.full_name}</p>
                      <p className="text-[11.5px] text-muted mt-0.5">
                        {entry.days_worked} {entry.days_worked === 1 ? 'day' : 'days'} ·{' '}
                        {formatHours(entry.hours_worked)} · base {formatMoney(entry.base_pay)}
                      </p>
                    </div>
                    <p className="font-heading text-[16px] font-semibold text-espresso">{formatMoney(total)}</p>
                  </div>

                  {/* Adjustments */}
                  {entry.adjustments.length > 0 && (
                    <div className="space-y-1.5 mt-3">
                      {entry.adjustments.map((adj, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <select
                            value={adj.type}
                            onChange={(e) => patchAdjustment(entry.id, i, { type: e.target.value as PayrollAdjustment['type'] })}
                            className="h-8 px-2 rounded-lg border border-line bg-paper text-[11.5px] font-medium text-dark-roast outline-none focus:border-caramel"
                          >
                            {(Object.keys(ADJ_LABELS) as PayrollAdjustment['type'][]).map((t) => (
                              <option key={t} value={t}>{ADJ_LABELS[t]}</option>
                            ))}
                          </select>
                          <input
                            value={adj.note}
                            onChange={(e) => patchAdjustment(entry.id, i, { note: e.target.value })}
                            placeholder="Note"
                            className="flex-1 h-8 px-2.5 rounded-lg border border-line bg-paper text-[11.5px] text-dark-roast placeholder:text-faint outline-none focus:border-caramel"
                          />
                          <div className="relative w-[96px]">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted">
                              {adj.type === 'bonus' ? '+₱' : '−₱'}
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={adj.amount || ''}
                              onChange={(e) => patchAdjustment(entry.id, i, { amount: Number(e.target.value) || 0 })}
                              placeholder="0"
                              className="w-full h-8 pl-7 pr-2 rounded-lg border border-line bg-paper text-[11.5px] text-right text-dark-roast outline-none focus:border-caramel"
                            />
                          </div>
                          <button
                            onClick={() => removeAdjustment(entry.id, i)}
                            className="flex-none w-7 h-7 rounded-lg grid place-items-center text-taupe hover:text-danger hover:bg-danger-soft transition-colors"
                            aria-label="Remove adjustment"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => addAdjustment(entry.id)}
                    className="flex items-center gap-1 mt-2.5 text-[11px] font-semibold text-caramel hover:text-espresso transition-colors"
                  >
                    <Plus size={12} /> Add bonus / deduction
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

export { ADJ_LABELS };

// Small helper used by the payslip / period view
export function adjustmentClass(type: PayrollAdjustment['type']): string {
  return cn('text-[11.5px]', type === 'bonus' ? 'text-sage' : 'text-danger');
}
