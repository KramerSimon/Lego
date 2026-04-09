import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { CatalogSetPart, CatalogSetPartsResponse, PagedResult } from '../../../../core/services/api-types';
import { SetsApiService } from '../../../../core/services/sets-api.service';
import { SetsTableApiService, ThemesApiService } from '../../../../core/services/tables/table-services.service';
import { SETS_CONFIG } from '../../config/table-definitions';

@Component({
  selector: 'lego-sets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatPaginatorModule
  ],
  templateUrl: './sets.component.html',
  styleUrl: './sets.component.scss'
})
export class SetsComponent implements OnDestroy {
  readonly config = SETS_CONFIG;
  private readonly setsTableApi = inject(SetsTableApiService);
  private readonly themesApi = inject(ThemesApiService);
  private readonly setsApi = inject(SetsApiService);

  readonly loading = signal(false);
  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly searchTerm = signal('');
  readonly selectedThemeId = signal<number | null>(null);
  readonly themeSearchTerm = signal('');
  readonly themeOptions = signal<Array<{ id: number; name: string }>>([]);
  readonly filteredThemeOptions = computed(() => {
    const term = this.themeSearchTerm().trim().toLowerCase();
    if (!term) {
      return this.themeOptions();
    }
    return this.themeOptions().filter((theme) => {
      return theme.name.toLowerCase().includes(term) || String(theme.id).includes(term);
    });
  });
  readonly themeNameById = computed(() => {
    const map: Record<number, string> = {};
    for (const theme of this.themeOptions()) {
      map[theme.id] = theme.name;
    }
    return map;
  });
  readonly pageSizeOptions = [10, 25, 50, 100, 200];
  readonly displayedColumns = [...this.config.displayedColumns, 'expand'];
  readonly detailColumns = ['expandedDetail'];
  readonly sortColumn = signal<string | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly sortedRows = computed(() => this.rows());

  readonly expandedSetNum = signal<string | null>(null);
  readonly expandedLoading = signal(false);
  readonly expandedPartsMap = signal<Record<string, CatalogSetPart[]>>({});
  readonly expandedError = signal<string | null>(null);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  readonly expandedParts = computed(() => {
    const setNum = this.expandedSetNum();
    if (!setNum) {
      return [];
    }
    return this.expandedPartsMap()[setNum] ?? [];
  });
  constructor() {
    this.loadThemeOptions();
    this.reload();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  }

