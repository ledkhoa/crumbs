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

export type DiningMomentSlot = 'morning' | 'lunch' | 'dinner' | 'late_night';

/**
 * Checks if a restaurant is scheduled to be open during a designated dining moment on the target day.
 *
 * Windows:
 * - morning: 07:00 – 11:00 (active anytime between 7 AM and 11 AM)
 * - lunch: 11:30 – 15:30 (active anytime between 11:30 AM and 3:30 PM)
 * - dinner: 17:00 – 22:00 (active anytime between 5:00 PM and 10:00 PM)
 * - late_night: 22:30 – 04:00 (active after 10:30 PM or overnight)
 */
export function isRestaurantOpenAtMoment(
  hours?: OpeningHoursInfo | null,
  momentType: DiningMomentSlot = 'lunch',
  referenceDateUtc: number = Date.now(),
): boolean {
  if (!hours?.periods || hours.periods.length === 0) {
    // If no operating hours data, allow potential match
    return true;
  }

  // 24/7 establishment
  if (
    hours.periods.length === 1 &&
    (!hours.periods[0].close ||
      (hours.periods[0].open.time === '00:00' &&
        hours.periods[0].close.time === '00:00'))
  ) {
    return true;
  }

  const offsetMs = (hours.utcOffsetMinutes ?? 0) * 60 * 1000;
  const localDate = new Date(referenceDateUtc + offsetMs);
  const currentDay = localDate.getUTCDay(); // 0 (Sun) - 6 (Sat)
  const yesterdayDay = (currentDay + 6) % 7;

  let slotStart = 690; // 11:30 AM default
  let slotEnd = 930; // 3:30 PM default

  if (momentType === 'morning') {
    slotStart = 420; // 7:00 AM
    slotEnd = 660; // 11:00 AM
  } else if (momentType === 'lunch') {
    slotStart = 690; // 11:30 AM
    slotEnd = 930; // 3:30 PM
  } else if (momentType === 'dinner') {
    slotStart = 1020; // 5:00 PM
    slotEnd = 1320; // 10:00 PM
  } else if (momentType === 'late_night') {
    slotStart = 1350; // 10:30 PM
    slotEnd = 1440; // Midnight
  }

  for (const period of hours.periods) {
    const openMin = parseTimeToMinutes(period.open.time);
    const closeMin = period.close
      ? parseTimeToMinutes(period.close.time)
      : 1440;

    // Check same-day shifts
    if (period.open.day === currentDay) {
      if (momentType === 'late_night') {
        if (period.close && period.close.day !== currentDay) {
          return true; // Overnight shift
        }
        if (closeMin >= 1350 || openMin >= 1320) {
          return true;
        }
      } else {
        const effectiveClose =
          period.close && period.close.day !== currentDay ? 1440 : closeMin;
        const hasOverlap =
          Math.max(openMin, slotStart) < Math.min(effectiveClose, slotEnd);
        if (hasOverlap) {
          return true;
        }
      }
    }

    // Check overnight shifts starting yesterday that bleed into early morning or late night
    if (
      period.open.day === yesterdayDay &&
      period.close &&
      period.close.day === currentDay
    ) {
      if (momentType === 'morning' && closeMin > 420) {
        // Must stay open past 7:00 AM into the morning window
        return true;
      }
      if (momentType === 'late_night' && closeMin >= 30) {
        // Open in the wee hours past midnight
        return true;
      }
    }
  }

  return false;
}
