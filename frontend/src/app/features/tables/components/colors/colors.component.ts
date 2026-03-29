import { Component } from '@angular/core';
import { TablePanelComponent } from '../../../../shared/components/table-panel/table-panel.component';
import { COLORS_CONFIG } from '../../config/table-definitions';

@Component({
  selector: 'lego-colors',
  standalone: true,
  imports: [TablePanelComponent],
  templateUrl: './colors.component.html'
})
export class ColorsComponent {
  readonly config = COLORS_CONFIG;
}
