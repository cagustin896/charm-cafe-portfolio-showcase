import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Modal, inputClass, labelClass, PrimaryButton } from '@/components/ui/Modal';
import { processStockIn, type InventoryRow } from '@/services/inventoryService';
import { useAuthStore } from '@/stores/authStore';
import { formatMoney, formatNumber } from '@/utils/format';

interface StockInModalProps {
  item: InventoryRow;
  onClose: () => void;
}

export function StockInModal({ item, onClose }: StockInModalProps) {
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();

  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState(String(item.unit_cost));
  const [supplier, setSupplier] = useState('');
  const [note, setNote] = useState('');

  const qtyNum = Number(quantity) || 0;
  const costNum = Number(unitCost) || 0;

  const onHand = Math.max(0, item.current_stock);
  const newAvgCost =
    onHand + qtyNum > 0
      ? (onHand * item.unit_cost + qtyNum * costNum) / (onHand + qtyNum)
      : costNum;

  const mutation = useMutation({
    mutationFn: async () => {
      processStockIn({
        inventoryItemId: item.id,
        quantity: qtyNum,
        unitCost: costNum,
        supplier: supplier.trim() || null,
        note: note.trim() || null,
        createdBy: profile?.id ?? 'unknown',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      toast.success(`Stocked in ${formatNumber(qtyNum)} ${item.unit_name} of ${item.name}`);
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Stock in failed'),
  });

  return (
    <Modal
      title="Stock In"
      subtitle={`${item.name} · ${formatNumber(item.current_stock)} ${item.unit_name} on hand`}
      onClose={onClose}
      footer={
        <PrimaryButton
          onClick={() => mutation.mutate()}
          disabled={qtyNum <= 0 || costNum < 0 || mutation.isPending}
        >
          {mutation.isPending
            ? 'Saving…'
            : `Receive · ${formatMoney(qtyNum * costNum)}`}
        </PrimaryButton>
      }
    >
      <div className="space-y-4">
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
            <label className={labelClass}>Cost per {item.unit_name} (₱)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>Supplier (optional)</label>
          <input
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="e.g. Metro Cebu Supplies"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Weekly delivery"
            className={inputClass}
          />
        </div>

        {/* Weighted average preview */}
        {qtyNum > 0 && (
          <div className="rounded-xl border border-line bg-cream/40 px-4 py-3 space-y-1">
            <div className="flex justify-between text-[12px] text-muted">
              <span>New stock level</span>
              <span className="font-semibold text-espresso">
                {formatNumber(item.current_stock + qtyNum)} {item.unit_name}
              </span>
            </div>
            <div className="flex justify-between text-[12px] text-muted">
              <span>New average cost</span>
              <span className="font-semibold text-espresso">
                {formatMoney(newAvgCost)} / {item.unit_name}
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
