import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BuildableSetCatalogRow, CatalogSetPart, CatalogSetPartsResponse } from '../../../core/services/api-types';
import { SetsApiService } from '../../../core/services/sets-api.service';
import { UserSetsApiService } from '../../../core/services/user-sets-api.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { BuildSessionService } from '../../../core/services/build-session.service';

interface BuildStepGroup {
  id: number;
  title: string;
  parts: CatalogSetPart[];
}

@Component({
  selector: 'lego-build-mode',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslatePipe
  ],
  templateUrl: './build-mode.component.html',
  styleUrl: './build-mode.component.scss'
})
export class BuildModeComponent implements OnInit {
  private readonly userSetsApi = inject(UserSetsApiService);
  private readonly setsApi = inject(SetsApiService);
  private readonly buildSession = inject(BuildSessionService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loadingSets = signal(false);
  readonly loadingParts = signal(false);
  readonly buildableSets = signal<BuildableSetCatalogRow[]>([]);
  readonly selectedSet = signal<BuildableSetCatalogRow | null>(null);
  readonly parts = signal<CatalogSetPart[]>([]);
  readonly doneByKey = signal<Record<string, number>>({});
  readonly showCompletionFlash = signal(false);
  readonly expandedStepId = signal<number | null>(1);
  readonly continueBuild = this.buildSession.continueBuild;

  readonly totalRequiredPieces = computed(() => {
    return this.parts().reduce((sum, part) => sum + this.requiredQuantity(part), 0);
  });

  readonly completedPieces = computed(() => {
    return this.parts().reduce((sum, part) => {
      const key = this.partKey(part);
      return sum + this.safeDoneValue(this.doneByKey()[key], this.requiredQuantity(part));
    }, 0);
  });

  readonly completionPercent = computed(() => {
    const total = this.totalRequiredPieces();
    if (total <= 0) {
      return 0;
    }
    return Math.round((this.completedPieces() / total) * 100);
  });

  readonly missingPieces = computed(() => {
    return Math.max(0, this.totalRequiredPieces() - this.completedPieces());
  });

  readonly stepGroups = computed<BuildStepGroup[]>(() => {
    const parts = this.parts();
    if (!parts.length) {
      return [];
    }

    const labels = ['Step 1: Base', 'Step 2: Structure', 'Step 3: Finish'];
    const size = Math.ceil(parts.length / 3);
    const groups: BuildStepGroup[] = [];
    for (let index = 0; index < 3; index += 1) {
      const slice = parts.slice(index * size, (index + 1) * size);
      if (!slice.length) {
        continue;
      }
      groups.push({
        id: index + 1,
        title: labels[index],
        parts: slice
      });
    }
    return groups;
  });

  readonly suggestion = computed(() => {
    if (!this.selectedSet()) {
      return 'Pick a buildable set to start step-by-step building.';
    }
    const missing = this.missingPieces();
    const percent = this.completionPercent();
    if (missing === 0) {
      return 'Great job! This set is fully completed in build mode.';
    }
    if (missing <= 5) {
      return `You are only ${missing} pieces away from finishing this set.`;
    }
    if (percent >= 90) {
      return `Strong progress: ${percent}% complete.`;
    }
    return `Keep going: ${percent}% complete with ${missing} pieces left.`;
  });

  ngOnInit(): void {
    this.reloadBuildableSets();
  }

  setLabel(row: BuildableSetCatalogRow): string {
    const name = String(row.set_name ?? '').trim();
    if (!name) {
      return String(row.set_num ?? '');
    }
    return `${row.set_num} - ${name}`;
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

  selectSet(row: BuildableSetCatalogRow): void {
    this.selectedSet.set(row);
    this.parts.set([]);
    this.expandedStepId.set(1);
    this.doneByKey.set(this.readProgress(String(row.set_num ?? '')));
    this.buildSession.setActiveSet(String(row.set_num ?? ''), String(row.set_name ?? ''), String(row.img_url ?? ''));
    this.loadingParts.set(true);

    this.setsApi.getCatalogSetParts(String(row.set_num ?? '')).subscribe({
      next: (response: CatalogSetPartsResponse) => {
        this.parts.set(Array.isArray(response.parts) ? response.parts : []);
        this.expandFirstStep();
        this.loadingParts.set(false);
        this.syncContinueBuildProgress();
      },
      error: () => {
        this.parts.set([]);
        this.loadingParts.set(false);
      }
    });
  }

  setDone(part: CatalogSetPart, nextRaw: number): void {
    const previousPercent = this.completionPercent();
    const required = this.requiredQuantity(part);
    const key = this.partKey(part);
    const next = this.safeDoneValue(nextRaw, required);
    this.doneByKey.update((current) => ({
      ...current,
      [key]: next
    }));
    this.persistProgress();
    this.syncContinueBuildProgress();
    const nextPercent = this.completionPercent();
    if (previousPercent < 100 && nextPercent === 100) {
      this.showCompletionCelebration();
    }
  }

  incrementDone(part: CatalogSetPart, delta: number): void {
    const key = this.partKey(part);
    const current = this.doneByKey()[key] ?? 0;
    this.setDone(part, current + delta);
  }

  resetProgress(): void {
    const setNum = String(this.selectedSet()?.set_num ?? '').trim();
    if (!setNum) {
      return;
    }
    this.doneByKey.set({});
    localStorage.removeItem(this.progressStorageKey(setNum));
    this.buildSession.clearProgressForSet(setNum);
  }

  stepCompletedPieces(group: BuildStepGroup): number {
    return group.parts.reduce((sum, part) => {
      const key = this.partKey(part);
      return sum + this.safeDoneValue(this.doneByKey()[key], this.requiredQuantity(part));
    }, 0);
  }

  stepRequiredPieces(group: BuildStepGroup): number {
    return group.parts.reduce((sum, part) => sum + this.requiredQuantity(part), 0);
  }

  stepPercent(group: BuildStepGroup): number {
    const required = this.stepRequiredPieces(group);
    if (required <= 0) {
      return 0;
    }
    return Math.round((this.stepCompletedPieces(group) / required) * 100);
  }

  isStepExpanded(stepId: number): boolean {
    return this.expandedStepId() === stepId;
  }

  toggleStep(stepId: number): void {
    const current = this.expandedStepId();
    this.expandedStepId.set(current === stepId ? null : stepId);
  }

  requiredQuantity(part: CatalogSetPart): number {
    const quantity = Number(part.quantity ?? 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return 0;
    }
    return Math.round(quantity);
  }

  partKey(part: CatalogSetPart): string {
    return `${String(part.part_num ?? '')}:${Number(part.color_id ?? 0)}`;
  }

  private reloadBuildableSets(): void {
    this.loadingSets.set(true);
    this.userSetsApi.getBuildableCatalog(1, 20, {
      buildableOnly: true,
      sortBy: 'completeness_percentage',
      sortDir: 'desc'
    }).subscribe({
      next: (result) => {
        const rows: BuildableSetCatalogRow[] = Array.isArray(result?.data) ? (result.data as BuildableSetCatalogRow[]) : [];
        this.buildableSets.set(rows);
        this.loadingSets.set(false);
        const preferredSetNum = this.buildSession.consumePendingBuildSet() ?? this.continueBuild()?.set_num ?? '';
        if (!preferredSetNum) {
          return;
        }
        const preferred = rows.find((row) => String(row['set_num'] ?? '') === preferredSetNum);
        if (preferred) {
          this.selectSet(preferred);
        }
      },
      error: () => {
        this.buildableSets.set([]);
        this.loadingSets.set(false);
      }
    });
  }

  private expandFirstStep(): void {
    const groups = this.stepGroups();
    if (!groups.length) {
      this.expandedStepId.set(null);
      return;
    }
    this.expandedStepId.set(groups[0].id);
  }

  private safeDoneValue(value: unknown, max: number): number {
    const numeric = Number(value ?? 0);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    return Math.max(0, Math.min(max, Math.round(numeric)));
  }

  private persistProgress(): void {
    const setNum = String(this.selectedSet()?.set_num ?? '').trim();
    if (!setNum) {
      return;
    }
    localStorage.setItem(this.progressStorageKey(setNum), JSON.stringify(this.doneByKey()));
  }

  private syncContinueBuildProgress(): void {
    this.buildSession.updateProgress(this.completedPieces(), this.totalRequiredPieces());
  }

  private showCompletionCelebration(): void {
    this.showCompletionFlash.set(true);
    this.snackBar.open('Set completed! Great work.', 'Close', { duration: 3000 });
    setTimeout(() => {
      this.showCompletionFlash.set(false);
    }, 1500);
  }

  private readProgress(setNum: string): Record<string, number> {
    if (!setNum) {
      return {};
    }

    try {
      const raw = localStorage.getItem(this.progressStorageKey(setNum));
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const normalized: Record<string, number> = {};
      for (const [key, value] of Object.entries(parsed ?? {})) {
        const num = Number(value);
        if (Number.isFinite(num) && num >= 0) {
          normalized[key] = Math.round(num);
        }
      }
      return normalized;
    } catch {
      return {};
    }
  }

  private progressStorageKey(setNum: string): string {
    return `lego_build_mode_progress_${setNum}`;
  }
}
