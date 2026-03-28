import { Component } from '@angular/core';
import { TablePanelComponent } from '../shared/table-panel.component';
import { PARTS_CONFIG } from './table-definitions';

@Component({
  selector: 'lego-parts',
  standalone: true,
  imports: [TablePanelComponent],
  template: '<lego-table-panel [config]="config"></lego-table-panel>'
})
export class PartsComponent {
  readonly config = PARTS_CONFIG;
}
