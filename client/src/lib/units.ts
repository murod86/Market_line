/**
 * MARKET_LINE — Professional ERP Unit System
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Birlik kategoriyalari:                                                 │
 * │                                                                         │
 * │  GRAM    : "gram"        — grammda saqlanadi (integer),                 │
 * │                            kg yoki gramda ko'rsatiladi                  │
 * │                                                                         │
 * │  DECIMAL : "kg","litr",  — o'z native birligida decimal saqlanadi       │
 * │            "metr"          (1.500 kg, 2.300 litr, 3.750 metr)           │
 * │                                                                         │
 * │  COUNT   : "dona","quti" — butun son, integer saqlanadi                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * DB narx qoidasi: har doim 1 ta native unit uchun narx (per-gram, per-dona...)
 *   gram  → ko'rinish narxi = DB narxi × 1000  (per kg)
 *   dona  → quti ko'rinish = DB narxi × boxQty (per quti)
 *   boshqa → ko'rinish narxi = DB narxi (o'zgarmaydi)
 */

import type { Product } from "@shared/schema";

// ═══════════════════════════════════════════════════════════════════════
// Birlik turi yordamchi funksiyalari
// ═══════════════════════════════════════════════════════════════════════

/** Decimal (float) saqlanadigan birliklar */
export const DECIMAL_UNITS = ["kg", "litr", "metr"] as const;

/**
 * Birlik DB'da decimal (float) saqlanadimi?
 * kg=1.500 kg, litr=2.300 litr, metr=3.750 metr
 */
export function isDecimalUnit(unit: string): boolean {
  return (DECIMAL_UNITS as readonly string[]).includes(unit);
}

/**
 * Birlik DB'da gramda saqlanadimi? (ko'rinish: kg yoki gram)
 */
export function isGramUnit(unit: string): boolean {
  return unit === "gram";
}

/**
 * Birlik butun son (integer) saqlanadimi?
 */
export function isCountUnit(unit: string): boolean {
  return unit === "dona" || unit === "quti";
}

// ═══════════════════════════════════════════════════════════════════════
// Sotuv birliklari
// ═══════════════════════════════════════════════════════════════════════

/**
 * Mahsulot uchun ruxsat etilgan SOTUV birliklari (POS, portal, diller).
 *
 *  gram              → ["kg", "gram"]
 *  kg / litr / metr  → [birlik]        (faqat o'zi)
 *  dona (boxQty > 1) → ["dona", "quti"]
 *  dona (boxQty = 1) → ["dona"]
 *  quti              → ["quti"]
 */
