import { Component } from '@angular/core';
import { TablePanelComponent } from '../../../../shared/components/table-panel/table-panel.component';
import { MINIFIGS_CONFIG } from '../../config/table-definitions';

@Component({
  selector: 'lego-minifigs',
  standalone: true,
  imports: [TablePanelComponent],
  templateUrl: './minifigs.component.html'
})
export class MinifigsComponent {
  readonly config = MINIFIGS_CONFIG;
}
