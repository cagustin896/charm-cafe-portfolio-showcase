// ─── Bundled Default Product Photos ───────────────────────────────────────────
// Ship the seed menu with real photos. These are part of the build (served from
// the deployment), so they appear on every device — unlike in-app uploads, which
// are per-device. A product's own uploaded image_url still overrides its default.

import spanishLatte from '@/assets/menu/spanish-latte.jpg';
import biscoffLatte from '@/assets/menu/biscoff-latte.jpg';
import mocha from '@/assets/menu/mocha.jpg';
import caramelMacchiato from '@/assets/menu/caramel-macchiato.jpg';
import cookieButter from '@/assets/menu/cookie-butter.jpg';
import chocoBerry from '@/assets/menu/choco-berry.jpg';
import matcha from '@/assets/menu/matcha.jpg';
import velvetBlush from '@/assets/menu/velvet-blush.jpg';
import mangoMilk from '@/assets/menu/mango-milk.jpg';
import blueberryMilk from '@/assets/menu/blueberry-milk.jpg';
import cokeFloat from '@/assets/menu/coke-float.jpg';
import greenApple from '@/assets/menu/green-apple.jpg';
import lycheeSoda from '@/assets/menu/lychee-soda.jpg';
import mangoStickyRice from '@/assets/menu/mango-sticky-rice.jpg';
import putoSikwate from '@/assets/menu/puto-sikwate.jpg';
import buldakCarbonara from '@/assets/menu/buldak-carbonara.jpg';

/** Seed product id → bundled photo. Products without an entry use the placeholder. */
const PRODUCT_IMAGE_DEFAULTS: Record<string, string> = {
  'prod-spanish-latte': spanishLatte,
  'prod-biscoff-latte': biscoffLatte,
  'prod-mocha': mocha,
  'prod-caramel-macchiato': caramelMacchiato,
  'prod-cookie-butter': cookieButter,
  'prod-choco-berry': chocoBerry,
  'prod-matcha': matcha,
  'prod-velvet-blush': velvetBlush,
  'prod-mango-milk': mangoMilk,
  'prod-blueberry-milk': blueberryMilk,
  'prod-coke-float': cokeFloat,
  'prod-green-apple-soda': greenApple,
  'prod-lychee-soda': lycheeSoda,
  'prod-mango-sticky-rice': mangoStickyRice,
  'prod-puto-sikwate': putoSikwate,
  'prod-buldak-carbonara': buldakCarbonara,
};

/** Bundled default photo for a product id, or null if none ships for it. */
export function defaultProductImage(productId: string | null | undefined): string | null {
  return productId ? PRODUCT_IMAGE_DEFAULTS[productId] ?? null : null;
}

/**
 * Effective photo for a product: an uploaded override wins, otherwise the
 * bundled default, otherwise null (the placeholder renders).
 */
export function resolveProductImage(product: { id: string; image_url: string | null }): string | null {
  return product.image_url ?? defaultProductImage(product.id);
}
