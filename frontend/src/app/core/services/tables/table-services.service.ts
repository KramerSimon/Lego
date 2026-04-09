import { Injectable } from '@angular/core';
import { ApiHttpService } from '../api-http.service';
import { BaseTableApiService } from './base-table-api.service';

@Injectable({ providedIn: 'root' })
export class InventoryApiService extends BaseTableApiService {
  constructor(apiHttp: ApiHttpService) {
    super(apiHttp, 'inventory');
  }
}

@Injectable({ providedIn: 'root' })
export class InventoryPartsApiService extends BaseTableApiService {
  constructor(apiHttp: ApiHttpService) {
    super(apiHttp, 'inventory_parts');
  }
}

@Injectable({ providedIn: 'root' })
export class PartsApiService extends BaseTableApiService {
  constructor(apiHttp: ApiHttpService) {
    super(apiHttp, 'parts');
  }
}

@Injectable({ providedIn: 'root' })
export class PartCategoriesApiService extends BaseTableApiService {
  constructor(apiHttp: ApiHttpService) {
    super(apiHttp, 'part_categories');
  }
}

@Injectable({ providedIn: 'root' })
export class PartRelationshipsApiService extends BaseTableApiService {
  constructor(apiHttp: ApiHttpService) {
    super(apiHttp, 'part_relationships');
  }
}

@Injectable({ providedIn: 'root' })
export class ElementsApiService extends BaseTableApiService {
  constructor(apiHttp: ApiHttpService) {
    super(apiHttp, 'elements');
  }
}

@Injectable({ providedIn: 'root' })
export class ColorsApiService extends BaseTableApiService {
  constructor(apiHttp: ApiHttpService) {
    super(apiHttp, 'colors');
  }
}

@Injectable({ providedIn: 'root' })
export class InventoryMinifigsApiService extends BaseTableApiService {
  constructor(apiHttp: ApiHttpService) {
    super(apiHttp, 'inventory_minifigs');
  }
}

@Injectable({ providedIn: 'root' })
export class MinifigsApiService extends BaseTableApiService {
  constructor(apiHttp: ApiHttpService) {
    super(apiHttp, 'minifigs');
  }
}

@Injectable({ providedIn: 'root' })
export class InventorySetsApiService extends BaseTableApiService {
  constructor(apiHttp: ApiHttpService) {
    super(apiHttp, 'inventory_sets');
  }
}

@Injectable({ providedIn: 'root' })
export class SetsTableApiService extends BaseTableApiService {
  constructor(apiHttp: ApiHttpService) {
    super(apiHttp, 'sets');
  }
}

@Injectable({ providedIn: 'root' })
export class ThemesApiService extends BaseTableApiService {
  constructor(apiHttp: ApiHttpService) {
    super(apiHttp, 'themes');
  }
}

@Injectable({ providedIn: 'root' })
export class UsersApiService extends BaseTableApiService {
  constructor(apiHttp: ApiHttpService) {
    super(apiHttp, 'users');
  }
}

@Injectable({ providedIn: 'root' })
export class UserPartsApiService extends BaseTableApiService {
  constructor(apiHttp: ApiHttpService) {
    super(apiHttp, 'user_parts');
  }
}

@Injectable({ providedIn: 'root' })
export class UserMissingPartsTableApiService extends BaseTableApiService {
  constructor(apiHttp: ApiHttpService) {
    super(apiHttp, 'user_missing_parts');
  }
}

@Injectable({ providedIn: 'root' })
export class UserSetsTableApiService extends BaseTableApiService {
  constructor(apiHttp: ApiHttpService) {
    super(apiHttp, 'user_sets');
  }
}
