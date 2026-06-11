import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Modal, inputClass, labelClass, PrimaryButton } from '@/components/ui/Modal';
import { saveAsset, type AssetInput } from '@/services/assetService';
import type { Asset } from '@/types';

interface AssetModalProps {
  asset: Asset | null; // null = create
  onClose: () => void;
}

export function AssetModal({ asset, onClose }: AssetModalProps) {
  const queryClient = useQueryClient();
  const isEdit = asset !== null;

  const [name, setName] = useState(asset?.name ?? '');
  const [price, setPrice] = useState(asset ? String(asset.purchase_price) : '');
  const [date, setDate] = useState(asset?.purchase_date ?? '');
  const [note, setNote] = useState(asset?.note ?? '');

  const mutation = useMutation({
    mutationFn: async () => {
      const input: AssetInput = {
        name,
        purchasePrice: Number(price) || 0,
        purchaseDate: date || null,
        note: note.trim() || null,
      };
      return saveAsset(input, asset?.id ?? null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success(isEdit ? 'Asset updated' : 'Asset added');
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  });

  return (
    <Modal
      title={isEdit ? 'Edit Asset' : 'Add Asset'}
      subtitle={isEdit ? asset.name : 'Equipment or fixture'}
      onClose={onClose}
      footer={
        <PrimaryButton onClick={() => mutation.mutate()} disabled={!name.trim() || mutation.isPending}>
          {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Asset'}
        </PrimaryButton>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className={labelClass}>Asset name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Espresso Machine"
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelClass}>Purchase price (₱)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Purchase date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Bought from Lazada, 1-yr warranty"
            className={inputClass}
          />
        </div>
      </div>
    </Modal>
  );
}
