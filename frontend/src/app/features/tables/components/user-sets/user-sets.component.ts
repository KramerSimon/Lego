import { Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import {
  PagedResult,
  SetPartRequirement,
  UserSetBreakdownPart,
  UserSetBreakdownResponse,
  UserSetPartSelection,
  UserSetWithPartsResult
} from '../../../../core/services/api-types';
import { AuthService } from '../../../../core/services/auth.service';
import { UserSetsApiService } from '../../../../core/services/user-sets-api.service';
import { SetsTableApiService, UserSetsTableApiService, UsersApiService } from '../../../../core/services/tables/table-services.service';
import { forkJoin } from 'rxjs';
import { UserSetConfirmDialogComponent } from './user-set-confirm-dialog.component';
import { USER_SETS_CONFIG } from '../../config/table-definitions';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { GlobalSearchService } from '../../../../core/services/global-search.service';

@Component({
  selector: 'lego-user-sets',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDividerModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatDialogModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    TranslatePipe
  ],
  templateUrl: './user-sets.component.html',
  styleUrl: './user-sets.component.scss'
})
export class UserSetsComponent implements OnInit, OnDestroy {
  readonly config = USER_SETS_CONFIG;
  readonly publicConditionOptions: Array<{ value: string; label: string }> = [
    { value: '', label: 'Unknown condition' },
    { value: 'sealed', label: 'Sealed' },
    { value: 'like_new', label: 'Like New' },
    { value: 'used_good', label: 'Used - Good' },
    { value: 'used_fair', label: 'Used - Fair' },
    { value: 'incomplete', label: 'Incomplete' },
    { value: 'for_parts', label: 'For Parts' }
  ];
  private readonly userSetsApi = inject(UserSetsApiService);
  private readonly userSetsTableApi = inject(UserSetsTableApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly setsApi = inject(SetsTableApiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly globalSearch = inject(GlobalSearchService);
  private setSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly autoSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private processedSearchTimestamp = 0;
  private mobileMediaQuery: MediaQueryList | null = null;

  readonly isAdmin = computed(() => Boolean(this.auth.user()?.is_admin));

  readonly loadingOptions = signal(false);
  readonly loadingSetOptions = signal(false);
  readonly loadingParts = signal(false);
  readonly loadingCatalog = signal(false);
  readonly saving = signal(false);
  readonly showCreateForm = signal(false);
  readonly showAdvancedOptions = signal(false);
  readonly showCatalogSection = signal(false);
  readonly showCatalogFilters = signal(false);
  readonly isMobileLayout = signal(false);
  readonly activeMobileStep = signal<1 | 2 | 3>(1);
  readonly setParts = signal<UserSetPartSelection[]>([]);
  readonly setSearchTerm = signal('');
  readonly users = signal<Array<{ user_id: number; label: string }>>([]);
  readonly userLabelById = computed(() => {
    const map: Record<number, string> = {};
    for (const user of this.users()) {
      map[user.user_id] = user.label;
    }
    return map;
  });
  readonly sets = signal<Array<{ set_num: string; label: string; img_url?: string }>>([]);
  readonly setImageByNum = signal<Record<string, string | undefined>>({});
  readonly summary = signal<UserSetWithPartsResult['summary'] | null>(null);

  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(15);
  readonly pageSizeOptions = [10, 25, 50, 100, 200];
  readonly catalogColumns = signal<string[]>([]);
  readonly catalogDetailColumns = ['expandedDetail'];
  readonly sortColumn = signal<string | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly catalogUserFilter = signal<number | 'all'>('all');
  readonly sortedCatalogRows = computed(() => this.rows());

  readonly expandedUserSetId = signal<number | null>(null);
  readonly breakdownLoading = signal(false);
  readonly breakdownError = signal<string | null>(null);
  readonly breakdownMap = signal<Record<number, UserSetBreakdownResponse>>({});
  readonly breakdownRequiredTotals = signal<Record<number, Record<string, number>>>({});
  readonly editedQuantities = signal<Record<string, number>>({});
  readonly updatingRowKey = signal<string | null>(null);
  readonly autoSaveStatus = signal<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
  readonly deletingUserSetId = signal<number | null>(null);
  readonly savingSetMetaId = signal<number | null>(null);
  readonly editedSetMeta = signal<Record<number, { condition_public: string; purchase_price: string }>>({});
  readonly selectedSetImageUrl = computed(() => {
    const selectedSetNum = (this.form.controls.set_num.value ?? '').trim();
    if (!selectedSetNum) {
      return null;
    }
    return this.asImageUrl(this.setImageByNum()[selectedSetNum]);
  });
  readonly expandedBreakdown = computed(() => {
    const userSetId = this.expandedUserSetId();
    if (!userSetId) {
      return null;
    }
    return this.breakdownMap()[userSetId] ?? null;
  });

  readonly pendingSummary = computed(() => {
    const multiplier = this.getSetMultiplier();
    const parts = this.setParts();
    let totalOwnedQuantity = 0;
    let totalMissingQuantity = 0;
    let userPartsCreated = 0;
    let missingPartsCreated = 0;

    for (const part of parts) {
      const requiredTotal = Math.max(0, Number(part.required_quantity ?? 0) * multiplier);
      const owned = this.resolveOwnedQuantity(part, requiredTotal);
      const missing = Math.max(0, requiredTotal - owned);

      totalOwnedQuantity += owned;
      totalMissingQuantity += missing;
      if (owned > 0) {
        userPartsCreated += 1;
      }
      if (missing > 0) {
        missingPartsCreated += 1;
      }
    }

    return {
      partsProcessed: parts.length,
      userPartsCreated,
      missingPartsCreated,
      totalOwnedQuantity,
      totalMissingQuantity
    };
  });

  readonly completenessPreview = computed(() => {
    const summary = this.pendingSummary();
    const totalRequired = summary.totalOwnedQuantity + summary.totalMissingQuantity;
    if (totalRequired <= 0) {
      return 'unknown';
    }
    const percentage = Math.round((summary.totalOwnedQuantity / totalRequired) * 100);
    if (percentage >= 100) {
      return 'complete (100%)';
    }
    if (percentage <= 0) {
      return 'missing (0%)';
    }
    return `partial (${percentage}%)`;
  });

  readonly form = this.fb.group({
    user_id: this.fb.control<number | null>(null, [Validators.required]),
    set_num: this.fb.control<string>('', [Validators.required]),
    quantity: this.fb.control<number>(1, [Validators.required, Validators.min(1)]),
    is_public: this.fb.control<boolean>(false),
    condition_public: this.fb.control<string>(''),
    purchase_price: this.fb.control<number | null>(null)
  });

  ngOnInit(): void {
    this.initializeResponsiveState();
    this.applyCurrentUserConstraint();
    this.loadOptions();
    this.reloadCatalog();

    this.form.controls.set_num.valueChanges.subscribe((setNum) => {
      const normalized = (setNum ?? '').trim();
      if (!normalized) {
        this.setParts.set([]);
        return;
      }
      if (!this.isKnownSet(normalized)) {
        this.setParts.set([]);
        return;
      }
      this.loadSetParts(normalized);
    });

    this.form.controls.quantity.valueChanges.subscribe(() => {
      this.reconcileOwnedQuantities();
    });

    effect(() => {
      const request = this.globalSearch.request();
      if (!request || request.timestamp <= this.processedSearchTimestamp) {
        return;
      }
      if (request.scope !== 'all' && request.scope !== 'my-sets') {
        return;
      }

      this.processedSearchTimestamp = request.timestamp;
      this.showCreateForm.set(true);
      this.setSearchTerm.set(request.query);
      this.searchSetOptions(request.query);
    });
  }

  ngOnDestroy(): void {
    for (const timer of this.autoSaveTimers.values()) {
      clearTimeout(timer);
    }
    this.autoSaveTimers.clear();
  }

  handlePage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.reloadCatalog();
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
      this.reloadCatalog();
      return;
    }

    this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    this.page.set(1);
    this.reloadCatalog();
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
    this.reloadCatalog();
  }

