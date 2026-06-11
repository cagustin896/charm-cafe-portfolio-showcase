import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Undo2, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { getOrders, voidOrderItem } from '@/services/salesService';
import { useAuthStore, selectIsManager } from '@/stores/authStore';
import type { Order, OrderItem } from '@/types';
import { formatMoney, formatTime, formatDateShort } from '@/utils/format';
import { cn } from '@/utils/cn';

export function RecentOrdersModal({ onClose }: { onClose: () => void }) {
  const isManager = useAuthStore(selectIsManager);
  const { data: orders = [] } = useQuery({
    queryKey: ['orders', 'recent-30'],
    queryFn: () => getOrders(30),
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Modal
      title="Recent Orders"
      subtitle={isManager ? 'Tap an order to see items — voiding restores stock.' : 'Tap an order to see its items.'}
      onClose={onClose}
      maxWidth="max-w-[520px]"
    >
      {orders.length === 0 ? (
        <div className="py-10 text-center">
          <ReceiptText size={28} className="mx-auto text-taupe/40" />
          <p className="text-muted text-sm mt-3">No orders yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              expanded={expandedId === order.id}
              onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
              canVoid={isManager}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}

function OrderRow({
  order, expanded, onToggle, canVoid,
}: {
  order: Order;
  expanded: boolean;
  onToggle: () => void;
  canVoid: boolean;
}) {
  const itemCount = (order.items ?? []).reduce((s, i) => s + (i.is_voided ? 0 : i.quantity), 0);
  const isVoided = order.status === 'voided';

  return (
    <div className={cn('rounded-xl border overflow-hidden transition-colors', expanded ? 'border-caramel' : 'border-line')}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-cream/30 hover:bg-cream/60 transition-colors text-left"
      >
        <div>
          <p className={cn('text-[13px] font-semibold', isVoided ? 'text-muted line-through' : 'text-dark-roast')}>
            {order.order_no}
            <span className="ml-2 text-[10px] font-bold uppercase text-taupe no-underline">{order.payment_method}</span>
            {isVoided && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-danger-soft text-danger text-[9.5px] font-bold border border-danger/25 no-underline">
                VOIDED
              </span>
            )}
          </p>
          <p className="text-[11px] text-muted mt-0.5">
            {formatDateShort(order.created_at)} · {formatTime(order.created_at)} · {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-heading text-[15px] font-semibold text-espresso">{formatMoney(order.total)}</span>
          <ChevronDown size={14} className={cn('text-taupe transition-transform', expanded && 'rotate-180')} />
        </div>
      </button>

      {expanded && (
        <div className="divide-y divide-line/60 border-t border-line">
          {(order.items ?? []).map((item) => (
            <ItemRow key={item.id} order={order} item={item} canVoid={canVoid} />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemRow({ order, item, canVoid }: { order: Order; item: OrderItem; canVoid: boolean }) {
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState('');

  const voidMutation = useMutation({
    mutationFn: async () => voidOrderItem(order.id, item.id, reason, profile?.id ?? 'unknown'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success(`Voided ${item.product_name} — stock restored`);
      setVoiding(false);
      setReason('');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Void failed'),
  });

  return (
    <div className="px-4 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('text-[12.5px] font-medium', item.is_voided ? 'text-muted line-through' : 'text-dark-roast')}>
            {item.quantity}× {item.product_name}
            {item.size_label !== 'Regular' && <span className="text-muted"> ({item.size_label})</span>}
          </p>
          {(item.add_ons ?? []).length > 0 && (
            <p className="text-[10.5px] text-muted">+ {(item.add_ons ?? []).map((a) => a.add_on_name).join(', ')}</p>
          )}
          {item.is_voided && item.void_reason && (
            <p className="text-[10.5px] text-danger mt-0.5">Voided: {item.void_reason}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-none">
          <span className={cn('text-[12.5px] font-semibold', item.is_voided ? 'text-muted line-through' : 'text-espresso')}>
            {formatMoney(item.line_total)}
          </span>
          {canVoid && !item.is_voided && !voiding && (
            <button
              onClick={() => setVoiding(true)}
              title="Void item"
              className="flex items-center gap-1 h-7 px-2 rounded-lg border border-line text-[10.5px] font-semibold text-muted hover:text-danger hover:border-danger/40 transition-colors"
            >
              <Undo2 size={11} /> Void
            </button>
          )}
        </div>
      </div>

      {voiding && (
        <div className="flex items-center gap-2 mt-2">
          <input
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (required) — e.g. wrong order, customer changed mind"
            className="flex-1 h-8 px-3 rounded-lg border border-line bg-cream/50 text-[11.5px] text-dark-roast placeholder:text-faint outline-none focus:border-caramel"
          />
          <button
            onClick={() => voidMutation.mutate()}
            disabled={!reason.trim() || voidMutation.isPending}
            className="h-8 px-3 rounded-lg bg-danger text-paper text-[11px] font-semibold hover:brightness-95 transition-all disabled:opacity-40"
          >
            {voidMutation.isPending ? '…' : 'Confirm Void'}
          </button>
          <button
            onClick={() => { setVoiding(false); setReason(''); }}
            className="h-8 px-2.5 rounded-lg border border-line text-[11px] font-semibold text-muted hover:text-espresso transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
