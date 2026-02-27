import { PaginationParams, PaginatedResponse } from '../types/common.types.js';

export const getPaginationParams = (
  page?: string | number,
  limit?: string | number,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): PaginationParams => {
  const parsedPage = Math.max(1, parseInt(String(page || 1), 10));
  const parsedLimit = Math.min(100, Math.max(1, parseInt(String(limit || 20), 10)));

  return {
    page: parsedPage,
    limit: parsedLimit,
    sortBy: sortBy || 'createdAt',
    sortOrder: sortOrder || 'desc',
  };
};

export const createPaginatedResponse = <T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> => {
  const totalPages = Math.ceil(total / params.limit);

  return {
    data,
    pagination: {
      total,
      page: params.page,
      limit: params.limit,
      totalPages,
      hasMore: params.page < totalPages,
    },
  };
};
