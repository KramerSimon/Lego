import { Component } from '@angular/core';
import { TablePanelComponent } from '../shared/table-panel.component';
import { USERS_CONFIG } from './table-definitions';

@Component({
  selector: 'lego-users',
  standalone: true,
  imports: [TablePanelComponent],
  template: '<lego-table-panel [config]="config"></lego-table-panel>'
})
export class UsersComponent {
  readonly config = USERS_CONFIG;
}
