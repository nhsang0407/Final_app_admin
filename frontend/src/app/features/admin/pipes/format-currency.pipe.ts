import { Pipe, PipeTransform, inject } from '@angular/core';
import { AdminService } from '../services/admin.service';

/**
 * FormatCurrencyPipe - Format currency without conversion
 * 
 * Usage: {{ amount | formatCurrency }}
 * 
 * Only formats the number with appropriate symbol, does NOT convert between currencies.
 * Use this for values that are already in the selected currency (like promotions).
 */
@Pipe({
  name: 'formatCurrency',
  standalone: true,
  pure: false
})
export class FormatCurrencyPipe implements PipeTransform {
  private adminService = inject(AdminService);

  transform(amount: number | null | undefined): string {
    if (amount == null) {
      return '—';
    }

    const currency = this.adminService.currency().toUpperCase();

    switch (currency) {
      case 'GBP':
      case 'VND':
        return `${amount.toFixed(2)} VND`;
      
      case 'USD':
        return `$${amount.toFixed(2)}`;
      
      default:
        return `${amount.toFixed(2)} ${currency}`;
    }
  }
}
