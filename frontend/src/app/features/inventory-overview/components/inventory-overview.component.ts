import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PagedResult } from '../../../core/services/api-types';
import { UserPartsApiService } from '../../../core/services/tables/table-services.service';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

interface PartAggregate {
  partNum: string;
  partName: string;
  totalQuantity: number;
  lots: number;
}

@Component({
  selector: 'lego-inventory-overview',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe
  ],
  templateUrl: './inventory-overview.component.html',
  styleUrl: './inventory-overview.component.scss'
})
export class InventoryOverviewComponent implements OnInit {
  private readonly userPartsApi = inject(UserPartsApiService);

  readonly loading = signal(false);
  readonly rows = signal<Record<string, unknown>[]>([]);

  readonly totalLots = computed(() => this.rows().length);
  readonly totalPieces = computed(() => {
    return this.rows().reduce((sum, row) => sum + this.quantityOf(row), 0);
  });

  readonly uniqueParts = computed(() => {
    const unique = new Set<string>();
    for (const row of this.rows()) {
      const partNum = this.partNumOf(row);
      if (partNum) {
        unique.add(partNum);
      }
    }
    return unique.size;
  });

  readonly rareLots = computed(() => {
    return this.rows().filter((row) => this.quantityOf(row) <= 2).length;
  });

  readonly topParts = computed(() => {
    const map = new Map<string, PartAggregate>();

    for (const row of this.rows()) {
      const partNum = this.partNumOf(row);
      if (!partNum) {
        continue;
      }
      const quantity = this.quantityOf(row);
      const partName = String(row['part_name'] ?? '').trim() || partNum;
      const existing = map.get(partNum);
      if (existing) {
        existing.totalQuantity += quantity;
        existing.lots += 1;
        continue;
      }

      map.set(partNum, {
        partNum,
        partName,
        totalQuantity: quantity,
        lots: 1
      });
    }

    return Array.from(map.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 8);
  });

  readonly rarePartHighlights = computed(() => {
    const map = new Map<string, PartAggregate>();

    for (const row of this.rows()) {
      const partNum = this.partNumOf(row);
      const quantity = this.quantityOf(row);
      if (!partNum || quantity > 2) {
        continue;
      }

      const partName = String(row['part_name'] ?? '').trim() || partNum;
      const existing = map.get(partNum);
      if (existing) {
        existing.totalQuantity += quantity;
        existing.lots += 1;
        continue;
      }

      map.set(partNum, {
        partNum,
        partName,
        totalQuantity: quantity,
        lots: 1
      });
    }

    return Array.from(map.values())
      .sort((a, b) => a.totalQuantity - b.totalQuantity)
      .slice(0, 8);
  });

  ngOnInit(): void {
    this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    try {
      const allRows = await this.fetchAllRows();
      this.rows.set(allRows);
    } catch {
      this.rows.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private async fetchAllRows(): Promise<Record<string, unknown>[]> {
    const pageSize = 500;
    let page = 1;
    let total = Number.POSITIVE_INFINITY;
    const items: Record<string, unknown>[] = [];

    while (items.length < total) {
      const response = await firstValueFrom(this.userPartsApi.getRows(page, pageSize));
      const paged = response as PagedResult;
      const pageRows = Array.isArray(paged.data) ? paged.data : [];
      items.push(...pageRows);
      total = Number(paged.total ?? items.length);
      if (!pageRows.length || items.length >= total) {
        break;
      }
      page += 1;
    }

    return items;
  }

  private quantityOf(row: Record<string, unknown>): number {
    const value = Number(row['quantity'] ?? 0);
    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }
    return Math.round(value);
  }

  private partNumOf(row: Record<string, unknown>): string {
    return String(row['part_num'] ?? '').trim();
  }
}
