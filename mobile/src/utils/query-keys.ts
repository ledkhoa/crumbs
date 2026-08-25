export interface CrumbQueryFilters {
  status?: string;
  guideId?: string;
  unorganized?: boolean | string;
  bookable?: boolean | string;
  neighborhood?: string;
}

export const QUERY_KEYS = {
  guides: {
    all: ['guides'] as const,
    lists: () => [...QUERY_KEYS.guides.all, 'list'] as const,
    detail: (id: string) => [...QUERY_KEYS.guides.all, 'detail', id] as const,
  },
  crumbs: {
    all: ['crumbs'] as const,
    counts: () => [...QUERY_KEYS.crumbs.all, 'counts'] as const,
    list: (filters?: CrumbQueryFilters) =>
      [...QUERY_KEYS.crumbs.all, 'list', filters] as const,
    uncategorized: () =>
      [...QUERY_KEYS.crumbs.all, 'list', 'uncategorized'] as const,
    allList: () => [...QUERY_KEYS.crumbs.all, 'list', 'all'] as const,
    inbox: () => [...QUERY_KEYS.crumbs.all, 'inbox'] as const,
    detail: (id: string) => [...QUERY_KEYS.crumbs.all, 'detail', id] as const,
  },
};
