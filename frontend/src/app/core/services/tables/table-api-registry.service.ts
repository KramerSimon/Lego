import { Injectable, inject } from '@angular/core';
import {
  ColorsApiService,
  ElementsApiService,
  InventoryApiService,
  InventoryMinifigsApiService,
  InventoryPartsApiService,
  InventorySetsApiService,
  MinifigsApiService,
  PartCategoriesApiService,
  PartRelationshipsApiService,
  PartsApiService,
  SetsTableApiService,
  ThemesApiService,
  UserMissingPartsTableApiService,
  UserPartsApiService,
  UsersApiService,
  UserSetsTableApiService
} from './table-services.service';
import { TableApiService } from './base-table-api.service';

@Injectable({ providedIn: 'root' })
export class TableApiRegistryService {
  private readonly services: Record<string, TableApiService> = {
    inventory: inject(InventoryApiService),
    inventory_parts: inject(InventoryPartsApiService),
    parts: inject(PartsApiService),
    part_categories: inject(PartCategoriesApiService),
    part_relationships: inject(PartRelationshipsApiService),
    elements: inject(ElementsApiService),
    colors: inject(ColorsApiService),
    inventory_minifigs: inject(InventoryMinifigsApiService),
    minifigs: inject(MinifigsApiService),
    inventory_sets: inject(InventorySetsApiService),
    sets: inject(SetsTableApiService),
    themes: inject(ThemesApiService),
    users: inject(UsersApiService),
    user_parts: inject(UserPartsApiService),
    user_missing_parts: inject(UserMissingPartsTableApiService),
    user_sets: inject(UserSetsTableApiService)
  };

  get(endpoint: string): TableApiService {
    const service = this.services[endpoint];
    if (!service) {
      throw new Error(`No table API service registered for endpoint: ${endpoint}`);
    }
    return service;
  }
}
