/**
 * Pagination Constants
 * Centralized configuration for pagination across the application
 */

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 12,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1,
  DEFAULT_PAGE: 1,
} as const;

export const UI_CONFIG = {
  GRID_BREAKPOINTS: {
    SM: 'grid-cols-1',
    MD: 'md:grid-cols-2', 
    LG: 'lg:grid-cols-4',
  },
  SKELETON_COUNT: 8,
} as const;