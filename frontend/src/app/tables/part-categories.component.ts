import { Component } from '@angular/core';
import { TablePanelComponent } from '../shared/table-panel.component';
import { PART_CATEGORIES_CONFIG } from './table-definitions';

@Component({
  selector: 'lego-part-categories',
  standalone: true,
  imports: [TablePanelComponent],
  template: '<lego-table-panel [config]="config"></lego-table-panel>'
})
export class PartCategoriesComponent {
  readonly config = PART_CATEGORIES_CONFIG;
}
