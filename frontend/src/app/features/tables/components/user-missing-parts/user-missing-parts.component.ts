import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { PagedResult } from '../../../../core/services/api-types';
import { UserMissingPartsApiService } from '../../../../core/services/user-missing-parts-api.service';
import { SetsTableApiService, ThemesApiService, UsersApiService } from '../../../../core/services/tables/table-services.service';

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
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule
  ],
  templateUrl: './user-missing-parts.component.html',
  styleUrls: ['./user-missing-parts.component.scss']
})
export class UserMissingPartsComponent implements OnInit {
  private readonly usersApi = inject(UsersApiService);
  private readonly themesApi = inject(ThemesApiService);
  private readonly setsApi = inject(SetsTableApiService);
  private readonly userMissingPartsApi = inject(UserMissingPartsApiService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private setSearchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly loading = signal(false);
  readonly loadingSetOptions = signal(false);
  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly pageSizeOptions = [10, 25, 50, 100, 200];
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

  readonly displayedColumns = [
    'part_img_url',
    'part_num',
    'part_name',
    'quantity_missing',
    'color_name',
    'set',
    'theme_name',
    'user'
  ];

  readonly filters = this.fb.group({
    user_id: this.fb.control<number | null>(null),
    set_num: this.fb.control<string>(''),
    theme_id: this.fb.control<number | null>(null),
    search: this.fb.control<string>('')
  });

  ngOnInit(): void {
    this.loadFilterOptions();
    this.reload();
  }

  handleSetPanelOpened(opened: boolean): void {
    if (opened) {
      this.setSearchTerm.set('');
      this.searchSetOptions('', true);
    }
  }

  handleThemePanelOpened(opened: boolean): void {
    if (opened) {
      this.themeSearchTerm.set('');
    }
  }

  handleThemeSearchInput(rawValue: string): void {
    this.themeSearchTerm.set(rawValue);
    this.filters.controls.theme_id.setValue(null, { emitEvent: false });
  }

  selectTheme(themeId: number | null): void {
    if (typeof themeId !== 'number' || themeId <= 0) {
      this.filters.controls.theme_id.setValue(null, { emitEvent: false });
      this.themeSearchTerm.set('');
      return;
    }

    const selected = this.themes().find((theme) => theme.id === themeId) ?? null;
    this.filters.controls.theme_id.setValue(themeId, { emitEvent: false });
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

  applyFilters(): void {
    this.page.set(1);
    this.reload();
  }

  resetFilters(): void {
    this.filters.reset({
      user_id: null,
      set_num: '',
      theme_id: null,
      search: ''
    });
    this.setSearchTerm.set('');
    this.themeSearchTerm.set('');
    this.page.set(1);
    this.reload();
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

  private searchSetOptions(searchValue: string, reset: boolean): void {
    this.loadingSetOptions.set(true);
    const trimmed = searchValue.trim();
    const page = reset ? 1 : this.setOptionsPage() + 1;
    const params: Record<string, string | number> = {};
    if (trimmed.length > 0) {
      params['search'] = trimmed;
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
          const label = setName ? `${setNum} - ${setName}` : setNum;
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
    const raw = this.filters.getRawValue();
    const filters: {
      user_id?: number;
      set_num?: string;
      theme_id?: number;
      search?: string;
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
    }

    this.loading.set(true);
    this.userMissingPartsApi.getCatalog(this.page(), this.pageSize(), filters).subscribe({
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
}
