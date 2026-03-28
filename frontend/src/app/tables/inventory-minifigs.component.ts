import { Component } from '@angular/core';
import { TablePanelComponent } from '../shared/table-panel.component';
import { INVENTORY_MINIFIGS_CONFIG } from './table-definitions';

@Component({
  selector: 'lego-inventory-minifigs',
  standalone: true,
  imports: [TablePanelComponent],
  template: '<lego-table-panel [config]="config"></lego-table-panel>'
})
export class InventoryMinifigsComponent {
  readonly config = INVENTORY_MINIFIGS_CONFIG;
}