  setCatalogUserFilter(value: string): void {
    const normalized = String(value ?? '').trim();
    if (!normalized || normalized === 'all') {
      this.catalogUserFilter.set('all');
      this.page.set(1);
      this.reloadCatalog();
      return;
    }

    const nextUserId = Number(normalized);
    if (!Number.isFinite(nextUserId) || nextUserId <= 0) {
      return;
    }

    this.catalogUserFilter.set(nextUserId);
    this.page.set(1);
    this.reloadCatalog();
  }

  catalogUserFilterValue(): string {
    const value = this.catalogUserFilter();
    return value === 'all' ? 'all' : String(value);
  }

  catalogUserOptionValue(userId: number): string {
    return String(userId);
  }

  handleSetPanelOpened(opened: boolean): void {
    if (opened) {
      this.setSearchTerm.set('');
      if (this.sets().length === 0 && !this.loadingSetOptions()) {
        this.searchSetOptions('');
      }
    }
  }

  toggleCreateForm(): void {
    this.showCreateForm.update((current) => !current);
  }

  openCreateForm(): void {
    this.showCreateForm.set(true);
  }

  toggleAdvancedOptions(): void {
    this.showAdvancedOptions.update((current) => !current);
  }

  openMobileStep(step: 1 | 2 | 3): void {
    this.activeMobileStep.set(step);
  }

  isStepVisible(step: 1 | 2 | 3): boolean {
    return !this.isMobileLayout() || this.activeMobileStep() === step;
  }

  openCatalogSection(): void {
    this.showCatalogSection.set(true);
  }

  toggleCatalogSection(): void {
    this.showCatalogSection.update((current) => !current);
  }

  toggleCatalogFilters(): void {
    this.showCatalogFilters.update((current) => !current);
  }

  toggleCatalogExpand(row: Record<string, unknown>): void {
    const userSetId = Number(row['user_set_id']);
    if (!Number.isFinite(userSetId) || userSetId <= 0) {
      return;
    }

    if (this.expandedUserSetId() === userSetId) {
      this.expandedUserSetId.set(null);
      this.breakdownError.set(null);
      return;
    }

    this.expandedUserSetId.set(userSetId);
    this.breakdownError.set(null);

    const cached = this.breakdownMap()[userSetId];
    if (cached) {
      this.ensureBreakdownRequiredTotals(userSetId, String(cached.set_num ?? ''));
      return;
    }

    this.breakdownLoading.set(true);
    this.userSetsApi.getBreakdown(userSetId).subscribe({
      next: (response) => {
        this.breakdownLoading.set(false);
        this.breakdownMap.update((current) => ({
          ...current,
          [userSetId]: response
        }));
        this.ensureBreakdownRequiredTotals(userSetId, String(response.set_num ?? ''));
      },
      error: () => {
        this.breakdownLoading.set(false);
        this.breakdownError.set('Failed to load available and missing parts.');
      }
    });
  }

