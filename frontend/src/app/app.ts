import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { InventoriesComponent } from './features/tables/components/inventories/inventories.component';
import { InventoryPartsComponent } from './features/tables/components/inventory-parts/inventory-parts.component';
import { PartsComponent } from './features/tables/components/parts/parts.component';
import { PartCategoriesComponent } from './features/tables/components/part-categories/part-categories.component';
import { PartRelationshipsComponent } from './features/tables/components/part-relationships/part-relationships.component';
import { ElementsComponent } from './features/tables/components/elements/elements.component';
import { ColorsComponent } from './features/tables/components/colors/colors.component';
import { InventoryMinifigsComponent } from './features/tables/components/inventory-minifigs/inventory-minifigs.component';
import { MinifigsComponent } from './features/tables/components/minifigs/minifigs.component';
import { InventorySetsComponent } from './features/tables/components/inventory-sets/inventory-sets.component';
import { SetsComponent } from './features/tables/components/sets/sets.component';
import { ThemesComponent } from './features/tables/components/themes/themes.component';
import { UsersComponent } from './features/tables/components/users/users.component';
import { UserPartsComponent } from './features/tables/components/user-parts/user-parts.component';
import { UserMissingPartsComponent } from './features/tables/components/user-missing-parts/user-missing-parts.component';
import { UserSetsComponent } from './features/tables/components/user-sets/user-sets.component';
import { AuthFormComponent } from './features/auth/components/auth-form/auth-form.component';
import { AuthService } from './core/services/auth.service';
import { AuthUser } from './core/services/api-types';
import { AccountSettingsDialogComponent } from './features/auth/components/account-settings-dialog/account-settings-dialog.component';
import { environment } from '../environments/environment';
import { OnboardingGuideComponent } from './shared/components/onboarding-guide/onboarding-guide.component';
import { OnboardingGuideService } from './core/services/onboarding-guide.service';
import { LanguageService } from './core/services/language.service';
import { SupportedLanguage } from './core/i18n/translations';
import { TranslatePipe } from './shared/pipes/translate.pipe';

