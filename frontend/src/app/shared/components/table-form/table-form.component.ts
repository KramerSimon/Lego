import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TableConfig, TableField } from '../../../core/models/table-config';
import { SelectLoadMore, SelectOption, SelectSearchChange } from './table-form.models';

@Component({
  selector: 'lego-table-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './table-form.component.html',
  styleUrl: './table-form.component.scss'
})
export class TableFormComponent {
  readonly config = input.required<TableConfig>();
  readonly form = input.required<FormGroup>();
  readonly loading = input.required<boolean>();
  readonly getOptions = input.required<(field: TableField) => SelectOption[]>();
  readonly getSelectSearch = input.required<(field: TableField) => string>();
  readonly isSelectLoading = input.required<(field: TableField) => boolean>();
  readonly hasMoreOptions = input.required<(field: TableField) => boolean>();

  readonly submitForm = output<void>();
  readonly reloadTable = output<void>();
  readonly selectSearch = output<SelectSearchChange>();
  readonly loadMore = output<SelectLoadMore>();

  onSubmit(): void {
    this.submitForm.emit();
  }

  onReload(): void {
    this.reloadTable.emit();
  }

  onSelectSearch(field: TableField, value: string): void {
    this.selectSearch.emit({ field, value });
  }

  onLoadMore(field: TableField, event: Event): void {
    this.loadMore.emit({ field, event });
  }
}
