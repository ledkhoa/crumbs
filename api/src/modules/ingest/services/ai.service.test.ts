import { describe, expect, it } from 'bun:test';
import { extractedRestaurantSchema, postExtractionSchema } from './ai.service';

describe('extractedRestaurantSchema', () => {
  it('should validate valid restaurant with hero dish, vibe tags, and reservation details', () => {
    const validRestaurant = {
      name: 'Lilia',
      cuisine: 'Italian',
      city: 'Brooklyn',
      neighborhood: 'Williamsburg',
      heroDish: 'Sheep Milk Cheese Agnolotti',
      vibeAnchor: 'Warm, bustling neighborhood trattoria',
      courseCategory: 'main',
      walkInTips: 'Arrive by 3:45 PM for 4 PM bar seat release',
      reservationProvider: 'resy',
      reservationUrl: 'https://resy.com/cities/ny/lilia',
      vibeTags: ['Date Night', 'Dimly Lit', 'Pasta Bar'],
      recommendedDishes: ['Focaccia', 'Grilled Seafood'],
    };

    const parsed = extractedRestaurantSchema.parse(validRestaurant);
    expect(parsed.name).toBe('Lilia');
    expect(parsed.heroDish).toBe('Sheep Milk Cheese Agnolotti');
    expect(parsed.courseCategory).toBe('main');
    expect(parsed.vibeTags).toHaveLength(3);
    expect(parsed.reservationProvider).toBe('resy');
  });

  it('should default vibeTags to empty array if omitted', () => {
    const minimal = {
      name: 'Levain Bakery',
    };

    const parsed = extractedRestaurantSchema.parse(minimal);
    expect(parsed.name).toBe('Levain Bakery');
    expect(parsed.vibeTags).toEqual([]);
    expect(parsed.recommendedDishes).toEqual([]);
  });

  it('should reject invalid courseCategory enum value', () => {
    const invalidCategory = {
      name: 'Invalid Spot',
      courseCategory: 'invalid_category_name',
    };

    expect(() => extractedRestaurantSchema.parse(invalidCategory)).toThrow();
  });
});

describe('postExtractionSchema', () => {
  it('should validate single food spot post extraction', () => {
    const payload = {
      classification: 'restaurant_related',
      summary: 'Review of best pasta in Brooklyn',
      restaurants: [
        {
          name: 'Misi',
          cuisine: 'Italian',
          heroDish: 'Spinach and Mascarpone Filled Occhi',
          courseCategory: 'main',
          vibeTags: ['Date Night', 'Handmade Pasta'],
        },
      ],
    };

    const parsed = postExtractionSchema.parse(payload);
    expect(parsed.classification).toBe('restaurant_related');
    expect(parsed.restaurants).toHaveLength(1);
    expect(parsed.restaurants[0].name).toBe('Misi');
  });

  it('should validate multi-restaurant roundup extraction', () => {
    const payload = {
      classification: 'restaurant_related',
      summary: '3 Essential Rome Food Spots',
      restaurants: [
        { name: 'Roscioli', courseCategory: 'main', vibeTags: ['Carbonara'] },
        {
          name: 'Regoli',
          courseCategory: 'cafe_bakery',
          vibeTags: ['Maritozzo'],
        },
        {
          name: 'Jerry Thomas Speakeasy',
          courseCategory: 'cocktail_bar',
          vibeTags: ['Speakeasy'],
        },
      ],
    };

    const parsed = postExtractionSchema.parse(payload);
    expect(parsed.restaurants).toHaveLength(3);
    expect(parsed.restaurants[1].courseCategory).toBe('cafe_bakery');
    expect(parsed.restaurants[2].courseCategory).toBe('cocktail_bar');
  });

  it('should validate random unrelated content with 0 restaurants', () => {
    const payload = {
      classification: 'random_unrelated',
      summary: 'Comedy skit unrelated to food',
      restaurants: [],
    };

    const parsed = postExtractionSchema.parse(payload);
    expect(parsed.classification).toBe('random_unrelated');
    expect(parsed.restaurants).toHaveLength(0);
  });
});
