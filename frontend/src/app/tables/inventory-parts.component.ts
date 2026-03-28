import { Component } from '@angular/core';
import { TablePanelComponent } from '../shared/table-panel.component';
import { INVENTORY_PARTS_CONFIG } from './table-definitions';

@Component({
  selector: 'lego-inventory-parts',
  standalone: true,
  imports: [TablePanelComponent],
  template: '<lego-table-panel [config]="config"></lego-table-panel>'
})
export class InventoryPartsComponent {
  readonly config = INVENTORY_PARTS_CONFIG;
}
