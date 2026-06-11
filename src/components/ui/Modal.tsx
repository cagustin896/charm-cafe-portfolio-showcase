import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ title, subtitle, onClose, children, footer, maxWidth = 'max-w-[440px]' }: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-dark-roast/40 backdrop-blur-[2px] grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          'w-full bg-paper rounded-2xl border border-line shadow-[0_16px_60px_rgba(44,24,16,0.25)] overflow-hidden',
          maxWidth
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-line">
          <div>
            <h2 className="font-heading text-[19px] font-semibold text-dark-roast">{title}</h2>
            {subtitle && <p className="text-muted text-[12px] mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex-none w-8 h-8 rounded-full grid place-items-center text-taupe hover:text-espresso hover:bg-cream transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">{children}</div>

        {footer && <div className="px-6 py-4 border-t border-line bg-cream/30">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Shared form field styles ────────────────────────────────────────────────

export const inputClass = cn(
  'w-full h-10 px-3.5 rounded-lg border bg-cream/50 text-[13px] text-dark-roast placeholder:text-faint',
  'outline-none transition-all border-line focus:border-caramel focus:shadow-[0_0_0_3px_rgba(164,124,88,0.12)]'
);

export const selectClass = cn(
  'w-full h-10 px-3 rounded-lg border border-line bg-cream/50 text-[13px] text-dark-roast',
  'outline-none focus:border-caramel'
);

export const labelClass = 'text-[11px] font-bold text-muted uppercase tracking-wide';

export function PrimaryButton({
  children, onClick, disabled, type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full h-11 rounded-xl font-semibold text-[13.5px] transition-all',
        'bg-caramel text-paper hover:bg-caramel-dark',
        'shadow-[0_2px_8px_rgba(164,124,88,0.3)] hover:shadow-[0_4px_16px_rgba(164,124,88,0.4)]',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none'
      )}
    >
      {children}
    </button>
  );
}
