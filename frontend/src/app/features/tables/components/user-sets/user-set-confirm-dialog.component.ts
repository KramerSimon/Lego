import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

export interface UserSetConfirmDialogData {
  setNum: string;
  setQuantity: number;
  partsProcessed: number;
  userPartsCreated: number;
  missingPartsCreated: number;
  totalOwnedQuantity: number;
  totalMissingQuantity: number;
}

@Component({
  selector: 'lego-user-set-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'Confirm User Set Save' | t }}</h2>
    <mat-dialog-content>
      <p><strong>{{ 'Set:' | t }}</strong> {{ data.setNum }} (x{{ data.setQuantity }})</p>
      <p><strong>{{ 'Part rows processed:' | t }}</strong> {{ data.partsProcessed }}</p>
      <p><strong>{{ 'User parts rows:' | t }}</strong> {{ data.userPartsCreated }}</p>
      <p><strong>{{ 'Missing parts rows:' | t }}</strong> {{ data.missingPartsCreated }}</p>
      <p><strong>{{ 'Total owned quantity:' | t }}</strong> {{ data.totalOwnedQuantity }}</p>
      <p><strong>{{ 'Total missing quantity:' | t }}</strong> {{ data.totalMissingQuantity }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close(false)">{{ 'Cancel' | t }}</button>
      <button mat-raised-button color="primary" type="button" (click)="close(true)">{{ 'Confirm Save' | t }}</button>
    </mat-dialog-actions>
  `
})
export class UserSetConfirmDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<UserSetConfirmDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: UserSetConfirmDialogData
  ) {}

  close(result: boolean): void {
    this.dialogRef.close(result);
  }
}
