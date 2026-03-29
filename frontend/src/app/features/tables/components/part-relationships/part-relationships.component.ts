import { Component } from '@angular/core';
import { TablePanelComponent } from '../../../../shared/components/table-panel/table-panel.component';
import { PART_RELATIONSHIPS_CONFIG } from '../../config/table-definitions';

@Component({
  selector: 'lego-part-relationships',
  standalone: true,
  imports: [TablePanelComponent],
  templateUrl: './part-relationships.component.html'
})
export class PartRelationshipsComponent {
  readonly config = PART_RELATIONSHIPS_CONFIG;
}
