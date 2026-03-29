import { Component } from '@angular/core';
import { TablePanelComponent } from '../../../../shared/components/table-panel/table-panel.component';
import { USER_PARTS_CONFIG } from '../../config/table-definitions';

@Component({
  selector: 'lego-user-parts',
  standalone: true,
  imports: [TablePanelComponent],
  templateUrl: './user-parts.component.html'
})
export class UserPartsComponent {
  readonly config = USER_PARTS_CONFIG;
}
