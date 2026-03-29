import { TableField } from '../../../core/models/table-config';

export interface SelectOption {
  value: unknown;
  label: string;
}

export interface SelectFieldState {
  options: SelectOption[];
  page: number;
  pageSize: number;
  total: number;
  loading: boolean;
  initialized: boolean;
  search: string;
}

export interface SelectSearchChange {
  field: TableField;
  value: string;
}

export interface SelectLoadMore {
  field: TableField;
  event: Event;
}
