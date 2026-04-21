import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
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
import { BuildableSetsComponent } from './features/buildable-sets/components/buildable-sets.component';
import { BuildModeComponent } from './features/build-mode/components/build-mode.component';
import { InventoryOverviewComponent } from './features/inventory-overview/components/inventory-overview.component';
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
import { UserSetsApiService } from './core/services/user-sets-api.service';
import { GlobalSearchScope, GlobalSearchService } from './core/services/global-search.service';
import { UserMissingPartsApiService } from './core/services/user-missing-parts-api.service';
import { forkJoin } from 'rxjs';
import { BuildSessionService } from './core/services/build-session.service';

type MainView = 'dashboard' | 'my-sets' | 'missing-parts' | 'buildable-sets' | 'build-mode' | 'inventory-overview';

interface SmartSuggestionItem {
  text: string;
  target: MainView;
}

@Component({
  selector: 'lego-root',
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatMenuModule,
    MatDialogModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
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
  protected readonly buildableSetsComponent = BuildableSetsComponent;
  protected readonly buildModeComponent = BuildModeComponent;
  protected readonly inventoryOverviewComponent = InventoryOverviewComponent;
  protected readonly auth = inject(AuthService);
  protected readonly onboardingGuide = inject(OnboardingGuideService);
  protected readonly languageService = inject(LanguageService);
  private readonly userSetsApi = inject(UserSetsApiService);
  private readonly userMissingPartsApi = inject(UserMissingPartsApiService);
  private readonly buildSession = inject(BuildSessionService);
  private readonly globalSearch = inject(GlobalSearchService);
  private readonly dialog = inject(MatDialog);
  protected readonly theme = signal<'light' | 'dark'>('light');
  protected readonly mainView = signal<MainView>('dashboard');
  protected readonly showSetCatalog = signal(false);
  protected readonly showAdminTables = signal(false);
  protected readonly dashboardAdvancedActionsOpen = signal(false);
  protected readonly isMobileView = signal(false);
  protected readonly globalSearchQuery = signal('');
  protected readonly globalSearchScope = signal<GlobalSearchScope>('all');
  protected readonly globalSearchScopes: Array<{ value: GlobalSearchScope; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'my-sets', label: 'Sets' },
    { value: 'missing-parts', label: 'Missing Parts' },
    { value: 'buildable-sets', label: 'Buildable Sets' },
    { value: 'build-mode', label: 'Build Mode' },
    { value: 'inventory-overview', label: 'My Parts' }
  ];
  protected readonly dashboardBuildableCount = signal(0);
  protected readonly dashboardBuildableLoading = signal(false);
  protected readonly smartSuggestionsLoading = signal(false);
  protected readonly smartSuggestions = signal<SmartSuggestionItem[]>([]);
  protected readonly continueBuild = this.buildSession.continueBuild;
  protected readonly hasContinueBuild = this.buildSession.hasContinueBuild;
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
    if (view === 'missing-parts') {
      return 3;
    }
    return 4;
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

    effect(() => {
      const user = this.auth.user();
      if (!user) {
        this.dashboardBuildableCount.set(0);
        this.smartSuggestions.set([]);
        return;
      }
      this.reloadDashboardBuildableCount();
      this.reloadSmartSuggestions();
    });
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

  protected dashboardBuildableHeadline(): string {
    const count = this.dashboardBuildableCount();
    if (count === 1) {
      return '1 set ready to build';
    }
    return `${count} sets ready to build`;
  }

  protected startBuild(): void {
    const active = this.continueBuild();
    if (active && active.set_num && active.completion > 0 && active.completion < 100) {
      this.buildSession.setPendingBuildSet(active.set_num);
      this.setMainView('build-mode');
      return;
    }
    this.setMainView('build-mode');
  }

  protected continueBuildLabel(): string {
    const state = this.continueBuild();
    if (!state) {
      return '';
    }
    const title = String(state.set_name ?? '').trim();
    if (title) {
      return `${state.set_num} - ${title}`;
    }
    return state.set_num;
  }

  protected runGlobalSearch(): void {
    const query = this.globalSearchQuery();
    const scope = this.globalSearchScope();
    const published = this.globalSearch.publish(query, scope);
    if (!published) {
      return;
    }

    if (scope === 'my-sets') {
      this.setMainView('my-sets');
      return;
    }
    if (scope === 'missing-parts') {
      this.setMainView('missing-parts');
      return;
    }
    if (scope === 'buildable-sets') {
      this.setMainView('buildable-sets');
      return;
    }
    if (scope === 'build-mode') {
      this.setMainView('build-mode');
      return;
    }
    if (scope === 'inventory-overview') {
      this.setMainView('inventory-overview');
      return;
    }

    this.setMainView('missing-parts');
  }

  protected setMainView(view: MainView): void {
    if (this.onboardingGuide.isOpen()) {
      this.onboardingGuide.skip();
    }
    this.mainView.set(view);
  }

  protected toggleDashboardAdvancedActions(): void {
    this.dashboardAdvancedActionsOpen.update((current) => !current);
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
    this.setMainView('build-mode');
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

  protected mobileFabIcon(): string {
    return 'add';
  }

  protected mobileFabLabel(): string {
    const view = this.mainView();
    if (view === 'dashboard') {
      return 'Add Set';
    }
    if (view === 'my-sets') {
      return 'Review Missing Parts';
    }
    if (view === 'missing-parts') {
      return 'Open Pick a Brick';
    }
    if (view === 'buildable-sets') {
      return 'Start Build';
    }
    if (view === 'build-mode') {
      return 'My Parts';
    }
    return 'Start Build';
  }

  protected handleMobileFabClick(): void {
    const view = this.mainView();
    if (view === 'dashboard') {
      this.setMainView('my-sets');
      return;
    }
    if (view === 'my-sets') {
      this.setMainView('missing-parts');
      return;
    }
    if (view === 'missing-parts') {
      this.openPickABrick();
      return;
    }
    if (view === 'buildable-sets') {
      this.setMainView('build-mode');
      return;
    }
    if (view === 'build-mode') {
      this.setMainView('inventory-overview');
      return;
    }
    this.setMainView('my-sets');
  }

  protected openSmartSuggestionTarget(target: MainView): void {
    this.setMainView(target);
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

  private reloadDashboardBuildableCount(): void {
    this.dashboardBuildableLoading.set(true);
    this.userSetsApi.getBuildableCatalog(1, 1, { buildableOnly: true }).subscribe({
      next: (result) => {
        this.dashboardBuildableCount.set(Number(result?.total ?? 0));
        this.dashboardBuildableLoading.set(false);
      },
      error: () => {
        this.dashboardBuildableCount.set(0);
        this.dashboardBuildableLoading.set(false);
      }
    });
  }

  private reloadSmartSuggestions(): void {
    this.smartSuggestionsLoading.set(true);
    forkJoin({
      buildable: this.userSetsApi.getBuildableCatalog(1, 8, {
        sortBy: 'completeness_percentage',
        sortDir: 'desc'
      }),
      missing: this.userMissingPartsApi.getCatalog(1, 1)
    }).subscribe({
      next: ({ buildable, missing }) => {
        const rows = Array.isArray(buildable?.data) ? buildable.data : [];
        const buildableCount = Number(buildable?.total ?? 0);
        const missingRows = Number(missing?.total ?? 0);
        const suggestions: SmartSuggestionItem[] = [];

        if (buildableCount > 0) {
          suggestions.push({
            text: this.smartSuggestionBuildableCount(buildableCount),
            target: 'build-mode'
          });
        }

        const nearComplete = rows.find((row) => Number(row['missing_parts'] ?? 0) > 0 && Number(row['missing_parts'] ?? 0) <= 2);
        if (nearComplete) {
          suggestions.push({
            text: this.smartSuggestionNearComplete(String(nearComplete['set_num'] ?? ''), Number(nearComplete['missing_parts'] ?? 0)),
            target: 'build-mode'
          });
        }

        const topProgress = rows.find((row) => Number(row['completeness_percentage'] ?? 0) >= 90 && Number(row['missing_parts'] ?? 0) > 0);
        if (topProgress) {
          suggestions.push({
            text: this.smartSuggestionTopProgress(String(topProgress['set_num'] ?? ''), Number(topProgress['completeness_percentage'] ?? 0)),
            target: 'build-mode'
          });
        }

        if (missingRows > 0) {
          suggestions.push({
            text: this.smartSuggestionMissingRows(missingRows),
            target: 'missing-parts'
          });
        } else {
          suggestions.push({
            text: this.smartSuggestionNoMissingRows(),
            target: 'build-mode'
          });
        }

        suggestions.push({
          text: this.smartSuggestionInventoryOverview(),
          target: 'inventory-overview'
        });

        this.smartSuggestions.set(suggestions.slice(0, 4));
        this.smartSuggestionsLoading.set(false);
      },
      error: () => {
        this.smartSuggestions.set([
          {
            text: this.smartSuggestionBuildModeFallback(),
            target: 'build-mode'
          },
          {
            text: this.smartSuggestionInventoryFallback(),
            target: 'inventory-overview'
          }
        ]);
        this.smartSuggestionsLoading.set(false);
      }
    });
  }

  private smartSuggestionBuildableCount(count: number): string {
    const language = this.languageService.language();
    if (language === 'de') {
      return `${count} Sets sind jetzt baubar. Starte den Bau-Modus.`;
    }
    if (language === 'it') {
      return `${count} set sono costruibili ora. Avvia la Modalita Costruzione.`;
    }
    return `${count} sets are buildable right now. Start Build Mode.`;
  }

  private smartSuggestionNearComplete(setNum: string, missingParts: number): string {
    const language = this.languageService.language();
    if (language === 'de') {
      return `${setNum} braucht nur noch ${missingParts} Teile bis zum Abschluss.`;
    }
    if (language === 'it') {
      return `${setNum} richiede solo ${missingParts} pezzi per essere completato.`;
    }
    return `${setNum} needs only ${missingParts} more parts to finish.`;
  }

  private smartSuggestionTopProgress(setNum: string, percentage: number): string {
    const language = this.languageService.language();
    if (language === 'de') {
      return `${setNum} ist bereits zu ${percentage}% abgeschlossen.`;
    }
    if (language === 'it') {
      return `${setNum} e gia completato al ${percentage}%.`;
    }
    return `${setNum} is ${percentage}% complete.`;
  }

  private smartSuggestionMissingRows(missingRows: number): string {
    const language = this.languageService.language();
    if (language === 'de') {
      return `Du hast noch ${missingRows} Zeilen mit fehlenden Teilen zu erledigen.`;
    }
    if (language === 'it') {
      return `Hai ancora ${missingRows} righe di pezzi mancanti da risolvere.`;
    }
    return `You still have ${missingRows} missing-part rows to resolve.`;
  }

  private smartSuggestionNoMissingRows(): string {
    const language = this.languageService.language();
    if (language === 'de') {
      return 'Keine fehlenden Teile mehr. Offne den Bau-Modus und beende ein Set.';
    }
    if (language === 'it') {
      return 'Nessun pezzo mancante rimasto. Apri la Modalita Costruzione e completa un set.';
    }
    return 'No missing-part rows left. Open Build Mode and finish a set.';
  }

  private smartSuggestionInventoryOverview(): string {
    const language = this.languageService.language();
    if (language === 'de') {
      return 'Offne die Teileubersicht, um haufige und seltene Teile zu erkennen.';
    }
    if (language === 'it') {
      return 'Apri la panoramica pezzi per vedere i pezzi comuni e rari.';
    }
    return 'Open My Parts overview to spot your most common and rare pieces.';
  }

  private smartSuggestionBuildModeFallback(): string {
    const language = this.languageService.language();
    if (language === 'de') {
      return 'Offne den Bau-Modus, um den Fortschritt Schritt fur Schritt zu verfolgen.';
    }
    if (language === 'it') {
      return 'Apri la Modalita Costruzione per tracciare i progressi passo dopo passo.';
    }
    return 'Open Build Mode to track each part step-by-step.';
  }

  private smartSuggestionInventoryFallback(): string {
    const language = this.languageService.language();
    if (language === 'de') {
      return 'Offne die Teileubersicht, um deine Sammlung besser zu verstehen.';
    }
    if (language === 'it') {
      return 'Apri la panoramica pezzi per capire meglio la tua collezione.';
    }
    return 'Open My Parts overview to understand your inventory shape.';
  }
}
