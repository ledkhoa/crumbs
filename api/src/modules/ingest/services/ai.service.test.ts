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

describe('pruneMetadataForPrompt', () => {
  it('should return undefined for missing or invalid JSON', () => {
    const { pruneMetadataForPrompt } = require('./ai.service');
    expect(pruneMetadataForPrompt(undefined)).toBeUndefined();
    expect(pruneMetadataForPrompt('')).toBeUndefined();
    expect(pruneMetadataForPrompt('invalid json')).toBeUndefined();
  });

  it('should prune noisy fields and keep essential metadata (locations, hashtags, mentions, alt text)', () => {
    const { pruneMetadataForPrompt } = require('./ai.service');
    const rawData = {
      locationName: 'Lilia Ristorante',
      locationAddress: '567 Union Ave',
      locationCity: 'Brooklyn',
      hashtags: ['nycfood', 'pasta', 'williamsburg'],
      mentions: ['lilianewyork'],
      taggedUsers: ['chefmissyrobbins'],
      alt: 'A plate of sheep milk agnolotti in buttery sauce',
      ownerUsername: 'foodie_nyc',
      // noisy fields that should be stripped
      comments: [{ text: 'omg so good', user: 'bob' }],
      latestComments: [1, 2, 3],
      videoPlayInfo: { duration: 15 },
      unrelatedAnalytics: { views: 50000 },
    };

    const prunedStr = pruneMetadataForPrompt(JSON.stringify(rawData));
    expect(prunedStr).toBeDefined();

    const parsed = JSON.parse(prunedStr!);
    expect(parsed.location).toBe('Lilia Ristorante');
    expect(parsed.address).toBe('567 Union Ave');
    expect(parsed.city).toBe('Brooklyn');
    expect(parsed.hashtags).toEqual(['nycfood', 'pasta', 'williamsburg']);
    expect(parsed.mentions).toEqual(['lilianewyork']);
    expect(parsed.taggedUsers).toEqual(['chefmissyrobbins']);
    expect(parsed.imageAltText).toBe(
      'A plate of sheep milk agnolotti in buttery sauce',
    );
    expect(parsed.author).toBe('foodie_nyc');
    expect(parsed.comments).toBeUndefined();
    expect(parsed.videoPlayInfo).toBeUndefined();
  });
});

describe('AIService Dynamic Provider Configuration', () => {
  it('should initialize with OpenAI provider and provided model', () => {
    const { AIService } = require('./ai.service');
    const ai = new AIService({
      provider: 'openai',
      model: 'gpt-5.6-luna',
      apiKey: 'sk-test-key',
    });
    expect(ai.provider).toBe('openai');
    expect(ai.modelName).toBe('gpt-5.6-luna');
  });

  it('should initialize with Google provider and provided model', () => {
    const { AIService } = require('./ai.service');
    const ai = new AIService({
      provider: 'google',
      model: 'gemini-2.5-flash',
      apiKey: 'AIzaSyTestKey',
    });
    expect(ai.provider).toBe('google');
    expect(ai.modelName).toBe('gemini-2.5-flash');
  });

  it('should throw an AIError if AI_MODEL is not provided in config or env', () => {
    const { AIService } = require('./ai.service');
    const prevModel = process.env.AI_MODEL;
    delete process.env.AI_MODEL;
    try {
      expect(
        () =>
          new AIService({
            provider: 'openai',
            apiKey: 'sk-test-key',
          }),
      ).toThrow('AI_MODEL is required');
    } finally {
      if (prevModel) process.env.AI_MODEL = prevModel;
    }
  });
});
