import { Component } from '@angular/core';
import { TablePanelComponent } from '../../../../shared/components/table-panel/table-panel.component';
import { PART_CATEGORIES_CONFIG } from '../../config/table-definitions';

@Component({
  selector: 'lego-part-categories',
  standalone: true,
  imports: [TablePanelComponent],
  templateUrl: './part-categories.component.html'
})
export class PartCategoriesComponent {
  readonly config = PART_CATEGORIES_CONFIG;
}
