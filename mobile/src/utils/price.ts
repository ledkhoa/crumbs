/**
 * Normalizes Google Places API (New) PriceLevel enums and legacy values into standard dollar sign format.
 *
 * Google Places API (New) enum mappings:
 * - PRICE_LEVEL_FREE -> "Free"
 * - PRICE_LEVEL_INEXPENSIVE -> "$"
 * - PRICE_LEVEL_MODERATE -> "$$"
 * - PRICE_LEVEL_EXPENSIVE -> "$$$"
 * - PRICE_LEVEL_VERY_EXPENSIVE -> "$$$$"
 * - PRICE_LEVEL_UNSPECIFIED -> null
 */
export function formatPriceLevel(
  priceLevel?: string | number | null,
): string | null {
  if (priceLevel == null || priceLevel === '') return null;

  const normalized = String(priceLevel).trim().toUpperCase();

  switch (normalized) {
    case 'PRICE_LEVEL_FREE':
    case 'FREE':
    case '0':
      return 'Free';

    case 'PRICE_LEVEL_INEXPENSIVE':
    case 'INEXPENSIVE':
    case 'CHEAP':
    case '1':
    case '$':
      return '$';

    case 'PRICE_LEVEL_MODERATE':
    case 'MODERATE':
    case 'MEDIUM':
    case '2':
    case '$$':
      return '$$';

    case 'PRICE_LEVEL_EXPENSIVE':
    case 'EXPENSIVE':
    case '3':
    case '$$$':
      return '$$$';

    case 'PRICE_LEVEL_VERY_EXPENSIVE':
    case 'VERY_EXPENSIVE':
    case '4':
    case '$$$$':
      return '$$$$';

    case 'PRICE_LEVEL_UNSPECIFIED':
    case 'UNSPECIFIED':
    case 'UNKNOWN':
    case 'NULL':
    case 'UNDEFINED':
      return null;

    default:
      // If it already consists purely of dollar signs (e.g. "$$", "$$$"), preserve it
      if (/^\$+$/.test(normalized)) {
        return normalized;
      }
      return null;
  }
}
