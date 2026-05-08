import { TableConfig } from '../../../core/models/table-config';

export const INVENTORIES_CONFIG: TableConfig = {
  key: 'inventories',
  title: 'Inventories',
  endpoint: 'inventory',
  idField: 'id',
  allowCreate: false,
  displayedColumns: ['id', 'version', 'set_num'],
  fields: [
    { key: 'version', label: 'Version', type: 'number', required: true },
    { key: 'set_num', label: 'Set Number', type: 'text', required: true }
  ]
};

export const INVENTORY_PARTS_CONFIG: TableConfig = {
  key: 'inventory_parts',
  title: 'Inventory Parts',
  endpoint: 'inventory_parts',
  idField: 'inventory_id',
  allowCreate: false,
  displayedColumns: ['inventory_id', 'part_num', 'color_id', 'is_spare', 'quantity'],
  fields: [
    { key: 'inventory_id', label: 'Inventory Id', type: 'number', required: true },
    { key: 'part_num', label: 'Part Number', type: 'text', required: true },
    { key: 'color_id', label: 'Color Id', type: 'number', required: true },
    { key: 'is_spare', label: 'Is Spare', type: 'checkbox' },
    { key: 'quantity', label: 'Quantity', type: 'number', required: true }
  ]
};

export const PARTS_CONFIG: TableConfig = {
  key: 'parts',
  title: 'Parts',
  endpoint: 'parts',
  idField: 'part_num',
  allowCreate: false,
  displayedColumns: ['part_num', 'name', 'part_cat_id', 'part_img_url'],
  fields: [
    { key: 'part_num', label: 'Part Number', type: 'text', required: true },
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'part_cat_id', label: 'Part Category Id', type: 'number', required: true }
  ]
};

export const PART_CATEGORIES_CONFIG: TableConfig = {
  key: 'part_categories',
  title: 'Part Categories',
  endpoint: 'part_categories',
  idField: 'id',
  allowCreate: false,
  displayedColumns: ['id', 'name'],
  fields: [
    { key: 'id', label: 'Id', type: 'number', required: true },
    { key: 'name', label: 'Name', type: 'text', required: true }
  ]
};

export const PART_RELATIONSHIPS_CONFIG: TableConfig = {
  key: 'part_relationships',
  title: 'Part Relationships',
  endpoint: 'part_relationships',
  idField: 'rel_type',
  allowCreate: false,
  displayedColumns: ['rel_type', 'child_part_num', 'parent_part_num'],
  fields: [
    { key: 'rel_type', label: 'Relationship Type', type: 'text', required: true },
    { key: 'child_part_num', label: 'Child Part Number', type: 'text', required: true },
    { key: 'parent_part_num', label: 'Parent Part Number', type: 'text', required: true }
  ]
};

export const ELEMENTS_CONFIG: TableConfig = {
  key: 'elements',
  title: 'Elements',
  endpoint: 'elements',
  idField: 'element_id',
  allowCreate: false,
  displayedColumns: ['element_id', 'part_num', 'color_id'],
  fields: [
    { key: 'element_id', label: 'Element Id', type: 'text', required: true },
    { key: 'part_num', label: 'Part Number', type: 'text', required: true },
    { key: 'color_id', label: 'Color Id', type: 'number', required: true }
  ]
};

export const COLORS_CONFIG: TableConfig = {
  key: 'colors',
  title: 'Colors',
  endpoint: 'colors',
  idField: 'id',
  allowCreate: false,
  displayedColumns: ['id', 'name', 'rgb', 'is_trans'],
  fields: [
    { key: 'id', label: 'Id', type: 'number', required: true },
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'rgb', label: 'RGB', type: 'text', required: true },
    { key: 'is_trans', label: 'Is Transparent', type: 'checkbox' }
  ]
};

export const INVENTORY_MINIFIGS_CONFIG: TableConfig = {
  key: 'inventory_minifigs',
  title: 'Inventory Minifigs',
  endpoint: 'inventory_minifigs',
  idField: 'inventory_id',
  allowCreate: false,
  displayedColumns: ['inventory_id', 'fig_num', 'quantity'],
  fields: [
    { key: 'inventory_id', label: 'Inventory Id', type: 'number', required: true },
    { key: 'fig_num', label: 'Fig Number', type: 'text', required: true },
    { key: 'quantity', label: 'Quantity', type: 'number', required: true }
  ]
};

export const MINIFIGS_CONFIG: TableConfig = {
  key: 'minifigs',
  title: 'Minifigs',
  endpoint: 'minifigs',
  idField: 'fig_num',
  allowCreate: false,
  displayedColumns: ['fig_num', 'name', 'num_parts'],
  fields: [
    { key: 'fig_num', label: 'Fig Number', type: 'text', required: true },
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'num_parts', label: 'Number of Parts', type: 'number', required: true }
  ]
};

export const INVENTORY_SETS_CONFIG: TableConfig = {
  key: 'inventory_sets',
  title: 'Inventory Sets',
  endpoint: 'inventory_sets',
  idField: 'inventory_id',
  allowCreate: false,
  displayedColumns: ['inventory_id', 'set_num', 'quantity'],
  fields: [
    { key: 'inventory_id', label: 'Inventory Id', type: 'number', required: true },
    { key: 'set_num', label: 'Set Number', type: 'text', required: true },
    { key: 'quantity', label: 'Quantity', type: 'number', required: true }
  ]
};