  isCatalogExpanded(row: Record<string, unknown>): boolean {
    return this.expandedUserSetId() === Number(row['user_set_id']);
  }

  getCatalogColumnLabel(column: string): string {
    if (column === 'expand') {
      return 'Details';
    }
    const fieldLabel = this.config.fields.find((field) => field.key === column)?.label;
    if (fieldLabel) {
      return fieldLabel;
    }

    const tokenMap: Record<string, string> = {
      id: 'ID',
      num: 'Number',
      url: 'URL'
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

  formatCatalogCell(column: string, value: unknown): unknown {
    if (column === 'user_id') {
      return this.getUserLabel(value);
    }

    if (column !== 'owned_complete') {
      if (column === 'is_public') {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
          return numeric > 0 ? 'Yes' : 'No';
        }
        if (typeof value === 'boolean') {
          return value ? 'Yes' : 'No';
        }
      }
      return value;
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric > 0 ? 'Yes' : 'No';
    }

    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'yes' || normalized === 'true' || normalized === 'y') {
      return 'Yes';
    }
    if (normalized === 'no' || normalized === 'false' || normalized === 'n') {
      return 'No';
    }

    return value;
  }

  getEditableQuantity(kind: 'available' | 'missing', row: UserSetBreakdownPart): number {
    const key = this.getRowActionKey(kind, row.row_id);
    const cached = this.editedQuantities()[key];
    if (typeof cached === 'number' && Number.isFinite(cached)) {
      return cached;
    }
    return Math.max(0, Number(row.quantity ?? 0));
  }

  setEditableQuantity(kind: 'available' | 'missing', row: UserSetBreakdownPart, rawValue: string): void {
    const nextValue = Number(rawValue);
    const safeValue = Number.isFinite(nextValue) && nextValue >= 0 ? Math.round(nextValue) : 0;
    const key = this.getRowActionKey(kind, row.row_id);
    const breakdown = this.expandedBreakdown();
    const userSetId = this.expandedUserSetId();
    if (!breakdown || !userSetId) {
      this.editedQuantities.update((current) => ({
        ...current,
        [key]: safeValue
      }));
      this.scheduleAutoSave(kind, row.row_id);
      return;
    }

    const counterpart = this.findCounterpartPart(kind, row, breakdown);
    if (!counterpart) {
      this.editedQuantities.update((current) => ({
        ...current,
        [key]: safeValue
      }));
      this.scheduleAutoSave(kind, row.row_id);
      return;
    }

    const pairKey = this.buildBreakdownKey(row.part_num, row.color_id);
    const requiredTotal = this.resolveRequiredTotalForPair(userSetId, pairKey, kind, row, counterpart);

    if (kind === 'available') {
      const nextAvailable = Math.max(0, Math.min(requiredTotal, safeValue));
      const nextMissing = Math.max(0, requiredTotal - nextAvailable);
      const counterpartKey = this.getRowActionKey('missing', counterpart.row_id);
      this.editedQuantities.update((current) => ({
        ...current,
        [key]: nextAvailable,
        [counterpartKey]: nextMissing
      }));
      this.scheduleAutoSave(kind, row.row_id);
      return;
    }

    const nextMissing = Math.max(0, Math.min(requiredTotal, safeValue));
    const nextAvailable = Math.max(0, requiredTotal - nextMissing);
    const counterpartKey = this.getRowActionKey('available', counterpart.row_id);
    this.editedQuantities.update((current) => ({
      ...current,
      [key]: nextMissing,
      [counterpartKey]: nextAvailable
    }));
    this.scheduleAutoSave(kind, row.row_id);
  }

