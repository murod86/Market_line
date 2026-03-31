/**
 * MARKET_LINE — Professional ERP Unit System
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │  BIRLIK KATEGORIYALARI                                   │
 * │                                                          │
 * │  Vazn   : kg  ↔  gram   (1 kg = 1000 gram)              │
 * │  Hajm   : litr ↔ ml    (1 litr = 1000 ml)              │
 * │  Uzunlik: metr ↔ sm    (1 metr = 100 sm)               │
 * │  Dona   : dona ↔ quti  (1 quti = boxQuantity dona)      │
 * │                                                          │
 * │  DB qoidasi: mahsulot native birligida saqlanadi:        │
 * │    kg  → decimal kg   (1.500 kg)                         │
 * │    litr → decimal litr (2.300 litr)                      │
 * │    metr → decimal metr (3.750 metr)                      │
 * │    dona → integer dona                                    │
 * │    quti → integer quti                                   │
 * │    gram (eski) → integer gram (1kg=1000)                 │
 * └──────────────────────────────────────────────────────────┘
 */

import type { Product } from "@shared/schema";

// ═══════════════════════════════════════════════════════════
// Birlik konfiguratsiyasi
// ═══════════════════════════════════════════════════════════

/** Birlik ↔ kichik birlik munosabati */
const SUB_UNIT_MAP: Record<string, { sub: string; factor: number }> = {
  kg:   { sub: "gram", factor: 1000 },   // 1 kg   = 1000 gram
  litr: { sub: "ml",   factor: 1000 },   // 1 litr = 1000 ml
  metr: { sub: "sm",   factor: 100  },   // 1 metr = 100 sm
};

/** Kichik birlik → asosiy birlik */
const PARENT_UNIT_MAP: Record<string, { parent: string; factor: number }> = {
  gram: { parent: "kg",   factor: 1000 },
  ml:   { parent: "litr", factor: 1000 },
  sm:   { parent: "metr", factor: 100  },
};

/** Decimal (float) saqlanadigan birliklar */
export const DECIMAL_UNITS = ["kg", "litr", "metr"] as const;

export function isDecimalUnit(unit: string): boolean {
  return (DECIMAL_UNITS as readonly string[]).includes(unit);
}

export function isGramUnit(unit: string): boolean {
  return unit === "gram";
}

export function isCountUnit(unit: string): boolean {
  return unit === "dona" || unit === "quti";
}

/** Sub birlikmi? (gram, ml, sm) */
export function isSubUnit(unit: string): boolean {
  return unit in PARENT_UNIT_MAP;
}

// ═══════════════════════════════════════════════════════════
// Sotuv birliklari (POS, portal, diller)
// ═══════════════════════════════════════════════════════════

/**
 * Mahsulot uchun ruxsat etilgan SOTUV birliklari.
 *
 *  kg               → ["kg", "gram"]
 *  litr             → ["litr", "ml"]
 *  metr             → ["metr", "sm"]
 *  dona (bq > 1)    → ["dona", "quti"]
 *  dona (bq = 1)    → ["dona"]
 *  quti             → ["quti", "dona"]
 *  gram (eski)      → ["kg", "gram"]   ← orqaga mos kelish
 */
export function getSellUnitOptions(
  product: Pick<Product, "unit" | "boxQuantity">
): string[] {
  const { unit } = product;
  const bq = product.boxQuantity ?? 1;

  if (unit in SUB_UNIT_MAP) {
    return [unit, SUB_UNIT_MAP[unit].sub];
  }
  if (unit === "gram") return ["kg", "gram"];
  if (unit === "dona") return bq > 1 ? ["dona", "quti"] : ["dona"];
  if (unit === "quti") return ["quti", "dona"];
  return [unit];
}

// ═══════════════════════════════════════════════════════════
// Xarid birliklari (Purchases moduli)
// ═══════════════════════════════════════════════════════════

/**
 * Mahsulot uchun ruxsat etilgan XARID birliklari.
 *
 *  kg               → ["kg", "gram"]
 *  litr             → ["litr", "ml"]
 *  metr             → ["metr", "sm"]
 *  dona (bq > 1)    → ["dona", "quti"]
 *  dona (bq = 1)    → ["dona"]
 *  quti (bq > 1)    → ["quti", "dona"]
 *  quti (bq = 1)    → ["quti"]
 *  gram (eski)      → ["kg", "gram"]
 */
