import { Component } from '@angular/core';
import { TablePanelComponent } from '../../../../shared/components/table-panel/table-panel.component';
import { INVENTORY_MINIFIGS_CONFIG } from '../../config/table-definitions';

@Component({
  selector: 'lego-inventory-minifigs',
  standalone: true,
  imports: [TablePanelComponent],
  templateUrl: './inventory-minifigs.component.html'
})
export class InventoryMinifigsComponent {
  readonly config = INVENTORY_MINIFIGS_CONFIG;
}
