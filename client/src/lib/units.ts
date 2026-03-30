/**
 * Central unit conversion utilities for MARKET_LINE
 * All stock quantities stored in native product unit (gram, dona, quti, kg, litr, metr)
 * Display units may differ from native (kg for gram products, quti for dona products)
 */

import type { Product } from "@shared/schema";

// ─────────────────────────────────────────────
// Unit options
// ─────────────────────────────────────────────

/** Allowed sell units in POS / dealer portal */
export function getSellUnitOptions(product: Product): string[] {
  const bq = product.boxQuantity || 1;
  if (product.unit === "gram") return ["kg", "gram"];
  if (product.unit === "dona" && bq > 1) return ["dona", "quti"];
  if (product.unit === "dona") return ["dona"];
  if (product.unit === "quti") return ["quti"]; // selling partial quti is not allowed
  return [product.unit]; // kg, litr, metr — single option
}

/** Allowed buy units in Purchases form */
export function getBuyUnitOptions(product: Product): string[] {
  const bq = product.boxQuantity || 1;
  if (product.unit === "gram") return ["kg", "gram"];
  if (product.unit === "dona" && bq > 1) return ["dona", "quti"];
  if (product.unit === "dona") return ["dona"];
  if (product.unit === "quti" && bq > 1) return ["quti", "dona"]; // buy dona to fill quti
  if (product.unit === "quti") return ["quti"];
  return [product.unit];
}

// ─────────────────────────────────────────────
// Quantity conversion
// ─────────────────────────────────────────────

/**
 * Convert display quantity → native stock units (always integer for gram)
 * E.g. 1.5 kg → 1500 gram;  2 quti (boxQty=20) → 40 dona
 */
export function toNativeQty(
  qty: number,
  displayUnit: string,
  nativeUnit: string,
  boxQty: number,
): number {
  if (displayUnit === nativeUnit) return Math.round(qty);
  if (displayUnit === "kg" && nativeUnit === "gram") return Math.round(qty * 1000);
  if (displayUnit === "quti" && nativeUnit === "dona") return Math.round(qty * boxQty);
  if (displayUnit === "dona" && nativeUnit === "quti") return qty; // fractional handled by server
  return Math.round(qty);
}

/**
 * Default starting quantity in display unit when adding to cart
 * Gram products default to 1 kg mode for usability
 */
export function defaultDisplayQty(nativeUnit: string, displayUnit: string): number {
  if (displayUnit === "kg") return 1;
  return 1;
}

// ─────────────────────────────────────────────
// Price conversion
// ─────────────────────────────────────────────

/**
 * Convert native price (per native unit) → display price (per display unit)
 * E.g. 80 per gram → 80,000 per kg;  5000 per dona → 100,000 per quti (boxQty=20)
 */
export function toDisplayPrice(
  nativePrice: number,
  displayUnit: string,
  nativeUnit: string,
  boxQty: number,
): number {
  if (displayUnit === nativeUnit) return nativePrice;
  if (displayUnit === "kg" && nativeUnit === "gram") return nativePrice * 1000;
  if (displayUnit === "quti" && nativeUnit === "dona") return nativePrice * boxQty;
  if (displayUnit === "dona" && nativeUnit === "quti") return nativePrice / boxQty;
  return nativePrice;
}

/**
 * Convert display price (per display unit) → native price (per native unit)
 * E.g. 80,000 per kg → 80 per gram;  100,000 per quti → 5000 per dona
 */
export function toNativePrice(
  displayPrice: number,
  displayUnit: string,
  nativeUnit: string,
  boxQty: number,
): number {
  if (displayUnit === nativeUnit) return displayPrice;
  if (displayUnit === "kg" && nativeUnit === "gram") return displayPrice / 1000;
  if (displayUnit === "quti" && nativeUnit === "dona") return displayPrice / boxQty;
  if (displayUnit === "dona" && nativeUnit === "quti") return displayPrice * boxQty;
  return displayPrice;
}

// ─────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────

/**
 * Human-readable quantity label for cart / receipt
 * E.g. 1.5 kg (1500 gram) or 2 quti (40 dona)
 */
export function qtyLabel(
  displayQty: number,
  nativeQty: number,
  displayUnit: string,
  nativeUnit: string,
): string {
  if (displayUnit === nativeUnit) return `${nativeQty} ${nativeUnit}`;
  if (displayUnit === "kg" && nativeUnit === "gram")
    return `${displayQty} kg (${nativeQty} gram)`;
  if (displayUnit === "quti" && nativeUnit === "dona")
    return `${displayQty} quti (${nativeQty} dona)`;
  return `${nativeQty} ${nativeUnit}`;
}

/**
 * Price display label for product card
 * gram products → per kg;  others → per native unit
 */
export function productPriceLabel(price: number, nativeUnit: string): string {
  const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);
  if (nativeUnit === "gram") return `${fmt(price * 1000)} so'm/kg`;
  return `${fmt(price)} so'm/${nativeUnit}`;
}

/**
 * When switching display unit, compute the new display quantity from current stockPieces
 */
export function stockToDisplayQty(
  stockPieces: number,
  newDisplayUnit: string,
  nativeUnit: string,
  boxQty: number,
): number {
  if (newDisplayUnit === nativeUnit) return stockPieces;
  if (newDisplayUnit === "kg" && nativeUnit === "gram")
    return parseFloat((stockPieces / 1000).toFixed(3));
  if (newDisplayUnit === "quti" && nativeUnit === "dona")
    return Math.max(1, Math.floor(stockPieces / boxQty));
  if (newDisplayUnit === "dona" && nativeUnit === "quti")
    return stockPieces * boxQty;
  return stockPieces;
}
