import { Component } from '@angular/core';
import { TablePanelComponent } from '../../../../shared/components/table-panel/table-panel.component';
import { ELEMENTS_CONFIG } from '../../config/table-definitions';

@Component({
  selector: 'lego-elements',
  standalone: true,
  imports: [TablePanelComponent],
  templateUrl: './elements.component.html'
})
export class ElementsComponent {
  readonly config = ELEMENTS_CONFIG;
}