  saveBreakdownQuantity(kind: 'available' | 'missing', row: UserSetBreakdownPart, silent = false): void {
    const userSetId = this.expandedUserSetId();
    const breakdown = this.expandedBreakdown();
    if (!userSetId || !breakdown) {
      return;
    }

    const counterpart = this.findCounterpartPart(kind, row, breakdown);
    const rowKey = this.getRowActionKey(kind, row.row_id);
    const quantity = this.getEditableQuantity(kind, row);
    this.setAutoSaveStatus(kind, row.row_id, 'saving');

    if (!counterpart) {
      this.updatingRowKey.set(rowKey);

      this.userSetsApi.updateBreakdownPart(userSetId, kind, row.row_id, quantity).subscribe({
        next: () => {
          this.updatingRowKey.set(null);
          this.breakdownMap.update((current) => {
            const existing = current[userSetId];
            if (!existing) {
              return current;
            }
            const next = { ...existing };
            if (kind === 'available') {
              next.available_parts = existing.available_parts.map((part) => (
                part.row_id === row.row_id ? { ...part, quantity } : part
              ));
            } else {
              next.missing_parts = existing.missing_parts.map((part) => (
                part.row_id === row.row_id ? { ...part, quantity } : part
              ));
            }
            return {
              ...current,
              [userSetId]: next
            };
          });
          this.setAutoSaveStatus(kind, row.row_id, 'saved');
          if (!silent) {
            this.snackBar.open('Part quantity updated.', 'Close', { duration: 1800 });
          }
        },
        error: () => {
          this.updatingRowKey.set(null);
          this.setAutoSaveStatus(kind, row.row_id, 'error');
          if (!silent) {
            this.snackBar.open('Failed to update part quantity.', 'Close', { duration: 2600 });
          }
        }
      });
      return;
    }

    const counterpartKind: 'available' | 'missing' = kind === 'available' ? 'missing' : 'available';
    const counterpartQuantity = this.getEditableQuantity(counterpartKind, counterpart);
    this.updatingRowKey.set(rowKey);

    forkJoin([
      this.userSetsApi.updateBreakdownPart(userSetId, kind, row.row_id, quantity),
      this.userSetsApi.updateBreakdownPart(userSetId, counterpartKind, counterpart.row_id, counterpartQuantity)
    ]).subscribe({
      next: () => {
        this.updatingRowKey.set(null);
        this.breakdownMap.update((current) => {
          const existing = current[userSetId];
          if (!existing) {
            return current;
          }
          const next = { ...existing };
          next.available_parts = existing.available_parts.map((part) => {
            if (part.row_id === row.row_id && kind === 'available') {
              return { ...part, quantity };
            }
            if (part.row_id === counterpart.row_id && counterpartKind === 'available') {
              return { ...part, quantity: counterpartQuantity };
            }
            return part;
          });
          next.missing_parts = existing.missing_parts.map((part) => {
            if (part.row_id === row.row_id && kind === 'missing') {
              return { ...part, quantity };
            }
            if (part.row_id === counterpart.row_id && counterpartKind === 'missing') {
              return { ...part, quantity: counterpartQuantity };
            }
            return part;
          });
          return {
            ...current,
            [userSetId]: next
          };
        });
        this.setAutoSaveStatus(kind, row.row_id, 'saved');
        if (!silent) {
          this.snackBar.open('Available and missing quantities balanced and saved.', 'Close', { duration: 2200 });
        }
      },
      error: () => {
        this.updatingRowKey.set(null);
        this.setAutoSaveStatus(kind, row.row_id, 'error');
        if (!silent) {
          this.snackBar.open('Failed to save balanced quantities.', 'Close', { duration: 2600 });
        }
      }
    });
  }

  autoSaveLabel(kind: 'available' | 'missing', rowId: number): string {
    const status = this.autoSaveStatus()[this.getRowActionKey(kind, rowId)] ?? 'idle';
    if (status === 'saving') {
      return 'Saving...';
    }
    if (status === 'saved') {
      return 'Saved ✓';
    }
    if (status === 'error') {
      return 'Retry needed';
    }
    return '';
  }

  deleteCatalogUserSet(row: Record<string, unknown>): void {
    const userSetId = Number(row['user_set_id']);
    if (!Number.isFinite(userSetId) || userSetId <= 0) {
      return;
    }
    const label = String(row['set_num'] ?? userSetId);
    const confirmed = confirm(`Delete whole user set ${label}? This also removes linked available/missing rows.`);
    if (!confirmed) {
      return;
    }

    this.deletingUserSetId.set(userSetId);
    this.userSetsTableApi.deleteRow(userSetId).subscribe({
      next: () => {
        this.deletingUserSetId.set(null);
        if (this.expandedUserSetId() === userSetId) {
          this.expandedUserSetId.set(null);
          this.breakdownError.set(null);
        }
        this.breakdownMap.update((current) => {
          const next = { ...current };
          delete next[userSetId];
          return next;
        });
        this.snackBar.open('User set deleted.', 'Close', { duration: 2200 });
        this.reloadCatalog();
      },
      error: () => {
        this.deletingUserSetId.set(null);
        this.snackBar.open('Failed to delete user set.', 'Close', { duration: 3000 });
      }
    });
  }

  isDeletingUserSet(row: Record<string, unknown>): boolean {
    return this.deletingUserSetId() === Number(row['user_set_id']);
  }

  getEditableSetCondition(row: Record<string, unknown>): string {
    const userSetId = Number(row['user_set_id']);
    const edited = this.editedSetMeta()[userSetId];
    if (edited) {
      return edited.condition_public;
    }
    return String(row['condition_public'] ?? '').trim();
  }

  getEditableSetPrice(row: Record<string, unknown>): string {
    const userSetId = Number(row['user_set_id']);
    const edited = this.editedSetMeta()[userSetId];
    if (edited) {
      return edited.purchase_price;
    }
    const raw = row['purchase_price'];
    if (raw == null || raw === '') {
      return '';
    }
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? String(numeric) : '';
  }

  setEditableSetCondition(row: Record<string, unknown>, value: string): void {
    const userSetId = Number(row['user_set_id']);
    if (!Number.isFinite(userSetId) || userSetId <= 0) {
      return;
    }
    const current = this.editedSetMeta()[userSetId] ?? {
      condition_public: this.getEditableSetCondition(row),
      purchase_price: this.getEditableSetPrice(row)
    };
    this.editedSetMeta.update((state) => ({
      ...state,
      [userSetId]: {
        ...current,
        condition_public: String(value ?? '').trim()
      }
    }));
  }

