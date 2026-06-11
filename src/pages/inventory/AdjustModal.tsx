import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Modal, inputClass, labelClass, PrimaryButton } from '@/components/ui/Modal';
import { adjustStock, type InventoryRow } from '@/services/inventoryService';
import { useAuthStore } from '@/stores/authStore';
import { formatNumber } from '@/utils/format';
import { cn } from '@/utils/cn';

interface AdjustModalProps {
  item: InventoryRow;
  onClose: () => void;
}

export function AdjustModal({ item, onClose }: AdjustModalProps) {
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();

  const [direction, setDirection] = useState<'add' | 'remove'>('remove');
  const [reason, setReason] = useState<'adjustment' | 'waste'>('adjustment');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');

  const qtyNum = Number(quantity) || 0;
  const signedChange = direction === 'add' ? qtyNum : -qtyNum;
  const newStock = Math.round((item.current_stock + signedChange) * 100) / 100;
  const wouldGoNegative = newStock < 0;

  const mutation = useMutation({
    mutationFn: async () => {
      adjustStock({
        inventoryItemId: item.id,
        qtyChange: signedChange,
        reason,
        note: note.trim() || null,
        createdBy: profile?.id ?? 'unknown',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      toast.success(`${item.name} adjusted to ${formatNumber(newStock)} ${item.unit_name}`);
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Adjustment failed'),
  });

  return (
    <Modal
      title="Adjust Stock"
      subtitle={`${item.name} · ${formatNumber(item.current_stock)} ${item.unit_name} on hand`}
      onClose={onClose}
      footer={
        <PrimaryButton
          onClick={() => mutation.mutate()}
          disabled={qtyNum <= 0 || wouldGoNegative || mutation.isPending}
        >
          {mutation.isPending ? 'Saving…' : 'Apply Adjustment'}
        </PrimaryButton>
      }
    >
      <div className="space-y-4">

        {/* Direction */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-cream border border-line">
          {(['remove', 'add'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={cn(
                'h-9 rounded-full text-[12px] font-semibold transition-all',
                direction === d ? 'bg-dark-roast text-paper shadow-sm' : 'text-muted hover:text-espresso'
              )}
            >
              {d === 'remove' ? '− Remove stock' : '+ Add stock'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelClass}>Quantity ({item.unit_name})</label>
            <input
              type="number"
              min={0}
              autoFocus
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as 'adjustment' | 'waste')}
              className={cn(inputClass, 'appearance-none')}
            >
              <option value="adjustment">Count correction</option>
              <option value="waste">Waste / spoilage</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={reason === 'waste' ? 'e.g. Spoiled milk, expired' : 'e.g. Physical count correction'}
            className={inputClass}
          />
        </div>

        {qtyNum > 0 && (
          <div
            className={cn(
              'rounded-xl border px-4 py-3 text-[12px] flex justify-between',
              wouldGoNegative
                ? 'border-danger/30 bg-danger-soft text-danger'
                : 'border-line bg-cream/40 text-muted'
            )}
          >
            <span>{wouldGoNegative ? 'Not enough stock on hand' : 'New stock level'}</span>
            <span className="font-semibold">
              {formatNumber(newStock)} {item.unit_name}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}
