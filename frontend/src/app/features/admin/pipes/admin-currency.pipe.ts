import { Pipe, PipeTransform, inject } from '@angular/core';
import { AdminService } from '../services/admin.service';

/**
 * AdminCurrencyPipe - Convert and format prices based on admin settings
 * 
 * Usage: {{ price | adminCurrency }}
 * 
 * Features:
 * - Converts price from GBP (base currency) to selected currency (GBP/USD/VND)
 * - Formats with appropriate symbol and decimal places
 * - Automatically updates when currency setting changes
 * 
 * Base currency: All prices in database are stored in GBP
 */
@Pipe({
  name: 'adminCurrency',
  standalone: true,
  pure: false // Re-evaluate when currency changes
})
export class AdminCurrencyPipe implements PipeTransform {
  private adminService = inject(AdminService);

  transform(priceGBP: number | null | undefined): string {
    // Handle null/undefined
    if (priceGBP == null) {
      return '—';
    }

    // Get current currency and rates from admin service
    const currency = this.adminService.currency();
    const rates = this.adminService.exchangeRates();

    // If no rates loaded yet, show GBP as default
    if (!rates) {
      return this.formatPrice(priceGBP, 'GBP');
    }

    // Convert price based on selected currency
    let convertedPrice = priceGBP;

    switch (currency.toUpperCase()) {
      case 'USD':
        convertedPrice = priceGBP * rates.gbp_to_usd;
        break;
      case 'VND':
        // Only change unit, no conversion
        convertedPrice = priceGBP;
        break;
      case 'GBP':
      default:
        convertedPrice = priceGBP;
        break;
    }

    return this.formatPrice(convertedPrice, currency);
  }

  /**
   * Format price with appropriate symbol and decimal places
   */
  private formatPrice(amount: number, currency: string): string {
    const currencyUpper = currency.toUpperCase();

    switch (currencyUpper) {
      case 'GBP':
      case 'VND':
        return `${amount.toFixed(2)} VND`;
      
      case 'USD':
        return `$${amount.toFixed(2)}`;
      
      default:
        return `${amount.toFixed(2)} ${currencyUpper}`;
    }
  }
}
