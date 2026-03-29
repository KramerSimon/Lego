import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import {
  CatalogSetPart,
  CatalogSetPartsResponse,
  LegoApiService,
  PagedResult
} from '../../../../core/services/lego-api.service';
import { SETS_CONFIG } from '../../config/table-definitions';

@Component({
  selector: 'lego-sets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
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
export class SetsComponent {
  readonly config = SETS_CONFIG;
  private readonly api = inject(LegoApiService);

  readonly loading = signal(false);
  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly searchTerm = signal('');
  readonly appliedSearch = signal('');
  readonly selectedThemeId = signal<number | null>(null);
  readonly appliedThemeId = signal<number | null>(null);
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
  readonly pageSizeOptions = [10, 25, 50, 100, 200];
  readonly displayedColumns = [...this.config.displayedColumns, 'expand'];
  readonly detailColumns = ['expandedDetail'];

  readonly expandedSetNum = signal<string | null>(null);
  readonly expandedLoading = signal(false);
  readonly expandedPartsMap = signal<Record<string, CatalogSetPart[]>>({});
  readonly expandedError = signal<string | null>(null);
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

  handlePage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.reload();
  }

  applySearch(): void {
    this.appliedSearch.set(this.searchTerm().trim());
    const nextThemeId = this.selectedThemeId();
    this.appliedThemeId.set(typeof nextThemeId === 'number' && nextThemeId > 0 ? nextThemeId : null);
    this.page.set(1);
    this.expandedSetNum.set(null);
    this.expandedError.set(null);
    this.reload();
  }

  clearSearch(): void {
    if (!this.searchTerm() && !this.appliedSearch() && this.selectedThemeId() === null && this.appliedThemeId() === null) {
      return;
    }
    this.searchTerm.set('');
    this.appliedSearch.set('');
    this.themeSearchTerm.set('');
    this.selectedThemeId.set(null);
    this.appliedThemeId.set(null);
    this.page.set(1);
    this.expandedSetNum.set(null);
    this.expandedError.set(null);
    this.reload();
  }

  handleThemePanelOpened(opened: boolean): void {
    if (opened) {
      this.themeSearchTerm.set('');
    }
  }

  handleThemeSearchInput(value: string): void {
    this.themeSearchTerm.set(value);
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

    const cached = this.expandedPartsMap()[setNum];
    if (cached) {
      return;
    }

    this.expandedLoading.set(true);
    this.api.getCatalogSetParts(setNum).subscribe({
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
    const search = this.appliedSearch();
    const extraParams: Record<string, string | number> = {};
    const themeId = this.appliedThemeId();
    if (search) {
      extraParams['search'] = search;
    }
    if (themeId) {
      extraParams['themeId'] = themeId;
    }
    this.api.getRows('sets', this.page(), this.pageSize(), extraParams).subscribe({
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

  private loadThemeOptions(): void {
    this.api.getRows('themes', 1, 5000).subscribe({
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
}
