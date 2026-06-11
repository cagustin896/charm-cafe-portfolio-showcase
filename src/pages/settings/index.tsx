import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Store, ReceiptText, KeyRound, DatabaseBackup, Download, Upload, AlertTriangle,
  Sparkles, Wand2, Eraser,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageShell, SectionPanel } from '@/components/ui/PageShell';
import { inputClass, labelClass } from '@/components/ui/Modal';
import { getSettings, saveSettings } from '@/services/settingsService';
import { changePassword, DEMO_MODE } from '@/services/authService';
import { exportAll, importAll, type BackupFile } from '@/services/storage';
import { SKIP_DEMO_ACTIVITY_KEY, loadDemoActivity, clearDemoActivity } from '@/data/seed';
import { useAuthStore } from '@/stores/authStore';
import { todayKey } from '@/utils/format';
import { cn } from '@/utils/cn';

export default function SettingsPage() {
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getSettings });

  // ── Cafe profile form ──
  const [businessName, setBusinessName] = useState('');
  const [tagline, setTagline] = useState('');
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [orPrefix, setOrPrefix] = useState('ORD');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (settings && !loaded) {
      setBusinessName(settings.business_name);
      setTagline(settings.tagline);
      setAddress(settings.address);
      setContact(settings.contact);
      setReceiptFooter(settings.receipt_footer);
      setOrPrefix(settings.or_prefix);
      setLoaded(true);
    }
  }, [settings, loaded]);

  const saveMutation = useMutation({
    mutationFn: async () =>
      saveSettings({
        business_name: businessName,
        tagline: tagline.trim(),
        address: address.trim(),
        contact: contact.trim(),
        receipt_footer: receiptFooter.trim(),
        or_prefix: orPrefix,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  });

  // ── Password form ──
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (newPw !== confirmPw) throw new Error("New passwords don't match");
      changePassword(profile?.id ?? '', currentPw, newPw);
    },
    onSuccess: () => {
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      toast.success('Password changed');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
  });

  // ── Backup ──
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const backup = exportAll();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `charm-cafe-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup downloaded — keep it somewhere safe!');
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = JSON.parse(String(reader.result)) as BackupFile;
        if (!window.confirm(
          `Restore backup from ${backup.exported_at?.slice(0, 10) ?? 'unknown date'}? This REPLACES all current data — sales, inventory, staff, everything.`
        )) return;
        importAll(backup);
        toast.success('Backup restored — reloading…');
        setTimeout(() => window.location.reload(), 800);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Not a valid backup file');
      }
    };
    reader.readAsText(file);
  }

  function handleReset() {
    if (!window.confirm('Reset ALL data back to the demo seed? Sales, inventory changes, staff, expenses — everything will be wiped.')) return;
    if (!window.confirm('Last chance — this cannot be undone. Export a backup first if you might need this data. Reset now?')) return;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('charm-cafe:')) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    // Reset gives a clean slate — skip the demo activity on the re-seed
    sessionStorage.setItem(SKIP_DEMO_ACTIVITY_KEY, '1');
    toast.success('Data reset — reloading…');
    setTimeout(() => window.location.reload(), 800);
  }

  function handleLoadDemo() {
    loadDemoActivity();
    toast.success('Sample data loaded — reloading…');
    setTimeout(() => window.location.reload(), 600);
  }

  function handleClearDemo() {
    if (!window.confirm('Clear the sample sales, expenses, and history? The menu stays. You can load it again anytime.')) return;
    clearDemoActivity();
    toast.success('Sample data cleared — reloading…');
    setTimeout(() => window.location.reload(), 600);
  }

  const nextOrderNo = settings
    ? `${settings.or_prefix}-${String(settings.or_current + 1).padStart(4, '0')}`
    : '—';

  return (
    <PageShell
      title="Settings"
      subtitle="Business profile, receipts, your account, and data backup."
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* ── Cafe profile ── */}
        <SectionPanel title="Business Profile" className="xl:col-span-2" action={<Store size={15} className="text-taupe" />}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Store name">
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Tagline">
              <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Address">
              <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Contact">
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+63…" className={inputClass} />
            </Field>
            <Field label="Receipt footer" className="col-span-2">
              <input value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={!businessName.trim() || saveMutation.isPending}
              className="px-5 h-10 rounded-lg bg-caramel text-paper text-[12.5px] font-semibold hover:bg-caramel-dark transition-colors shadow-[0_2px_8px_rgba(164,124,88,0.3)] disabled:opacity-40"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </SectionPanel>

        {/* ── Receipts & numbering ── */}
        <SectionPanel title="Receipts & Orders" action={<ReceiptText size={15} className="text-taupe" />}>
          <div className="space-y-4">
            <Field label="Order number prefix">
              <input
                value={orPrefix}
                onChange={(e) => setOrPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                className={inputClass}
              />
            </Field>
            <div className="rounded-xl border border-line bg-cream/40 px-4 py-3">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted">Next order number</p>
              <p className="font-heading text-[18px] font-semibold text-espresso mt-1">{nextOrderNo}</p>
              <p className="text-[11px] text-muted mt-1">{settings?.or_current ?? 0} orders issued so far</p>
            </div>
            <p className="text-[11px] text-muted">
              Save the profile to apply the prefix. Existing receipts keep their numbers.
            </p>
          </div>
        </SectionPanel>

        {/* ── Account ── */}
        <SectionPanel title="My Account" action={<KeyRound size={15} className="text-taupe" />}>
          <div className="space-y-3">
            <Field label="Current password">
              <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className={inputClass} autoComplete="current-password" />
            </Field>
            <Field label="New password">
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min 6 characters" className={inputClass} autoComplete="new-password" />
            </Field>
            <Field label="Confirm new password">
              <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className={inputClass} autoComplete="new-password" />
            </Field>
            <button
              onClick={() => passwordMutation.mutate()}
              disabled={!currentPw || newPw.length < 6 || passwordMutation.isPending}
              className="w-full h-10 rounded-lg border border-line bg-cream/50 text-espresso text-[12.5px] font-semibold hover:border-caramel hover:bg-cream transition-colors disabled:opacity-40"
            >
              {passwordMutation.isPending ? 'Changing…' : 'Change Password'}
            </button>
          </div>
        </SectionPanel>

        {/* ── Backup & restore ── */}
        <SectionPanel title="Data & Backup" className="xl:col-span-2" action={<DatabaseBackup size={15} className="text-taupe" />}>
          <div className="rounded-xl border border-amber/25 bg-amber-soft px-4 py-3 flex items-start gap-2.5 mb-4">
            <AlertTriangle size={15} className="flex-none text-amber mt-0.5" />
            <p className="text-[12px] text-amber leading-relaxed">
              All data lives in this browser. Clearing Chrome's site data — or a factory reset — wipes everything.
              <strong> Download a backup regularly</strong> (end of week is a good habit).
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleExport}
              className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-cream hover:bg-sand/20 border border-line transition-colors group text-left"
            >
              <div>
                <p className="text-[13px] font-semibold text-espresso flex items-center gap-1.5">
                  <Download size={14} className="text-caramel" /> Download backup
                </p>
                <p className="text-[11px] text-muted mt-0.5">Everything as one JSON file</p>
              </div>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-cream hover:bg-sand/20 border border-line transition-colors group text-left"
            >
              <div>
                <p className="text-[13px] font-semibold text-espresso flex items-center gap-1.5">
                  <Upload size={14} className="text-caramel" /> Restore backup
                </p>
                <p className="text-[11px] text-muted mt-0.5">Replaces all current data</p>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.target.value = '';
              }}
            />
          </div>

          {/* Danger zone */}
          <div className="mt-5 pt-4 border-t border-line">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-danger mb-2">Danger zone</p>
            <button
              onClick={handleReset}
              className="px-4 h-10 rounded-lg border border-danger/30 bg-danger-soft text-danger text-[12px] font-semibold hover:bg-danger hover:text-paper transition-colors"
            >
              Reset all data to demo seed
            </button>
          </div>
        </SectionPanel>

        {/* ── Demo data (showcase only) ── */}
        {DEMO_MODE && (
          <SectionPanel
            title="Sample Data"
            className="xl:col-span-3"
            action={<Sparkles size={15} className="text-taupe" />}
          >
            <div className="rounded-xl border border-caramel/25 bg-caramel-soft/50 px-4 py-3 flex items-start gap-2.5 mb-4">
              <Sparkles size={15} className="flex-none text-caramel mt-0.5" />
              <p className="text-[12px] text-espresso leading-relaxed">
                This is the public demo. Load ~2 weeks of sample sales, expenses, and staff
                activity to see every dashboard and report filled in — handy for review and
                screenshots — or clear it for clean, empty-state shots. The menu stays either way.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleLoadDemo}
                className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-caramel text-paper text-[13px] font-semibold hover:bg-caramel-dark transition-colors shadow-[0_2px_8px_rgba(164,124,88,0.3)]"
              >
                <Wand2 size={15} /> Load sample data
              </button>
              <button
                onClick={handleClearDemo}
                className="flex items-center gap-2 px-4 py-3.5 rounded-xl border border-line bg-cream/50 text-espresso text-[13px] font-semibold hover:border-caramel transition-colors"
              >
                <Eraser size={15} /> Clear sample data
              </button>
            </div>
          </SectionPanel>
        )}
      </div>
    </PageShell>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('space-y-1.5 block', className)}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}
