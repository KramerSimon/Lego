export type FieldType = 'text' | 'number' | 'checkbox' | 'select';

export interface SelectOptionSource {
  endpoint: string;
  valueKey: string;
  labelKey: string;
  labelSecondaryKey?: string;
  labelFallbackKey?: string;
  searchParam?: string;
  pageSize?: number;
}

export interface TableField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  optionSource?: SelectOptionSource;
}

export interface TableConfig {
  key: string;
  title: string;
  endpoint: string;
  idField: string;
  fields: TableField[];
  displayedColumns: string[];
  allowCreate?: boolean;
}
