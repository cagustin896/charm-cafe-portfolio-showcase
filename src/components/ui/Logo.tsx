import { cn } from '@/utils/cn';
import logoUrl from '@/assets/charm-cafe-logo.png';

interface BrandLogoProps {
  size?: number;
  className?: string;
}

/** The Charm Cafe logo image (brown line art). Sits best on a light surface. */
export function BrandLogo({ size = 40, className }: BrandLogoProps) {
  return (
    <img
      src={logoUrl}
      alt="Charm Cafe"
      width={size}
      height={size}
      draggable={false}
      className={cn('object-contain select-none', className)}
      style={{ width: size, height: size }}
    />
  );
}

interface LogoMarkProps {
  className?: string;
  size?: number;
}

export function LogoMark({ className, size = 32 }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      className={cn('fill-none stroke-current stroke-[2.3] [stroke-linecap:round] [stroke-linejoin:round]', className)}
    >
      <path d="M19 25c-6-8-16-1-11 9 4 8 15 14 24 18 9-4 20-10 24-18 5-10-5-17-11-9" />
      <path d="M22 28h18v13a7 7 0 0 1-7 7h-4a7 7 0 0 1-7-7V28Z" />
      <path d="M40 31h4a5 5 0 0 1 0 10h-4" />
      <path d="M20 28h22M23 34h17M24 40h15M26 22c4-3 9-3 13 0" />
      <path d="M14 18l2 3 3-2M48 15l2 3 3-2M42 10l1 2 2-1" />
    </svg>
  );
}
