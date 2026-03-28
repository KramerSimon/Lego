import { Component } from '@angular/core';
import { TablePanelComponent } from '../shared/table-panel.component';
import { PART_RELATIONSHIPS_CONFIG } from './table-definitions';

@Component({
  selector: 'lego-part-relationships',
  standalone: true,
  imports: [TablePanelComponent],
  template: '<lego-table-panel [config]="config"></lego-table-panel>'
})
export class PartRelationshipsComponent {
  readonly config = PART_RELATIONSHIPS_CONFIG;
}
