import { Component } from '@angular/core';
import { TablePanelComponent } from '../../../../shared/components/table-panel/table-panel.component';
import { INVENTORY_SETS_CONFIG } from '../../config/table-definitions';

@Component({
  selector: 'lego-inventory-sets',
  standalone: true,
  imports: [TablePanelComponent],
  templateUrl: './inventory-sets.component.html'
})
export class InventorySetsComponent {
  readonly config = INVENTORY_SETS_CONFIG;
}
