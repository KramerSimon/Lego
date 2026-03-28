import { Component } from '@angular/core';
import { TablePanelComponent } from '../shared/table-panel.component';
import { THEMES_CONFIG } from './table-definitions';

@Component({
  selector: 'lego-themes',
  standalone: true,
  imports: [TablePanelComponent],
  template: '<lego-table-panel [config]="config"></lego-table-panel>'
})
export class ThemesComponent {
  readonly config = THEMES_CONFIG;
}
