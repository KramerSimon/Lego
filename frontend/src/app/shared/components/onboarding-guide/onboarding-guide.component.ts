import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { OnboardingGuideService, OnboardingStep } from '../../../core/services/onboarding-guide.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

@Component({
  selector: 'lego-onboarding-guide',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, TranslatePipe],
  templateUrl: './onboarding-guide.component.html',
  styleUrl: './onboarding-guide.component.scss'
})
export class OnboardingGuideComponent implements AfterViewInit {
  private static readonly PADDING = 10;

  readonly guide = inject(OnboardingGuideService);

  readonly spotlight = signal<SpotlightRect | null>(null);

  readonly activeStep = computed(() => this.guide.steps()[this.guide.currentStepIndex()] ?? null);

  readonly stepLabel = computed(() => {
    const step = this.guide.currentStepIndex() + 1;
    const total = this.guide.steps().length;
    return `${step} / ${total}`;
  });

  readonly progressPercent = computed(() => {
    const total = this.guide.steps().length;
    if (total <= 0) {
      return 0;
    }
    return Math.round(((this.guide.currentStepIndex() + 1) / total) * 100);
  });

  readonly activeIcon = computed(() => this.activeStep()?.icon ?? 'school');

  readonly pointerClass = computed(() => {
    const placement = this.activeStep()?.placement ?? 'bottom';
    return `guide-arrow-${placement}`;
  });

  readonly canGoBack = computed(() => this.guide.currentStepIndex() > 0);

  readonly tooltipStyle = computed<Record<string, string>>(() => {
    const rect = this.spotlight();
    const step = this.activeStep();
    const viewportWidth = window.innerWidth;
    const panelWidth = Math.min(420, viewportWidth - 24);

    if (!rect || !step) {
      return {
        top: '50%',
        left: '50%',
        width: `${panelWidth}px`,
        transform: 'translate(-50%, -50%)'
      };
    }

    const placement = step.placement ?? 'bottom';
    const viewportHeight = window.innerHeight;
    const panelHeight = 220;
    const gap = 16;

    let top = rect.top + rect.height + gap;
    let left = rect.left + rect.width / 2 - panelWidth / 2;

    if (placement === 'top') {
      top = rect.top - panelHeight - gap;
    }

    if (placement === 'left') {
      top = rect.top + rect.height / 2 - panelHeight / 2;
      left = rect.left - panelWidth - gap;
    }

    if (placement === 'right') {
      top = rect.top + rect.height / 2 - panelHeight / 2;
      left = rect.left + rect.width + gap;
    }

    const clampedTop = Math.max(12, Math.min(top, viewportHeight - panelHeight - 12));
    const clampedLeft = Math.max(12, Math.min(left, viewportWidth - panelWidth - 12));

    return {
      top: `${clampedTop}px`,
      left: `${clampedLeft}px`,
      width: `${panelWidth}px`,
      transform: 'none'
    };
  });

  constructor() {
    effect(() => {
      if (!this.guide.isOpen()) {
        this.spotlight.set(null);
        return;
      }

      const step = this.activeStep();
      if (!step) {
        this.spotlight.set(null);
        return;
      }

      this.focusStep(step, 0);
    });
  }