export function getBuyUnitOptions(
  product: Pick<Product, "unit" | "boxQuantity">
): string[] {
  const { unit } = product;
  const bq = product.boxQuantity ?? 1;

  if (unit in SUB_UNIT_MAP) {
    return [unit, SUB_UNIT_MAP[unit].sub];
  }
  if (unit === "gram") return ["kg", "gram"];
  if (unit === "dona") return bq > 1 ? ["dona", "quti"] : ["dona"];
  if (unit === "quti") return bq > 1 ? ["quti", "dona"] : ["quti"];
  return [unit];
}

// ═══════════════════════════════════════════════════════════
// Miqdor konvertatsiyasi
// ═══════════════════════════════════════════════════════════

/**
 * Ko'rsatish miqdori → DB native miqdor.
 *
 *  kg native:
 *    "gram" display  → qty / 1000   (500 gram → 0.5 kg)
 *    "kg"   display  → qty          (1.5 kg → 1.5 kg)
 *
 *  litr native:
 *    "ml"   display  → qty / 1000   (500 ml → 0.5 litr)
 *    "litr" display  → qty
 *
 *  metr native:
 *    "sm"   display  → qty / 100    (150 sm → 1.5 metr)
 *    "metr" display  → qty
 *
 *  gram (eski) native:
 *    "kg"   display  → qty × 1000   (5 kg → 5000 gram)
 *    "gram" display  → qty          (butun son)
 *
 *  dona native + "quti" display → qty × boxQty
 *  quti native + "dona" display → qty / boxQty
 */
export function toNativeQty(
  qty: number,
  displayUnit: string,
  nativeUnit: string,
  boxQty: number
): number {
  if (qty <= 0) return 0;

  // gram mahsuloti (eski) — grammda saqlanadi
  if (nativeUnit === "gram") {
    if (displayUnit === "kg") return Math.round(qty * 1000);
    return Math.round(qty);
  }

  // Native birlikning kichik birligi kiritilgan (gram, ml, sm)
  const sub = SUB_UNIT_MAP[nativeUnit];
  if (sub && displayUnit === sub.sub) {
    return parseFloat((qty / sub.factor).toFixed(4));
  }

  // Decimal birliklar (kg, litr, metr) — to'g'ridan saqlash
  if (isDecimalUnit(nativeUnit)) {
    return parseFloat(qty.toFixed(4));
  }

  // Dona ↔ Quti
  if (nativeUnit === "dona" && displayUnit === "quti") {
    return Math.round(qty * boxQty);
  }
  if (nativeUnit === "quti" && displayUnit === "dona") {
    return Math.round(qty / boxQty);
  }

  return Math.round(qty);
}

/**
 * DB native miqdor → ko'rsatish miqdori.
 *
 *  kg native + "gram" display → stockPieces × 1000
 *  litr native + "ml" display → stockPieces × 1000
 *  metr native + "sm" display → stockPieces × 100
 *  gram (eski) + "kg" display → stockPieces / 1000
 *  dona + "quti" display      → stockPieces / boxQty
 *  quti + "dona" display      → stockPieces × boxQty
 */
export function stockToDisplayQty(
  stockPieces: number,
  newDisplayUnit: string,
  nativeUnit: string,
  boxQty: number
): number {
  if (newDisplayUnit === nativeUnit) return stockPieces;

  // Kichik birlikka o'tish: kg→gram, litr→ml, metr→sm
  const sub = SUB_UNIT_MAP[nativeUnit];
  if (sub && newDisplayUnit === sub.sub) {
    return parseFloat((stockPieces * sub.factor).toFixed(3));
  }

  // gram (eski) → kg
  if (nativeUnit === "gram" && newDisplayUnit === "kg") {
    return parseFloat((stockPieces / 1000).toFixed(3));
  }

  // dona ↔ quti
  if (nativeUnit === "dona" && newDisplayUnit === "quti") {
    return Math.max(1, Math.floor(stockPieces / boxQty));
  }
  if (nativeUnit === "quti" && newDisplayUnit === "dona") {
    return stockPieces * boxQty;
  }

  return stockPieces;
}

