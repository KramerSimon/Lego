import { Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { PagedResult } from '../../../../core/services/api-types';
import { UserMissingPartsApiService } from '../../../../core/services/user-missing-parts-api.service';
import { SetsTableApiService, ThemesApiService, UsersApiService } from '../../../../core/services/tables/table-services.service';
import { debounceTime, firstValueFrom } from 'rxjs';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { GlobalSearchService } from '../../../../core/services/global-search.service';

@Component({
  selector: 'lego-user-missing-parts',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    TranslatePipe
  ],
  templateUrl: './user-missing-parts.component.html',
  styleUrls: ['./user-missing-parts.component.scss']
})
export class UserMissingPartsComponent implements OnInit {
  private readonly pickABrickUrl = 'https://www.lego.com/de-de/pick-and-build/pick-a-brick?icmp=PAB_All_Pieces';
  private readonly usersApi = inject(UsersApiService);
  private readonly themesApi = inject(ThemesApiService);
  private readonly setsApi = inject(SetsTableApiService);
  private readonly userMissingPartsApi = inject(UserMissingPartsApiService);
  private readonly globalSearch = inject(GlobalSearchService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private setSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private processedSearchTimestamp = 0;
  private filterOptionsLoaded = false;

  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly loadingSetOptions = signal(false);
  readonly showFilters = signal(false);
  readonly showDetails = signal(false);
  readonly showAdvancedOptions = signal(false);
  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(15);
  readonly pageSizeOptions = [10, 25, 50, 100, 200];
  readonly sortColumn = signal<string | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly users = signal<Array<{ user_id: number; label: string }>>([]);
  readonly themes = signal<Array<{ id: number; name: string }>>([]);
  readonly themeSearchTerm = signal('');
  readonly filteredThemes = computed(() => {
    const term = this.themeSearchTerm().trim().toLowerCase();
    if (!term) {
      return this.themes();
    }
    return this.themes().filter((theme) => {
      return theme.name.toLowerCase().includes(term) || String(theme.id).includes(term);
    });
  });
  readonly sets = signal<Array<{ set_num: string; label: string; img_url?: string }>>([]);
  readonly setSearchTerm = signal('');
  readonly setOptionsPage = signal(1);
  readonly setOptionsTotal = signal(0);
  readonly activeFilterCount = computed(() => {
    const raw = this.filters.getRawValue();
    let count = 0;
    if (Number(raw.user_id) > 0) {
      count += 1;
    }
    if (String(raw.set_num ?? '').trim()) {
      count += 1;
    }
    if (Number(raw.theme_id) > 0) {
      count += 1;
    }
    return count;
  });

  readonly compactColumns = [
    'part_name',
    'quantity_missing',
    'set'
  ];
  readonly detailedColumns = [
    'part_img_url',
    'part_num',
    'part_name',
    'quantity_missing',
    'color_name',
    'set',
    'theme_name',
    'user'
  ];
  readonly displayedColumns = signal<string[]>(this.compactColumns);
  readonly sortedRows = computed(() => this.rows());

  readonly filters = this.fb.group({
    user_id: this.fb.control<number | null>(null),
    set_num: this.fb.control<string>(''),
    theme_id: this.fb.control<number | null>(null),
    search: this.fb.control<string>('')
  });

  ngOnInit(): void {
    this.filters.valueChanges
      .pipe(debounceTime(180), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.reload();
      });

    this.reload();

    effect(() => {
      const request = this.globalSearch.request();
      if (!request || request.timestamp <= this.processedSearchTimestamp) {
        return;
      }
      if (request.scope !== 'all' && request.scope !== 'missing-parts') {
        return;
      }

      this.processedSearchTimestamp = request.timestamp;
      this.filters.controls.search.setValue(request.query, { emitEvent: false });
      this.page.set(1);
      this.reload();
    });
  }

  handleSetPanelOpened(opened: boolean): void {
    if (opened) {
      this.ensureFilterOptionsLoaded();
      this.setSearchTerm.set('');
      if (this.sets().length === 0 && !this.loadingSetOptions()) {
        this.searchSetOptions('', true);
      }
    }
  }