@Component({
  selector: 'lego-root',
  imports: [
    CommonModule,
    MatTabsModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatMenuModule,
    MatDialogModule,
    InventoriesComponent,
    InventoryPartsComponent,
    PartsComponent,
    PartCategoriesComponent,
    PartRelationshipsComponent,
    ElementsComponent,
    ColorsComponent,
    InventoryMinifigsComponent,
    MinifigsComponent,
    InventorySetsComponent,
    SetsComponent,
    ThemesComponent,
    UsersComponent,
    UserPartsComponent,
    UserMissingPartsComponent,
    UserSetsComponent,
    AuthFormComponent,
    OnboardingGuideComponent,
    TranslatePipe
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private static readonly THEME_COOKIE = 'lego_theme';
  private static readonly THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
  private readonly pickABrickUrl = 'https://www.lego.com/de-de/pick-and-build/pick-a-brick?icmp=PAB_All_Pieces';

  protected readonly title = 'Lego Collection Manager';
  protected readonly auth = inject(AuthService);
  protected readonly onboardingGuide = inject(OnboardingGuideService);
  protected readonly languageService = inject(LanguageService);
  private readonly dialog = inject(MatDialog);
  protected readonly theme = signal<'light' | 'dark'>('light');
  protected readonly mainView = signal<'dashboard' | 'my-sets' | 'missing-parts'>('dashboard');
  protected readonly showSetCatalog = signal(false);
  protected readonly showAdminTables = signal(false);
  protected readonly isMobileView = signal(false);
  protected readonly workflowExpanded = signal(true);
  protected readonly workflowSteps = [1, 2, 3, 4] as const;
  protected readonly currentWorkflowStep = computed(() => {
    const view = this.mainView();
    if (view === 'dashboard') {
      return 1;
    }
    if (view === 'my-sets') {
      return 2;
    }
    return 3;
  });
  protected readonly languageOptions: Array<{ code: SupportedLanguage; label: string }> = [
    { code: 'en', label: 'English' },
    { code: 'it', label: 'Italian' },
    { code: 'de', label: 'German' }
  ];

  constructor() {
    const savedTheme = this.readSavedTheme();
    this.theme.set(savedTheme);
    this.applyTheme(savedTheme);
    this.initializeResponsiveState();
  }

  protected toggleTheme(): void {
    const nextTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(nextTheme);
    this.applyTheme(nextTheme);
    this.writeThemeCookie(nextTheme);
  }

  protected openAccountSettings(): void {
    const currentUser = this.auth.user();
    if (!currentUser) {
      return;
    }

    const dialogRef = this.dialog.open(AccountSettingsDialogComponent, {
      width: 'min(680px, 96vw)',
      maxWidth: '96vw',
      data: currentUser
    });

    dialogRef.afterClosed().subscribe((updatedUser: AuthUser | null | undefined) => {
      if (!updatedUser) {
        return;
      }
      this.auth.setCurrentUser(updatedUser);
    });
  }

  protected openGuide(): void {
    this.onboardingGuide.start(false);
  }

  protected openPickABrick(): void {
    window.open(this.pickABrickUrl, '_blank', 'noopener');
  }

  protected setMainView(view: 'dashboard' | 'my-sets' | 'missing-parts'): void {
    this.mainView.set(view);
  }

  protected openSetCatalog(): void {
    this.mainView.set('dashboard');
    this.showSetCatalog.set(true);
  }

  protected toggleAdminTables(): void {
    this.showAdminTables.update((current) => !current);
  }

  protected openAdminTables(): void {
    this.setMainView('dashboard');
    this.showAdminTables.set(true);
  }

  protected goToWorkflowStep(step: number): void {
    if (step <= 1) {
      this.setMainView('dashboard');
      this.showSetCatalog.set(true);
      return;
    }
    if (step === 2) {
      this.setMainView('my-sets');
      return;
    }
    if (step === 3) {
      this.setMainView('missing-parts');
      return;
    }
    this.setMainView('missing-parts');
  }

  protected toggleWorkflowExpanded(): void {
    this.workflowExpanded.update((current) => !current);
  }

  protected workflowStepIcon(step: number): string {
    if (step < this.currentWorkflowStep()) {
      return 'check_circle';
    }
    if (step === this.currentWorkflowStep()) {
      return 'arrow_forward';
    }
    return 'radio_button_unchecked';
  }

  protected workflowStepClass(step: number): string {
    if (step < this.currentWorkflowStep()) {
      return 'done';
    }
    if (step === this.currentWorkflowStep()) {
      return 'current';
    }
    return 'todo';
  }

  protected setLanguage(language: SupportedLanguage): void {
    this.languageService.setLanguage(language);
  }

  protected languageCode(): string {
    return this.languageService.language().toUpperCase();
  }

  protected profileImageUrl(user: AuthUser | null): string | null {
    if (!user) {
      return null;
    }
    const raw = String(user.profile_image_url ?? '').trim();
    if (!raw) {
      return null;
    }
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }
    if (raw.startsWith('/')) {
      return `${environment.apiBaseUrl}${raw}`;
    }
    return raw;
  }

  private readSavedTheme(): 'light' | 'dark' {
    const saved = this.readThemeCookie().toLowerCase();
    if (saved === 'dark') {
      return 'dark';
    }
    return 'light';
  }

  private readThemeCookie(): string {
    const cookieName = `${App.THEME_COOKIE}=`;
    const cookies = document.cookie ? document.cookie.split(';') : [];
    for (const rawCookie of cookies) {
      const cookie = rawCookie.trim();
      if (!cookie.startsWith(cookieName)) {
        continue;
      }
      return decodeURIComponent(cookie.slice(cookieName.length));
    }
    return '';
  }

  private writeThemeCookie(theme: 'light' | 'dark'): void {
    document.cookie = `${App.THEME_COOKIE}=${encodeURIComponent(theme)}; path=/; max-age=${App.THEME_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  private initializeResponsiveState(): void {
    const mediaQuery = window.matchMedia('(max-width: 700px)');
    const applyState = (matches: boolean): void => {
      this.isMobileView.set(matches);
      if (!matches) {
        this.workflowExpanded.set(true);
      }
    };

    applyState(mediaQuery.matches);
    mediaQuery.addEventListener('change', (event) => applyState(event.matches));
  }
}
