// ─── Payslip PDF ──────────────────────────────────────────────────────────────
// One page per staff entry. Pure jsPDF (no html2canvas) for crisp, light output.

import { jsPDF } from 'jspdf';
import type { PayrollPeriod } from '@/types';
import { readSingleton } from '@/services/storage';
import { DEFAULT_SETTINGS } from '@/data/seed';
import type { CafeSettings } from '@/types';
import { sumAdjustments } from '@/services/payrollService';
import { formatMoney, formatDate, formatHours } from '@/utils/format';
import { toast } from 'sonner';

const ADJ_LABELS: Record<string, string> = {
  bonus: 'Bonus',
  deduction: 'Deduction',
  cash_advance: 'Cash advance',
};

export function exportPayslips(period: PayrollPeriod): void {
  const entries = period.entries ?? [];
  if (entries.length === 0) {
    toast.error('No entries to export');
    return;
  }

  const settings = readSingleton<CafeSettings>(DEFAULT_SETTINGS);
  const doc = new jsPDF({ unit: 'pt', format: 'a5' });
  const W = doc.internal.pageSize.getWidth();
  const M = 40; // margin

  const ESPRESSO: [number, number, number] = [133, 79, 47];
  const DARK: [number, number, number] = [44, 24, 16];
  const MUTED: [number, number, number] = [105, 117, 134];

  entries.forEach((entry, idx) => {
    if (idx > 0) doc.addPage();
    let y = M;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...DARK);
    doc.text(settings.business_name, M, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(settings.tagline, M, y);
    doc.text(settings.address, W - M, y, { align: 'right' });
    y += 24;

    // Title band
    doc.setDrawColor(232, 222, 206);
    doc.setLineWidth(1);
    doc.line(M, y, W - M, y);
    y += 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...ESPRESSO);
    doc.text('PAYSLIP', M, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(`${formatDate(period.period_start)} – ${formatDate(period.period_end)}`, W - M, y, { align: 'right' });
    y += 24;

    // Employee
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text(entry.profile?.full_name ?? 'Staff', M, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(
      `${entry.days_worked} day(s) worked  ·  ${formatHours(entry.hours_worked)}`,
      M, y
    );
    y += 22;

    // Line items
    const rightX = W - M;
    const row = (label: string, value: string, opts?: { bold?: boolean; color?: [number, number, number] }) => {
      doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...(opts?.color ?? DARK));
      doc.text(label, M, y);
      doc.text(value, rightX, y, { align: 'right' });
      y += 16;
    };

    row('Base pay', formatMoney(entry.base_pay));
    for (const adj of entry.adjustments) {
      const sign = adj.type === 'bonus' ? '+' : '−';
      const label = `${ADJ_LABELS[adj.type] ?? adj.type}${adj.note ? ` (${adj.note})` : ''}`;
      row(label, `${sign}${formatMoney(adj.amount)}`, {
        color: adj.type === 'bonus' ? [95, 139, 107] : [184, 91, 80],
      });
    }

    y += 4;
    doc.setDrawColor(232, 222, 206);
    doc.line(M, y, rightX, y);
    y += 18;

    const total = entry.base_pay + sumAdjustments(entry.adjustments);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...ESPRESSO);
    doc.text('NET PAY', M, y);
    doc.text(formatMoney(total), rightX, y, { align: 'right' });
    y += 30;

    // Status + footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(`Status: ${period.status === 'paid' ? 'PAID' : 'DRAFT'}`, M, y);
    y += 30;

    // Signature line
    doc.setDrawColor(189, 163, 155);
    doc.line(M, y + 24, M + 140, y + 24);
    doc.line(rightX - 140, y + 24, rightX, y + 24);
    doc.setFontSize(8);
    doc.text('Received by', M, y + 36);
    doc.text('Authorized by', rightX - 140, y + 36);

    // bottom note
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(settings.receipt_footer, W / 2, doc.internal.pageSize.getHeight() - 24, { align: 'center' });
  });

  doc.save(`payslips-${period.period_start}-to-${period.period_end}.pdf`);
  toast.success(`Exported ${entries.length} payslip${entries.length === 1 ? '' : 's'}`);
}