  handleThemePanelOpened(opened: boolean): void {
    if (opened) {
      this.ensureFilterOptionsLoaded();
      this.themeSearchTerm.set('');
    }
  }

  handleThemeSearchInput(rawValue: string): void {
    this.themeSearchTerm.set(rawValue);
    if (this.filters.controls.theme_id.value !== null) {
      this.filters.controls.theme_id.setValue(null);
    }
  }

  selectTheme(themeId: number | null): void {
    if (typeof themeId !== 'number' || themeId <= 0) {
      if (this.filters.controls.theme_id.value !== null) {
        this.filters.controls.theme_id.setValue(null);
      }
      this.themeSearchTerm.set('');
      return;
    }

    const selected = this.themes().find((theme) => theme.id === themeId) ?? null;
    this.filters.controls.theme_id.setValue(themeId);
    this.themeSearchTerm.set(selected ? selected.name : '');
  }

  handleSetSearchInput(rawValue: string): void {
    const value = rawValue.trim();
    this.setSearchTerm.set(value);
    if (this.setSearchTimer) {
      clearTimeout(this.setSearchTimer);
    }

    this.setSearchTimer = setTimeout(() => {
      this.searchSetOptions(value, true);
    }, 180);
  }

  hasMoreSetOptions(): boolean {
    return this.sets().length < this.setOptionsTotal();
  }

