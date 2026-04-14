import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../../core/services/language.service';

@Pipe({
  name: 't',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(value: unknown): string {
    const normalized = String(value ?? '');
    return this.language.translate(normalized);
  }
}
