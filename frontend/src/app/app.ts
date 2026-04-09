import { Component, inject, signal } from '@angular/core';
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
    OnboardingGuideComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private static readonly THEME_KEY = 'lego_theme';
  private readonly pickABrickUrl = 'https://www.lego.com/de-de/pick-and-build/pick-a-brick?icmp=PAB_All_Pieces';

  protected readonly title = 'Lego Collection Manager';
  protected readonly auth = inject(AuthService);
  protected readonly onboardingGuide = inject(OnboardingGuideService);
  private readonly dialog = inject(MatDialog);
  protected readonly theme = signal<'light' | 'dark'>('light');

  constructor() {
    const savedTheme = this.readSavedTheme();
    this.theme.set(savedTheme);
    this.applyTheme(savedTheme);
  }

  protected toggleTheme(): void {
    const nextTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(nextTheme);
    this.applyTheme(nextTheme);
    localStorage.setItem(App.THEME_KEY, nextTheme);
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
    const saved = String(localStorage.getItem(App.THEME_KEY) ?? '').toLowerCase();
    if (saved === 'dark') {
      return 'dark';
    }
    return 'light';
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