  ngAfterViewInit(): void {
    if (!this.guide.isOpen()) {
      return;
    }
    const step = this.activeStep();
    if (step) {
      this.focusStep(step, 0);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.refreshSpotlight();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.refreshSpotlight();
  }

  closeGuide(): void {
    this.guide.close();
  }

  nextStep(): void {
    this.guide.next();
  }

  previousStep(): void {
    this.guide.previous();
  }

  finishGuide(): void {
    this.guide.finish();
  }

  topMaskStyle(): Record<string, string> {
    const rect = this.spotlight();
    if (!rect) {
      return { top: '0px', left: '0px', width: '100vw', height: '100vh' };
    }
    return {
      top: '0px',
      left: '0px',
      width: '100vw',
      height: `${Math.max(0, rect.top - OnboardingGuideComponent.PADDING)}px`
    };
  }

  bottomMaskStyle(): Record<string, string> {
    const rect = this.spotlight();
    if (!rect) {
      return { display: 'none' };
    }
    const top = rect.top + rect.height + OnboardingGuideComponent.PADDING;
    return {
      top: `${top}px`,
      left: '0px',
      width: '100vw',
      height: `${Math.max(0, window.innerHeight - top)}px`
    };
  }

  leftMaskStyle(): Record<string, string> {
    const rect = this.spotlight();
    if (!rect) {
      return { display: 'none' };
    }
    return {
      top: `${Math.max(0, rect.top - OnboardingGuideComponent.PADDING)}px`,
      left: '0px',
      width: `${Math.max(0, rect.left - OnboardingGuideComponent.PADDING)}px`,
      height: `${rect.height + OnboardingGuideComponent.PADDING * 2}px`
    };
  }

  rightMaskStyle(): Record<string, string> {
    const rect = this.spotlight();
    if (!rect) {
      return { display: 'none' };
    }
    const left = rect.left + rect.width + OnboardingGuideComponent.PADDING;
    return {
      top: `${Math.max(0, rect.top - OnboardingGuideComponent.PADDING)}px`,
      left: `${left}px`,
      width: `${Math.max(0, window.innerWidth - left)}px`,
      height: `${rect.height + OnboardingGuideComponent.PADDING * 2}px`
    };
  }

  spotlightStyle(): Record<string, string> {
    const rect = this.spotlight();
    if (!rect) {
      return { display: 'none' };
    }

    return {
      top: `${rect.top - OnboardingGuideComponent.PADDING}px`,
      left: `${rect.left - OnboardingGuideComponent.PADDING}px`,
      width: `${rect.width + OnboardingGuideComponent.PADDING * 2}px`,
      height: `${rect.height + OnboardingGuideComponent.PADDING * 2}px`
    };
  }

  private focusStep(step: OnboardingStep, attempt: number): void {
    this.prepareContext(step);

    const target = document.querySelector(step.selector) as HTMLElement | null;
    if (!target) {
      if (attempt < 8) {
        setTimeout(() => this.focusStep(step, attempt + 1), 180);
      } else {
        this.spotlight.set(null);
      }
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

    setTimeout(() => {
      this.updateFromElement(target);
    }, 210);
  }

  private prepareContext(step: OnboardingStep): void {
    if (
      step.id === 'tab-missing-parts'
      || step.id === 'missing-parts-filters'
      || step.id === 'missing-parts-search'
      || step.id === 'missing-parts-actions'
      || step.id === 'missing-parts-table'
    ) {
      this.clickMainTab(2);
      return;
    }

    if (
      step.id === 'tab-set-catalog'
      || step.id === 'set-catalog-filters'
      || step.id === 'set-catalog-search'
      || step.id === 'set-catalog-theme'
      || step.id === 'set-catalog-table'
    ) {
      this.clickMainTab(3);
      return;
    }

    if (step.id === 'set-input' || step.id === 'quantity-input' || step.id === 'save-action') {
      this.clickMainTab(1);
    }
  }

  private clickMainTab(index: number): void {
    const tab = document.querySelector(`.top-tabs .mdc-tab:nth-child(${index})`) as HTMLElement | null;
    if (tab) {
      tab.click();
    }
  }

  private refreshSpotlight(): void {
    if (!this.guide.isOpen()) {
      return;
    }

    const step = this.activeStep();
    if (!step) {
      return;
    }

    const target = document.querySelector(step.selector) as HTMLElement | null;
    if (!target) {
      return;
    }

    this.updateFromElement(target);
  }

  private updateFromElement(target: HTMLElement): void {
    const rect = target.getBoundingClientRect();
    this.spotlight.set({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    });
  }
}