  loadMoreSetOptions(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.loadingSetOptions() || !this.hasMoreSetOptions()) {
      return;
    }
    this.searchSetOptions(this.setSearchTerm(), false);
  }

  handlePage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.reload();
  }

  toggleSort(column: string): void {
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

  toggleFilters(): void {
    const next = !this.showFilters();
    this.showFilters.set(next);
    if (next) {
      this.ensureFilterOptionsLoaded();
    }
  }

  toggleAdvancedOptions(): void {
    this.showAdvancedOptions.update((current) => !current);
  }

  toggleDetails(): void {
    const next = !this.showDetails();
    this.showDetails.set(next);
    this.displayedColumns.set(next ? this.detailedColumns : this.compactColumns);
    if (!next && this.sortColumn() && !this.compactColumns.includes(this.sortColumn() ?? '')) {
      this.clearSort();
    }
  }

  resetFilters(): void {
    this.filters.reset({
      user_id: null,
      set_num: '',
      theme_id: null,
      search: ''
    }, { emitEvent: false });
    this.setSearchTerm.set('');
    this.themeSearchTerm.set('');
    this.page.set(1);
    this.reload();
  }

  async exportMissingPartsCsv(): Promise<void> {
    if (this.exporting()) {
      return;
    }

    this.exporting.set(true);
    try {
      const { summary, skipped } = await this.buildMissingPartsSummary();
      if (summary.length === 0) {
        this.snackBar.open('No missing parts found for current filters.', 'Close', { duration: 2400 });
        return;
      }

      const lines = [
        'elementId,quantity',
        ...summary.map((item) => `${item.elementId},${item.quantity}`)
      ];

      this.downloadTextFile(this.buildExportFileName('csv'), lines.join('\n'), 'text/csv;charset=utf-8');
      const message = skipped > 0
        ? `CSV export ready (${summary.length} rows). Skipped ${skipped} rows without LEGO element ID.`
        : 'CSV export ready for Pick a Brick list upload.';
      this.snackBar.open(message, 'Close', { duration: 3200 });
    } catch {
      this.snackBar.open('Failed to build CSV export.', 'Close', { duration: 2600 });
    } finally {
      this.exporting.set(false);
    }
  }

  async exportMissingPartsJson(): Promise<void> {
    if (this.exporting()) {
      return;
    }

    this.exporting.set(true);
    try {
      const { summary, skipped } = await this.buildMissingPartsSummary();
      if (summary.length === 0) {
        this.snackBar.open('No missing parts found for current filters.', 'Close', { duration: 2400 });
        return;
      }

      this.downloadTextFile(this.buildExportFileName('json'), JSON.stringify(summary, null, 2), 'application/json;charset=utf-8');
      const message = skipped > 0
        ? `JSON export ready (${summary.length} rows). Skipped ${skipped} rows without LEGO element ID.`
        : 'JSON export ready for Pick a Brick list upload.';
      this.snackBar.open(message, 'Close', { duration: 3200 });
    } catch {
      this.snackBar.open('Failed to build JSON export.', 'Close', { duration: 2600 });
    } finally {
      this.exporting.set(false);
    }
  }

  async buyAllMissingParts(): Promise<void> {
    if (this.exporting()) {
      return;
    }

    this.exporting.set(true);
    try {
      const rows = await this.fetchAllFilteredRows();
      const brickLinkItems = this.buildBrickLinkWantedItems(rows);
      if (brickLinkItems.length === 0) {
        this.snackBar.open('No missing parts found for current filters.', 'Close', { duration: 2400 });
        return;
      }

      const brickLinkXml = this.buildBrickLinkWantedXml(brickLinkItems);
      const plainList = this.buildBrickLinkWantedList(brickLinkItems);
      this.downloadTextFile(this.buildExportFileName('xml'), brickLinkXml, 'application/xml;charset=utf-8');
      await this.copyToClipboard(plainList);
      window.open('https://www.bricklink.com/v2/wanted/upload.page', '_blank', 'noopener');
      this.snackBar.open('BrickLink XML downloaded and list copied. Opened BrickLink upload page.', 'Close', { duration: 4000 });
    } catch {
      this.snackBar.open('Failed to prepare BrickLink purchase list.', 'Close', { duration: 2800 });
    } finally {
      this.exporting.set(false);
    }
  }

  openPickABrick(): void {
    window.open(this.pickABrickUrl, '_blank', 'noopener');
  }

  asImageUrl(value: unknown): string | null {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return null;
    }
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }
    return `https://${raw}`;
  }

  userLabel(row: Record<string, unknown>): string {
    const fullName = String(row['full_name'] ?? '').trim();
    const username = String(row['username'] ?? '').trim();
    const email = String(row['email'] ?? '').trim();
    if (fullName) {
      return username ? `${fullName} (${username})` : fullName;
    }
    if (username) {
      return email ? `${username} (${email})` : username;
    }
    return email || `User #${String(row['user_id'] ?? '')}`;
  }

  setLabel(row: Record<string, unknown>): string {
    const setNum = String(row['set_num'] ?? '').trim();
    const setName = String(row['set_name'] ?? '').trim();
    if (setName) {
      return `${setNum} - ${setName}`;
    }
    return setNum;
  }

  missingBadgeClass(row: Record<string, unknown>): string {
    const quantity = Number(row['quantity_missing'] ?? 0);
    if (quantity >= 10) {
      return 'badge-high';
    }
    if (quantity >= 4) {
      return 'badge-medium';
    }
    return 'badge-low';
  }

  private loadFilterOptions(): void {
    this.usersApi.getRows(1, 200).subscribe({
      next: (response) => {
        const rows = Array.isArray(response) ? response : response.data;
        const mapped = (rows ?? []).map((row) => ({
          user_id: Number(row['user_id']),
          label: String(row['full_name'] || row['username'] || row['email'] || row['user_id'])
        }));
        this.users.set(mapped.filter((item) => Number.isFinite(item.user_id)));
      }
    });

    this.themesApi.getRows(1, 200).subscribe({
      next: (response) => {
        const rows = Array.isArray(response) ? response : response.data;
        const mapped = (rows ?? []).map((row) => ({
          id: Number(row['id']),
          name: String(row['name'] ?? '')
        }));
        this.themes.set(mapped.filter((item) => Number.isFinite(item.id) && item.name));
      }
    });

    this.searchSetOptions('', true);
  }

  private ensureFilterOptionsLoaded(): void {
    if (this.filterOptionsLoaded) {
      return;
    }
    this.filterOptionsLoaded = true;
    this.loadFilterOptions();
  }

  private searchSetOptions(searchValue: string, reset: boolean): void {
    this.loadingSetOptions.set(true);
    const trimmed = searchValue.trim();
    const page = reset ? 1 : this.setOptionsPage() + 1;
    const params: Record<string, string | number> = {};
    if (trimmed.length > 0) {
      params['search'] = trimmed;
      const searchYear = this.parseYear(trimmed);
      if (searchYear !== null) {
        params['year'] = searchYear;
      }
    }

    this.setsApi.getRows(page, 25, params).subscribe({
      next: (response) => {
        const paged = Array.isArray(response)
          ? { data: response, total: response.length }
          : response;
        const rows = paged.data ?? [];
        const mapped: Array<{ set_num: string; label: string; img_url?: string }> = [];
        for (const row of rows) {
          const setNum = String(row['set_num'] ?? '').trim();
          if (!setNum) {
            continue;
          }
          const setName = String(row['name'] ?? '').trim();
          const year = Number(row['year']);
          const yearLabel = Number.isInteger(year) && year > 0 ? ` (${year})` : '';
          const label = setName ? `${setNum} - ${setName}${yearLabel}` : `${setNum}${yearLabel}`;
          mapped.push({
            set_num: setNum,
            label,
            img_url: String(row['img_url'] ?? '').trim() || undefined
          });
        }

        this.sets.set(reset ? mapped : [...this.sets(), ...mapped]);
        this.setOptionsPage.set(page);
        this.setOptionsTotal.set(Number(paged.total ?? 0));
        this.loadingSetOptions.set(false);
      },
      error: () => {
        this.loadingSetOptions.set(false);
      }
    });
  }

  private reload(): void {
    const filters = this.buildCatalogFilters();
    const sortColumn = this.resolveServerSortColumn(this.sortColumn());

    this.loading.set(true);
    this.userMissingPartsApi.getCatalog(this.page(), this.pageSize(), {
      ...filters,
      ...(sortColumn ? { sortBy: sortColumn } : {}),
      ...(sortColumn ? { sortDir: this.sortDirection() } : {})
    }).subscribe({
      next: (response) => {
        const paged = response as PagedResult;
        this.rows.set(paged.data ?? []);
        this.total.set(paged.total ?? 0);
        this.page.set(paged.page ?? this.page());
        this.pageSize.set(paged.pageSize ?? this.pageSize());
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load missing parts.', 'Close', { duration: 3000 });
      }
    });
  }

  private async buildMissingPartsSummary(): Promise<{
    summary: Array<{
      elementId: string;
      quantity: number;
    }>;
    skipped: number;
  }> {
    const rows = await this.fetchAllFilteredRows();
    const aggregate = new Map<string, {
      elementId: string;
      quantity: number;
    }>();
    let skipped = 0;

    for (const row of rows) {
      const elementId = this.resolveElementId(row);
      if (!elementId) {
        skipped += 1;
        continue;
      }
      const quantity = Number(row['quantity_missing'] ?? 0);
      const safeQuantity = Number.isFinite(quantity) ? Math.max(0, Math.round(quantity)) : 0;
      if (safeQuantity <= 0) {
        continue;
      }

      const key = elementId;
      const existing = aggregate.get(key);
      if (existing) {
        existing.quantity += safeQuantity;
        continue;
      }

      aggregate.set(key, {
        elementId,
        quantity: safeQuantity
      });
    }

    const summary = Array.from(aggregate.values()).sort((a, b) => {
      return a.elementId.localeCompare(b.elementId, undefined, { numeric: true, sensitivity: 'base' });
    });

    return { summary, skipped };
  }

  private async fetchAllFilteredRows(): Promise<Record<string, unknown>[]> {
    const filters = this.buildCatalogFilters();
    const pageSize = 500;
    let nextPage = 1;
    let total = Number.POSITIVE_INFINITY;
    const allRows: Record<string, unknown>[] = [];

    while (allRows.length < total) {
      const response = await firstValueFrom(this.userMissingPartsApi.getCatalog(nextPage, pageSize, filters));
      const paged = response as PagedResult;
      const rows = Array.isArray(paged.data) ? paged.data : [];
      allRows.push(...rows);

      total = Number(paged.total ?? allRows.length);
      if (!rows.length || allRows.length >= total) {
        break;
      }
      nextPage += 1;
    }

    return allRows;
  }

  private buildCatalogFilters(): {
    user_id?: number;
    set_num?: string;
    theme_id?: number;
    search?: string;
    year?: number;
  } {
    const raw = this.filters.getRawValue();
    const filters: {
      user_id?: number;
      set_num?: string;
      theme_id?: number;
      search?: string;
      year?: number;
    } = {};

    const userId = Number(raw.user_id);
    if (Number.isFinite(userId) && userId > 0) {
      filters.user_id = userId;
    }

    const themeId = this.resolveThemeId(raw.theme_id);
    if (typeof themeId === 'number' && themeId > 0) {
      filters.theme_id = themeId;
    }

    const setNum = String(raw.set_num ?? '').trim();
    if (setNum) {
      filters.set_num = setNum;
    }

    const search = String(raw.search ?? '').trim();
    if (search) {
      filters.search = search;
      const searchYear = this.parseYear(search);
      if (searchYear !== null) {
        filters.year = searchYear;
      }
    }

    return filters;
  }

  private buildExportFileName(extension: 'csv' | 'json' | 'xml'): string {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `missing-parts-summary-${stamp}.${extension}`;
  }

  private resolveElementId(row: Record<string, unknown>): string {
    const direct = String(row['element_id'] ?? row['elementId'] ?? '').trim();
    if (direct) {
      return direct;
    }
    return '';
  }

  private buildBrickLinkWantedItems(rows: Record<string, unknown>[]): Array<{ partNum: string; colorId: number; quantity: number }> {
    const aggregate = new Map<string, { partNum: string; colorId: number; quantity: number }>();

    for (const row of rows) {
      const partNum = String(row['part_num'] ?? '').trim();
      const colorId = Number(row['color_id'] ?? 0);
      const quantity = Number(row['quantity_missing'] ?? 0);
      const safeQuantity = Number.isFinite(quantity) ? Math.max(0, Math.round(quantity)) : 0;
      if (!partNum || !Number.isFinite(colorId) || colorId <= 0 || safeQuantity <= 0) {
        continue;
      }

      const key = `${partNum}:${colorId}`;
      const current = aggregate.get(key);
      if (current) {
        current.quantity += safeQuantity;
        continue;
      }

      aggregate.set(key, { partNum, colorId, quantity: safeQuantity });
    }

    return Array.from(aggregate.values()).sort((a, b) => {
      return a.partNum.localeCompare(b.partNum, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  private buildBrickLinkWantedList(items: Array<{ partNum: string; colorId: number; quantity: number }>): string {
    const lines = ['Part,Color,Qty'];
    for (const item of items) {
      lines.push(`${item.partNum},${item.colorId},${item.quantity}`);
    }

    return lines.join('\n');
  }

  private buildBrickLinkWantedXml(items: Array<{ partNum: string; colorId: number; quantity: number }>): string {
    const lines = ['<INVENTORY>'];
    for (const item of items) {
      lines.push('  <ITEM>');
      lines.push('    <ITEMTYPE>P</ITEMTYPE>');
      lines.push(`    <ITEMID>${this.escapeXml(item.partNum)}</ITEMID>`);
      lines.push(`    <COLOR>${item.colorId}</COLOR>`);
      lines.push(`    <MINQTY>${item.quantity}</MINQTY>`);
      lines.push('  </ITEM>');
    }
    lines.push('</INVENTORY>');
    return lines.join('\n');
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private async copyToClipboard(content: string): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(content);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  private downloadTextFile(fileName: string, content: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  private getSortValue(row: Record<string, unknown>, column: string): unknown {
    if (column === 'set') {
      return this.setLabel(row);
    }
    if (column === 'user') {
      return this.userLabel(row);
    }
    return row[column];
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

  private resolveThemeId(rawValue: unknown): number | null {
    const numericThemeId = Number(rawValue);
    if (Number.isFinite(numericThemeId) && numericThemeId > 0) {
      return numericThemeId;
    }

    const term = this.themeSearchTerm().trim().toLowerCase();
    if (!term) {
      return null;
    }

    const exact = this.themes().find((theme) => theme.name.toLowerCase() === term || String(theme.id) === term);
    return exact ? exact.id : null;
  }

  private resolveServerSortColumn(column: string | null): string | null {
    if (!column) {
      return null;
    }

    const allowedColumns = new Set([
      'part_img_url',
      'part_num',
      'part_name',
      'quantity_missing',
      'color_name',
      'set',
      'theme_name',
      'user'
    ]);

    return allowedColumns.has(column) ? column : null;
  }
}
