import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
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
  LegoApiService,
  PagedResult,
  SetPartRequirement,
  UserSetBreakdownPart,
  UserSetBreakdownResponse,
  UserSetPartSelection,
  UserSetWithPartsResult
} from '../../../../core/services/lego-api.service';
import { forkJoin } from 'rxjs';
import { UserSetConfirmDialogComponent } from './user-set-confirm-dialog.component';
import { USER_SETS_CONFIG } from '../../config/table-definitions';

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
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatDialogModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule
  ],
  templateUrl: './user-sets.component.html',
  styleUrl: './user-sets.component.scss'
})
export class UserSetsComponent implements OnInit {
  readonly config = USER_SETS_CONFIG;
  private readonly api = inject(LegoApiService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private setSearchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly loadingOptions = signal(false);
  readonly loadingSetOptions = signal(false);
  readonly loadingParts = signal(false);
  readonly loadingCatalog = signal(false);
  readonly saving = signal(false);
  readonly setParts = signal<UserSetPartSelection[]>([]);
  readonly setSearchTerm = signal('');
  readonly users = signal<Array<{ user_id: number; label: string }>>([]);
  readonly sets = signal<Array<{ set_num: string; label: string; img_url?: string }>>([]);
  readonly setImageByNum = signal<Record<string, string | undefined>>({});
  readonly summary = signal<UserSetWithPartsResult['summary'] | null>(null);

  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly pageSizeOptions = [10, 25, 50, 100, 200];
  readonly catalogColumns = signal<string[]>([]);
  readonly catalogDetailColumns = ['expandedDetail'];

  readonly expandedUserSetId = signal<number | null>(null);
  readonly breakdownLoading = signal(false);
  readonly breakdownError = signal<string | null>(null);
  readonly breakdownMap = signal<Record<number, UserSetBreakdownResponse>>({});
  readonly editedQuantities = signal<Record<string, number>>({});
  readonly updatingRowKey = signal<string | null>(null);
  readonly deletingUserSetId = signal<number | null>(null);
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
    condition_public: this.fb.control<string>(''),
    purchase_price: this.fb.control<number | null>(null)
  });

  ngOnInit(): void {
    this.loadOptions();
    this.reloadCatalog();

    this.form.controls.set_num.valueChanges.subscribe((setNum) => {
      const normalized = (setNum ?? '').trim();
      if (!normalized) {
        this.setParts.set([]);
        return;
      }
      this.loadSetParts(normalized);
    });

    this.form.controls.quantity.valueChanges.subscribe(() => {
      this.reconcileOwnedQuantities();
    });
  }

  handlePage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.pageSize.set(event.pageSize);
    this.reloadCatalog();
  }

  handleSetPanelOpened(opened: boolean): void {
    if (opened) {
      this.setSearchTerm.set('');
      this.searchSetOptions('');
    }
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
      return;
    }

    this.breakdownLoading.set(true);
    this.api.getUserSetBreakdown(userSetId).subscribe({
      next: (response) => {
        this.breakdownLoading.set(false);
        this.breakdownMap.update((current) => ({
          ...current,
          [userSetId]: response
        }));
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
    if (column !== 'owned_complete') {
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
    const safeValue = Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : 0;
    const key = this.getRowActionKey(kind, row.row_id);
    this.editedQuantities.update((current) => ({
      ...current,
      [key]: safeValue
    }));
  }

  saveBreakdownQuantity(kind: 'available' | 'missing', row: UserSetBreakdownPart): void {
    const userSetId = this.expandedUserSetId();
    if (!userSetId) {
      return;
    }
    const rowKey = this.getRowActionKey(kind, row.row_id);
    const quantity = this.getEditableQuantity(kind, row);
    this.updatingRowKey.set(rowKey);

    this.api.updateUserSetBreakdownPart(userSetId, kind, row.row_id, quantity).subscribe({
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
        this.snackBar.open('Part quantity updated.', 'Close', { duration: 1800 });
      },
      error: () => {
        this.updatingRowKey.set(null);
        this.snackBar.open('Failed to update part quantity.', 'Close', { duration: 2600 });
      }
    });
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
    this.api.deleteRow('user_sets', userSetId).subscribe({
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
    const userId = Number(raw.user_id);
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
      this.api.createUserSetWithParts({
      user_set: {
        user_id: userId,
        set_num: setNum,
        quantity,
        condition_public: (raw.condition_public ?? '').trim() || undefined,
        purchase_price: purchasePrice == null ? undefined : Number(purchasePrice)
      },
      parts: this.buildPartPayload()
    }).subscribe({
        next: (result) => {
          this.saving.set(false);
          this.summary.set(result.summary);
          this.snackBar.open('User set saved. User parts and missing parts generated.', 'Close', { duration: 2800 });
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
      this.api.getRows('users', 1, 500)
    ]).subscribe({
      next: ([usersResponse]) => {
      const userRows = this.unwrapRows(usersResponse);

      this.users.set(userRows.map((row) => ({
        user_id: Number(row['user_id']),
        label: String(row['username'] ?? row['email'] ?? row['user_id'])
      })).filter((row) => Number.isFinite(row.user_id) && row.user_id > 0));

      this.loadingOptions.set(false);
      this.searchSetOptions('');
      },
      error: () => {
        this.loadingOptions.set(false);
        this.snackBar.open('Failed to load users.', 'Close', { duration: 2500 });
      }
    });
  }

  private searchSetOptions(searchTerm: string): void {
    const normalized = searchTerm.trim();
    const extraParams: Record<string, string | number> = {};
    if (normalized) {
      extraParams['search'] = normalized;
    }

    this.loadingSetOptions.set(true);
    this.api.getRows('sets', 1, 200, extraParams).subscribe({
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
        const rawImage = row['img_url'];
        return {
          set_num: setNum,
          label: setName ? `${setNum} - ${setName}` : setNum,
          img_url: typeof rawImage === 'string' ? rawImage : undefined
        };
      })
      .filter((row) => row.set_num.length > 0);
  }

  private loadSetParts(setNum: string): void {
    this.loadingParts.set(true);
    this.summary.set(null);
    this.api.getUserSetParts(setNum).subscribe({
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
    this.loadingCatalog.set(true);
    this.api.getRows('user_sets', this.page(), this.pageSize()).subscribe({
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
    const preferred = ['user_set_id', 'user_id', 'set_num', 'set_name', 'img_url', 'quantity'];
    if (!rows.length) {
      return [...preferred, 'expand'];
    }

    const keys = Object.keys(rows[0]).filter((key) => key !== 'notes');
    const ordered = preferred.filter((key) => keys.includes(key));
    const tail = keys.filter((key) => !ordered.includes(key));
    return [...ordered, ...tail, 'expand'];
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
}
