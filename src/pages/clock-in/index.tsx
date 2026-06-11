import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, LogIn, LogOut, Delete, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageShell, SectionPanel } from '@/components/ui/PageShell';
import { getClockStatus, clockIn, clockOut, type ClockableStaff } from '@/services/timeService';
import { formatTime, formatHours } from '@/utils/format';
import { cn } from '@/utils/cn';

export default function ClockIn() {
  const queryClient = useQueryClient();
  const { data: staff = [] } = useQuery({ queryKey: ['clock-status'], queryFn: getClockStatus });
  const [selected, setSelected] = useState<ClockableStaff | null>(null);

  return (
    <PageShell
      title="Clock In / Out"
      subtitle="Tap your name, enter your PIN if you have one, and record your time."
    >
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {staff.map((person) => {
          const isIn = !!person.open_log_id;
          return (
            <button
              key={person.id}
              onClick={() => setSelected(person)}
              className={cn(
                'relative text-left rounded-2xl border p-5 min-h-[128px] flex flex-col transition-all active:scale-[0.98]',
                isIn
                  ? 'bg-sage-soft border-sage/30 hover:border-sage'
                  : 'bg-paper border-line hover:border-caramel hover:shadow-[0_4px_16px_rgba(164,124,88,0.15)]'
              )}
            >
              <div className={cn(
                'w-11 h-11 rounded-full grid place-items-center text-[15px] font-bold text-paper',
                isIn ? 'bg-sage' : 'bg-gradient-to-br from-caramel to-espresso'
              )}>
                {person.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <p className="font-heading text-[15px] font-semibold text-dark-roast mt-3 leading-tight">
                {person.full_name}
              </p>
              <p className="text-[11px] text-muted mt-0.5 capitalize">{person.cafe_role}</p>
              {isIn ? (
                <span className="mt-auto pt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-sage">
                  <span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
                  In since {person.clocked_in_at ? formatTime(person.clocked_in_at) : ''}
                </span>
              ) : (
                <span className="mt-auto pt-2 text-[11px] text-taupe">Tap to clock in</span>
              )}
            </button>
          );
        })}
      </div>

      {staff.length === 0 && (
        <SectionPanel noPad>
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Clock size={32} className="text-taupe/40" />
            <p className="text-muted text-sm">No active staff to clock in.</p>
          </div>
        </SectionPanel>
      )}

      {selected && (
        <ClockDialog
          key={selected.id}
          person={selected}
          onClose={() => setSelected(null)}
          onDone={() => {
            queryClient.invalidateQueries({ queryKey: ['clock-status'] });
            queryClient.invalidateQueries({ queryKey: ['time-logs'] });
            queryClient.invalidateQueries({ queryKey: ['staff'] });
            setSelected(null);
          }}
        />
      )}
    </PageShell>
  );
}

function ClockDialog({ person, onClose, onDone }: { person: ClockableStaff; onClose: () => void; onDone: () => void }) {
  const isIn = !!person.open_log_id;
  const [pin, setPin] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      if (isIn) {
        const hours = clockOut(person.id, person.has_pin ? pin : null);
        return { action: 'out' as const, hours };
      }
      clockIn(person.id, person.has_pin ? pin : null);
      return { action: 'in' as const, hours: 0 };
    },
    onSuccess: (result) => {
      if (result.action === 'out') {
        toast.success(`${person.full_name} clocked out · ${formatHours(result.hours)} this shift`);
      } else {
        toast.success(`${person.full_name} clocked in`);
      }
      onDone();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed');
      setPin('');
    },
  });

  const needsPin = person.has_pin;
  const canSubmit = !needsPin || pin.length >= 4;

  function press(digit: string) {
    if (pin.length < 6) setPin((p) => p + digit);
  }

  return (
    <div className="fixed inset-0 z-50 bg-dark-roast/40 backdrop-blur-[2px] grid place-items-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-[360px] bg-paper rounded-2xl border border-line shadow-[0_16px_60px_rgba(44,24,16,0.25)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-line">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-caramel">
              {isIn ? 'Clocking out' : 'Clocking in'}
            </p>
            <h2 className="font-heading text-[19px] font-semibold text-dark-roast mt-0.5">{person.full_name}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex-none w-8 h-8 rounded-full grid place-items-center text-taupe hover:text-espresso hover:bg-cream transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5">
          {needsPin ? (
            <>
              <p className="text-[12px] text-muted text-center mb-3">Enter your PIN</p>
              <div className="flex justify-center gap-2 mb-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'w-3 h-3 rounded-full border-2 transition-colors',
                      i < pin.length ? 'bg-caramel border-caramel' : 'border-line'
                    )}
                  />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                  <PinKey key={d} onClick={() => press(d)}>{d}</PinKey>
                ))}
                <PinKey onClick={() => setPin('')} aria-label="Clear">
                  <X size={18} className="mx-auto" />
                </PinKey>
                <PinKey onClick={() => press('0')}>0</PinKey>
                <PinKey onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Backspace">
                  <Delete size={18} className="mx-auto" />
                </PinKey>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-muted text-center py-4">
              Confirm you want to {isIn ? 'clock out' : 'clock in'}.
            </p>
          )}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className={cn(
              'w-full h-13 py-3.5 rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2 transition-all',
              isIn
                ? 'bg-espresso text-paper hover:bg-dark-roast'
                : 'bg-caramel text-paper hover:bg-caramel-dark shadow-[0_2px_8px_rgba(164,124,88,0.3)]',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none'
            )}
          >
            {mutation.isPending ? (
              <span className="w-4 h-4 border-2 border-paper border-t-transparent rounded-full animate-spin" />
            ) : isIn ? (
              <><LogOut size={16} /> Clock Out</>
            ) : (
              <><LogIn size={16} /> Clock In</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function PinKey({ children, onClick, ...rest }: { children: React.ReactNode; onClick: () => void } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      className="h-14 rounded-xl bg-cream/60 border border-line text-[20px] font-semibold text-dark-roast hover:bg-cream hover:border-caramel active:scale-95 transition-all"
      {...rest}
    >
      {children}
    </button>
  );
}
