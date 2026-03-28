import { Component } from '@angular/core';
import { TablePanelComponent } from '../shared/table-panel.component';
import { INVENTORIES_CONFIG } from './table-definitions';

@Component({
  selector: 'lego-inventories',
  standalone: true,
  imports: [TablePanelComponent],
  template: '<lego-table-panel [config]="config"></lego-table-panel>'
})
export class InventoriesComponent {
  readonly config = INVENTORIES_CONFIG;
}
