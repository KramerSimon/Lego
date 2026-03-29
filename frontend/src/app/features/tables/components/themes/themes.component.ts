import { Component } from '@angular/core';
import { TablePanelComponent } from '../../../../shared/components/table-panel/table-panel.component';
import { THEMES_CONFIG } from '../../config/table-definitions';

@Component({
  selector: 'lego-themes',
  standalone: true,
  imports: [TablePanelComponent],
  templateUrl: './themes.component.html'
})
export class ThemesComponent {
  readonly config = THEMES_CONFIG;
}
