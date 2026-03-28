import { Component } from '@angular/core';
import { TablePanelComponent } from '../shared/table-panel.component';
import { SETS_CONFIG } from './table-definitions';

@Component({
  selector: 'lego-sets',
  standalone: true,
  imports: [TablePanelComponent],
  template: '<lego-table-panel [config]="config"></lego-table-panel>'
})
export class SetsComponent {
  readonly config = SETS_CONFIG;
}
