import { Component } from '@angular/core';
import { TablePanelComponent } from '../shared/table-panel.component';
import { ELEMENTS_CONFIG } from './table-definitions';

@Component({
  selector: 'lego-elements',
  standalone: true,
  imports: [TablePanelComponent],
  template: '<lego-table-panel [config]="config"></lego-table-panel>'
})
export class ElementsComponent {
  readonly config = ELEMENTS_CONFIG;
}
