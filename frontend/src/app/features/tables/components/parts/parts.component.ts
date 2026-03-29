import { Component } from '@angular/core';
import { TablePanelComponent } from '../../../../shared/components/table-panel/table-panel.component';
import { PARTS_CONFIG } from '../../config/table-definitions';

@Component({
  selector: 'lego-parts',
  standalone: true,
  imports: [TablePanelComponent],
  templateUrl: './parts.component.html'
})
export class PartsComponent {
  readonly config = PARTS_CONFIG;
}
