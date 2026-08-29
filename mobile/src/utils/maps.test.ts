import { describe, expect, it } from 'bun:test';
import { getMapsUrl } from './maps-url';

describe('getMapsUrl', () => {
  it('should generate iOS maps URL with encoded query', () => {
    const url = getMapsUrl({
      name: 'Carbone',
      address: '181 Thompson St, New York, NY 10012',
      platform: 'ios',
    });
    expect(url).toBe(
      'maps:0,0?q=Carbone%2C%20181%20Thompson%20St%2C%20New%20York%2C%20NY%2010012',
    );
  });

  it('should include lat/lng coordinate params on iOS when provided', () => {
    const url = getMapsUrl({
      name: 'Carbone',
      address: '181 Thompson St, New York, NY',
      latitude: 40.7279,
      longitude: -73.9997,
      platform: 'ios',
    });
    expect(url).toBe(
      'maps:0,0?q=Carbone%2C%20181%20Thompson%20St%2C%20New%20York%2C%20NY&ll=40.7279,-73.9997',
    );
  });

  it('should generate Android geo URL with encoded query', () => {
    const url = getMapsUrl({
      name: 'Katz Delicatessen',
      address: '205 E Houston St, New York, NY',
      platform: 'android',
    });
    expect(url).toBe(
      'geo:0,0?q=Katz%20Delicatessen%2C%20205%20E%20Houston%20St%2C%20New%20York%2C%20NY',
    );
  });

  it('should include coordinates in Android geo URL when provided', () => {
    const url = getMapsUrl({
      name: 'Katz Delicatessen',
      address: '205 E Houston St, New York, NY',
      latitude: 40.7222,
      longitude: -73.9874,
      platform: 'android',
    });
    expect(url).toBe(
      'geo:40.7222,-73.9874?q=Katz%20Delicatessen%2C%20205%20E%20Houston%20St%2C%20New%20York%2C%20NY',
    );
  });

  it('should fallback to Google Maps search web URL when on web or unrecognized platform', () => {
    const url = getMapsUrl({
      name: 'Tartine Bakery',
      address: '600 Guerrero St, San Francisco, CA',
      platform: 'web',
    });
    expect(url).toBe(
      'https://www.google.com/maps/search/?api=1&query=Tartine%20Bakery%2C%20600%20Guerrero%20St%2C%20San%20Francisco%2C%20CA',
    );
  });
});
