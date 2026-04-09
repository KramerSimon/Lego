import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { TableConfig } from '../../../core/models/table-config';

export interface TableSortChange {
  column: string | null;
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'lego-table-catalog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatPaginatorModule
  ],
  templateUrl: './table-catalog.component.html',
  styleUrl: './table-catalog.component.scss'
})
export class TableCatalogComponent {
  readonly config = input.required<TableConfig>();
  readonly loading = input.required<boolean>();
  readonly rows = input.required<Record<string, unknown>[]>();
  readonly displayedColumns = input.required<string[]>();
  readonly total = input.required<number>();
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly pageSizeOptions = input.required<number[]>();
  readonly searchTerm = signal('');
  readonly sortColumn = signal<string | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly filteredRows = computed(() => {
    const rows = this.rows();
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return rows;
    }

    return rows.filter((row) => this.rowMatchesTerm(row, term));
  });

  readonly sortedRows = computed(() => this.filteredRows());
  readonly hasActiveSort = computed(() => Boolean(this.sortColumn()));

  readonly pageChange = output<PageEvent>();
  readonly sortChange = output<TableSortChange>();

  onPage(event: PageEvent): void {
    this.pageChange.emit(event);
  }

  handleSearchInput(value: string): void {
    this.searchTerm.set(value);
  }

  toggleSort(column: string): void {
    const active = this.sortColumn();
    if (active !== column) {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
      this.sortChange.emit({ column, direction: 'asc' });
      return;
    }

    const nextDirection = this.sortDirection() === 'asc' ? 'desc' : 'asc';
    this.sortDirection.set(nextDirection);
    this.sortChange.emit({ column, direction: nextDirection });
  }

  clearSort(): void {
    if (!this.sortColumn()) {
      return;
    }
    this.sortColumn.set(null);
    this.sortDirection.set('asc');
    this.sortChange.emit({ column: null, direction: 'asc' });
  }

  sortIcon(column: string): string {
    if (this.sortColumn() !== column) {
      return 'unfold_more';
    }
    return this.sortDirection() === 'asc' ? 'north' : 'south';
  }

  getColumnLabel(column: string): string {
    const fieldLabel = this.config().fields.find((field) => field.key === column)?.label;
    if (fieldLabel) {
      return fieldLabel;
    }

    const tokenMap: Record<string, string> = {
      id: 'ID',
      num: 'Number',
      url: 'URL',
      rgb: 'RGB',
      api: 'API'
    };

    return column
      .split('_')
      .filter((token) => token.length > 0)
      .map((token) => {
        const lowered = token.toLowerCase();
        if (tokenMap[lowered]) {
          return tokenMap[lowered];
        }
        return lowered.charAt(0).toUpperCase() + lowered.slice(1);
      })
      .join(' ');
  }

  isImageColumn(column: string): boolean {
    const key = column.toLowerCase();
    return key === 'img_url' || key === 'part_img_url' || key.endsWith('_img_url');
  }

  asImageUrl(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const url = value.trim();
    if (!url) {
      return null;
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return null;
  }

  private rowMatchesTerm(row: Record<string, unknown>, term: string): boolean {
    for (const value of Object.values(row)) {
      const normalized = this.normalizeSearchValue(value);
      if (normalized.includes(term)) {
        return true;
      }
    }
    return false;
  }

  private normalizeSearchValue(value: unknown): string {
    if (value == null) {
      return '';
    }
    if (typeof value === 'string') {
      return value.toLowerCase();
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value).toLowerCase();
    }
    return JSON.stringify(value).toLowerCase();
  }

}
