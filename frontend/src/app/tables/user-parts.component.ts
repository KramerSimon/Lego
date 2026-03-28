import { Component } from '@angular/core';
import { TablePanelComponent } from '../shared/table-panel.component';
import { USER_PARTS_CONFIG } from './table-definitions';

@Component({
  selector: 'lego-user-parts',
  standalone: true,
  imports: [TablePanelComponent],
  template: '<lego-table-panel [config]="config"></lego-table-panel>'
})
export class UserPartsComponent {
  readonly config = USER_PARTS_CONFIG;
}
