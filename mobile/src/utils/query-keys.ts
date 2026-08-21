export const QUERY_KEYS = {
  guides: {
    all: ['guides'] as const,
    lists: () => [...QUERY_KEYS.guides.all, 'list'] as const,
    detail: (id: string) => [...QUERY_KEYS.guides.all, 'detail', id] as const,
  },
  crumbs: {
    all: ['crumbs'] as const,
    inbox: () => [...QUERY_KEYS.crumbs.all, 'inbox'] as const,
    detail: (id: string) => [...QUERY_KEYS.crumbs.all, 'detail', id] as const,
  },
};
