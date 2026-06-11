import { cn } from '@/utils/cn';

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Pixel size for the fallback icon. */
  iconSize?: number;
}

/**
 * Shows a product's photo, or a brand-styled placeholder (a simple cup glyph
 * on a warm gradient) when none has been uploaded.
 */
export function ProductImage({ src, alt, className, iconSize = 40 }: ProductImageProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        draggable={false}
        className={cn('w-full h-full object-cover select-none', className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'w-full h-full grid place-items-center bg-gradient-to-br from-sand/40 to-cream',
        className
      )}
      aria-label="No photo"
    >
      <CupGlyph size={iconSize} />
    </div>
  );
}

function CupGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="fill-none stroke-caramel/45 stroke-[2.4] [stroke-linecap:round] [stroke-linejoin:round]"
    >
      <path d="M18 24h22v15a9 9 0 0 1-9 9h-4a9 9 0 0 1-9-9V24Z" />
      <path d="M40 28h5a6 6 0 0 1 0 12h-5" />
      <path d="M22 14c3-3 7-3 10 0M28 13c2-2 5-2 7 0" />
    </svg>
  );
}