  setEditableSetPrice(row: Record<string, unknown>, value: string): void {
    const userSetId = Number(row['user_set_id']);
    if (!Number.isFinite(userSetId) || userSetId <= 0) {
      return;
    }
    const current = this.editedSetMeta()[userSetId] ?? {
      condition_public: this.getEditableSetCondition(row),
      purchase_price: this.getEditableSetPrice(row)
    };
    this.editedSetMeta.update((state) => ({
      ...state,
      [userSetId]: {
        ...current,
        purchase_price: String(value ?? '').trim()
      }
    }));
  }

  saveCatalogSetMeta(row: Record<string, unknown>): void {
    const userSetId = Number(row['user_set_id']);
    if (!Number.isFinite(userSetId) || userSetId <= 0 || this.savingSetMetaId() === userSetId) {
      return;
    }

    const conditionPublic = this.getEditableSetCondition(row);
    const rawPrice = this.getEditableSetPrice(row);
    const parsedPrice = rawPrice === '' ? null : Number(rawPrice);

    if (rawPrice !== '' && !Number.isFinite(parsedPrice)) {
      this.snackBar.open('Purchase price must be a valid number.', 'Close', { duration: 2600 });
      return;
    }

    this.savingSetMetaId.set(userSetId);
    this.userSetsApi.updateUserSet(userSetId, {
      condition_public: conditionPublic || null,
      purchase_price: parsedPrice
    }).subscribe({
      next: () => {
        this.savingSetMetaId.set(null);
        this.rows.update((rows) => rows.map((entry) => {
          if (Number(entry['user_set_id']) !== userSetId) {
            return entry;
          }
          return {
            ...entry,
            condition_public: conditionPublic || null,
            purchase_price: parsedPrice
          };
        }));
        this.snackBar.open('Set details updated.', 'Close', { duration: 1800 });
      },
      error: () => {
        this.savingSetMetaId.set(null);
        this.snackBar.open('Failed to update set details.', 'Close', { duration: 2600 });
      }
    });
  }

  isSavingSetMeta(row: Record<string, unknown>): boolean {
    return this.savingSetMetaId() === Number(row['user_set_id']);
  }

  isUpdatingRow(kind: 'available' | 'missing', rowId: number): boolean {
    return this.updatingRowKey() === this.getRowActionKey(kind, rowId);
  }

  handleSetSearchInput(value: string): void {
    this.setSearchTerm.set(value);
    if (this.setSearchTimer) {
      clearTimeout(this.setSearchTimer);
    }
    this.setSearchTimer = setTimeout(() => {
      this.searchSetOptions(this.setSearchTerm());
    }, 220);
  }

  toggleAllParts(hasPart: boolean): void {
    const multiplier = this.getSetMultiplier();
    this.setParts.update((parts) => parts.map((part) => {
      const requiredTotal = Math.max(0, Number(part.required_quantity ?? 0) * multiplier);
      return {
        ...part,
        has_part: hasPart,
        owned_quantity: hasPart ? requiredTotal : 0
      };
    }));
    this.triggerHapticFeedback();
  }

  setHasPart(index: number, hasPart: boolean): void {
    const multiplier = this.getSetMultiplier();
    this.setParts.update((parts) => parts.map((part, partIndex) => {
      if (partIndex !== index) {
        return part;
      }
      const requiredTotal = Math.max(0, Number(part.required_quantity ?? 0) * multiplier);
      return {
        ...part,
        has_part: hasPart,
        owned_quantity: hasPart ? requiredTotal : 0
      };
    }));
  }

  setOwnedQuantity(index: number, value: string): void {
    const multiplier = this.getSetMultiplier();
    const rawNumber = Number(value);
    this.setParts.update((parts) => parts.map((part, partIndex) => {
      if (partIndex !== index) {
        return part;
      }
      const requiredTotal = Math.max(0, Number(part.required_quantity ?? 0) * multiplier);
      const safeValue = Number.isFinite(rawNumber) ? rawNumber : 0;
      const ownedQuantity = Math.max(0, Math.min(requiredTotal, safeValue));
      return {
        ...part,
        owned_quantity: ownedQuantity,
        has_part: ownedQuantity > 0
      };
    }));
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      return;
    }

    if (this.setParts().length === 0) {
      this.snackBar.open('Load a set first to choose owned parts.', 'Close', { duration: 2500 });
      return;
    }

    const raw = this.form.getRawValue();
    const setNum = (raw.set_num ?? '').trim();
    const currentUser = this.auth.user();
    const userId = (!this.isAdmin() && currentUser)
      ? Number(currentUser.user_id)
      : Number(raw.user_id);
    const quantity = Number(raw.quantity ?? 1);
    const purchasePrice = raw.purchase_price;

    if (!setNum || !Number.isFinite(userId) || userId <= 0) {
      this.snackBar.open('Select a valid user and set.', 'Close', { duration: 2500 });
      return;
    }

    const summary = this.pendingSummary();
    const confirmRef = this.dialog.open(UserSetConfirmDialogComponent, {
      width: '440px',
      data: {
        setNum,
        setQuantity: quantity,
        partsProcessed: summary.partsProcessed,
        userPartsCreated: summary.userPartsCreated,
        missingPartsCreated: summary.missingPartsCreated,
        totalOwnedQuantity: summary.totalOwnedQuantity,
        totalMissingQuantity: summary.totalMissingQuantity
      }
    });

    confirmRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.saving.set(true);
      this.userSetsApi.createWithParts({
      user_set: {
        user_id: userId,
        set_num: setNum,
        quantity,
        is_public: Boolean(raw.is_public),
        condition_public: (raw.condition_public ?? '').trim() || undefined,
        purchase_price: purchasePrice == null ? undefined : Number(purchasePrice)
      },
      parts: this.buildPartPayload()
    }).subscribe({
        next: (result) => {
          this.saving.set(false);
          this.summary.set(result.summary);
          this.snackBar.open('User set saved. User parts and missing parts generated.', 'Close', { duration: 2800 });
          this.triggerHapticFeedback();
          this.reloadCatalog();
        },
        error: () => {
          this.saving.set(false);
          this.snackBar.open('Failed to save user set with parts.', 'Close', { duration: 3000 });
        }
      });
    });
  }

  private loadOptions(): void {
    this.loadingOptions.set(true);

    forkJoin([
      this.usersApi.getRows(1, 200)
    ]).subscribe({
      next: ([usersResponse]) => {
      const userRows = this.unwrapRows(usersResponse);

      this.users.set(userRows.map((row) => ({
        user_id: Number(row['user_id']),
        label: this.buildUserSummaryLabel(row)
      })).filter((row) => Number.isFinite(row.user_id) && row.user_id > 0));

      this.loadingOptions.set(false);
      },
      error: () => {
        this.loadingOptions.set(false);
        this.snackBar.open('Failed to load users.', 'Close', { duration: 2500 });
      }
    });
  }

  private initializeResponsiveState(): void {
    this.mobileMediaQuery = window.matchMedia('(max-width: 800px)');
    const applyState = (matches: boolean): void => {
      this.isMobileLayout.set(matches);
      if (!matches) {
        this.activeMobileStep.set(1);
      }
    };

    applyState(this.mobileMediaQuery.matches);
    this.mobileMediaQuery.addEventListener('change', (event) => applyState(event.matches));
  }

  private triggerHapticFeedback(): void {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(12);
    }
  }

  private scheduleAutoSave(kind: 'available' | 'missing', rowId: number): void {
    const key = this.getRowActionKey(kind, rowId);
    const activeTimer = this.autoSaveTimers.get(key);
    if (activeTimer) {
      clearTimeout(activeTimer);
    }

    this.setAutoSaveStatus(kind, rowId, 'saving');
    const timer = setTimeout(() => {
      this.autoSaveTimers.delete(key);
      const breakdown = this.expandedBreakdown();
      if (!breakdown) {
        return;
      }

      const source = kind === 'available' ? breakdown.available_parts : breakdown.missing_parts;
      const targetRow = source.find((part) => part.row_id === rowId);
      if (!targetRow) {
        return;
      }

      this.saveBreakdownQuantity(kind, targetRow, true);
    }, 650);

    this.autoSaveTimers.set(key, timer);
  }

  private setAutoSaveStatus(kind: 'available' | 'missing', rowId: number, status: 'idle' | 'saving' | 'saved' | 'error'): void {
    const key = this.getRowActionKey(kind, rowId);
    this.autoSaveStatus.update((current) => ({
      ...current,
      [key]: status
    }));

    if (status === 'saved') {
      setTimeout(() => {
        this.autoSaveStatus.update((current) => ({
          ...current,
          [key]: 'idle'
        }));
      }, 1700);
    }
  }

  private applyCurrentUserConstraint(): void {
    const currentUser = this.auth.user();
    if (!currentUser) {
      return;
    }

    if (!currentUser.is_admin) {
      this.form.controls.user_id.setValue(Number(currentUser.user_id), { emitEvent: false });
      this.form.controls.user_id.disable({ emitEvent: false });
      return;
    }

    this.form.controls.user_id.enable({ emitEvent: false });
  }

  private searchSetOptions(searchTerm: string): void {
    const normalized = searchTerm.trim();
    const extraParams: Record<string, string | number> = {};
    if (normalized) {
      extraParams['search'] = normalized;
      const searchYear = this.parseYear(normalized);
      if (searchYear !== null) {
        extraParams['year'] = searchYear;
      }
    }

    this.loadingSetOptions.set(true);
    this.setsApi.getRows(1, 200, extraParams).subscribe({
      next: (response) => {
        this.loadingSetOptions.set(false);
        const setRows = this.unwrapRows(response);
        const nextSets = this.mapSetOptions(setRows);
        this.sets.set(nextSets);
        this.setImageByNum.update((current) => {
          const updates: Record<string, string | undefined> = { ...current };
          for (const setOption of nextSets) {
            updates[setOption.set_num] = setOption.img_url;
          }
          return updates;
        });
      },
      error: () => {
        this.loadingSetOptions.set(false);
        this.sets.set([]);
      }
    });
  }

  private mapSetOptions(rows: Record<string, unknown>[]): Array<{ set_num: string; label: string; img_url?: string }> {
    return rows
      .map((row) => {
        const setNum = String(row['set_num'] ?? '').trim();
        const setName = String(row['name'] ?? '').trim();
        const year = Number(row['year']);
        const yearLabel = Number.isInteger(year) && year > 0 ? ` (${year})` : '';
        const rawImage = row['img_url'];
        return {
          set_num: setNum,
          label: setName ? `${setNum} - ${setName}${yearLabel}` : `${setNum}${yearLabel}`,
          img_url: typeof rawImage === 'string' ? rawImage : undefined
        };
      })
      .filter((row) => row.set_num.length > 0);
  }

  private isKnownSet(setNum: string): boolean {
    return this.sets().some((setOption) => setOption.set_num === setNum);
  }

  private loadSetParts(setNum: string): void {
    this.loadingParts.set(true);
    this.summary.set(null);
    this.userSetsApi.getSetParts(setNum).subscribe({
      next: (response) => {
        this.loadingParts.set(false);
        const parts = Array.isArray(response.parts) ? response.parts : [];
        const mapped: UserSetPartSelection[] = parts.map((part: SetPartRequirement) => ({
          ...part,
          required_quantity: Number(part.required_quantity ?? 0),
          color_id: Number(part.color_id ?? 0),
          has_part: false,
          owned_quantity: 0
        })).filter((part) => Number.isFinite(part.required_quantity) && part.required_quantity > 0);
        this.setParts.set(mapped);
      },
      error: () => {
        this.loadingParts.set(false);
        this.setParts.set([]);
        this.snackBar.open('Failed to load set parts.', 'Close', { duration: 2500 });
      }
    });
  }

  private reloadCatalog(): void {
    const sortColumn = this.resolveServerSortColumn(this.sortColumn());
    const sortDirection = this.sortDirection();
    const userFilter = this.catalogUserFilter();
    const extraParams: Record<string, string | number> = {
      ...(sortColumn ? { sortBy: sortColumn } : {}),
      sortDir: sortDirection
    };

    if (typeof userFilter === 'number' && Number.isFinite(userFilter) && userFilter > 0) {
      extraParams['user_id'] = userFilter;
    }

    this.loadingCatalog.set(true);

    this.userSetsTableApi.getRows(this.page(), this.pageSize(), extraParams).subscribe({
      next: (response) => {
        this.loadingCatalog.set(false);
        const resolvedRows = Array.isArray(response)
          ? response
          : (response as PagedResult).data ?? [];

        this.rows.set(resolvedRows);
        this.catalogColumns.set(this.buildCatalogColumns(resolvedRows));
        this.setImageByNum.update((current) => {
          const updates: Record<string, string | undefined> = { ...current };
          for (const row of resolvedRows) {
            const setNum = String(row['set_num'] ?? '').trim();
            if (!setNum) {
              continue;
            }
            const rawImage = row['img_url'];
            updates[setNum] = typeof rawImage === 'string' ? rawImage : updates[setNum];
          }
          return updates;
        });

        if (Array.isArray(response)) {
          this.total.set(resolvedRows.length);
          return;
        }

        const paged = response as PagedResult;
        this.total.set(paged.total ?? 0);
      },
      error: () => {
        this.loadingCatalog.set(false);
        this.snackBar.open('Failed to load user sets catalog.', 'Close', { duration: 2500 });
      }
    });
  }

  getRequiredTotal(part: UserSetPartSelection): number {
    return Math.max(0, Number(part.required_quantity ?? 0) * this.getSetMultiplier());
  }

  getMissingQuantity(part: UserSetPartSelection): number {
    const requiredTotal = this.getRequiredTotal(part);
    const ownedQuantity = this.resolveOwnedQuantity(part, requiredTotal);
    return Math.max(0, requiredTotal - ownedQuantity);
  }

  private buildPartPayload(): UserSetPartSelection[] {
    return this.setParts().map((part) => ({
      ...part,
      owned_quantity: this.resolveOwnedQuantity(part, this.getRequiredTotal(part)),
      has_part: this.resolveOwnedQuantity(part, this.getRequiredTotal(part)) > 0
    }));
  }

  private getSetMultiplier(): number {
    const quantity = Number(this.form.controls.quantity.value ?? 1);
    return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  }

  private resolveOwnedQuantity(part: UserSetPartSelection, requiredTotal: number): number {
    const rawOwned = Number(part.owned_quantity ?? (part.has_part ? requiredTotal : 0));
    const safeOwned = Number.isFinite(rawOwned) ? rawOwned : 0;
    return Math.max(0, Math.min(requiredTotal, safeOwned));
  }

  private reconcileOwnedQuantities(): void {
    const multiplier = this.getSetMultiplier();
    this.setParts.update((parts) => parts.map((part) => {
      const requiredTotal = Math.max(0, Number(part.required_quantity ?? 0) * multiplier);
      const owned = this.resolveOwnedQuantity(part, requiredTotal);
      return {
        ...part,
        owned_quantity: owned,
        has_part: owned > 0
      };
    }));
  }

  private unwrapRows(response: PagedResult | Record<string, unknown>[] | undefined): Record<string, unknown>[] {
    if (!response) {
      return [];
    }
    return Array.isArray(response) ? response : response.data ?? [];
  }

  private buildCatalogColumns(rows: Record<string, unknown>[]): string[] {
    const preferred = ['user_id', 'set_num', 'set_name', 'img_url', 'quantity', 'is_public', 'condition_public'];
    if (!rows.length) {
      return [...preferred, 'expand'];
    }

    const keys = Object.keys(rows[0]).filter((key) => key !== 'notes' && key !== 'user_set_id');
    const ordered = preferred.filter((key) => keys.includes(key));
    const tail = keys.filter((key) => !ordered.includes(key));
    return [...ordered, ...tail, 'expand'];
  }

  private resolveCatalogSetQuantity(userSetId: number): number {
    const row = this.rows().find((item) => Number(item['user_set_id']) === userSetId);
    const raw = Number(row?.['quantity'] ?? 1);
    if (!Number.isFinite(raw) || raw <= 0) {
      return 1;
    }
    return Math.max(1, Math.round(raw));
  }

  private ensureBreakdownRequiredTotals(userSetId: number, setNumRaw: string): void {
    const setNum = String(setNumRaw ?? '').trim();
    if (!setNum) {
      return;
    }

    const existingMap = this.breakdownRequiredTotals()[userSetId];
    if (existingMap && Object.keys(existingMap).length > 0) {
      return;
    }

    const setQuantity = this.resolveCatalogSetQuantity(userSetId);
    this.userSetsApi.getSetParts(setNum).subscribe({
      next: (response) => {
        const requirements = Array.isArray(response.parts) ? response.parts : [];
        const totals: Record<string, number> = {};
        for (const requirement of requirements) {
          const partNum = String(requirement.part_num ?? '').trim();
          const colorId = Number(requirement.color_id ?? 0);
          const requiredBase = Number(requirement.required_quantity ?? 0);
          if (!partNum || !Number.isFinite(colorId) || colorId <= 0 || !Number.isFinite(requiredBase) || requiredBase <= 0) {
            continue;
          }
          const key = this.buildBreakdownKey(partNum, colorId);
          const requiredTotal = Math.max(0, Math.round(requiredBase * setQuantity));
          totals[key] = (totals[key] ?? 0) + requiredTotal;
        }

        this.breakdownRequiredTotals.update((current) => ({
          ...current,
          [userSetId]: totals
        }));
      }
    });
  }

  private findCounterpartPart(
    kind: 'available' | 'missing',
    row: UserSetBreakdownPart,
    breakdown: UserSetBreakdownResponse
  ): UserSetBreakdownPart | null {
    const targetList = kind === 'available' ? breakdown.missing_parts : breakdown.available_parts;
    const partNum = String(row.part_num ?? '').trim();
    const colorId = Number(row.color_id);
    const counterpart = targetList.find((item) => {
      return String(item.part_num ?? '').trim() === partNum && Number(item.color_id) === colorId;
    });
    return counterpart ?? null;
  }

  private resolveRequiredTotalForPair(
    userSetId: number,
    pairKey: string,
    kind: 'available' | 'missing',
    row: UserSetBreakdownPart,
    counterpart: UserSetBreakdownPart
  ): number {
    const requirementMap = this.breakdownRequiredTotals()[userSetId] ?? {};
    const requiredFromSource = Number(requirementMap[pairKey]);
    if (Number.isFinite(requiredFromSource) && requiredFromSource >= 0) {
      return Math.max(0, Math.round(requiredFromSource));
    }

    if (kind === 'available') {
      return Math.max(0, this.getEditableQuantity('available', row) + this.getEditableQuantity('missing', counterpart));
    }
    return Math.max(0, this.getEditableQuantity('available', counterpart) + this.getEditableQuantity('missing', row));
  }

  private buildBreakdownKey(partNum: unknown, colorId: unknown): string {
    const normalizedPartNum = String(partNum ?? '').trim().toLowerCase();
    const normalizedColorId = Number(colorId);
    return `${normalizedPartNum}:${Number.isFinite(normalizedColorId) ? normalizedColorId : 0}`;
  }

  private getRowActionKey(kind: 'available' | 'missing', rowId: number): string {
    return `${kind}:${rowId}`;
  }

  asImageUrl(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return null;
  }

  private getSortValue(row: Record<string, unknown>, column: string): unknown {
    if (column === 'expand') {
      return String(row['set_num'] ?? row['user_set_id'] ?? '');
    }
    if (column === 'user_id') {
      return this.getUserLabel(row[column]);
    }
    if (column === 'owned_complete') {
      const formatted = this.formatCatalogCell(column, row[column]);
      return formatted;
    }
    return row[column];
  }

  private getUserLabel(value: unknown): string {
    const userId = Number(value);
    if (!Number.isInteger(userId) || userId <= 0) {
      return String(value ?? '');
    }
    return this.userLabelById()[userId] ?? `User #${userId}`;
  }

  private buildUserSummaryLabel(row: Record<string, unknown> | { [key: string]: unknown }): string {
    const fullName = String(row['full_name'] ?? '').trim();
    const username = String(row['username'] ?? '').trim();
    const email = String(row['email'] ?? '').trim();

    if (fullName && username) {
      return `${fullName} (${username})`;
    }
    if (fullName) {
      return fullName;
    }
    if (username && email) {
      return `${username} (${email})`;
    }
    if (username) {
      return username;
    }
    if (email) {
      return email;
    }

    return `User #${String(row['user_id'] ?? '')}`;
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
      'user_set_id',
      'user_id',
      'set_num',
      'set_name',
      'img_url',
      'quantity',
      'is_public',
      'condition_public',
      'purchase_price',
      'owned_since',
      'owned_complete'
    ]);

    return allowedColumns.has(column) ? column : null;
  }
}
