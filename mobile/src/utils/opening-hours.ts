import type { OpeningHoursInfo } from '@/types/ingest';

export interface OpenStatusResult {
  isOpen: boolean;
  statusText: string;
  currentLocalDay: number; // 0 (Sun) - 6 (Sat)
}

/**
 * Parses "HH:mm" time string into total minutes since midnight (0 - 1439).
 */
export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const [hourStr, minStr] = timeStr.split(':');
  const h = parseInt(hourStr, 10) || 0;
  const m = parseInt(minStr, 10) || 0;
  return h * 60 + m;
}

/**
 * Formats "HH:mm" 24-hour time to friendly 12-hour format (e.g. "10:00 PM", "11:30 AM", "midnight", "noon").
 */
export function formatDisplayTime(timeStr?: string): string {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  let hour = parseInt(hourStr, 10) || 0;
  const minute = parseInt(minStr, 10) || 0;

  if (hour === 0 && minute === 0) return 'midnight';
  if (hour === 12 && minute === 0) return 'noon';

  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  const minFormatted =
    minute === 0 ? '' : `:${String(minute).padStart(2, '0')}`;
  return `${hour}${minFormatted} ${ampm}`;
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Real-time, timezone-independent calculation of whether a restaurant is currently open,
 * accounting for the restaurant's local UTC offset, overnight shifts, and next open times.
 */
export function getRestaurantOpenStatus(
  hours?: OpeningHoursInfo | null,
  referenceDateUtc: number = Date.now(),
): OpenStatusResult {
  if (!hours?.periods || hours.periods.length === 0) {
    return {
      isOpen: false,
      statusText: '',
      currentLocalDay: -1,
    };
  }

  // Calculate the restaurant's local clock time from universal UTC epoch
  const offsetMs = (hours.utcOffsetMinutes ?? 0) * 60 * 1000;
  const localDate = new Date(referenceDateUtc + offsetMs);

  const currentDay = localDate.getUTCDay(); // 0 (Sun) - 6 (Sat)
  const currentMinutes =
    localDate.getUTCHours() * 60 + localDate.getUTCMinutes();
  const yesterdayDay = (currentDay + 6) % 7;

  // Case 1: 24/7 establishment
  if (
    hours.periods.length === 1 &&
    (!hours.periods[0].close ||
      (hours.periods[0].open.time === '00:00' &&
        hours.periods[0].close.time === '00:00'))
  ) {
    return {
      isOpen: true,
      statusText: 'Open 24 hours',
      currentLocalDay: currentDay,
    };
  }

  // Case 2: Check active shifts
  for (const period of hours.periods) {
    const openMin = parseTimeToMinutes(period.open.time);
    const closeMin = period.close
      ? parseTimeToMinutes(period.close.time)
      : 1440;

    // A. Normal same-day shift (e.g. Open 11:30, Close 22:00 on Day D)
    if (
      period.open.day === currentDay &&
      period.close &&
      period.close.day === currentDay
    ) {
      if (currentMinutes >= openMin && currentMinutes < closeMin) {
        return {
          isOpen: true,
          statusText: `Open · Closes ${formatDisplayTime(period.close.time)}`,
          currentLocalDay: currentDay,
        };
      }
    }

    // B. Overnight shift starting today (e.g. Open Fri 18:00, Close Sat 02:00)
    if (
      period.open.day === currentDay &&
      period.close &&
      period.close.day === (currentDay + 1) % 7
    ) {
      if (currentMinutes >= openMin) {
        return {
          isOpen: true,
          statusText: `Open · Closes ${formatDisplayTime(period.close.time)}`,
          currentLocalDay: currentDay,
        };
      }
    }

    // C. Overnight shift that started yesterday (e.g. Opened Fri 18:00, it is currently Sat 01:30 AM)
    if (
      period.open.day === yesterdayDay &&
      period.close &&
      period.close.day === currentDay
    ) {
      if (currentMinutes < closeMin) {
        return {
          isOpen: true,
          statusText: `Open · Closes ${formatDisplayTime(period.close.time)}`,
          currentLocalDay: currentDay,
        };
      }
    }
  }

  // Case 3: Currently closed -> Find next opening shift
  // Check remaining shifts today
  const todayUpcoming = hours.periods
    .filter(
      (p) =>
        p.open.day === currentDay &&
        parseTimeToMinutes(p.open.time) > currentMinutes,
    )
    .sort(
      (a, b) =>
        parseTimeToMinutes(a.open.time) - parseTimeToMinutes(b.open.time),
    );

  if (todayUpcoming.length > 0) {
    const next = todayUpcoming[0];
    return {
      isOpen: false,
      statusText: `Closed · Opens today ${formatDisplayTime(next.open.time)}`,
      currentLocalDay: currentDay,
    };
  }

  // Check upcoming shifts in the following days
  for (let offset = 1; offset <= 7; offset++) {
    const targetDay = (currentDay + offset) % 7;
    const dayShifts = hours.periods
      .filter((p) => p.open.day === targetDay)
      .sort(
        (a, b) =>
          parseTimeToMinutes(a.open.time) - parseTimeToMinutes(b.open.time),
      );

    if (dayShifts.length > 0) {
      const next = dayShifts[0];
      const dayLabel = offset === 1 ? 'tomorrow' : DAY_NAMES[targetDay];
      return {
        isOpen: false,
        statusText: `Closed · Opens ${dayLabel} ${formatDisplayTime(next.open.time)}`,
        currentLocalDay: currentDay,
      };
    }
  }

  return {
    isOpen: false,
    statusText: 'Closed',
    currentLocalDay: currentDay,
  };
}
