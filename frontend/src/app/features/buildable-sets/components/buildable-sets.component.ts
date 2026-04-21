import { Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { BuildableSetCatalogRow, CatalogSetPart, CatalogSetPartsResponse } from '../../../core/services/api-types';
import { SetsApiService } from '../../../core/services/sets-api.service';
import { UserSetsApiService } from '../../../core/services/user-sets-api.service';
import { ThemesApiService } from '../../../core/services/tables/table-services.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { debounceTime } from 'rxjs';
import { GlobalSearchService } from '../../../core/services/global-search.service';

@Component({
  selector: 'lego-buildable-sets',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    TranslatePipe
  ],
  templateUrl: './buildable-sets.component.html',
  styleUrl: './buildable-sets.component.scss'
})
export class BuildableSetsComponent implements OnInit {
  private readonly instructionSearchBaseUrl = 'https://www.lego.com/en-us/service/building-instructions/search-results?searchString=';
  private readonly userSetsApi = inject(UserSetsApiService);
  private readonly setsApi = inject(SetsApiService);
  private readonly themesApi = inject(ThemesApiService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly globalSearch = inject(GlobalSearchService);
  private requestToken = 0;
  private processedSearchTimestamp = 0;
  private themesLoaded = false;

  readonly loading = signal(false);
  readonly rows = signal<BuildableSetCatalogRow[]>([]);
  readonly themes = signal<Array<{ id: number; name: string }>>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(15);
  readonly pageSizeOptions = [10, 25, 50, 100, 200];
  readonly sortColumn = signal<string>('completeness_percentage');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');
  readonly filtersVisible = signal(false);
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

  readonly columns = ['set', 'theme', 'required_parts', 'owned_matching_parts', 'missing_parts', 'completeness', 'status', 'expand'];
  readonly detailColumns = ['expandedDetail'];
  readonly buildableCount = computed(() => this.rows().filter((row) => Number(row.is_buildable) === 1).length);

  readonly filters = this.fb.group({
    search: this.fb.control<string>(''),
    theme_id: this.fb.control<number | null>(null),
    buildableOnly: this.fb.control<boolean>(false)
  });

  ngOnInit(): void {
    this.filters.valueChanges
      .pipe(debounceTime(220), takeUntilDestroyed(this.destroyRef))
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
      if (request.scope !== 'all' && request.scope !== 'buildable-sets') {
        return;
      }

      this.processedSearchTimestamp = request.timestamp;
      this.filters.controls.search.setValue(request.query, { emitEvent: false });
      this.page.set(1);
      this.reload();
    });
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

  toggleFilters(): void {
    const next = !this.filtersVisible();
    this.filtersVisible.set(next);
    if (next && !this.themesLoaded) {
      this.themesLoaded = true;
      this.loadThemes();
    }
  }

  resetFilters(): void {
    this.filters.reset({
      search: '',
      theme_id: null,
      buildableOnly: false
    }, { emitEvent: false });
    this.page.set(1);
    this.reload();
  }

  setLabel(row: BuildableSetCatalogRow): string {
    if (row.set_name) {
      return `${row.set_num} - ${row.set_name}`;
    }
    return row.set_num;
  }

  asImageUrl(value: string | undefined): string | null {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return null;
    }
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }
    return `https://${raw}`;
  }

  completenessClass(row: BuildableSetCatalogRow): string {
    const percentage = Number(row.completeness_percentage ?? 0);
    if (percentage >= 100) {
      return 'complete';
    }
    if (percentage >= 70) {
      return 'high';
    }
    if (percentage >= 40) {
      return 'medium';
    }
    return 'low';
  }

  completenessValue(row: BuildableSetCatalogRow): number {
    const percentage = Number(row.completeness_percentage ?? 0);
    if (!Number.isFinite(percentage)) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(percentage)));
  }

  instructionSearchUrl(setNumValue: unknown): string {
    const normalized = this.normalizeSetNumForInstructionSearch(setNumValue);
    if (!normalized) {
      return this.instructionSearchBaseUrl;
    }
    return `${this.instructionSearchBaseUrl}${encodeURIComponent(normalized)}`;
  }

  toggleExpand(row: BuildableSetCatalogRow): void {
    const setNum = String(row.set_num ?? '');
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

  isExpanded(row: BuildableSetCatalogRow): boolean {
    return this.expandedSetNum() === String(row.set_num ?? '');
  }

  private ensureExpandedData(setNum: string): void {
    const cachedParts = this.expandedPartsMap()[setNum];
    if (cachedParts) {
      return;
    }

    this.expandedLoading.set(true);
    this.setsApi.getCatalogSetParts(setNum).subscribe({
      next: (response: CatalogSetPartsResponse) => {
        this.expandedPartsMap.update((current) => ({
          ...current,
          [setNum]: Array.isArray(response.parts) ? response.parts : []
        }));
        this.expandedLoading.set(false);
      },
      error: () => {
        this.expandedLoading.set(false);
        this.expandedError.set('Failed to load set parts.');
      }
    });
  }

  private normalizeSetNumForInstructionSearch(setNumValue: unknown): string {
    const raw = String(setNumValue ?? '').trim();
    if (!raw) {
      return '';
    }
    return raw.replace(/-\d+$/, '');
  }

  private loadThemes(): void {
    this.themesApi.getRows(1, 250).subscribe({
      next: (response) => {
        const rows = Array.isArray(response) ? response : response.data;
        const mapped = (rows ?? []).map((row) => ({
          id: Number(row['id']),
          name: String(row['name'] ?? '')
        }));
        this.themes.set(mapped.filter((item) => Number.isFinite(item.id) && item.id > 0 && item.name));
      }
    });
  }

  private reload(): void {
    const token = ++this.requestToken;
    const raw = this.filters.getRawValue();

    this.loading.set(true);

    this.userSetsApi.getBuildableCatalog(this.page(), this.pageSize(), {
      search: String(raw.search ?? '').trim() || undefined,
      theme_id: Number(raw.theme_id) > 0 ? Number(raw.theme_id) : undefined,
      buildableOnly: Boolean(raw.buildableOnly),
      sortBy: this.sortColumn(),
      sortDir: this.sortDirection()
    }).subscribe({
      next: (result) => {
        if (token !== this.requestToken) {
          return;
        }
        this.rows.set(Array.isArray(result?.data) ? result.data : []);
        this.total.set(Number(result?.total ?? 0));
        const activeSetNum = this.expandedSetNum();
        if (activeSetNum && !this.rows().some((row) => String(row.set_num) === activeSetNum)) {
          this.expandedSetNum.set(null);
          this.expandedError.set(null);
        }
      },
      error: () => {
        if (token !== this.requestToken) {
          return;
        }
        this.rows.set([]);
        this.total.set(0);
        this.loading.set(false);
      },
      complete: () => {
        if (token !== this.requestToken) {
          return;
        }
        this.loading.set(false);
      }
    });
  }
}
