import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, inputClass, selectClass, labelClass, PrimaryButton } from '@/components/ui/Modal';
import { saveAddOn, deleteAddOn, recipeCost, type AddOnDraft } from '@/services/productService';
import { getInventory } from '@/services/inventoryService';
import type { AddOn } from '@/types';
import { formatMoney } from '@/utils/format';
import { cn } from '@/utils/cn';

interface AddOnEditorProps {
  addOn: AddOn | null; // null = create
  onClose: () => void;
}

export function AddOnEditor({ addOn, onClose }: AddOnEditorProps) {
  const queryClient = useQueryClient();
  const isEdit = addOn !== null;

  const { data: inventory = [] } = useQuery({ queryKey: ['inventory'], queryFn: getInventory });

  const [draft, setDraft] = useState<AddOnDraft>(() => ({
    id: addOn?.id ?? null,
    name: addOn?.name ?? '',
    price: addOn?.price ?? 0,
    recipe: (addOn?.recipe_items ?? []).map((r) => ({
      inventory_item_id: r.inventory_item_id,
      qty_per_sale: r.qty_per_sale,
    })),
  }));

  const saveMutation = useMutation({
    mutationFn: async () => saveAddOn(draft),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      toast.success(`${saved.name} saved`);
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => deleteAddOn(addOn!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      toast.success(`${addOn!.name} removed`);
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Remove failed'),
  });

  const cost = recipeCost(draft.recipe, inventory);

  return (
    <Modal
      title={isEdit ? 'Edit Add-on' : 'New Add-on'}
      subtitle={isEdit ? addOn.name : 'Extras customers can add to drinks'}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {isEdit && (
            <button
              onClick={() => {
                if (window.confirm(`Remove "${addOn!.name}" from add-ons?`)) deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              className="h-11 px-4 rounded-xl border border-line text-muted text-[12.5px] font-semibold hover:text-danger hover:border-danger/40 transition-colors disabled:opacity-40"
            >
              Remove
            </button>
          )}
          <div className="flex-1">
            <PrimaryButton
              onClick={() => saveMutation.mutate()}
              disabled={!draft.name.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Add-on'}
            </PrimaryButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_140px] gap-3">
          <div className="space-y-1.5">
            <label className={labelClass}>Add-on name</label>
            <input
              autoFocus={!isEdit}
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="e.g. Coffee Jelly"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Price (₱)</label>
            <input
              type="number"
              min={0}
              value={draft.price || ''}
              onChange={(e) => setDraft((d) => ({ ...d, price: Number(e.target.value) || 0 }))}
              placeholder="0"
              className={inputClass}
            />
          </div>
        </div>

        {/* Recipe */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={labelClass}>Recipe (deducted per serving)</label>
            <button
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  recipe: [...d.recipe, { inventory_item_id: '', qty_per_sale: 0 }],
                }))
              }
              className="flex items-center gap-1 text-[11.5px] font-semibold text-caramel hover:text-espresso transition-colors"
            >
              <Plus size={13} /> Add ingredient
            </button>
          </div>

          {draft.recipe.length === 0 ? (
            <p className="text-[12px] text-muted rounded-xl border border-dashed border-line px-4 py-4 text-center">
              No recipe — this add-on won't deduct any stock when sold.
            </p>
          ) : (
            <div className="space-y-1.5">
              {draft.recipe.map((row, i) => {
                const item = inventory.find((inv) => inv.id === row.inventory_item_id);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={row.inventory_item_id}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          recipe: d.recipe.map((r, j) =>
                            j === i ? { ...r, inventory_item_id: e.target.value } : r
                          ),
                        }))
                      }
                      className={cn(selectClass, 'h-9 flex-1')}
                    >
                      <option value="">Select ingredient…</option>
                      {inventory.map((inv) => (
                        <option key={inv.id} value={inv.id}>{inv.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={row.qty_per_sale || ''}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          recipe: d.recipe.map((r, j) =>
                            j === i ? { ...r, qty_per_sale: Number(e.target.value) || 0 } : r
                          ),
                        }))
                      }
                      placeholder="Qty"
                      className={cn(inputClass, 'h-9 w-[84px] flex-none text-right')}
                    />
                    <span className="w-9 flex-none text-[11px] text-muted">{item?.unit_name ?? ''}</span>
                    <button
                      onClick={() =>
                        setDraft((d) => ({ ...d, recipe: d.recipe.filter((_, j) => j !== i) }))
                      }
                      className="flex-none w-8 h-8 rounded-lg grid place-items-center text-taupe hover:text-danger hover:bg-danger-soft transition-colors"
                      aria-label="Remove ingredient"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Margin strip */}
        <div className="rounded-xl border border-line bg-cream/40 px-4 py-3 flex justify-between text-[12px]">
          <span className="text-muted">Ingredient cost {formatMoney(cost)}</span>
          <span className={cn('font-semibold', draft.price - cost >= 0 ? 'text-sage' : 'text-danger')}>
            Margin {formatMoney(draft.price - cost)}
          </span>
        </div>
      </div>
    </Modal>
  );
}
