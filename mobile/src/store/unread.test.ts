import { describe, expect, it } from 'bun:test';

export function calculateUnreadCount(
  crumbs: Array<{ createdAt: string; guideIds?: string[] }>,
  lastInboxViewedAt: number,
  filterUnorganizedOnly = true,
): number {
  const targetCrumbs = filterUnorganizedOnly
    ? crumbs.filter((c) => !c.guideIds || c.guideIds.length === 0)
    : crumbs;

  return targetCrumbs.filter(
    (c) => new Date(c.createdAt).getTime() > lastInboxViewedAt,
  ).length;
}

describe('Unread Crumbs & Inbox Badge Logic', () => {
  const t0 = 1724300000000; // Baseline timestamp
  const mockCrumbs = [
    {
      id: 'c1',
      createdAt: new Date(t0 + 1000).toISOString(),
      guideIds: [],
    },
    {
      id: 'c2',
      createdAt: new Date(t0 + 2000).toISOString(),
      guideIds: [],
    },
    {
      id: 'c3',
      createdAt: new Date(t0 + 3000).toISOString(),
      guideIds: ['guide-1'], // already organized
    },
  ];

  it('counts all unorganized crumbs as unread when inbox has never been viewed (lastViewed = 0)', () => {
    const unread = calculateUnreadCount(mockCrumbs, 0);
    expect(unread).toBe(2); // c1 and c2
  });

  it('resets unread count to 0 after inbox is marked as viewed at latest timestamp', () => {
    const viewedTimestamp = t0 + 5000;
    const unread = calculateUnreadCount(mockCrumbs, viewedTimestamp);
    expect(unread).toBe(0);
  });

  it('increments unread count when new crumb arrives after last viewed timestamp', () => {
    const viewedTimestamp = t0 + 2500;
    // c1 (t0+1000) and c2 (t0+2000) are read
    // c4 arrives at t0+4000
    const updatedCrumbs = [
      ...mockCrumbs,
      {
        id: 'c4',
        createdAt: new Date(t0 + 4000).toISOString(),
        guideIds: [],
      },
    ];

    const unread = calculateUnreadCount(updatedCrumbs, viewedTimestamp);
    expect(unread).toBe(1); // only c4 is unread
  });

  it('ignores newly ingested crumbs if they are directly linked to a guide on ingestion', () => {
    const viewedTimestamp = t0 + 2500;
    const updatedCrumbs = [
      ...mockCrumbs,
      {
        id: 'c5',
        createdAt: new Date(t0 + 4000).toISOString(),
        guideIds: ['guide-favorites'],
      },
    ];

    const unread = calculateUnreadCount(updatedCrumbs, viewedTimestamp);
    expect(unread).toBe(0); // c5 is organized
  });
});
