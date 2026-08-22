import { describe, expect, it } from 'bun:test';
import {
  detectReservationProvider,
  extractCommunityDishFromReviews,
  extractNeighborhood,
  sanitizeHeroDish,
} from './places.service';

describe('detectReservationProvider', () => {
  describe('Direct explicit reservation URL (Layer 1)', () => {
    it('should return explicit reservation URL and custom/specified provider', () => {
      const result = detectReservationProvider(
        'https://myspot.com',
        'resy',
        'https://resy.com/cities/ny/carbone',
        'Carbone',
        'New York',
      );
      expect(result).toEqual({
        reservationUrl: 'https://resy.com/cities/ny/carbone',
        reservationProvider: 'resy',
      });
    });
  });

  describe('Website URL domain detection (Layer 2)', () => {
    it('should detect Resy provider from restaurant websiteUrl', () => {
      const result = detectReservationProvider(
        'https://resy.com/cities/mia/boia-de',
      );
      expect(result).toEqual({
        reservationUrl: 'https://resy.com/cities/mia/boia-de',
        reservationProvider: 'resy',
      });
    });

    it('should detect OpenTable provider from restaurant websiteUrl', () => {
      const result = detectReservationProvider(
        'https://www.opentable.com/r/gramercy-tavern-new-york',
      );
      expect(result).toEqual({
        reservationUrl: 'https://www.opentable.com/r/gramercy-tavern-new-york',
        reservationProvider: 'opentable',
      });
    });

    it('should detect Tock provider from restaurant websiteUrl', () => {
      const result = detectReservationProvider(
        'https://www.exploretock.com/alinea',
      );
      expect(result).toEqual({
        reservationUrl: 'https://www.exploretock.com/alinea',
        reservationProvider: 'tock',
      });
    });
  });

  describe('Smart provider search deeplink (Layer 3)', () => {
    it('should construct Resy search deeplink when provider is Resy without direct link', () => {
      const result = detectReservationProvider(
        'https://carbone-nyc.com',
        'resy',
        undefined,
        'Carbone',
        'New York',
      );
      expect(result).toEqual({
        reservationUrl:
          'https://resy.com/cities/search?query=Carbone%20New%20York',
        reservationProvider: 'resy',
      });
    });

    it('should construct OpenTable search deeplink when provider is OpenTable', () => {
      const result = detectReservationProvider(
        'https://noburestaurants.com',
        'opentable',
        undefined,
        'Nobu',
        'Miami',
      );
      expect(result).toEqual({
        reservationUrl: 'https://www.opentable.com/s?term=Nobu%20Miami',
        reservationProvider: 'opentable',
      });
    });
  });

  describe('No reservation platform (Layer 4 fallback)', () => {
    it('should return empty object when no reservation info exists', () => {
      const result = detectReservationProvider(
        'https://bestbakerynyc.com',
        undefined,
        undefined,
        'Supermoon Bakehouse',
        'New York',
      );
      expect(result).toEqual({});
    });
  });
});

describe('sanitizeHeroDish', () => {
  it('should reject conversational fragments and sentiment clauses', () => {
    expect(sanitizeHeroDish("i've had in a while")).toBeUndefined();
    expect(sanitizeHeroDish("best meal I've had in a while")).toBeUndefined();
    expect(sanitizeHeroDish('so good')).toBeUndefined();
    expect(sanitizeHeroDish('must try')).toBeUndefined();
    expect(sanitizeHeroDish('good food')).toBeUndefined();
    expect(sanitizeHeroDish('great service')).toBeUndefined();
    expect(sanitizeHeroDish('vibes')).toBeUndefined();
    expect(sanitizeHeroDish('everything')).toBeUndefined();
  });

  it('should clean and strip trailing conversational clauses from valid dishes', () => {
    expect(sanitizeHeroDish('the spicy rigatoni vodka')).toBe(
      'spicy rigatoni vodka',
    );
    expect(sanitizeHeroDish('Truffle Cacio e Pepe')).toBe(
      'Truffle Cacio e Pepe',
    );
    expect(sanitizeHeroDish("Pistachio Croissant I've had in a while")).toBe(
      'Pistachio Croissant',
    );
    expect(sanitizeHeroDish('Matcha Basque Cheesecake in my life')).toBe(
      'Matcha Basque Cheesecake',
    );
  });
});

describe('extractCommunityDishFromReviews', () => {
  it('should extract signature dish from editorialSummary', () => {
    const summary =
      'Bustling Italian trattoria famous for spicy rigatoni vodka and veal parmesan.';
    const dish = extractCommunityDishFromReviews(summary);
    expect(dish).toBe('spicy rigatoni vodka');
  });

  it('should extract must-order dish from user reviews when summary is absent', () => {
    const reviews = [
      { text: { text: 'Great ambiance and attentive service.' } },
      {
        text: {
          text: 'You definitely get the pistachio croissant before it sells out!',
        },
      },
    ];
    const dish = extractCommunityDishFromReviews(undefined, reviews);
    expect(dish).toBe('pistachio croissant');
  });

  it('should reject conversational fragment reviews like "i\'ve had in a while"', () => {
    const reviews = [
      { text: { text: "Hands down the best food I've had in a while." } },
      { text: { text: "Best meal I've had in a while!" } },
    ];
    const dish = extractCommunityDishFromReviews(undefined, reviews);
    expect(dish).toBeUndefined();
  });

  it('should ignore generic feedback in reviews', () => {
    const reviews = [
      { text: { text: 'The place was really nice and good food.' } },
    ];
    const dish = extractCommunityDishFromReviews(undefined, reviews);
    expect(dish).toBeUndefined();
  });
});

describe('extractNeighborhood', () => {
  it('should extract neighborhood when neighborhood component exists', () => {
    const components = [
      { longText: 'West Village', types: ['neighborhood', 'political'] },
      {
        longText: 'Manhattan',
        types: ['sublocality_level_1', 'sublocality', 'political'],
      },
      { longText: 'New York', types: ['locality', 'political'] },
    ];
    expect(extractNeighborhood(components)).toBe('West Village');
  });

  it('should fallback to sublocality when neighborhood is not available', () => {
    const components = [
      {
        longText: 'Brooklyn',
        types: ['sublocality_level_1', 'sublocality', 'political'],
      },
      { longText: 'New York', types: ['locality', 'political'] },
    ];
    expect(extractNeighborhood(components)).toBe('Brooklyn');
  });

  it('should return undefined when no neighborhood or sublocality exists', () => {
    const components = [
      { longText: 'New York', types: ['locality', 'political'] },
      { longText: 'NY', types: ['administrative_area_level_1', 'political'] },
    ];
    expect(extractNeighborhood(components)).toBeUndefined();
  });
});
