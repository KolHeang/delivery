export interface PaginatedResult<T> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  results: T[];
}
