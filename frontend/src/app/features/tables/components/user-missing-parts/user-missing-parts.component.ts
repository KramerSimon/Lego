import { Component } from '@angular/core';
import { TablePanelComponent } from '../../../../shared/components/table-panel/table-panel.component';
import { USER_MISSING_PARTS_CONFIG } from '../../config/table-definitions';

@Component({
  selector: 'lego-user-missing-parts',
  standalone: true,
  imports: [TablePanelComponent],
  templateUrl: './user-missing-parts.component.html'
})
export class UserMissingPartsComponent {
  readonly config = USER_MISSING_PARTS_CONFIG;
}
