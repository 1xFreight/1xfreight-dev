import { FiltersI } from './filters.interface';

export interface PaginationI {
  skip?: number;
  limit?: number;
}

export type PaginationWithFilters = PaginationI & FiltersI;
