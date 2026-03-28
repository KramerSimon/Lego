import { Component } from '@angular/core';
import { TablePanelComponent } from '../shared/table-panel.component';
import { USER_MISSING_PARTS_CONFIG } from './table-definitions';

@Component({
  selector: 'lego-user-missing-parts',
  standalone: true,
  imports: [TablePanelComponent],
  template: '<lego-table-panel [config]="config"></lego-table-panel>'
})
export class UserMissingPartsComponent {
  readonly config = USER_MISSING_PARTS_CONFIG;
}