// ═══════════════════════════════════════════════════════════
// Narx konvertatsiyasi
// ═══════════════════════════════════════════════════════════

/**
 * Native (DB) narx → ko'rsatish narxi.
 *
 *  kg native + "gram" display  → nativePrice / 1000   (25,000/kg → 25/gram)
 *  litr native + "ml" display  → nativePrice / 1000
 *  metr native + "sm" display  → nativePrice / 100
 *  gram (eski) + "kg" display  → nativePrice × 1000   (80/gram → 80,000/kg)
 *  dona + "quti" display       → nativePrice × boxQty
 *  quti + "dona" display       → nativePrice / boxQty
 */
export function toDisplayPrice(
  nativePrice: number,
  displayUnit: string,
  nativeUnit: string,
  boxQty: number
): number {
  if (displayUnit === nativeUnit) return nativePrice;

  // Kichik birlikda narx ko'rsatish: kg→gram, litr→ml, metr→sm
  const sub = SUB_UNIT_MAP[nativeUnit];
  if (sub && displayUnit === sub.sub) {
    return nativePrice / sub.factor;
  }

  // gram (eski) → kg narxi
  if (nativeUnit === "gram" && displayUnit === "kg") return nativePrice * 1000;

  // dona ↔ quti
  if (nativeUnit === "dona" && displayUnit === "quti") return nativePrice * boxQty;
  if (nativeUnit === "quti" && displayUnit === "dona") return nativePrice / boxQty;

  return nativePrice;
}

/**
 * Ko'rsatish narxi → native (DB) narxi.
 *
 *  "gram" display + kg native  → displayPrice × 1000
 *  "ml"   display + litr native → displayPrice × 1000
 *  "sm"   display + metr native → displayPrice × 100
 *  "kg"   display + gram (eski) → displayPrice / 1000
 *  "quti" display + dona native → displayPrice / boxQty
 *  "dona" display + quti native → displayPrice × boxQty
 */
export function toNativePrice(
  displayPrice: number,
  displayUnit: string,
  nativeUnit: string,
  boxQty: number
): number {
  if (displayUnit === nativeUnit) return displayPrice;

  // Kichik birlikdan native birlikka: gram→kg, ml→litr, sm→metr
  const parent = PARENT_UNIT_MAP[displayUnit];
  if (parent && parent.parent === nativeUnit) {
    return displayPrice * parent.factor;
  }

  // gram (eski): kg narxini gram narxiga
  if (nativeUnit === "gram" && displayUnit === "kg") return displayPrice / 1000;

  // dona ↔ quti
  if (nativeUnit === "dona" && displayUnit === "quti") return displayPrice / boxQty;
  if (nativeUnit === "quti" && displayUnit === "dona") return displayPrice * boxQty;

  return displayPrice;
}

// ═══════════════════════════════════════════════════════════
// UI ko'rsatish yordamchi funksiyalari
// ═══════════════════════════════════════════════════════════

/**
 * Mahsulot kartasida narx yorlig'i.
 *   gram (eski) → "80,000 so'm/kg"
 *   kg          → "25,000 so'm/kg"
 *   litr        → "3,000 so'm/litr"
 *   metr        → "15,000 so'm/metr"
 *   dona        → "5,000 so'm/dona"
 */
export function productPriceLabel(
  price: number | string,
  nativeUnit: string
): string {
  const p = Number(price);
  const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(n));
  if (nativeUnit === "gram") return `${fmt(p * 1000)} so'm/kg`;
  return `${fmt(p)} so'm/${nativeUnit}`;
}

/**
 * Miqdorni chiroyli formatlaydi.
 *   kg/litr/metr  → 3 decimal raqam, ortiqcha nollar tushiriladi
 *   gram/ml/sm    → butun son
 *   dona/quti     → butun son
 */
