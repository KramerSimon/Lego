import { Injectable, computed, signal } from '@angular/core';

export interface ContinueBuildState {
  set_num: string;
  set_name?: string;
  img_url?: string;
  completion: number;
  completed_pieces: number;
  total_pieces: number;
  updated_at: number;
}

@Injectable({ providedIn: 'root' })
export class BuildSessionService {
  private static readonly CONTINUE_BUILD_KEY = 'lego_continue_build_state';
  private static readonly PENDING_SET_KEY = 'lego_pending_build_set';

  private readonly continueBuildState = signal<ContinueBuildState | null>(this.readContinueBuildState());

  readonly continueBuild = this.continueBuildState.asReadonly();
  readonly hasContinueBuild = computed(() => {
    const state = this.continueBuildState();
    return Boolean(state && state.completion > 0 && state.completion < 100);
  });

  setActiveSet(setNum: string, setName?: string, imgUrl?: string): void {
    const normalizedSetNum = String(setNum ?? '').trim();
    if (!normalizedSetNum) {
      return;
    }

    const current = this.continueBuildState();
    const next: ContinueBuildState = {
      set_num: normalizedSetNum,
      set_name: String(setName ?? '').trim() || undefined,
      img_url: String(imgUrl ?? '').trim() || undefined,
      completion: current?.set_num === normalizedSetNum ? current.completion : 0,
      completed_pieces: current?.set_num === normalizedSetNum ? current.completed_pieces : 0,
      total_pieces: current?.set_num === normalizedSetNum ? current.total_pieces : 0,
      updated_at: Date.now()
    };

    this.writeContinueBuildState(next);
  }

  updateProgress(completedPieces: number, totalPieces: number): void {
    const current = this.continueBuildState();
    if (!current) {
      return;
    }

    const safeTotal = Number.isFinite(totalPieces) ? Math.max(0, Math.round(totalPieces)) : 0;
    const safeCompletedRaw = Number.isFinite(completedPieces) ? Math.max(0, Math.round(completedPieces)) : 0;
    const safeCompleted = safeTotal > 0 ? Math.min(safeCompletedRaw, safeTotal) : 0;
    const completion = safeTotal > 0 ? Math.round((safeCompleted / safeTotal) * 100) : 0;

    const next: ContinueBuildState = {
      ...current,
      completed_pieces: safeCompleted,
      total_pieces: safeTotal,
      completion,
      updated_at: Date.now()
    };

    this.writeContinueBuildState(next);
  }

  clearProgressForSet(setNum: string): void {
    const normalizedSetNum = String(setNum ?? '').trim();
    if (!normalizedSetNum) {
      return;
    }
    const current = this.continueBuildState();
    if (!current || current.set_num !== normalizedSetNum) {
      return;
    }

    const next: ContinueBuildState = {
      ...current,
      completion: 0,
      completed_pieces: 0,
      total_pieces: 0,
      updated_at: Date.now()
    };
    this.writeContinueBuildState(next);
  }

  setPendingBuildSet(setNum: string): void {
    const normalizedSetNum = String(setNum ?? '').trim();
    if (!normalizedSetNum) {
      return;
    }
    localStorage.setItem(BuildSessionService.PENDING_SET_KEY, normalizedSetNum);
  }

  consumePendingBuildSet(): string | null {
    const value = localStorage.getItem(BuildSessionService.PENDING_SET_KEY);
    if (!value) {
      return null;
    }
    localStorage.removeItem(BuildSessionService.PENDING_SET_KEY);
    return value;
  }

  private writeContinueBuildState(state: ContinueBuildState): void {
    this.continueBuildState.set(state);
    localStorage.setItem(BuildSessionService.CONTINUE_BUILD_KEY, JSON.stringify(state));
  }

  private readContinueBuildState(): ContinueBuildState | null {
    try {
      const raw = localStorage.getItem(BuildSessionService.CONTINUE_BUILD_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const setNum = String(parsed['set_num'] ?? '').trim();
      if (!setNum) {
        return null;
      }
      return {
        set_num: setNum,
        set_name: String(parsed['set_name'] ?? '').trim() || undefined,
        img_url: String(parsed['img_url'] ?? '').trim() || undefined,
        completion: Number(parsed['completion'] ?? 0),
        completed_pieces: Number(parsed['completed_pieces'] ?? 0),
        total_pieces: Number(parsed['total_pieces'] ?? 0),
        updated_at: Number(parsed['updated_at'] ?? Date.now())
      };
    } catch {
      return null;
    }
  }
}
