import { describe, expect, it } from 'bun:test';
import {
  getRestaurantOpenStatus,
  formatDisplayTime,
  parseTimeToMinutes,
} from './opening-hours';

describe('formatDisplayTime', () => {
  it('formats standard times cleanly', () => {
    expect(formatDisplayTime('11:30')).toBe('11:30 AM');
    expect(formatDisplayTime('10:00')).toBe('10 AM');
    expect(formatDisplayTime('22:00')).toBe('10 PM');
    expect(formatDisplayTime('17:45')).toBe('5:45 PM');
  });

  it('formats midnight and noon', () => {
    expect(formatDisplayTime('00:00')).toBe('midnight');
    expect(formatDisplayTime('12:00')).toBe('noon');
  });
});

describe('parseTimeToMinutes', () => {
  it('converts HH:mm to minutes from midnight', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('01:30')).toBe(90);
    expect(parseTimeToMinutes('12:00')).toBe(720);
    expect(parseTimeToMinutes('23:59')).toBe(1439);
  });
});

describe('getRestaurantOpenStatus', () => {
  it('identifies open place during standard operating hours', () => {
    // Wednesday 15:00 UTC (10:00 AM NYC EDT, utcOffset: -240)
    // 2026-08-26T15:00:00Z -> Day 3 (Wed), local time 11:00 AM (NYC)
    const testUtc = new Date('2026-08-26T15:00:00Z').getTime();

    const hours = {
      utcOffsetMinutes: -240, // EDT (UTC-4)
      periods: [
        {
          open: { day: 3, time: '10:00' },
          close: { day: 3, time: '22:00' },
        },
      ],
      weekdayDescriptions: ['Wednesday: 10:00 AM – 10:00 PM'],
    };

    const status = getRestaurantOpenStatus(hours, testUtc);
    expect(status.isOpen).toBe(true);
    expect(status.statusText).toBe('Open · Closes 10 PM');
    expect(status.currentLocalDay).toBe(3);
  });

  it('handles remote timezones accurately (User in Tokyo, Restaurant in NYC)', () => {
    // 2026-08-27T02:00:00Z (Thursday 11:00 AM Tokyo JST / Wednesday 10:00 PM NYC EDT)
    const testUtc = new Date('2026-08-27T02:00:00Z').getTime();

    const hours = {
      utcOffsetMinutes: -240, // NYC EDT: local time Wednesday 22:00 (10 PM)
      periods: [
        {
          open: { day: 3, time: '17:00' },
          close: { day: 3, time: '23:00' },
        },
      ],
    };

    const status = getRestaurantOpenStatus(hours, testUtc);
    expect(status.isOpen).toBe(true);
    expect(status.statusText).toBe('Open · Closes 11 PM');
    expect(status.currentLocalDay).toBe(3); // Wednesday in NYC, even though Thursday in Tokyo
  });

  it('handles overnight shifts accurately (Friday night into Saturday morning)', () => {
    // 2026-08-29T05:30:00Z (Saturday 1:30 AM NYC EDT, offset -240)
    // Friday night bar open from Friday 18:00 to Saturday 03:00
    const testUtc = new Date('2026-08-29T05:30:00Z').getTime();

    const hours = {
      utcOffsetMinutes: -240,
      periods: [
        {
          open: { day: 5, time: '18:00' }, // Friday 6 PM
          close: { day: 6, time: '03:00' }, // Saturday 3 AM
        },
      ],
    };

    const status = getRestaurantOpenStatus(hours, testUtc);
    expect(status.isOpen).toBe(true);
    expect(status.statusText).toBe('Open · Closes 3 AM');
    expect(status.currentLocalDay).toBe(6); // It's Saturday 1:30 AM locally
  });

  it('identifies closed place and shows upcoming opening time', () => {
    // 2026-08-26T12:00:00Z (Wednesday 8:00 AM NYC EDT, offset -240)
    const testUtc = new Date('2026-08-26T12:00:00Z').getTime();

    const hours = {
      utcOffsetMinutes: -240,
      periods: [
        {
          open: { day: 3, time: '11:30' },
          close: { day: 3, time: '22:00' },
        },
      ],
    };

    const status = getRestaurantOpenStatus(hours, testUtc);
    expect(status.isOpen).toBe(false);
    expect(status.statusText).toBe('Closed · Opens today 11:30 AM');
  });

  it('identifies 24/7 places', () => {
    const hours = {
      utcOffsetMinutes: 0,
      periods: [{ open: { day: 0, time: '00:00' } }],
    };

    const status = getRestaurantOpenStatus(hours);
    expect(status.isOpen).toBe(true);
    expect(status.statusText).toBe('Open 24 hours');
  });
});
