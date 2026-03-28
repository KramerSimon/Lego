import { Component } from '@angular/core';
import { TablePanelComponent } from '../shared/table-panel.component';
import { MINIFIGS_CONFIG } from './table-definitions';

@Component({
  selector: 'lego-minifigs',
  standalone: true,
  imports: [TablePanelComponent],
  template: '<lego-table-panel [config]="config"></lego-table-panel>'
})
export class MinifigsComponent {
  readonly config = MINIFIGS_CONFIG;
}
