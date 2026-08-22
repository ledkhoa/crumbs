import { describe, it, expect } from 'bun:test';
import { formatPriceLevel } from './price';

describe('formatPriceLevel', () => {
  it('should format Google Places API (New) enums', () => {
    expect(formatPriceLevel('PRICE_LEVEL_FREE')).toBe('Free');
    expect(formatPriceLevel('PRICE_LEVEL_INEXPENSIVE')).toBe('$');
    expect(formatPriceLevel('PRICE_LEVEL_MODERATE')).toBe('$$');
    expect(formatPriceLevel('PRICE_LEVEL_EXPENSIVE')).toBe('$$$');
    expect(formatPriceLevel('PRICE_LEVEL_VERY_EXPENSIVE')).toBe('$$$$');
    expect(formatPriceLevel('PRICE_LEVEL_UNSPECIFIED')).toBeNull();
  });

  it('should format legacy string and lowercase representations', () => {
    expect(formatPriceLevel('free')).toBe('Free');
    expect(formatPriceLevel('inexpensive')).toBe('$');
    expect(formatPriceLevel('moderate')).toBe('$$');
    expect(formatPriceLevel('expensive')).toBe('$$$');
    expect(formatPriceLevel('very_expensive')).toBe('$$$$');
  });

  it('should format numeric levels', () => {
    expect(formatPriceLevel(0)).toBe('Free');
    expect(formatPriceLevel(1)).toBe('$');
    expect(formatPriceLevel(2)).toBe('$$');
    expect(formatPriceLevel(3)).toBe('$$$');
    expect(formatPriceLevel(4)).toBe('$$$$');
  });

  it('should preserve existing dollar sign strings', () => {
    expect(formatPriceLevel('$')).toBe('$');
    expect(formatPriceLevel('$$')).toBe('$$');
    expect(formatPriceLevel('$$$')).toBe('$$$');
    expect(formatPriceLevel('$$$$')).toBe('$$$$');
  });

  it('should return null for invalid, unspecified or null values', () => {
    expect(formatPriceLevel(null)).toBeNull();
    expect(formatPriceLevel(undefined)).toBeNull();
    expect(formatPriceLevel('')).toBeNull();
    expect(formatPriceLevel('unknown')).toBeNull();
  });
});
