import { Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Order } from '@/types';
import { LogoMark } from '@/components/ui/Logo';
import { getSettings } from '@/services/settingsService';
import { formatMoney, formatDateTime } from '@/utils/format';

interface ReceiptModalProps {
  order: Order;
  onClose: () => void;
}

export function ReceiptModal({ order, onClose }: ReceiptModalProps) {
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getSettings });

  return (
    <div className="fixed inset-0 z-50 bg-dark-roast/40 backdrop-blur-[2px] grid place-items-center p-4">
      <div className="w-full max-w-[360px] bg-paper rounded-2xl border border-line shadow-[0_16px_60px_rgba(44,24,16,0.25)] overflow-hidden">

        {/* Success header */}
        <div className="px-6 pt-7 pb-5 text-center border-b border-dashed border-line">
          <div className="inline-flex w-12 h-12 rounded-full bg-sage-soft border border-sage/30 items-center justify-center mb-3">
            <Check size={22} className="text-sage" />
          </div>
          <h2 className="font-heading text-[20px] font-semibold text-dark-roast">Payment complete</h2>
          <p className="text-muted text-[12px] mt-1">
            {order.order_no} · {formatDateTime(order.created_at)}
          </p>
        </div>

        {/* Items */}
        <div className="px-6 py-4 max-h-[38vh] overflow-y-auto">
          <div className="space-y-2.5">
            {(order.items ?? []).map((item) => (
              <div key={item.id} className="text-[12.5px]">
                <div className="flex justify-between gap-3">
                  <span className="text-dark-roast font-medium">
                    {item.quantity}× {item.product_name}
                    {item.size_label !== 'Regular' && (
                      <span className="text-muted"> ({item.size_label})</span>
                    )}
                  </span>
                  <span className="flex-none font-semibold text-espresso">
                    {formatMoney(item.line_total)}
                  </span>
                </div>
                {(item.add_ons ?? []).length > 0 && (
                  <p className="text-[11px] text-muted mt-0.5 pl-4">
                    + {(item.add_ons ?? []).map((a) => a.add_on_name).join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="px-6 pb-4 space-y-1.5 border-t border-dashed border-line pt-4">
          <div className="flex justify-between text-[12px] text-muted">
            <span>Subtotal</span>
            <span>{formatMoney(order.subtotal)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-[12px] text-sage font-medium">
              <span>{order.discount_type_name ?? 'Discount'}</span>
              <span>−{formatMoney(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-heading text-[18px] font-semibold text-espresso pt-1">
            <span>Total</span>
            <span>{formatMoney(order.total)}</span>
          </div>
          <div className="flex justify-between text-[12px] text-muted pt-1">
            <span>Paid via</span>
            <span className="font-semibold uppercase">{order.payment_method}</span>
          </div>
          {order.payment_method === 'cash' && order.amount_tendered != null && (
            <>
              <div className="flex justify-between text-[12px] text-muted">
                <span>Cash received</span>
                <span>{formatMoney(order.amount_tendered)}</span>
              </div>
              <div className="flex justify-between text-[13px] font-semibold text-sage">
                <span>Change</span>
                <span>{formatMoney(order.change_due ?? 0)}</span>
              </div>
            </>
          )}
          {order.payment_method === 'gcash' && order.gcash_ref && (
            <div className="flex justify-between text-[12px] text-muted">
              <span>GCash ref</span>
              <span className="font-mono">{order.gcash_ref}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-taupe pb-4">
            <LogoMark size={12} />
            <span>{settings?.receipt_footer ?? 'Salamat, see you again!'}</span>
          </div>
          <button
            onClick={onClose}
            autoFocus
            className="w-full h-11 rounded-xl bg-dark-roast text-paper font-semibold text-[13.5px] hover:bg-espresso transition-colors"
          >
            Start New Order
          </button>
        </div>
      </div>
    </div>
  );
}
