import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Modal, inputClass, selectClass, labelClass, PrimaryButton } from '@/components/ui/Modal';
import {
  createInventoryItem, updateInventoryItem, deactivateInventoryItem,
  getInventoryCategories, getUnits, type InventoryRow,
} from '@/services/inventoryService';
import { useAuthStore } from '@/stores/authStore';

interface ItemFormModalProps {
  item: InventoryRow | null; // null = create
  onClose: () => void;
}

export function ItemFormModal({ item, onClose }: ItemFormModalProps) {
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const isEdit = item !== null;

  const { data: categories = [] } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: getInventoryCategories,
  });
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: getUnits });

  const [name, setName] = useState(item?.name ?? '');
  const [categoryId, setCategoryId] = useState(item?.category_id ?? '');
  const [unitId, setUnitId] = useState(item?.unit_id ?? '');
  const [threshold, setThreshold] = useState(String(item?.low_stock_threshold ?? ''));
  const [unitCost, setUnitCost] = useState(String(item?.unit_cost ?? ''));
  const [initialStock, setInitialStock] = useState('');

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['movements'] });
    queryClient.invalidateQueries({ queryKey: ['catalog'] });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const input = {
        name,
        categoryId: categoryId || null,
        unitId: unitId || null,
        lowStockThreshold: Number(threshold) || 0,
        unitCost: Number(unitCost) || 0,
        initialStock: Number(initialStock) || 0,
      };
      if (isEdit) updateInventoryItem(item.id, input);
      else createInventoryItem(input, profile?.id ?? 'unknown');
    },
    onSuccess: () => {
      invalidate();
      toast.success(isEdit ? `${name} updated` : `${name} added to inventory`);
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  });

  const removeMutation = useMutation({
    mutationFn: async () => deactivateInventoryItem(item!.id),
    onSuccess: () => {
      invalidate();
      toast.success(`${item!.name} removed from inventory`);
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Remove failed'),
  });

  function handleRemove() {
    if (window.confirm(`Remove "${item!.name}" from inventory? Recipes using it will show as out of stock.`)) {
      removeMutation.mutate();
    }
  }

  return (
    <Modal
      title={isEdit ? 'Edit Item' : 'New Inventory Item'}
      subtitle={isEdit ? item.name : 'Add an ingredient or supply'}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {isEdit && (
            <button
              onClick={handleRemove}
              disabled={removeMutation.isPending}
              className="h-11 px-4 rounded-xl border border-line text-muted text-[12.5px] font-semibold hover:text-danger hover:border-danger/40 transition-colors disabled:opacity-40"
            >
              Remove
            </button>
          )}
          <div className="flex-1">
            <PrimaryButton
              onClick={() => saveMutation.mutate()}
              disabled={!name.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Item'}
            </PrimaryButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className={labelClass}>Item name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Oat Milk"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelClass}>Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={selectClass}>
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Unit</label>
            <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={selectClass}>
              <option value="">No unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelClass}>Low stock alert at</label>
            <input
              type="number"
              min={0}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Cost per unit (₱)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
        </div>

        {!isEdit && (
          <div className="space-y-1.5">
            <label className={labelClass}>Opening stock (optional)</label>
            <input
              type="number"
              min={0}
              value={initialStock}
              onChange={(e) => setInitialStock(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
