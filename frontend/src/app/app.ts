import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
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

@Component({
  selector: 'lego-root',
  imports: [
    CommonModule,
    MatTabsModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
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
    AuthFormComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = 'Lego Collection Manager';
  protected readonly auth = inject(AuthService);
}