  handlePage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.reload();
  }

  handleSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.scheduleSearch();
  }

  toggleSort(column: string): void {
    if (column === 'expand') {
      return;
    }

    const active = this.sortColumn();
    if (active !== column) {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
      this.page.set(1);
      this.reload();
      return;
    }

    this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    this.page.set(1);
    this.reload();
  }

  sortIcon(column: string): string {
    if (this.sortColumn() !== column) {
      return 'unfold_more';
    }
    return this.sortDirection() === 'asc' ? 'north' : 'south';
  }

  clearSort(): void {
    if (!this.sortColumn()) {
      return;
    }

    this.sortColumn.set(null);
    this.sortDirection.set('asc');
    this.page.set(1);
    this.reload();
  }

  triggerSearchNow(): void {
    this.page.set(1);
    this.expandedSetNum.set(null);
    this.expandedError.set(null);
    this.reload();
  }

  private scheduleSearch(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.triggerSearchNow();
    }, 180);
  }

  clearSearch(): void {
    const hasThemeFilter = this.resolveThemeIdFromSearch() !== null;
    if (!this.searchTerm().trim() && !this.themeSearchTerm().trim() && !hasThemeFilter) {
      return;
    }
    this.searchTerm.set('');
    this.themeSearchTerm.set('');
    this.selectedThemeId.set(null);
    this.triggerSearchNow();
  }

  handleThemeSearchInput(value: string): void {
    this.themeSearchTerm.set(value);
    this.selectedThemeId.set(null);
    this.scheduleSearch();
  }

  selectTheme(themeId: number | null): void {
    if (typeof themeId !== 'number' || themeId <= 0) {
      this.selectedThemeId.set(null);
      this.themeSearchTerm.set('');
      this.triggerSearchNow();
      return;
    }

    const selected = this.themeOptions().find((theme) => theme.id === themeId) ?? null;
    this.selectedThemeId.set(themeId);
    this.themeSearchTerm.set(selected ? selected.name : '');
    this.triggerSearchNow();
  }

  toggleExpand(row: Record<string, unknown>): void {
    const setNum = String(row['set_num'] ?? '');
    if (!setNum) {
      return;
    }

    if (this.expandedSetNum() === setNum) {
      this.expandedSetNum.set(null);
      this.expandedError.set(null);
      return;
    }

    this.expandedSetNum.set(setNum);
    this.expandedError.set(null);

    this.ensureExpandedData(setNum);
  }

  private ensureExpandedData(setNum: string): void {
    const cachedParts = this.expandedPartsMap()[setNum];
    if (!cachedParts) {
      this.expandedLoading.set(true);
      this.setsApi.getCatalogSetParts(setNum).subscribe({
        next: (response: CatalogSetPartsResponse) => {
          this.expandedLoading.set(false);
          this.expandedPartsMap.update((current) => ({
            ...current,
            [setNum]: Array.isArray(response.parts) ? response.parts : []
          }));
        },
        error: () => {
          this.expandedLoading.set(false);
          this.expandedError.set('Failed to load set parts.');
        }
      });
    }

  }

  isExpanded(row: Record<string, unknown>): boolean {
    return this.expandedSetNum() === String(row['set_num'] ?? '');
  }

  trackBySetNum(_index: number, row: Record<string, unknown>): string {
    return String(row['set_num'] ?? _index);
  }

  getColumnLabel(column: string): string {
    const fieldLabel = this.config.fields.find((field) => field.key === column)?.label;
    if (fieldLabel) {
      return fieldLabel;
    }
    if (column === 'expand') {
      return 'Details';
    }
    const tokenMap: Record<string, string> = {
      id: 'ID',
      num: 'Number',
      url: 'URL',
      rgb: 'RGB'
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
    return column.toLowerCase().endsWith('img_url') || column.toLowerCase() === 'img_url';
  }

  displayCellValue(column: string, value: unknown): unknown {
    if (column === 'theme_id') {
      return this.getThemeName(value);
    }
    return value;
  }

  asImageUrl(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return null;
  }

  private reload(): void {
    this.loading.set(true);
    const search = this.searchTerm().trim();
    const extraParams: Record<string, string | number> = {};
    const themeId = this.resolveThemeIdFromSearch();
    if (search) {
      extraParams['search'] = search;
      const searchYear = this.parseYear(search);
      if (searchYear !== null) {
        extraParams['year'] = searchYear;
      }
    }
    if (themeId) {
      extraParams['themeId'] = themeId;
    }

    const sortColumn = this.resolveServerSortColumn(this.sortColumn());
    if (sortColumn) {
      extraParams['sortBy'] = sortColumn;
      extraParams['sortDir'] = this.sortDirection();
    }

    this.setsTableApi.getRows(this.page(), this.pageSize(), extraParams).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (Array.isArray(response)) {
          this.rows.set(response);
          this.total.set(response.length);
          return;
        }
        const paged = response as PagedResult;
        this.rows.set(paged.data ?? []);
        this.total.set(paged.total ?? 0);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  private getSortValue(row: Record<string, unknown>, column: string): unknown {
    if (column === 'theme_id') {
      return this.getThemeName(row[column]);
    }
    return row[column];
  }

  private getThemeName(value: unknown): string {
    const themeId = Number(value);
    if (!Number.isInteger(themeId) || themeId <= 0) {
      return String(value ?? '');
    }
    return this.themeNameById()[themeId] ?? String(value);
  }

  private loadThemeOptions(): void {
    this.themesApi.getRows(1, 5000).subscribe({
      next: (response) => {
        const rows = Array.isArray(response) ? response : (response as PagedResult).data ?? [];
        const options = rows
          .map((row) => {
            const idValue = Number(row['id']);
            const nameValue = String(row['name'] ?? '').trim();
            if (!Number.isInteger(idValue) || idValue <= 0 || !nameValue) {
              return null;
            }
            return { id: idValue, name: nameValue };
          })
          .filter((item): item is { id: number; name: string } => item !== null)
          .sort((a, b) => a.name.localeCompare(b.name));
        this.themeOptions.set(options);
      },
      error: () => {
        this.themeOptions.set([]);
      }
    });
  }

  private resolveThemeIdFromSearch(): number | null {
    const selectedThemeId = this.selectedThemeId();
    if (typeof selectedThemeId === 'number' && selectedThemeId > 0) {
      return selectedThemeId;
    }

    const term = this.themeSearchTerm().trim().toLowerCase();
    if (!term) {
      return null;
    }

    const exact = this.themeOptions().find((theme) => theme.name.toLowerCase() === term || String(theme.id) === term);
    if (exact) {
      return exact.id;
    }

    return null;
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

  private compareValues(left: unknown, right: unknown): number {
    const leftNumber = this.toNumber(left);
    const rightNumber = this.toNumber(right);
    if (leftNumber !== null && rightNumber !== null) {
      return leftNumber - rightNumber;
    }

    const leftTime = this.toTimestamp(left);
    const rightTime = this.toTimestamp(right);
    if (leftTime !== null && rightTime !== null) {
      return leftTime - rightTime;
    }

    return String(left ?? '').localeCompare(String(right ?? ''), undefined, { numeric: true, sensitivity: 'base' });
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim();
      if (!normalized) {
        return null;
      }
      const numeric = Number(normalized);
      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }
    return null;
  }

  private toTimestamp(value: unknown): number | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const timestamp = Date.parse(trimmed);
    if (Number.isNaN(timestamp)) {
      return null;
    }
    return timestamp;
  }

  private resolveServerSortColumn(column: string | null): string | null {
    if (!column || column === 'expand') {
      return null;
    }

    const allowedColumns = new Set([
      'set_num',
      'name',
      'year',
      'theme_id',
      'num_parts',
      'img_url',
      'instruction_count'
    ]);

    return allowedColumns.has(column) ? column : null;
  }
}
