import { Component } from '@angular/core';
import { TablePanelComponent } from '../../../../shared/components/table-panel/table-panel.component';
import { INVENTORY_PARTS_CONFIG } from '../../config/table-definitions';

@Component({
  selector: 'lego-inventory-parts',
  standalone: true,
  imports: [TablePanelComponent],
  templateUrl: './inventory-parts.component.html'
})
export class InventoryPartsComponent {
  readonly config = INVENTORY_PARTS_CONFIG;
}
