import { Component } from '@angular/core';
import { TablePanelComponent } from '../shared/table-panel.component';
import { USER_SETS_CONFIG } from './table-definitions';

@Component({
  selector: 'lego-user-sets',
  standalone: true,
  imports: [TablePanelComponent],
  template: '<lego-table-panel [config]="config"></lego-table-panel>'
})
export class UserSetsComponent {
  readonly config = USER_SETS_CONFIG;
}