export function formatQtyDisplay(qty: number, displayUnit: string): string {
  if (displayUnit === "kg" || displayUnit === "litr" || displayUnit === "metr") {
    const val = parseFloat(qty.toFixed(3));
    return `${val} ${displayUnit}`;
  }
  if (displayUnit === "gram" || displayUnit === "ml" || displayUnit === "sm") {
    return `${Math.round(qty)} ${displayUnit}`;
  }
  return `${Math.round(qty)} ${displayUnit}`;
}

/**
 * Stok badge matni (mahsulot kartasi uchun).
 *   gram product, stock=1500  → "1.5 kg"
 *   kg product, stock=2.5     → "2.5 kg"
 *   litr product, stock=10.3  → "10.3 litr"
 *   dona, stock=100            → "100 dona"
 */
export function stockBadge(
  nativeStock: number,
  nativeUnit: string,
  boxQty: number
): string {
  const defDisplay = getSellUnitOptions({ unit: nativeUnit, boxQuantity: boxQty })[0];
  const displayQty = stockToDisplayQty(nativeStock, defDisplay, nativeUnit, boxQty);
  return formatQtyDisplay(displayQty, defDisplay);
}

/**
 * Chek va savat uchun miqdor + birlik ko'rsatish.
 * Barcha birlik kombinatsiyalarini qo'llab-quvvatlaydi.
 *
 * Misollar:
 *   kg product, buyUnit=gram  → "500 gram (0.5 kg)"
 *   litr product, buyUnit=ml  → "500 ml (0.5 litr)"
 *   metr product, buyUnit=sm  → "50 sm (0.5 metr)"
 *   gram(legacy), buyUnit=kg  → "1.5 kg (1500 gram)"
 *   dona product, buyUnit=quti → "2 quti (10 dona)"
 *   kg product, buyUnit=kg    → "1.500 kg"
 */
export function qtyLabel(
  displayQty: number,
  nativeQty: number,
  displayUnit: string,
  nativeUnit: string
): string {
  if (displayUnit === nativeUnit) return formatQtyDisplay(displayQty, displayUnit);

  // Sub-birlik ko'rsatish: gram/ml/sm display, kg/litr/metr native
  const parentInfo = PARENT_UNIT_MAP[displayUnit];
  if (parentInfo && parentInfo.parent === nativeUnit) {
    return `${formatQtyDisplay(displayQty, displayUnit)} (${formatQtyDisplay(nativeQty, nativeUnit)})`;
  }

  // gram (eski) + kg display
  if (displayUnit === "kg" && nativeUnit === "gram") {
    return `${formatQtyDisplay(displayQty, "kg")} (${Math.round(nativeQty)} gram)`;
  }

  // quti + dona native
  if (displayUnit === "quti" && nativeUnit === "dona") {
    return `${Math.round(displayQty)} quti (${Math.round(nativeQty)} dona)`;
  }

  // dona + quti native
  if (displayUnit === "dona" && nativeUnit === "quti") {
    return `${Math.round(displayQty)} dona`;
  }

  return formatQtyDisplay(displayQty, displayUnit);
}

/**
 * Input step qiymati (HTML input step="..." uchun).
 *   kg / litr / metr  → 0.001
 *   gram / ml / sm    → 1
 *   dona / quti       → 1
 */
export function qtyInputStep(displayUnit: string): number {
  if (displayUnit === "kg" || displayUnit === "litr" || displayUnit === "metr") {
    return 0.001;
  }
  return 1;
}

/**
 * +/- tugmalar uchun qadam (delta).
 *   kg / litr / metr  → 0.5
 *   gram              → 100
 *   ml                → 100
 *   sm                → 10
 *   dona / quti       → 1
 */
export function qtyDelta(displayUnit: string): number {
  if (displayUnit === "kg" || displayUnit === "litr" || displayUnit === "metr") return 0.5;
  if (displayUnit === "gram" || displayUnit === "ml") return 100;
  if (displayUnit === "sm") return 10;
  return 1;
}

/**
 * Minimal miqdor (input min="..." uchun).
 */
export function qtyMin(displayUnit: string): number {
  if (displayUnit === "kg" || displayUnit === "litr" || displayUnit === "metr") return 0.001;
  return 1;
}

/**
 * Stok yetarlimi?
 */
export function hasEnoughStock(
  nativeRequired: number,
  productStock: number
): boolean {
  return productStock >= nativeRequired;
}
