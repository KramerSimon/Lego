import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

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
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Confirm User Set Save</h2>
    <mat-dialog-content>
      <p><strong>Set:</strong> {{ data.setNum }} (x{{ data.setQuantity }})</p>
      <p><strong>Part rows processed:</strong> {{ data.partsProcessed }}</p>
      <p><strong>User parts rows:</strong> {{ data.userPartsCreated }}</p>
      <p><strong>Missing parts rows:</strong> {{ data.missingPartsCreated }}</p>
      <p><strong>Total owned quantity:</strong> {{ data.totalOwnedQuantity }}</p>
      <p><strong>Total missing quantity:</strong> {{ data.totalMissingQuantity }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close(false)">Cancel</button>
      <button mat-raised-button color="primary" type="button" (click)="close(true)">Confirm Save</button>
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