export function getSellUnitOptions(
  product: Pick<Product, "unit" | "boxQuantity">
): string[] {
  const bq = product.boxQuantity ?? 1;
  switch (product.unit) {
    case "gram":
      return ["kg", "gram"];
    case "kg":
      return ["kg"];
    case "litr":
      return ["litr"];
    case "metr":
      return ["metr"];
    case "dona":
      return bq > 1 ? ["dona", "quti"] : ["dona"];
    case "quti":
      return ["quti"];
    default:
      return [product.unit];
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Xarid birliklari
// ═══════════════════════════════════════════════════════════════════════

/**
 * Mahsulot uchun ruxsat etilgan XARID birliklari (Purchases moduli).
 *
 *  gram              → ["kg", "gram"]
 *  kg / litr / metr  → [birlik]
 *  dona (boxQty > 1) → ["dona", "quti"]
 *  dona (boxQty = 1) → ["dona"]
 *  quti (boxQty > 1) → ["quti", "dona"]  (dona bilan ham xarid qilish mumkin)
 *  quti (boxQty = 1) → ["quti"]
 */
export function getBuyUnitOptions(
  product: Pick<Product, "unit" | "boxQuantity">
): string[] {
  const bq = product.boxQuantity ?? 1;
  switch (product.unit) {
    case "gram":
      return ["kg", "gram"];
    case "kg":
      return ["kg"];
    case "litr":
      return ["litr"];
    case "metr":
      return ["metr"];
    case "dona":
      return bq > 1 ? ["dona", "quti"] : ["dona"];
    case "quti":
      return bq > 1 ? ["quti", "dona"] : ["quti"];
    default:
      return [product.unit];
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Miqdor konvertatsiyasi
// ═══════════════════════════════════════════════════════════════════════

/**
 * Ko'rsatish miqdorini → DB native miqdorga aylantiradi.
 *
 *  gram mahsuloti + "kg"  displayUnit  → qty × 1000   (integer gram)
 *  gram mahsuloti + "gram" displayUnit → qty           (integer gram)
 *  kg / litr / metr                   → qty           (decimal, 4 raqam)
 *  dona + "quti" displayUnit          → qty × boxQty  (integer dona)
 *  quti + "dona" displayUnit          → qty / boxQty  (integer quti)
 *  boshqa                             → Math.round(qty)
 */
export function toNativeQty(
  qty: number,
  displayUnit: string,
  nativeUnit: string,
  boxQty: number
): number {
  // gram: grammda saqlanadi
  if (nativeUnit === "gram") {
    if (displayUnit === "kg") return Math.round(qty * 1000);
    return Math.round(qty);
  }
  // decimal birliklar: to'g'ridan saqlash (yuvarlanmaydi)
  if (isDecimalUnit(nativeUnit)) {
    return parseFloat(qty.toFixed(4));
  }
  // dona ↔ quti
  if (nativeUnit === "dona" && displayUnit === "quti") {
    return Math.round(qty * boxQty);
  }
  if (nativeUnit === "quti" && displayUnit === "dona") {
    return Math.round(qty / boxQty);
  }
  return Math.round(qty);
}

/**
 * DB native miqdorini → ko'rsatish miqdorga aylantiradi.
 *
 *  gram + "kg"    → qty / 1000   (3 raqamli decimal)
 *  dona + "quti"  → qty / boxQty (butun son)
 *  quti + "dona"  → qty × boxQty
 *  boshqa         → qty (o'zgarmaydi)
 */
export function stockToDisplayQty(
  stockPieces: number,
  newDisplayUnit: string,
  nativeUnit: string,
  boxQty: number
): number {
  if (newDisplayUnit === nativeUnit) return stockPieces;
  if (nativeUnit === "gram" && newDisplayUnit === "kg") {
    return parseFloat((stockPieces / 1000).toFixed(3));
  }
  if (nativeUnit === "dona" && newDisplayUnit === "quti") {
    return Math.max(1, Math.floor(stockPieces / boxQty));
  }
  if (nativeUnit === "quti" && newDisplayUnit === "dona") {
    return stockPieces * boxQty;
  }
  return stockPieces;
}

// ═══════════════════════════════════════════════════════════════════════
// Narx konvertatsiyasi
// ═══════════════════════════════════════════════════════════════════════

/**
 * Native (DB) narxini → ko'rsatish narxiga aylantiradi.
 *
 *  gram → kg:    nativePrice × 1000
 *  dona → quti:  nativePrice × boxQty
 *  quti → dona:  nativePrice / boxQty
 *  boshqa:       o'zgarmaydi
 */
export function toDisplayPrice(
  nativePrice: number,
  displayUnit: string,
  nativeUnit: string,
  boxQty: number
): number {
  if (displayUnit === nativeUnit) return nativePrice;
  if (nativeUnit === "gram" && displayUnit === "kg") return nativePrice * 1000;
  if (nativeUnit === "dona" && displayUnit === "quti") return nativePrice * boxQty;
  if (nativeUnit === "quti" && displayUnit === "dona") return nativePrice / boxQty;
  return nativePrice;
}

/**
 * Ko'rsatish narxini → native (DB) narxga aylantiradi.
 *
 *  kg → gram:    displayPrice / 1000
 *  quti → dona:  displayPrice / boxQty
 *  dona → quti:  displayPrice × boxQty
 *  boshqa:       o'zgarmaydi
 */
export function toNativePrice(
  displayPrice: number,
  displayUnit: string,
  nativeUnit: string,
  boxQty: number
): number {
  if (displayUnit === nativeUnit) return displayPrice;
  if (nativeUnit === "gram" && displayUnit === "kg") return displayPrice / 1000;
  if (nativeUnit === "dona" && displayUnit === "quti") return displayPrice / boxQty;
  if (nativeUnit === "quti" && displayUnit === "dona") return displayPrice * boxQty;
  return displayPrice;
}

// ═══════════════════════════════════════════════════════════════════════
// UI ko'rsatish yordamchi funksiyalari
// ═══════════════════════════════════════════════════════════════════════

/**
 * Mahsulot kartasida narx yorlig'i.
 *   gram  → "80,000 so'm/kg"   (narx×1000 ko'rsatiladi)
 *   kg    → "25,000 so'm/kg"
 *   dona  → "5,000 so'm/dona"
 *   quti  → "120,000 so'm/quti"
 *   litr  → "3,000 so'm/litr"
 *   metr  → "15,000 so'm/metr"
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
 * Chek va savat uchun miqdor + birlik ko'rsatish.
 *   gram + kg:   "1.5 kg (1500 gram)"
 *   dona + quti: "2 quti (40 dona)"
 *   kg:          "1.500 kg"
 *   dona:        "5 dona"
 */
export function qtyLabel(
  displayQty: number,
  nativeQty: number,
  displayUnit: string,
  nativeUnit: string
): string {
  if (displayUnit === nativeUnit) return `${formatQtyDisplay(nativeQty, displayUnit)} `;
  if (displayUnit === "kg" && nativeUnit === "gram") {
    return `${formatQtyDisplay(displayQty, "kg")} (${Math.round(nativeQty)} gram)`;
  }
  if (displayUnit === "quti" && nativeUnit === "dona") {
    return `${Math.round(displayQty)} quti (${Math.round(nativeQty)} dona)`;
  }
  return `${nativeQty} ${nativeUnit}`;
}

/**
 * Stok badge matni (mahsulot kartasi uchun).
 *   gram product, stock=1500  → "1.5 kg"
 *   kg product, stock=2.5    → "2.5 kg"
 *   litr product, stock=10.3 → "10.3 litr"
 *   dona, stock=100           → "100 dona"
 *   quti, stock=20            → "20 quti"
 */
export function stockBadge(
  nativeStock: number,
  nativeUnit: string,
  boxQty: number
): string {
  const defDisplay = getSellUnitOptions({ unit: nativeUnit, boxQuantity: boxQty })[0];
  const displayQty = stockToDisplayQty(nativeStock, defDisplay, nativeUnit, boxQty);
  return `${formatQtyDisplay(displayQty, defDisplay)} `;
}

/**
 * Miqdorni chiroyli formatlaydi.
 *   kg/litr/metr → 3 decimal raqam, ortiqcha nollar tushiriladi
 *   gram         → butun son
 *   dona/quti    → butun son
 */
export function formatQtyDisplay(qty: number, displayUnit: string): string {
  if (displayUnit === "kg" || displayUnit === "litr" || displayUnit === "metr") {
    const val = parseFloat(qty.toFixed(3));
    return `${val} ${displayUnit}`;
  }
  if (displayUnit === "gram") {
    return `${Math.round(qty)} gram`;
  }
  return `${Math.round(qty)} ${displayUnit}`;
}

/**
 * Input step qiymati (HTML input step="..." uchun).
 *   kg / litr / metr → 0.001  (millionlik aniqlik)
 *   gram displayUnit → 1      (1 gramlik qadamlar)
 *   dona / quti      → 1
 */
export function qtyInputStep(displayUnit: string): number {
  if (displayUnit === "kg" || displayUnit === "litr" || displayUnit === "metr") {
    return 0.001;
  }
  return 1;
}

/**
 * +/- tugmalar uchun qadam (delta).
 *   kg / litr / metr → 0.5   (500g, 500ml, 50cm)
 *   gram display     → 100   (100 gramlik qadamlar)
 *   dona / quti      → 1
 */
export function qtyDelta(displayUnit: string): number {
  if (displayUnit === "kg" || displayUnit === "litr" || displayUnit === "metr") {
    return 0.5;
  }
  if (displayUnit === "gram") return 100;
  return 1;
}

/**
 * Minimal miqdor (input min="..." uchun).
 *   decimal  → 0.001
 *   gram     → 1
 *   boshqa   → 1
 */
export function qtyMin(displayUnit: string): number {
  if (displayUnit === "kg" || displayUnit === "litr" || displayUnit === "metr") {
    return 0.001;
  }
  return 1;
}

/**
 * Stok yetarlimi? (savatchaga qo'shishdan oldin tekshirish)
 *   nativeRequired: so'ralgan miqdor (native birlikda)
 *   productStock:   mavjud stok (native birlikda, decimal mumkin)
 */
export function hasEnoughStock(
  nativeRequired: number,
  productStock: number
): boolean {
  return productStock >= nativeRequired;
}
