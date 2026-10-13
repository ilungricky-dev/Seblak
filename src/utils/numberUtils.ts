/**
 * Helper utility for parsing and formatting numbers and currency in Indonesian format.
 * Intelligently handles:
 * - "2000" -> 2000
 * - "2.000" -> 2000 (Indonesian thousand separator)
 * - "1.500.000" -> 1500000
 * - "2,000" -> 2000
 * - "Rp 2.000" -> 2000
 * - "Rp 2000" -> 2000
 * - "2.5" -> 2.5
 * - "2,5" -> 2.5 (Indonesian comma decimal)
 */

export function parseNumberInput(val: string | number | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let str = String(val).trim();
  if (!str) return 0;

  // Remove "Rp", "IDR", spaces
  str = str.replace(/^(rp|idr)\.?\s*/i, '').trim();

  // Remove whitespace
  str = str.replace(/\s+/g, '');

  // Case 1: Multiple dots like "1.000.000" -> pure thousand separators
  if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
    str = str.replace(/\./g, '');
    return parseFloat(str) || 0;
  }

  // Case 2: Multiple commas like "1,000,000" -> pure thousand separators
  if (/^\d{1,3}(,\d{3})+$/.test(str)) {
    str = str.replace(/,/g, '');
    return parseFloat(str) || 0;
  }

  // Case 3: Exactly 3 digits after a single dot (e.g. "1.000", "2.000", "15.000")
  // In Indonesian currency/pricing context, "1.000" or "2.000" ALWAYS means Rp 1.000 or Rp 2.000
  if (/^\d+\.\d{3}$/.test(str)) {
    str = str.replace('.', '');
    return parseFloat(str) || 0;
  }

  // Case 4: Exactly 3 digits after a single comma (e.g. "1,000", "2,000")
  if (/^\d+,\d{3}$/.test(str)) {
    str = str.replace(',', '');
    return parseFloat(str) || 0;
  }

  // Case 5: Indonesian decimal comma (e.g. "2,5" or "0,5")
  if (str.includes(',') && !str.includes('.')) {
    str = str.replace(',', '.');
  }

  // Strip anything that is not digit or dot
  str = str.replace(/[^0-9.]/g, '');

  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format raw number input to clean display with thousand separators (e.g. 2000 -> "2.000")
 */
export function formatNumberWithDots(val: number): string {
  if (isNaN(val) || val === 0) return '0';
  return val.toLocaleString('id-ID');
}
