import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Modal, inputClass, selectClass, labelClass, PrimaryButton } from '@/components/ui/Modal';
import { createStaff, updateStaff, deactivateStaff, type StaffInput, type StaffRow } from '@/services/staffService';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/utils/cn';

interface StaffModalProps {
  staff: StaffRow | null; // null = create
  onClose: () => void;
}

export function StaffModal({ staff, onClose }: StaffModalProps) {
  const currentUser = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const isEdit = staff !== null;

  const [fullName, setFullName] = useState(staff?.full_name ?? '');
  const [username, setUsername] = useState(staff?.username ?? '');
  const [password, setPassword] = useState('');
  const [cafeRole, setCafeRole] = useState<'manager' | 'staff'>(staff?.cafe_role ?? 'staff');
  const [canViewInventory, setCanViewInventory] = useState(staff?.can_view_inventory ?? false);
  const [canAddExpenses, setCanAddExpenses] = useState(staff?.can_add_expenses ?? false);
  const [payType, setPayType] = useState<'daily' | 'hourly'>(staff?.hourly_rate != null ? 'hourly' : 'daily');
  const [rate, setRate] = useState(
    staff ? String(staff.daily_rate ?? staff.hourly_rate ?? '') : ''
  );
  const [pin, setPin] = useState(staff?.pin_code ?? '');

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['staff'] });
    queryClient.invalidateQueries({ queryKey: ['clock-status'] });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const input: StaffInput = {
        fullName,
        username,
        password: password || null,
        cafeRole,
        canViewInventory,
        canAddExpenses,
        payType,
        rate: Number(rate) || 0,
        pinCode: pin.trim() || null,
      };
      if (isEdit) updateStaff(staff.id, input, currentUser?.id);
      else createStaff(input);
    },
    onSuccess: () => {
      invalidate();
      toast.success(isEdit ? `${fullName} updated` : `${fullName} added to the team`);
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => deactivateStaff(staff!.id, currentUser?.id ?? ''),
    onSuccess: () => {
      invalidate();
      toast.success(`${staff!.full_name} deactivated`);
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
  });

  const isManagerRole = cafeRole === 'manager';

  return (
    <Modal
      title={isEdit ? 'Edit Staff' : 'Add Staff'}
      subtitle={isEdit ? staff.full_name : 'New team member'}
      onClose={onClose}
      maxWidth="max-w-[480px]"
      footer={
        <div className="flex gap-2">
          {isEdit && staff.id !== currentUser?.id && (
            <button
              onClick={() => {
                if (window.confirm(`Deactivate ${staff.full_name}? They'll lose access and won't appear in lists.`)) {
                  deactivateMutation.mutate();
                }
              }}
              disabled={deactivateMutation.isPending}
              className="h-11 px-4 rounded-xl border border-line text-muted text-[12.5px] font-semibold hover:text-danger hover:border-danger/40 transition-colors disabled:opacity-40"
            >
              Deactivate
            </button>
          )}
          <div className="flex-1">
            <PrimaryButton
              onClick={() => saveMutation.mutate()}
              disabled={!fullName.trim() || !username.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Staff'}
            </PrimaryButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className={labelClass}>Full name</label>
          <input
            autoFocus
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Juan dela Cruz"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelClass}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. maria"
              autoComplete="off"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>{isEdit ? 'Reset password' : 'Temporary password'}</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? 'Leave blank to keep' : 'Min 6 characters'}
              className={inputClass}
            />
            {(!isEdit || staff.id !== currentUser?.id) && (
              <p className="text-[10.5px] text-faint">
                They'll be asked to set their own password on their next sign-in.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelClass}>Role</label>
            <select
              value={cafeRole}
              onChange={(e) => setCafeRole(e.target.value as 'manager' | 'staff')}
              className={selectClass}
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Clock-in PIN (optional)</label>
            <input
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="4–6 digits"
              className={inputClass}
            />
          </div>
        </div>

        {/* Permissions (staff only — managers always have full access) */}
        {!isManagerRole && (
          <div className="space-y-2">
            <label className={labelClass}>Permissions</label>
            <PermissionToggle
              label="View inventory"
              description="See stock levels and movement history"
              checked={canViewInventory}
              onChange={setCanViewInventory}
            />
            <PermissionToggle
              label="Add expenses"
              description="Log operational spending"
              checked={canAddExpenses}
              onChange={setCanAddExpenses}
            />
          </div>
        )}

        {/* Pay */}
        <div>
          <label className={labelClass}>Pay rate</label>
          <div className="grid grid-cols-2 gap-3 mt-1.5">
            <select value={payType} onChange={(e) => setPayType(e.target.value as 'daily' | 'hourly')} className={selectClass}>
              <option value="daily">Per day</option>
              <option value="hourly">Per hour</option>
            </select>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">₱</span>
              <input
                type="number"
                min={0}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0"
                className={cn(inputClass, 'pl-7')}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function PermissionToggle({
  label, description, checked, onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-line bg-cream/40 px-4 py-2.5 cursor-pointer">
      <div>
        <p className="text-[12.5px] font-semibold text-dark-roast">{label}</p>
        <p className="text-[11px] text-muted">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-caramel w-5 h-5"
      />
    </label>
  );
}
