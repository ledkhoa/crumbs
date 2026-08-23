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

  // Normalize: trim, uppercase, convert spaces/hyphens to underscores
  const normalized = String(priceLevel)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  // Strip leading prefixes like PRICE_LEVEL_ or PRICE_ or LEVEL_
  const core = normalized.replace(/^(?:PRICE_LEVEL_|PRICE_|LEVEL_)/, '');

  switch (core) {
    case 'FREE':
    case '0':
      return 'Free';

    case 'INEXPENSIVE':
    case 'CHEAP':
    case '1':
    case '$':
      return '$';

    case 'MODERATE':
    case 'MEDIUM':
    case '2':
    case '$$':
      return '$$';

    case 'EXPENSIVE':
    case '3':
    case '$$$':
      return '$$$';

    case 'VERY_EXPENSIVE':
    case 'VERYEXPENSIVE':
    case 'LUXURY':
    case '4':
    case '$$$$':
      return '$$$$';

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
