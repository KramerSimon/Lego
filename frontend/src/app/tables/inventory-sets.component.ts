import { Component } from '@angular/core';
import { TablePanelComponent } from '../shared/table-panel.component';
import { INVENTORY_SETS_CONFIG } from './table-definitions';

@Component({
  selector: 'lego-inventory-sets',
  standalone: true,
  imports: [TablePanelComponent],
  template: '<lego-table-panel [config]="config"></lego-table-panel>'
})
export class InventorySetsComponent {
  readonly config = INVENTORY_SETS_CONFIG;
}
