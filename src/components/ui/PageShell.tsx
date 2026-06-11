import { cn } from '@/utils/cn';

interface PageShellProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ title, subtitle, action, children, className }: PageShellProps) {
  return (
    <div className={cn('px-8 py-7', className)}>
      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-espresso leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-muted text-[12.5px] mt-1.5 max-w-xl">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex-none">{action}</div>}
      </div>
      {children}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  detail?: string;
  tone?: 'default' | 'warning' | 'success' | 'dark';
  icon?: React.ReactNode;
}

export function MetricCard({ label, value, detail, tone = 'default', icon }: MetricCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-5 min-h-[96px]',
        tone === 'dark' && 'bg-espresso border-espresso text-paper',
        tone !== 'dark' && 'bg-paper border-line'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn('text-[10.5px] font-bold uppercase tracking-wider', tone === 'dark' ? 'text-sand/70' : 'text-muted')}>
          {label}
        </p>
        {icon && <div className={cn('flex-none opacity-50', tone === 'dark' ? 'text-sand' : 'text-caramel')}>{icon}</div>}
      </div>
      <p
        className={cn(
          'text-[26px] font-heading font-semibold mt-3 leading-none',
          tone === 'dark' && 'text-paper',
          tone === 'warning' && 'text-amber',
          tone === 'success' && 'text-sage',
          tone === 'default' && 'text-espresso'
        )}
      >
        {value}
      </p>
      {detail && (
        <p className={cn('text-[11px] mt-2', tone === 'dark' ? 'text-sand/60' : 'text-muted')}>
          {detail}
        </p>
      )}
    </div>
  );
}

interface SectionPanelProps {
  title?: string;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPad?: boolean;
}

export function SectionPanel({ title, badge, action, children, className, noPad }: SectionPanelProps) {
  return (
    <div className={cn('bg-paper border border-line rounded-xl overflow-hidden', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line">
          <div className="flex items-center gap-2.5">
            {title && <h2 className="text-[14px] font-semibold text-espresso">{title}</h2>}
            {badge && (
              <span className="px-2 py-0.5 rounded-full bg-cream text-muted text-[10.5px] font-semibold border border-line">
                {badge}
              </span>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={noPad ? undefined : 'p-5'}>
        {children}
      </div>
    </div>
  );
}

export function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  renderCell,
  emptyMessage = 'No data yet',
}: {
  columns: { label: string; key: string; align?: 'left' | 'right' | 'center'; width?: string }[];
  rows: T[];
  keyExtractor: (row: T) => string;
  renderCell: (row: T, key: string) => React.ReactNode;
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-line">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-muted whitespace-nowrap',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                  !col.align && 'text-left'
                )}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-muted text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={keyExtractor(row)} className="border-b border-line/60 hover:bg-cream/40 transition-colors last:border-0">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3.5 text-[13px] text-dark-roast',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center'
                    )}
                  >
                    {renderCell(row, col.key)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
