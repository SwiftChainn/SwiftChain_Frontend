export interface DeliveryFilterParams {
  search?: string;
  status?: string;
  sortBy?: 'date-asc' | 'date-desc';
}

export interface FilterState extends DeliveryFilterParams {
  hasActiveFilters: boolean;
}
