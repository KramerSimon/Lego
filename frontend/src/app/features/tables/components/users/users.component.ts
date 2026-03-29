import { Component } from '@angular/core';
import { TablePanelComponent } from '../../../../shared/components/table-panel/table-panel.component';
import { USERS_CONFIG } from '../../config/table-definitions';

@Component({
  selector: 'lego-users',
  standalone: true,
  imports: [TablePanelComponent],
  templateUrl: './users.component.html'
})
export class UsersComponent {
  readonly config = USERS_CONFIG;
}
