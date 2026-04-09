import { Injectable, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

export type GuidePlacement = 'top' | 'bottom' | 'left' | 'right';

export interface OnboardingStep {
  id: string;
  selector: string;
  title: string;
  description: string;
  icon?: string;
  placement?: GuidePlacement;
}

@Injectable({ providedIn: 'root' })
export class OnboardingGuideService {
  private readonly auth = inject(AuthService);

  readonly isOpen = signal(false);
  readonly isMandatory = signal(false);
  readonly currentStepIndex = signal(0);

  readonly steps = signal<OnboardingStep[]>([
    {
      id: 'toolbar',
      selector: '[data-guide-id="toolbar-title"]',
      title: 'App Overview',
      description: 'This is your workspace header. It keeps account controls and the main navigation in one place.',
      icon: 'home_repair_service',
      placement: 'bottom'
    },
    {
      id: 'tabs',
      selector: '[data-guide-id="main-tabs"]',
      title: 'Main Work Areas',
      description: 'Use these tabs to switch between Build Actions, Missing Parts, and Set Catalog.',
      icon: 'tabs',
      placement: 'bottom'
    },
    {
      id: 'tab-missing-parts',
      selector: '[data-guide-id="tab-missing-parts"]',
      title: 'Missing Parts Tab',
      description: 'This tab shows your unresolved shortages so you can prioritize replacements quickly.',
      icon: 'warning_amber',
      placement: 'bottom'
    },
    {
      id: 'missing-parts-filters',
      selector: '[data-guide-id="missing-parts-filters"]',
      title: 'Missing Parts Filters',
      description: 'Start here: filter by user, set, and theme to narrow the shortage list to the exact build context you need.',
      icon: 'filter_alt',
      placement: 'bottom'
    },
    {
      id: 'missing-parts-search',
      selector: '[data-guide-id="missing-parts-search"]',
      title: 'Search Missing Parts',
      description: 'Use free-text search for part names, part numbers, set numbers, themes, and years to find issues quickly.',
      icon: 'search',
      placement: 'bottom'
    },
    {
      id: 'missing-parts-actions',
      selector: '[data-guide-id="missing-parts-actions"]',
      title: 'Missing Parts Actions',
      description: 'Use Reset Filters and Reset Sort to recover fast, then export CSV or JSON for ordering workflows.',
      icon: 'download',
      placement: 'left'
    },
    {
      id: 'missing-parts-table',
      selector: '[data-guide-id="missing-parts-table"]',
      title: 'Missing Parts Table',
      description: 'Sort columns to prioritize high-impact shortages and scan part, color, set, theme, and user context in one view.',
      icon: 'table_view',
      placement: 'top'
    },
    {
      id: 'tab-set-catalog',
      selector: '[data-guide-id="tab-set-catalog"]',
      title: 'Set Catalog Tab',
      description: 'Open Set Catalog to browse sets, inspect details, and pick the next model to build.',
      icon: 'menu_book',
      placement: 'bottom'
    },
    {
      id: 'set-catalog-filters',
      selector: '[data-guide-id="set-catalog-filters"]',
      title: 'Set Catalog Filters',
      description: 'Filter the catalog by search text and theme before opening a set. This keeps large catalogs manageable.',
      icon: 'tune',
      placement: 'bottom'
    },
    {
      id: 'set-catalog-search',
      selector: '[data-guide-id="set-catalog-search"]',
      title: 'Search by Number, Name, or Year',
      description: 'Enter set number, set name, or a 4-digit year to quickly jump to relevant sets.',
      icon: 'manage_search',
      placement: 'bottom'
    },
    {
      id: 'set-catalog-theme',
      selector: '[data-guide-id="set-catalog-theme"]',
      title: 'Theme Filter',
      description: 'Use the theme dropdown to scope the list to one collection family, then compare options with less noise.',
      icon: 'category',
      placement: 'bottom'
    },
    {
      id: 'set-catalog-table',
      selector: '[data-guide-id="set-catalog-table"]',
      title: 'Catalog Table and Row Expansion',
      description: 'Click a row to expand it and inspect required parts before adding the set to your build actions.',
      icon: 'view_list',
      placement: 'top'
    },
    {
      id: 'set-input',
      selector: '[data-guide-id="set-input"]',
      title: 'Set Input',
      description: 'Search a set number or name here to prepare a build with linked part requirements.',
      icon: 'search',
      placement: 'right'
    },
    {
      id: 'quantity-input',
      selector: '[data-guide-id="quantity-input"]',
      title: 'Quantity Input',
      description: 'Set how many copies of a set you own so the app can compute available and missing parts correctly.',
      icon: 'pin',
      placement: 'right'
    },
    {
      id: 'save-action',
      selector: '[data-guide-id="save-user-set"]',
      title: 'Save Build Action',
      description: 'Save here to create your user set and automatically generate available and missing part records.',
      icon: 'save',
      placement: 'top'
    },
    {
      id: 'guide-button',
      selector: '[data-guide-id="open-guide"]',
      title: 'Reopen This Guide Anytime',
      description: 'You can run this guide again whenever you want from this Guide button.',
      icon: 'school',
      placement: 'left'
    }
  ]);

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (!user) {
        this.forceClose();
        return;
      }

      const shouldRunMandatory = Boolean(user.onboarding_guide_required) && !Boolean(user.onboarding_completed);

      if (shouldRunMandatory && !this.isOpen()) {
        setTimeout(() => this.start(true), 100);
      }
    });
  }

  start(mandatory = false): void {
    if (!this.auth.user()) {
      return;
    }

    this.currentStepIndex.set(0);
    this.isMandatory.set(mandatory);
    this.isOpen.set(true);
  }

  next(): void {
    const nextIndex = this.currentStepIndex() + 1;
    if (nextIndex >= this.steps().length) {
      this.finish();
      return;
    }
    this.currentStepIndex.set(nextIndex);
  }

  previous(): void {
    const prevIndex = this.currentStepIndex() - 1;
    this.currentStepIndex.set(prevIndex < 0 ? 0 : prevIndex);
  }

  finish(): void {
    const user = this.auth.user();
    if (user && !user.onboarding_completed) {
      this.auth.completeOnboardingGuide().subscribe((ok) => {
        if (!ok) {
          this.isOpen.set(true);
          return;
        }

        this.isOpen.set(false);
        this.isMandatory.set(false);
      });
      return;
    }

    this.isOpen.set(false);
    this.isMandatory.set(false);
  }

  close(): void {
    if (this.isMandatory()) {
      return;
    }
    this.isOpen.set(false);
  }

  startMandatoryGuide(): void {
    this.start(true);
  }

  private forceClose(): void {
    this.isOpen.set(false);
    this.isMandatory.set(false);
    this.currentStepIndex.set(0);
  }
}
