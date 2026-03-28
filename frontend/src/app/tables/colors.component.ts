import { Component } from '@angular/core';
import { TablePanelComponent } from '../shared/table-panel.component';
import { COLORS_CONFIG } from './table-definitions';

@Component({
  selector: 'lego-colors',
  standalone: true,
  imports: [TablePanelComponent],
  template: '<lego-table-panel [config]="config"></lego-table-panel>'
})
export class ColorsComponent {
  readonly config = COLORS_CONFIG;
}
