import { Component } from '@angular/core';
import { TablePanelComponent } from '../../../../shared/components/table-panel/table-panel.component';
import { INVENTORIES_CONFIG } from '../../config/table-definitions';

@Component({
  selector: 'lego-inventories',
  standalone: true,
  imports: [TablePanelComponent],
  templateUrl: './inventories.component.html'
})
export class InventoriesComponent {
  readonly config = INVENTORIES_CONFIG;
}
