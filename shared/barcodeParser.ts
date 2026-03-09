
/**
 * Utility for parsing barcode data from Urano POP-S scale labels
 * Format: 20PPPPVVVVVC where:
 * - 20 = prefix indicating weighed product
 * - PPPP = product code/PLU (4 digits)
 * - VVVVV = weight in grams (5 digits, padded with zeros)
 * - C = check digit
 */

export interface ParsedScaleBarcode {
  isScaleBarcode: boolean;
  productCode: string;
  weightGrams: number;
  weightKg: number;
  checkDigit: string;
  rawBarcode: string;
}

/**
 * Parse a barcode from a scale label
 * Standard format: 13 digits starting with "20" or "21"
 */
export function parseScaleBarcode(barcode: string): ParsedScaleBarcode | null {
  const normalized = barcode.trim();

  // Check if it matches the scale barcode pattern
  if (normalized.length !== 13 || (!normalized.startsWith("20") && !normalized.startsWith("21"))) {
    return null;
  }

  try {
    // Extract parts
    const prefix = normalized.substring(0, 2); // "20" or "21"
    const productCode = normalized.substring(2, 6); // PPPP - 4 digits
    const weightPart = normalized.substring(6, 11); // VVVVV - 5 digits
    const checkDigit = normalized.substring(11, 12); // C - 1 digit

    // Convert weight from grams to kg
    const weightGrams = parseInt(weightPart, 10);
    const weightKg = weightGrams / 1000;

    return {
      isScaleBarcode: true,
      productCode,
      weightGrams,
      weightKg,
      checkDigit,
      rawBarcode: normalized
    };
  } catch (error) {
    return null;
  }
}

/**
 * Validate a parsed scale barcode check digit
 * Uses EAN-13 check digit algorithm
 */
export function validateScaleBarcodeCheckDigit(barcode: string): boolean {
  if (barcode.length !== 13) return false;

  const digits = barcode.substring(0, 12).split('').map(Number);
  let sum = 0;

  for (let i = 0; i < digits.length; i++) {
    const weight = i % 2 === 0 ? 1 : 3;
    sum += digits[i] * weight;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  const providedCheckDigit = parseInt(barcode[12], 10);

  return checkDigit === providedCheckDigit;
}

/**
 * Check if a barcode string looks like a scale barcode
 * Quick check without full parsing
 */
export function isLikelyScaleBarcode(barcode: string): boolean {
  const normalized = barcode.trim();
  return normalized.length === 13 && (normalized.startsWith("20") || normalized.startsWith("21"));
}