export const SETS_CONFIG: TableConfig = {
  key: 'sets',
  title: 'Sets',
  endpoint: 'sets',
  idField: 'set_num',
  allowCreate: false,
  displayedColumns: ['set_num', 'name', 'year', 'theme_id', 'num_parts', 'img_url'],
  fields: [
    { key: 'set_num', label: 'Set Number', type: 'text', required: true },
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'year', label: 'Year', type: 'number', required: true },
    { key: 'theme_id', label: 'Theme', type: 'number', required: true },
    { key: 'num_parts', label: 'Number of Parts', type: 'number', required: true },
    { key: 'instruction_count', label: 'Instruction Links', type: 'number', required: false }
  ]
};

export const THEMES_CONFIG: TableConfig = {
  key: 'themes',
  title: 'Themes',
  endpoint: 'themes',
  idField: 'id',
  allowCreate: false,
  displayedColumns: ['id', 'name', 'parent_id'],
  fields: [
    { key: 'id', label: 'Id', type: 'number', required: true },
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'parent_id', label: 'Parent Id', type: 'number' }
  ]
};

export const USERS_CONFIG: TableConfig = {
  key: 'users',
  title: 'Users',
  endpoint: 'users',
  idField: 'user_id',
  displayedColumns: ['user_id', 'username', 'email', 'full_name'],
  fields: [
    { key: 'username', label: 'Username', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'text', required: true },
    { key: 'full_name', label: 'Full Name', type: 'text', required: true }
  ]
};

export const USER_PARTS_CONFIG: TableConfig = {
  key: 'user_parts',
  title: 'User Parts',
  endpoint: 'user_parts',
  idField: 'user_part_id',
  allowCreate: false,
  displayedColumns: ['user_part_id', 'user_id', 'part_num', 'color_id', 'quantity', 'inventory_part_id', 'is_built'],
  fields: [
    {
      key: 'user_id',
      label: 'User',
      type: 'select',
      required: true,
      optionSource: {
        endpoint: 'users',
        valueKey: 'user_id',
        labelKey: 'username',
        labelFallbackKey: 'email',
        pageSize: 200
      }
    },
    { key: 'part_num', label: 'Part Number', type: 'text', required: true },
    { key: 'color_id', label: 'Color Id', type: 'number', required: true },
    { key: 'quantity', label: 'Quantity', type: 'number', required: true },
    { key: 'inventory_part_id', label: 'Inventory Part Id', type: 'number' },
    { key: 'is_built', label: 'Built', type: 'checkbox' }
  ]
};

export const USER_MISSING_PARTS_CONFIG: TableConfig = {
  key: 'user_missing_parts',
  title: 'User Missing Parts',
  endpoint: 'user_missing_parts',
  idField: 'missing_part_id',
  allowCreate: false,
  displayedColumns: ['missing_part_id', 'user_id', 'part_num', 'color_id', 'quantity', 'partly_available'],
  fields: [
    {
      key: 'user_id',
      label: 'User',
      type: 'select',
      required: true,
      optionSource: {
        endpoint: 'users',
        valueKey: 'user_id',
        labelKey: 'username',
        labelFallbackKey: 'email',
        pageSize: 200
      }
    },
    { key: 'part_num', label: 'Part Number', type: 'text', required: true },
    { key: 'color_id', label: 'Color Id', type: 'number', required: true },
    { key: 'quantity', label: 'Quantity', type: 'number', required: true },
    { key: 'partly_available', label: 'Partly Available', type: 'checkbox' }
  ]
};

export const USER_SETS_CONFIG: TableConfig = {
  key: 'user_sets',
  title: 'User Sets',
  endpoint: 'user_sets',
  idField: 'user_set_id',
  displayedColumns: ['user_set_id', 'user_id', 'set_num', 'quantity', 'is_public', 'condition_public', 'condition_complete', 'purchase_price'],
  fields: [
    {
      key: 'user_id',
      label: 'User',
      type: 'select',
      required: true,
      optionSource: {
        endpoint: 'users',
        valueKey: 'user_id',
        labelKey: 'username',
        labelFallbackKey: 'email',
        pageSize: 200
      }
    },
    {
      key: 'set_num',
      label: 'Set Number',
      type: 'select',
      required: true,
      optionSource: {
        endpoint: 'sets',
        valueKey: 'set_num',
        labelKey: 'set_num',
        labelSecondaryKey: 'name',
        searchParam: 'search',
        pageSize: 25
      }
    },
    { key: 'quantity', label: 'Quantity', type: 'number', required: true },
    { key: 'is_public', label: 'Publicly Visible', type: 'checkbox' },
    { key: 'condition_public', label: 'Public Condition', type: 'text' },
    { key: 'condition_complete', label: 'Completeness', type: 'text' },
    { key: 'purchase_price', label: 'Purchase Price', type: 'number' }
  ]
};
