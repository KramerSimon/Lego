import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { TableConfig, TableField } from '../core/table-config';
import { LegoApiService, PagedResult } from '../core/lego-api.service';

interface SelectOption {
  value: unknown;
  label: string;
}

interface SelectFieldState {
  options: SelectOption[];
  page: number;
  pageSize: number;
  total: number;
  loading: boolean;
  initialized: boolean;
  search: string;
}

@Component({
  selector: 'lego-table-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatIconModule,
    MatPaginatorModule,
    MatSelectModule
  ],
  template: `
    <div class="table-panel-shell">
      <mat-card class="entry-card" *ngIf="config().allowCreate !== false">
        <mat-card-header>
          <mat-card-title>Add {{ config().title }}</mat-card-title>
          <mat-card-subtitle>Insert a new row into {{ config().endpoint }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" class="entry-form" (ngSubmit)="submit()">
            <ng-container *ngFor="let field of config().fields">
              <mat-form-field *ngIf="field.type !== 'checkbox'" appearance="outline">
                <mat-label>{{ field.label }}</mat-label>
                <input
                  *ngIf="field.type !== 'select'"
                  matInput
                  [type]="field.type === 'number' ? 'number' : 'text'"
                  [formControlName]="field.key"
                />

                <mat-select *ngIf="field.type === 'select'" [formControlName]="field.key">
                  <mat-option class="search-option" *ngIf="field.optionSource?.searchParam" disabled>
                    <div class="search-input-wrap" (click)="$event.stopPropagation()">
                      <mat-icon>search</mat-icon>
                      <input
                        matInput
                        placeholder="Search by set number or name"
                        [value]="getSelectSearch(field)"
                        (click)="$event.stopPropagation()"
                        (keydown)="$event.stopPropagation()"
                        (input)="onSelectSearch(field, $any($event.target).value)"
                      />
                    </div>
                  </mat-option>

                  <mat-option *ngFor="let option of getOptions(field)" [value]="option.value">
                    {{ option.label }}
                  </mat-option>

                  <mat-option *ngIf="hasMoreOptions(field)" class="load-more-option">
                    <button mat-button type="button" (click)="loadMoreOptions(field, $event)" [disabled]="isSelectLoading(field)">
                      <span *ngIf="!isSelectLoading(field)">Load more</span>
                      <span *ngIf="isSelectLoading(field)">Loading...</span>
                    </button>
                  </mat-option>
                </mat-select>
              </mat-form-field>

              <mat-checkbox *ngIf="field.type === 'checkbox'" [formControlName]="field.key">
                {{ field.label }}
              </mat-checkbox>
            </ng-container>

            <div class="form-actions">
              <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || loading()">
                <mat-icon>add</mat-icon>
                Create
              </button>
              <button mat-stroked-button color="primary" type="button" (click)="reload()" [disabled]="loading()">
                <mat-icon>refresh</mat-icon>
                Refresh Table
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <mat-divider></mat-divider>

      <mat-card class="catalog-card">
        <mat-card-header>
          <mat-card-title>{{ config().title }} Catalog</mat-card-title>
          <mat-card-subtitle>Live view of {{ config().endpoint }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <div class="loader" *ngIf="loading()">
            <mat-spinner diameter="36"></mat-spinner>
          </div>

          <div class="table-wrap" *ngIf="!loading()">
            <table mat-table [dataSource]="rows()" class="mat-elevation-z2">
              <ng-container *ngFor="let column of displayedColumns()" [matColumnDef]="column">
                <th mat-header-cell *matHeaderCellDef>{{ column }}</th>
                <td mat-cell *matCellDef="let row">{{ row[column] }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns()"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns()"></tr>
            </table>

            <mat-paginator
              [length]="total()"
              [pageSize]="pageSize()"
              [pageSizeOptions]="pageSizeOptions"
              [pageIndex]="page() - 1"
              (page)="handlePage($event)"
            ></mat-paginator>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .table-panel-shell {
        display: grid;
        gap: 16px;
      }

      .entry-card,
      .catalog-card {
        border-radius: 18px;
        background: #ffffff;
        border: 1px solid #d7e5eb;
        box-shadow: 0 6px 22px rgba(15, 23, 42, 0.08);
      }

      mat-card-title {
        color: #0b7285;
      }

      mat-card-subtitle {
        color: #4f6a75;
      }

      .entry-form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 14px;
        align-items: end;
      }

      .form-actions {
        display: flex;
        gap: 10px;
        align-items: center;
      }

      .form-actions button {
        border-radius: 999px;
        min-height: 42px;
        font-weight: 600;
        letter-spacing: 0.01em;
      }

      button[mat-raised-button] {
        background: linear-gradient(90deg, #0b7285 0%, #1098ad 100%);
        color: #ffffff;
      }

      button[mat-stroked-button] {
        border-color: #0b7285;
        color: #0b7285;
        background: #f7fbfc;
      }

      button[mat-raised-button][disabled],
      button[mat-stroked-button][disabled] {
        opacity: 0.55;
      }

      .loader {
        display: flex;
        justify-content: center;
        padding: 18px;
      }

      .table-wrap {
        width: 100%;
        overflow-x: auto;
      }

      .search-option {
        min-height: 56px;
      }

      .search-input-wrap {
        display: flex;
        align-items: center;
        gap: 6px;
        width: 100%;
        color: #4f6a75;
      }

      .search-input-wrap input {
        width: 100%;
        border: 0;
        outline: 0;
        background: transparent;
        color: #183641;
        font: inherit;
      }

      .load-more-option button {
        width: 100%;
        justify-content: flex-start;
      }

      th.mat-mdc-header-cell {
        color: #24424d;
        font-weight: 700;
        background: #f2f8fa;
      }

      td.mat-mdc-cell {
        color: #183641;
      }

      mat-paginator {
        margin-top: 10px;
        border-radius: 12px;
        border: 1px solid #d7e5eb;
        background: #fbfeff;
      }

      table {
        width: 100%;
        min-width: 640px;
      }

      @media (max-width: 800px) {
        table {
          min-width: 420px;
        }

        .form-actions {
          flex-wrap: wrap;
        }
      }
    `
  ]
})
export class TablePanelComponent implements OnInit {
  readonly config = input.required<TableConfig>();
  private readonly api = inject(LegoApiService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly loading = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly displayedColumns = computed(() => this.config().displayedColumns);
  readonly pageSizeOptions = [10, 25, 50, 100, 200];
  readonly selectStates = signal<Record<string, SelectFieldState>>({});

  readonly form = this.fb.group({});

  ngOnInit(): void {
    this.buildForm();
    this.initializeSelectStates();
    this.loadSelectOptions(true);
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.getRows(this.config().endpoint, this.page(), this.pageSize()).subscribe({
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
    this.api.createRow(this.config().endpoint, this.form.getRawValue()).subscribe({
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
    }

    this.selectStates.update((current) => ({
      ...current,
      [field.key]: {
        ...current[field.key],
        loading: true,
        page
      }
    }));

    this.api.getRows(source.endpoint, page, pageSize, extraParams).subscribe({
        next: (response) => {
          const rows = Array.isArray(response) ? response : response.data;
          const total = Array.isArray(response) ? rows.length : (response.total ?? rows.length);
          const mapped = (rows ?? []).map((row) => {
            const primaryLabel = row[source.labelKey];
            const secondaryLabel = source.labelSecondaryKey ? row[source.labelSecondaryKey] : '';
            const fallbackLabel = source.labelFallbackKey ? row[source.labelFallbackKey] : '';
            const baseLabel = String(primaryLabel ?? fallbackLabel ?? row[source.valueKey] ?? 'Unknown');
            const label = secondaryLabel ? `${baseLabel} - ${String(secondaryLabel)}` : baseLabel;
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
}
