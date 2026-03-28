import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { InventoriesComponent } from './tables/inventories.component';
import { InventoryPartsComponent } from './tables/inventory-parts.component';
import { PartsComponent } from './tables/parts.component';
import { PartCategoriesComponent } from './tables/part-categories.component';
import { PartRelationshipsComponent } from './tables/part-relationships.component';
import { ElementsComponent } from './tables/elements.component';
import { ColorsComponent } from './tables/colors.component';
import { InventoryMinifigsComponent } from './tables/inventory-minifigs.component';
import { MinifigsComponent } from './tables/minifigs.component';
import { InventorySetsComponent } from './tables/inventory-sets.component';
import { SetsComponent } from './tables/sets.component';
import { ThemesComponent } from './tables/themes.component';
import { UsersComponent } from './tables/users.component';
import { UserPartsComponent } from './tables/user-parts.component';
import { UserMissingPartsComponent } from './tables/user-missing-parts.component';
import { UserSetsComponent } from './tables/user-sets.component';

@Component({
  selector: 'lego-root',
  imports: [
    CommonModule,
    MatTabsModule,
    MatToolbarModule,
    MatIconModule,
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
    UserSetsComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = 'Lego Collection Manager';
}
