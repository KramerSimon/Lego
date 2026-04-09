import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { PageEvent } from '@angular/material/paginator';
import { TableConfig, TableField } from '../../../core/models/table-config';
import { PagedResult } from '../../../core/services/api-types';
import { TableApiRegistryService } from '../../../core/services/tables/table-api-registry.service';
import { TableFormComponent } from '../table-form/table-form.component';
import { TableCatalogComponent, TableSortChange } from '../table-catalog/table-catalog.component';
import { SelectFieldState, SelectOption } from '../table-form/table-form.models';

@Component({
  selector: 'lego-table-panel',
  standalone: true,
  imports: [
    CommonModule,
    TableFormComponent,
    TableCatalogComponent,
    MatSnackBarModule,
    MatDividerModule
  ],
  templateUrl: './table-panel.component.html',
  styleUrl: './table-panel.component.scss'
})
export class TablePanelComponent implements OnInit {
  readonly config = input.required<TableConfig>();
  private readonly tableApiRegistry = inject(TableApiRegistryService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly loading = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly sortColumn = signal<string | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly displayedColumns = computed(() => this.config().displayedColumns);
  readonly pageSizeOptions = [10, 25, 50, 100, 200];
  readonly selectStates = signal<Record<string, SelectFieldState>>({});
  readonly optionsForField = (field: TableField): SelectOption[] => this.getOptions(field);
  readonly selectSearchForField = (field: TableField): string => this.getSelectSearch(field);
  readonly selectLoadingForField = (field: TableField): boolean => this.isSelectLoading(field);
  readonly selectHasMoreForField = (field: TableField): boolean => this.hasMoreOptions(field);

  readonly form = this.fb.group({});

  ngOnInit(): void {
    this.buildForm();
    this.initializeSelectStates();
    this.loadSelectOptions(true);
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    const extraParams: Record<string, string | number> = {};
    const sortColumn = this.sortColumn();
    if (sortColumn) {
      extraParams['sortBy'] = sortColumn;
      extraParams['sortDir'] = this.sortDirection();
    }

    this.tableApiRegistry.get(this.config().endpoint).getRows(this.page(), this.pageSize(), extraParams).subscribe({
      next: (response) => {
        if (Array.isArray(response)) {
          this.rows.set(response);
          this.total.set(response.length);
        } else {
          const paged = response as PagedResult;
          this.rows.set(paged.data ?? []);
          this.total.set(paged.total ?? 0);
          this.page.set(paged.page ?? this.page());
          this.pageSize.set(paged.pageSize ?? this.pageSize());
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open(`Failed to load ${this.config().title}`, 'Close', { duration: 3000 });
      }
    });
  }

  submit(): void {
    if (this.form.invalid || this.config().allowCreate === false) {
      return;
    }

    this.loading.set(true);
    this.tableApiRegistry.get(this.config().endpoint).createRow(this.form.getRawValue()).subscribe({
      next: () => {
        this.form.reset();
        this.page.set(1);
        this.reload();
        this.snackBar.open(`${this.config().title} created`, 'Close', { duration: 2000 });
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open(`Failed to create ${this.config().title}`, 'Close', { duration: 3000 });
      }
    });
  }

  handlePage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.reload();
  }

  handleSortChange(event: TableSortChange): void {
    const nextColumn = event.column;
    this.sortColumn.set(nextColumn);
    this.sortDirection.set(event.direction);
    this.page.set(1);
    this.reload();
  }

  getOptions(field: TableField): SelectOption[] {
    return this.selectStates()[field.key]?.options ?? [];
  }

  getSelectSearch(field: TableField): string {
    return this.selectStates()[field.key]?.search ?? '';
  }

  isSelectLoading(field: TableField): boolean {
    return this.selectStates()[field.key]?.loading ?? false;
  }

  hasMoreOptions(field: TableField): boolean {
    const state = this.selectStates()[field.key];
    if (!state) {
      return false;
    }
    return state.options.length < state.total;
  }

  onSelectSearch(field: TableField, value: string): void {
    const trimmed = value.trim();
    this.selectStates.update((current) => {
      const existing = current[field.key];
      if (!existing) {
        return current;
      }
      return {
        ...current,
        [field.key]: {
          ...existing,
          search: trimmed,
          page: 1,
          options: []
        }
      };
    });
    this.loadSelectField(field, true);
  }

  loadMoreOptions(field: TableField, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const state = this.selectStates()[field.key];
    if (!state || state.loading || state.options.length >= state.total) {
      return;
    }

    this.selectStates.update((current) => ({
      ...current,
      [field.key]: {
        ...current[field.key],
        page: current[field.key].page + 1
      }
    }));

    this.loadSelectField(field, false);
  }

  private buildForm(): void {
    for (const field of this.config().fields) {
      const validators = field.required ? [Validators.required] : [];
      const initialValue = field.type === 'checkbox' ? false : null;
      this.form.addControl(field.key, this.fb.control(initialValue, validators));
    }
  }

  private initializeSelectStates(): void {
    const nextState: Record<string, SelectFieldState> = {};
    for (const field of this.config().fields) {
      if (field.type !== 'select' || !field.optionSource) {
        continue;
      }

      nextState[field.key] = {
        options: [],
        page: 1,
        pageSize: field.optionSource.pageSize ?? 200,
        total: 0,
        loading: false,
        initialized: false,
        search: ''
      };
    }
    this.selectStates.set(nextState);
  }

  private loadSelectOptions(reset = false): void {
    for (const field of this.config().fields) {
      if (field.type !== 'select' || !field.optionSource) {
        continue;
      }

      this.loadSelectField(field, reset);
    }
  }

  private loadSelectField(field: TableField, reset: boolean): void {
    if (field.type !== 'select' || !field.optionSource) {
      return;
    }

    const state = this.selectStates()[field.key];
    if (!state || state.loading) {
      return;
    }

    const page = reset ? 1 : state.page;
    const pageSize = state.pageSize;
    const source = field.optionSource;
    const extraParams: Record<string, string | number> = {};
    if (source.searchParam && state.search) {
      extraParams[source.searchParam] = state.search;
      const year = this.parseYear(state.search);
      if (year !== null) {
        extraParams['year'] = year;
      }
    }

    this.selectStates.update((current) => ({
      ...current,
      [field.key]: {
        ...current[field.key],
        loading: true,
        page
      }
    }));

    this.tableApiRegistry.get(source.endpoint).getRows(page, pageSize, extraParams).subscribe({
        next: (response) => {
          const rows = Array.isArray(response) ? response : response.data;
          const total = Array.isArray(response) ? rows.length : (response.total ?? rows.length);
          const mapped = (rows ?? []).map((row) => {
            const primaryLabel = row[source.labelKey];
            const secondaryLabel = source.labelSecondaryKey ? row[source.labelSecondaryKey] : '';
            const fallbackLabel = source.labelFallbackKey ? row[source.labelFallbackKey] : '';
            const baseLabel = String(primaryLabel ?? fallbackLabel ?? row[source.valueKey] ?? 'Unknown');
            const year = Number(row['year']);
            const yearSuffix = Number.isInteger(year) && year > 0 ? ` (${year})` : '';
            const labelCore = secondaryLabel ? `${baseLabel} - ${String(secondaryLabel)}` : baseLabel;
            const label = `${labelCore}${yearSuffix}`;
            return {
              value: row[source.valueKey],
              label
            };
          });

          this.selectStates.update((current) => ({
            ...current,
            [field.key]: {
              ...current[field.key],
              options: reset ? mapped : [...current[field.key].options, ...mapped],
              total,
              loading: false,
              initialized: true,
              page
            }
          }));
        },
        error: () => {
          this.selectStates.update((current) => ({
            ...current,
            [field.key]: {
              ...current[field.key],
              loading: false
            }
          }));
          this.snackBar.open(`Failed to load ${field.label} options`, 'Close', { duration: 2500 });
        }
      });
  }

  private parseYear(value: string): number | null {
    const trimmed = value.trim();
    if (!/^\d{4}$/.test(trimmed)) {
      return null;
    }
    const year = Number(trimmed);
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      return null;
    }
    return year;
  }
}
