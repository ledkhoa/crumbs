export const QUERY_KEYS = {
  guides: {
    all: ['guides'] as const,
    detail: (id: string) => ['guides', id] as const,
  },
  crumbs: {
    all: ['crumbs'] as const,
    inbox: ['crumbs', 'inbox'] as const,
  },
};
